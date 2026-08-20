import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';

import { demand, demandComment, demandCategory } from '../../database/schema';
import { hasSectionAccess } from '../../common/utils/section-auth';
import type {
  CreateCommentRequest,
  CreateDemandOpenApiRequest,
  CreateDemandRequest,
  DemandCommentListResponse,
  DemandDetail,
  DemandListItem,
  DemandListResponse,
  DemandValueType,
  CustomFields,
  FormFieldDefinition,
  MyDemandItem,
  MyDemandListResponse,
  SourceDemandItem,
} from '@shared/api.interface';

@Injectable()
export class DemandService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(
    categoryId: string,
    page: number,
    pageSize: number,
  ): Promise<DemandListResponse> {
    const demands = await this.db
      .select({
        id: demand.id,
        title: demand.title,
        department: demand.department,
        creator: demand.creator,
        submitterName: demand.submitterName,
        image: demand.image,
        createdAt: demand.createdAt,
      })
      .from(demand)
      .where(eq(demand.categoryId, categoryId))
      .orderBy(desc(demand.createdAt));

    const items: DemandListItem[] = demands.map((d) => ({
      id: d.id,
      title: d.title,
      department: d.department,
      creator: d.creator ?? '',
      submitterName: d.submitterName ?? null,
      image: d.image
        ? { bucketId: d.image.bucket_id, filePath: d.image.file_path }
        : null,
      createdAt: d.createdAt.toISOString(),
    }));

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { items: paged, total };
  }

  async listMine(userId: string): Promise<MyDemandListResponse> {
    if (!userId) return { items: [] };
    const rows = await this.db
      .select({
        id: demand.id,
        title: demand.title,
        department: demand.department,
        categoryId: demand.categoryId,
        section: demandCategory.section,
        status: demand.status,
        createdAt: demand.createdAt,
      })
      .from(demand)
      .leftJoin(demandCategory, eq(demand.categoryId, demandCategory.id))
      .where(eq(demand.creator, userId))
      .orderBy(desc(demand.createdAt));

    const items: MyDemandItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      department: r.department,
      categoryId: r.categoryId,
      section: r.section,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
    return { items };
  }

  async listAllForMerge(categoryId: string): Promise<SourceDemandItem[]> {
    const rows = await this.db
      .select({
        id: demand.id,
        title: demand.title,
        background: demand.background,
        department: demand.department,
        creator: demand.creator,
        image: demand.image,
        createdAt: demand.createdAt,
        status: demand.status,
        assignee: demand.assignee,
        followUpFeedback: demand.followUpFeedback,
        expectedValue: demand.expectedValue,
        gmvLevel: demand.gmvLevel,
        efficiencyAffected: demand.efficiencyAffected,
        efficiencySavedMinutes: demand.efficiencySavedMinutes,
        expectedOnlineTime: demand.expectedOnlineTime,
        demandType: demand.demandType,
        isBlocking: demand.isBlocking,
        priority: demand.priority,
        manualScore: demand.manualScore,
        plannedSchedule: demand.plannedSchedule,
        submitterName: demand.submitterName,
        customFields: demand.customFields,
      })
      .from(demand)
      .where(eq(demand.categoryId, categoryId))
      .orderBy(desc(demand.createdAt));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      background: r.background,
      department: r.department,
      creator: r.creator ?? '',
      submitterName: r.submitterName ?? null,
      image: r.image
        ? { bucketId: r.image.bucket_id, filePath: r.image.file_path }
        : null,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
      assignee: r.assignee ?? null,
      followUpFeedback: r.followUpFeedback,
      valueType: (r.expectedValue as DemandValueType | null) || null,
      gmvLevel: r.gmvLevel,
      efficiencyAffected: r.efficiencyAffected,
      efficiencySavedMinutes: r.efficiencySavedMinutes,
      expectedOnlineTime: r.expectedOnlineTime
        ? r.expectedOnlineTime.toISOString()
        : null,
      demandType: r.demandType,
      isBlocking: r.isBlocking,
      priority: r.priority,
      manualScore: r.manualScore ?? null,
      plannedSchedule: r.plannedSchedule ? r.plannedSchedule.toISOString() : null,
      customFields: (r.customFields as CustomFields) ?? null,
    }));
  }

  async getTitleMap(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: demand.id, title: demand.title })
      .from(demand)
      .where(inArray(demand.id, ids));
    return new Map(rows.map((r) => [r.id, r.title]));
  }

  async create(
    body: CreateDemandRequest,
    userId: string,
  ): Promise<{ id: string }> {
    const image: { bucket_id: string; file_path: string } | null = body.image
      ? { bucket_id: body.image.bucketId, file_path: body.image.filePath }
      : null;

    const rows = await this.db
      .insert(demand)
      .values({
        categoryId: body.categoryId,
        title: body.title,
        background: body.background ?? '',
        expectedValue: body.valueType ?? '',
        gmvLevel: body.gmvLevel,
        efficiencyAffected: body.efficiencyAffected,
        efficiencySavedMinutes: body.efficiencySavedMinutes,
        department: body.department ?? '',
        expectedOnlineTime: body.expectedOnlineTime
          ? new Date(body.expectedOnlineTime)
          : null,
        demandType: body.demandType,
        isBlocking: body.isBlocking,
        priority: body.priority,
        creator: userId,
        image,
        customFields: body.customFields ?? null,
      })
      .returning({ id: demand.id });
    return { id: rows[0].id };
  }

  async createExternal(
    body: CreateDemandOpenApiRequest,
  ): Promise<{ id: string }> {
    const categoryRows = await this.db
      .select({ id: demandCategory.id, enabled: demandCategory.enabled })
      .from(demandCategory)
      .where(eq(demandCategory.id, body.categoryId))
      .limit(1);
    if (categoryRows.length === 0 || !categoryRows[0].enabled) {
      throw new NotFoundException('需求栏目不存在或已停用');
    }
    const rows = await this.db
      .insert(demand)
      .values({
        categoryId: body.categoryId,
        title: body.title,
        background: body.background ?? '',
        expectedValue: body.valueType ?? '',
        gmvLevel: body.gmvLevel,
        efficiencyAffected: body.efficiencyAffected,
        efficiencySavedMinutes: body.efficiencySavedMinutes,
        department: body.department ?? '',
        expectedOnlineTime: body.expectedOnlineTime
          ? new Date(body.expectedOnlineTime)
          : null,
        demandType: body.demandType,
        isBlocking: body.isBlocking,
        priority: body.priority,
        creator: null,
        submitterName: body.submitterName ?? null,
        image: null,
      })
      .returning({ id: demand.id });
    return { id: rows[0].id };
  }

  async detail(id: string): Promise<DemandDetail> {
    const rows = await this.db
      .select()
      .from(demand)
      .where(eq(demand.id, id))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('需求不存在');
    }
    const d = rows[0];

    const catRows = await this.db
      .select({ formFields: demandCategory.formFields, section: demandCategory.section })
      .from(demandCategory)
      .where(eq(demandCategory.id, d.categoryId))
      .limit(1);

    return {
      id: d.id,
      title: d.title,
      background: d.background,
      department: d.department,
      creator: d.creator ?? '',
      submitterName: d.submitterName ?? null,
      assignee: d.assignee ?? null,
      image: d.image
        ? { bucketId: d.image.bucket_id, filePath: d.image.file_path }
        : null,
      createdAt: d.createdAt.toISOString(),
      valueType: (d.expectedValue as DemandValueType | null) || null,
      gmvLevel: d.gmvLevel,
      efficiencyAffected: d.efficiencyAffected,
      efficiencySavedMinutes: d.efficiencySavedMinutes,
      expectedOnlineTime: d.expectedOnlineTime
        ? d.expectedOnlineTime.toISOString()
        : null,
      demandType: d.demandType,
      isBlocking: d.isBlocking,
      priority: d.priority,
      plannedSchedule: d.plannedSchedule ? d.plannedSchedule.toISOString() : null,
      section: catRows[0]?.section ?? null,
      customFields: (d.customFields as CustomFields) ?? null,
      formFields: (catRows[0]?.formFields as FormFieldDefinition[] | null) ?? null,
    };
  }

  async listComments(
    id: string,
    page: number,
    pageSize: number,
  ): Promise<DemandCommentListResponse> {
    const totalRows = await this.db
      .select({ cnt: count() })
      .from(demandComment)
      .where(eq(demandComment.demandId, id));
    const total = Number(totalRows[0]?.cnt ?? 0);

    const rows = await this.db
      .select({
        id: demandComment.id,
        userId: demandComment.userId,
        content: demandComment.content,
        createdAt: demandComment.createdAt,
      })
      .from(demandComment)
      .where(eq(demandComment.demandId, id))
      .orderBy(desc(demandComment.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }

  async createComment(
    id: string,
    body: CreateCommentRequest,
    userId: string,
  ): Promise<{ id: string }> {
    const rows = await this.db
      .insert(demandComment)
      .values({
        demandId: id,
        userId,
        content: body.content,
      })
      .returning({ id: demandComment.id });
    return { id: rows[0].id };
  }

  async updateStatus(
    id: string,
    status: string,
    plannedSchedule?: string | null,
  ): Promise<void> {
    const updateData: { status: string; plannedSchedule?: Date | null } = {
      status,
    };
    if (plannedSchedule !== undefined) {
      updateData.plannedSchedule = plannedSchedule
        ? new Date(plannedSchedule)
        : null;
    }
    await this.db.update(demand).set(updateData).where(eq(demand.id, id));
  }

  async updateManualScore(
    id: string,
    manualScore: number | null,
    userSections: string[] | null = null,
  ): Promise<void> {
    const exists = await this.db
      .select({ id: demand.id, categoryId: demand.categoryId })
      .from(demand)
      .where(eq(demand.id, id))
      .limit(1);
    if (exists.length === 0) {
      throw new NotFoundException('需求不存在');
    }
    if (userSections !== null) {
      const catRows = await this.db
        .select({ section: demandCategory.section })
        .from(demandCategory)
        .where(eq(demandCategory.id, exists[0].categoryId))
        .limit(1);
      if (!hasSectionAccess(catRows[0]?.section ?? null, userSections)) {
        throw new ForbiddenException('无权操作当前板块的需求');
      }
    }
    await this.db
      .update(demand)
      .set({ manualScore })
      .where(eq(demand.id, id));
  }

  async updateAssignee(
    id: string,
    assignee: string | null,
    userSections: string[] | null = null,
  ): Promise<void> {
    const exists = await this.db
      .select({ id: demand.id, categoryId: demand.categoryId })
      .from(demand)
      .where(eq(demand.id, id))
      .limit(1);
    if (exists.length === 0) {
      throw new NotFoundException('需求不存在');
    }
    if (userSections !== null) {
      const catRows = await this.db
        .select({ section: demandCategory.section })
        .from(demandCategory)
        .where(eq(demandCategory.id, exists[0].categoryId))
        .limit(1);
      if (!hasSectionAccess(catRows[0]?.section ?? null, userSections)) {
        throw new ForbiddenException('无权操作当前板块的需求');
      }
    }
    await this.db
      .update(demand)
      .set({
        assignee: assignee ? sql`ROW(${assignee})::user_profile` : null,
        ...(assignee === null ? { status: '待处理' } : {}),
        updatedAt: new Date(),
      })
      .where(eq(demand.id, id));
  }
}
