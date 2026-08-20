import {
  Inject, Injectable, Logger,
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq } from 'drizzle-orm';
import { rule } from '../../database/schema';
import { canManageRuleSection } from '../../common/utils/section-auth';
import type {
  RuleType, RuleStatus, RuleListItem, RuleListResponse, Rule,
  CreateRuleRequest, UpdateRuleRequest, UpdateRuleStatusRequest,
  FileAttachment,
} from '@shared/api.interface';

type RuleRow = typeof rule.$inferSelect;
type SchemaFile = { bucket_id: string; file_path: string };

function toRuleItem(r: RuleRow): RuleListItem {
  return {
    id: r.id, name: r.name, type: r.type as RuleType,
    section: r.section ?? '', content: r.content, reason: r.reason,
    file: r.file ? { bucketId: r.file.bucket_id, filePath: r.file.file_path } : null,
    effectiveTime: r.effectiveTime ? r.effectiveTime.toISOString() : null,
    scope: r.scope, status: r.status as RuleStatus,
    creator: r.creator ?? '', reviewer: r.reviewer,
    reviewFeedback: r.reviewFeedback,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

function toSchemaFile(f: FileAttachment | null | undefined): SchemaFile | null {
  return f ? { bucket_id: f.bucketId, file_path: f.filePath } : null;
}

@Injectable()
export class RuleService {
  private readonly logger = new Logger(RuleService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: {
    section?: string; type?: string; status?: string;
    creatorId?: string; page: number; pageSize: number;
  }): Promise<RuleListResponse> {
    const { section, type, status, creatorId, page, pageSize } = params;
    const conditions = [];
    if (section) conditions.push(eq(rule.section, section));
    if (type) conditions.push(eq(rule.type, type));
    if (status) conditions.push(eq(rule.status, status));
    if (creatorId) conditions.push(eq(rule.creator, creatorId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await this.db.select().from(rule).where(whereClause)
      .orderBy(desc(rule.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
    const totalRows = await this.db.select({ count: count() })
      .from(rule).where(whereClause);
    return {
      items: rows.map((r: RuleRow) => toRuleItem(r)),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  async detail(id: string): Promise<Rule> {
    const rows = await this.db.select().from(rule).where(eq(rule.id, id)).limit(1);
    if (rows.length === 0) throw new NotFoundException('规则不存在');
    return toRuleItem(rows[0]);
  }

  async create(
    body: CreateRuleRequest, userId: string, roles: string[] | undefined,
  ): Promise<{ id: string }> {
    if (body.type === '规则' && !canManageRuleSection(body.section, roles)) {
      throw new ForbiddenException('无权创建规则');
    }
    const status: RuleStatus = body.type === '规则' ? '已通过' : '待审批';
    const rows = await this.db.insert(rule).values({
      name: body.name, type: body.type, content: body.content,
      reason: body.reason ?? null,
      effectiveTime: body.effectiveTime ? new Date(body.effectiveTime) : null,
      scope: body.scope ?? null, status, creator: userId || null,
      section: body.section, file: toSchemaFile(body.file),
    }).returning({ id: rule.id });
    this.logger.log(`Rule created: ${rows[0].id} by ${userId}`);
    return { id: rows[0].id };
  }

  async update(
    id: string, body: UpdateRuleRequest, roles: string[] | undefined,
  ): Promise<{ id: string }> {
    const existing = await this.checkRuleExists(id, roles, '规则');
    const patch: {
      name?: string; content?: string; file?: SchemaFile | null;
      effectiveTime?: Date | null; scope?: string | null; updatedAt: Date;
    } = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.content !== undefined) patch.content = body.content;
    if (body.file !== undefined) patch.file = toSchemaFile(body.file);
    if (body.effectiveTime !== undefined) {
      patch.effectiveTime = body.effectiveTime ? new Date(body.effectiveTime) : null;
    }
    if (body.scope !== undefined) patch.scope = body.scope;
    const updated = await this.db.update(rule).set(patch)
      .where(eq(rule.id, id)).returning({ id: rule.id });
    if (updated.length === 0) throw new NotFoundException('规则不存在');
    return { id: existing.id };
  }

  async delete(id: string, roles: string[] | undefined): Promise<{ id: string }> {
    const existing = await this.checkRuleExists(id, roles, '规则');
    const deleted = await this.db.delete(rule).where(eq(rule.id, id))
      .returning({ id: rule.id });
    if (deleted.length === 0) throw new NotFoundException('规则不存在');
    return { id: existing.id };
  }

  async updateStatus(
    id: string, body: UpdateRuleStatusRequest,
    userId: string, roles: string[] | undefined,
  ): Promise<{ id: string }> {
    const existing = await this.checkRuleExists(id, roles, 'apply');
    const updated = await this.db.update(rule).set({
      status: body.status, reviewer: userId || null,
      reviewFeedback: body.reviewFeedback ?? null,
      reviewedAt: new Date(), updatedAt: new Date(),
    }).where(eq(rule.id, id)).returning({ id: rule.id });
    if (updated.length === 0) throw new NotFoundException('规则不存在');
    this.logger.log(`Rule ${id} reviewed: ${body.status} by ${userId}`);
    return { id: existing.id };
  }

  private async checkRuleExists(
    id: string, roles: string[] | undefined, mode: '规则' | 'apply',
  ): Promise<{ id: string }> {
    const rows = await this.db.select({
      id: rule.id, type: rule.type, section: rule.section, status: rule.status,
    }).from(rule).where(eq(rule.id, id)).limit(1);
    if (rows.length === 0) throw new NotFoundException('规则不存在');
    const r = rows[0];
    if (mode === '规则') {
      if (r.type !== '规则') throw new BadRequestException('仅规则类型可编辑');
    } else {
      if (r.type === '规则') throw new BadRequestException('规则类型无需审批');
      if (r.status !== '待审批') throw new BadRequestException('该规则已审批');
    }
    if (!canManageRuleSection(r.section ?? '', roles)) {
      throw new ForbiddenException('无权管理当前板块的规则');
    }
    return { id: r.id };
  }
}
