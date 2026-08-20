import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { mergedDemand, mergedDemandSource, demand, demandCategory } from '../../database/schema';
import { hasSectionAccess } from '../../common/utils/section-auth';
import { DemandService } from '../demand/demand.service';
import type {
  AddMergedSourcesRequest,
  CreateMergedDemandRequest,
  MergedDemand,
  MergedDemandListResponse,
  MergedDemandSourceItem,
  ReleaseSourceResponse,
  SourceDemandListResponse,
  UpdateMergedDemandRequest,
} from '@shared/api.interface';

@Injectable()
export class MergedDemandService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly demandService: DemandService,
  ) {}

  async listSourceDemands(
    categoryId: string,
    userSections: string[] | null = null,
  ): Promise<SourceDemandListResponse> {
    await this.assertCategoryAccess(categoryId, userSections);
    const items = await this.demandService.listAllForMerge(categoryId);
    return { items };
  }

  async list(
    categoryId: string,
    userSections: string[] | null = null,
  ): Promise<MergedDemandListResponse> {
    await this.assertCategoryAccess(categoryId, userSections);
    const mains = await this.db
      .select({
        id: mergedDemand.id,
        title: mergedDemand.title,
        reason: mergedDemand.reason,
        status: mergedDemand.status,
        assignee: mergedDemand.assignee,
        followUpFeedback: mergedDemand.followUpFeedback,
        manualScore: mergedDemand.manualScore,
        plannedSchedule: mergedDemand.plannedSchedule,
        createdAt: mergedDemand.createdAt,
        updatedAt: mergedDemand.updatedAt,
      })
      .from(mergedDemand)
      .where(eq(mergedDemand.categoryId, categoryId))
      .orderBy(desc(mergedDemand.createdAt));

    if (mains.length === 0) return { items: [] };

    const mergedIds = mains.map((m) => m.id);
    const sourceRows = await this.db
      .select({
        mergedDemandId: mergedDemandSource.mergedDemandId,
        demandId: mergedDemandSource.demandId,
      })
      .from(mergedDemandSource)
      .where(inArray(mergedDemandSource.mergedDemandId, mergedIds));

    const allDemandIds = Array.from(
      new Set(sourceRows.map((s) => s.demandId)),
    );
    const titleMap = await this.demandService.getTitleMap(allDemandIds);

    const sourceMap = new Map<string, MergedDemandSourceItem[]>();
    for (const row of sourceRows) {
      const list = sourceMap.get(row.mergedDemandId) ?? [];
      list.push({
        demandId: row.demandId,
        title: titleMap.get(row.demandId) ?? '（原需求已删除）',
      });
      sourceMap.set(row.mergedDemandId, list);
    }

    const items: MergedDemand[] = mains.map((m) => ({
      id: m.id,
      title: m.title,
      reason: m.reason,
      status: m.status,
      assignee: m.assignee ?? null,
      followUpFeedback: m.followUpFeedback,
      manualScore: m.manualScore ?? null,
      plannedSchedule: m.plannedSchedule ? m.plannedSchedule.toISOString() : null,
      sources: sourceMap.get(m.id) ?? [],
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return { items };
  }

  async create(
    body: CreateMergedDemandRequest,
    userSections: string[] | null = null,
  ): Promise<{ id: string }> {
    await this.assertCategoryAccess(body.categoryId, userSections);
    const rows = await this.db
      .insert(mergedDemand)
      .values({
        categoryId: body.categoryId,
        title: body.title,
        reason: body.reason,
      })
      .returning({ id: mergedDemand.id });
    const id = rows[0].id;
    await this.insertSources(id, body.demandIds);
    return { id };
  }

  async update(
    id: string,
    body: UpdateMergedDemandRequest,
    userSections: string[] | null = null,
  ): Promise<{ id: string }> {
    const exists = await this.db
      .select({ id: mergedDemand.id })
      .from(mergedDemand)
      .where(eq(mergedDemand.id, id))
      .limit(1);
    if (exists.length === 0) {
      throw new NotFoundException('整合需求不存在');
    }
    await this.assertMergedDemandAccess(id, userSections);

    const updateData: { title?: string; reason?: string; updatedAt: Date; status?: string; assignee?: ReturnType<typeof sql> | null; followUpFeedback?: string | null; manualScore?: number | null; plannedSchedule?: Date | null } = {
      updatedAt: new Date(),
    };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignee !== undefined) {
      updateData.assignee = body.assignee ? sql`ROW(${body.assignee})::user_profile` : null;
      if (body.assignee === null) {
        updateData.status = '待处理';
      }
    }
    if (body.followUpFeedback !== undefined) updateData.followUpFeedback = body.followUpFeedback;
    if (body.manualScore !== undefined) updateData.manualScore = body.manualScore;
    if (body.plannedSchedule !== undefined) {
      updateData.plannedSchedule = body.plannedSchedule
        ? new Date(body.plannedSchedule)
        : null;
    }
    await this.db.update(mergedDemand).set(updateData).where(eq(mergedDemand.id, id));

    if (body.demandIds !== undefined && body.demandIds.length > 0) {
      await this.db
        .delete(mergedDemandSource)
        .where(eq(mergedDemandSource.mergedDemandId, id));
      await this.insertSources(id, body.demandIds);
    }

    return { id };
  }

  async remove(
    id: string,
    userSections: string[] | null = null,
  ): Promise<{ id: string }> {
    const exists = await this.db
      .select({ id: mergedDemand.id })
      .from(mergedDemand)
      .where(eq(mergedDemand.id, id))
      .limit(1);
    if (exists.length === 0) {
      throw new NotFoundException('整合需求不存在');
    }
    await this.assertMergedDemandAccess(id, userSections);
    await this.db
      .delete(mergedDemandSource)
      .where(eq(mergedDemandSource.mergedDemandId, id));
    await this.db.delete(mergedDemand).where(eq(mergedDemand.id, id));
    return { id };
  }

  async addSources(
    id: string,
    body: AddMergedSourcesRequest,
    userSections: string[] | null = null,
  ): Promise<{ id: string }> {
    const exists = await this.db
      .select({ id: mergedDemand.id })
      .from(mergedDemand)
      .where(eq(mergedDemand.id, id))
      .limit(1);
    if (exists.length === 0) {
      throw new NotFoundException('整合需求不存在');
    }
    await this.assertMergedDemandAccess(id, userSections);

    const existingRows = await this.db
      .select({ demandId: mergedDemandSource.demandId })
      .from(mergedDemandSource)
      .where(eq(mergedDemandSource.mergedDemandId, id));
    const existingIds = new Set(existingRows.map((r) => r.demandId));

    const newIds = Array.from(new Set(body.demandIds))
      .filter(Boolean)
      .filter((demandId) => !existingIds.has(demandId));

    if (newIds.length > 0) {
      await this.insertSources(id, newIds);
      await this.db
        .update(mergedDemand)
        .set({ updatedAt: new Date() })
        .where(eq(mergedDemand.id, id));
    }

    return { id };
  }

  async removeSource(
    id: string,
    demandId: string,
    userSections: string[] | null = null,
  ): Promise<ReleaseSourceResponse> {
    const exists = await this.db
      .select({ id: mergedDemand.id })
      .from(mergedDemand)
      .where(eq(mergedDemand.id, id))
      .limit(1);
    if (exists.length === 0) {
      throw new NotFoundException('整合需求不存在');
    }
    await this.assertMergedDemandAccess(id, userSections);

    await this.db
      .delete(mergedDemandSource)
      .where(
        and(
          eq(mergedDemandSource.mergedDemandId, id),
          eq(mergedDemandSource.demandId, demandId),
        ),
      );

    const remaining = await this.db
      .select({ value: count() })
      .from(mergedDemandSource)
      .where(eq(mergedDemandSource.mergedDemandId, id));
    const remainingCount = Number(remaining[0]?.value ?? 0);

    if (remainingCount < 2) {
      await this.db
        .delete(mergedDemandSource)
        .where(eq(mergedDemandSource.mergedDemandId, id));
      await this.db.delete(mergedDemand).where(eq(mergedDemand.id, id));
      return { id, dissolved: true };
    }

    return { id, dissolved: false };
  }

  async getNotifyInfo(
    mergedDemandId: string,
  ): Promise<{ title: string; assignee: string | null; plannedSchedule: string | null } | null> {
    const rows = await this.db
      .select({
        title: mergedDemand.title,
        assignee: mergedDemand.assignee,
        plannedSchedule: mergedDemand.plannedSchedule,
      })
      .from(mergedDemand)
      .where(eq(mergedDemand.id, mergedDemandId))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      title: row.title,
      assignee: row.assignee
        ? (row.assignee as unknown as { user_id: string }).user_id
        : null,
      plannedSchedule: row.plannedSchedule
        ? row.plannedSchedule.toISOString()
        : null,
    };
  }

  async getSourceCreators(mergedDemandId: string): Promise<string[]> {
    const sourceRows = await this.db
      .select({ demandId: mergedDemandSource.demandId })
      .from(mergedDemandSource)
      .where(eq(mergedDemandSource.mergedDemandId, mergedDemandId));
    const demandIds = Array.from(new Set(sourceRows.map((r) => r.demandId)));
    if (demandIds.length === 0) return [];

    const creatorRows = await this.db
      .select({ creator: demand.creator })
      .from(demand)
      .where(inArray(demand.id, demandIds));
    return Array.from(
      new Set(
        creatorRows
          .map((r) => r.creator)
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      ),
    );
  }

  private async assertCategoryAccess(
    categoryId: string,
    userSections: string[] | null,
  ): Promise<void> {
    if (userSections === null) return;
    const rows = await this.db
      .select({ section: demandCategory.section })
      .from(demandCategory)
      .where(eq(demandCategory.id, categoryId))
      .limit(1);
    if (rows.length === 0) return;
    if (!hasSectionAccess(rows[0].section ?? null, userSections)) {
      throw new ForbiddenException('无权操作当前板块的整合需求');
    }
  }

  private async assertMergedDemandAccess(
    mergedDemandId: string,
    userSections: string[] | null,
  ): Promise<void> {
    if (userSections === null) return;
    const rows = await this.db
      .select({ categoryId: mergedDemand.categoryId })
      .from(mergedDemand)
      .where(eq(mergedDemand.id, mergedDemandId))
      .limit(1);
    if (rows.length === 0) return;
    await this.assertCategoryAccess(rows[0].categoryId, userSections);
  }

  private async insertSources(
    mergedDemandId: string,
    demandIds: string[],
  ): Promise<void> {
    const uniqueIds = Array.from(new Set(demandIds)).filter(Boolean);
    if (uniqueIds.length === 0) return;
    await this.db
      .insert(mergedDemandSource)
      .values(uniqueIds.map((demandId) => ({ mergedDemandId, demandId })));
  }
}
