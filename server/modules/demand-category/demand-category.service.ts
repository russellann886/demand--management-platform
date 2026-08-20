import { Inject, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthorizationSDK,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { demand, demandCategory } from '../../database/schema';
import { hasSectionAccess } from '../../common/utils/section-auth';
import {
  SECTION_ADMIN_ROLES,
  BOARD_SECTIONS,
  type BoardAdmins,
  type CreateDemandCategoryRequest,
  type DemandCategory,
  type DemandCategoryListResponse,
  type FormFieldDefinition,
  type UpdateDemandCategoryRequest,
} from '@shared/api.interface';

@Injectable()
export class DemandCategoryService {
  private readonly logger = new Logger(DemandCategoryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authzSDK: AuthorizationSDK,
  ) {}

  async list(
    onlyEnabled: boolean,
    userSections: string[] | null = null,
  ): Promise<DemandCategoryListResponse> {
    if (userSections !== null && userSections.length === 0) {
      return { items: [] };
    }

    const baseSelect = {
      id: demandCategory.id,
      name: demandCategory.name,
      description: demandCategory.description,
      enabled: demandCategory.enabled,
      departments: demandCategory.departments,
      section: demandCategory.section,
      formFields: demandCategory.formFields,
      createdAt: demandCategory.createdAt,
      demandCount: this.db.$count(
        demand,
        eq(demand.categoryId, demandCategory.id),
      ),
      pendingCount: this.db.$count(
        demand,
        and(eq(demand.categoryId, demandCategory.id), eq(demand.status, '待处理')),
      ),
      inProgressCount: this.db.$count(
        demand,
        and(eq(demand.categoryId, demandCategory.id), eq(demand.status, '跟进中')),
      ),
      completedCount: this.db.$count(
        demand,
        and(eq(demand.categoryId, demandCategory.id), eq(demand.status, '已完成')),
      ),
      closedCount: this.db.$count(
        demand,
        and(eq(demand.categoryId, demandCategory.id), eq(demand.status, '已关闭')),
      ),
    };

    const conditions = [];
    if (onlyEnabled) conditions.push(eq(demandCategory.enabled, true));
    if (userSections !== null) {
      conditions.push(inArray(demandCategory.section, userSections));
    }

    const rows =
      conditions.length > 0
        ? await this.db
            .select(baseSelect)
            .from(demandCategory)
            .where(and(...conditions))
            .orderBy(desc(demandCategory.createdAt))
        : await this.db
            .select(baseSelect)
            .from(demandCategory)
            .orderBy(desc(demandCategory.createdAt));

    const items: DemandCategory[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      enabled: r.enabled,
      departments: r.departments ?? [],
      section: r.section ?? null,
      formFields: (r.formFields as FormFieldDefinition[] | null) ?? null,
      demandCount: Number(r.demandCount ?? 0),
      statusCounts: {
        '待处理': Number(r.pendingCount ?? 0),
        '跟进中': Number(r.inProgressCount ?? 0),
        '已完成': Number(r.completedCount ?? 0),
        '已关闭': Number(r.closedCount ?? 0),
      },
      createdAt: r.createdAt.toISOString(),
    }));

    return { items };
  }

  async create(
    body: CreateDemandCategoryRequest,
    userSections: string[] | null = null,
  ): Promise<{ id: string }> {
    if (userSections !== null) {
      const section = body.section ?? null;
      if (!hasSectionAccess(section, userSections)) {
        throw new ForbiddenException('无权在当前板块创建栏目');
      }
    }
    const rows = await this.db
      .insert(demandCategory)
      .values({
        name: body.name,
        description: body.description ?? '',
        departments: body.departments ?? [],
        section: body.section ?? null,
        formFields: body.formFields ?? null,
      })
      .returning({ id: demandCategory.id });
    return { id: rows[0].id };
  }

  async update(
    id: string,
    body: UpdateDemandCategoryRequest,
    userSections: string[] | null = null,
  ): Promise<{ id: string }> {
    const existing = await this.db
      .select({ id: demandCategory.id, section: demandCategory.section })
      .from(demandCategory)
      .where(eq(demandCategory.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('栏目不存在');
    }

    if (userSections !== null) {
      if (!hasSectionAccess(existing[0].section ?? null, userSections)) {
        throw new ForbiddenException('无权管理当前板块的栏目');
      }
    }

    const patch: {
      name?: string;
      description?: string;
      enabled?: boolean;
      departments?: string[];
      section?: string | null;
      formFields?: FormFieldDefinition[] | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.enabled !== undefined) patch.enabled = body.enabled;
    if (body.departments !== undefined) patch.departments = body.departments;
    if (body.section !== undefined) patch.section = body.section;
    if (body.formFields !== undefined) patch.formFields = body.formFields;

    await this.db
      .update(demandCategory)
      .set(patch)
      .where(eq(demandCategory.id, id));

    return { id };
  }

  async getBoardAdmins(): Promise<BoardAdmins> {
    const sectionToRoles = new Map<string, string[]>();
    for (const [role, section] of Object.entries(SECTION_ADMIN_ROLES)) {
      const existing = sectionToRoles.get(section) ?? [];
      sectionToRoles.set(section, [...existing, role]);
    }

    const result: BoardAdmins = {};
    for (const { name: sectionName } of BOARD_SECTIONS) {
      const roles = sectionToRoles.get(sectionName) ?? [];
      const userIds = new Set<string>();
      for (const role of roles) {
        try {
          const res = await this.authzSDK.members.list(role, { type: 'User' });
          for (const u of res.members.userList ?? []) {
            if (u.userID) userIds.add(u.userID);
          }
        } catch (err) {
          this.logger.error(
            `Failed to list members for role ${role}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      result[sectionName] = Array.from(userIds);
    }
    return result;
  }
}
