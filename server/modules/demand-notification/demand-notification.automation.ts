import { Inject, Logger } from '@nestjs/common';
import {
  Automation,
  BindTrigger,
  AuthorizationSDK,
  CapabilityService,
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import dayjs from 'dayjs';

import { demandCategory } from '../../database/schema';
import { DemandService } from '../demand/demand.service';
import { MergedDemandService } from '../merged-demand/merged-demand.service';
import type { SourceDemandItem, MergedDemand } from '@shared/api.interface';
import type {
  DemandSubmitFeishuNotifyOneInput,
} from '@shared/plugin-types';

interface TaskHandlerArgs {
  attributes: {
    trigger: string;
    triggerID?: string;
    triggerType: 'record_change' | 'cron' | 'webhook';
    instanceID: string;
    startAt?: number;
  };
  content: {
    input: string | Record<string, unknown>;
  };
}

interface DataChangeEventInput {
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  after?: Record<string, unknown>;
  before?: Record<string, unknown>;
}

type AnyRecord = Record<string, unknown>;

const ADMIN_ROLE = 'demand_admin';
const MERGE_ANALYZER = 'demand_merge_analyzer';
const FEISHU_NOTIFY = 'demand_submit_feishu_notify_1';
const FOLLOWUP_NOTIFY = 'demand_follow_feishu_notify_1';
const FOLLOWUP_STATUS = '跟进中';

@Automation()
export class DemandNotificationAutomationService {
  private readonly logger = new Logger(DemandNotificationAutomationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject() private readonly capabilityService: CapabilityService,
    private readonly authzSDK: AuthorizationSDK,
    private readonly demandService: DemandService,
    private readonly mergedDemandService: MergedDemandService,
  ) {}

  @BindTrigger('demand_created_notify')
  async handleDemandCreated(event: TaskHandlerArgs): Promise<void> {
    const eventData = this.parseChangeEvent(event);
    if (!eventData || eventData.type !== 'INSERT' || !eventData.after) {
      return;
    }

    const record = eventData.after;
    const demandId = String(record.id ?? '');
    const categoryId = String(record.category_id ?? '');
    if (!demandId || !categoryId) {
      this.logger.error('新需求缺少 id 或 category_id');
      return;
    }

    this.logger.log(
      `handleDemandCreated 触发: demandId=${demandId}, categoryId=${categoryId}`,
    );
    await this.processNewDemand(demandId, categoryId);
  }

  async processNewDemand(demandId: string, categoryId: string): Promise<void> {
    try {
      const detail = await this.demandService.detail(demandId);
      const categoryName = await this.getCategoryName(categoryId);

      const allSources =
        await this.demandService.listAllForMerge(categoryId);
      const otherDemands = allSources.filter((d) => d.id !== demandId);
      const mergedResp = await this.mergedDemandService.list(categoryId);

      const aiConclusion = await this.analyzeMergeability(
        { title: detail.title, background: detail.background },
        otherDemands,
        mergedResp.items,
      );

      this.logger.log(`AI 合并分析完成: demandId=${demandId}`);

      const receivers = await this.getAdminUserIds();
      this.logger.log(
        `查询 demand_admin 成员完成: 接收人数=${receivers.length}, receivers=${JSON.stringify(receivers)}`,
      );
      if (receivers.length === 0) {
        this.logger.warn('无 demand_admin 成员，跳过飞书通知发送');
        return;
      }

      const content = this.buildContent(
        categoryName,
        detail.title,
        detail.department,
        detail.creator,
        aiConclusion,
      );
      const linkUrl = this.buildLinkUrl(categoryId);

      await this.sendNotification({
        receiverUserList: receivers,
        title: `【${categoryName}】收到新需求`,
        content,
        linkUrl,
      });
      this.logger.log(
        `新需求通知已发送: demandId=${demandId}, 接收人数=${receivers.length}`,
      );
    } catch (error) {
      this.logger.error(
        `处理新需求通知失败: demandId=${demandId}, error=${
          error instanceof Error ? error.stack ?? error.message : 'unknown'
        }`,
      );
    }
  }

  @BindTrigger('demand_status_followup_notify')
  async handleDemandStatusChanged(event: TaskHandlerArgs): Promise<void> {
    const eventData = this.parseChangeEvent(event);
    if (!eventData || eventData.type !== 'UPDATE' || !eventData.after) {
      return;
    }
    const after = eventData.after;
    this.logger.log(
      `handleDemandStatusChanged 触发: id=${String(after.id ?? '')}, status=${String(after.status ?? '')}`,
    );
    if (String(after.status ?? '') !== FOLLOWUP_STATUS) {
      return;
    }

    const demandId = String(after.id ?? '');
    if (!demandId) {
      this.logger.error('状态变更事件缺少 demand id');
      return;
    }

    try {
      const detail = await this.demandService.detail(demandId);
      if (!detail.creator) {
        this.logger.warn(`需求 ${demandId} 无创建者，跳过跟进通知`);
        return;
      }
      await this.sendNotification(
        {
          receiverUserList: [detail.creator],
          title: '需求跟进通知',
          content: this.buildFollowupContent(
            detail.title,
            detail.assignee,
            detail.plannedSchedule,
          ),
          linkUrl: this.buildMyDemandsUrl(),
        },
        FOLLOWUP_NOTIFY,
      );
      this.logger.log(`原始需求跟进通知已发送: demandId=${demandId}`);
    } catch (error) {
      this.logger.error(
        `原始需求跟进通知失败: demandId=${demandId}, error=${
          error instanceof Error ? error.stack ?? error.message : 'unknown'
        }`,
      );
    }
  }

  @BindTrigger('merged_demand_status_followup_notify')
  async handleMergedDemandStatusChanged(
    event: TaskHandlerArgs,
  ): Promise<void> {
    const eventData = this.parseChangeEvent(event);
    if (!eventData || eventData.type !== 'UPDATE' || !eventData.after) {
      return;
    }
    const after = eventData.after;
    this.logger.log(
      `handleMergedDemandStatusChanged 触发: id=${String(after.id ?? '')}, status=${String(after.status ?? '')}`,
    );
    if (String(after.status ?? '') !== FOLLOWUP_STATUS) {
      return;
    }

    const mergedId = String(after.id ?? '');
    if (!mergedId) {
      this.logger.error('状态变更事件缺少 merged_demand id');
      return;
    }

    try {
      const creators =
        await this.mergedDemandService.getSourceCreators(mergedId);
      if (creators.length === 0) {
        this.logger.warn(
          `整合需求 ${mergedId} 无可通知的原始需求创建者，跳过跟进通知`,
        );
        return;
      }
      const notifyInfo =
        await this.mergedDemandService.getNotifyInfo(mergedId);
      const title = notifyInfo?.title ?? String(after.title ?? '');
      await this.sendNotification(
        {
          receiverUserList: creators,
          title: '需求跟进通知',
          content: this.buildFollowupContent(
            title,
            notifyInfo?.assignee ?? null,
            notifyInfo?.plannedSchedule ?? null,
          ),
          linkUrl: this.buildMyDemandsUrl(),
        },
        FOLLOWUP_NOTIFY,
      );
      this.logger.log(
        `整合需求跟进通知已发送: mergedId=${mergedId}, 接收人数=${creators.length}`,
      );
    } catch (error) {
      this.logger.error(
        `整合需求跟进通知失败: mergedId=${mergedId}, error=${
          error instanceof Error ? error.stack ?? error.message : 'unknown'
        }`,
      );
    }
  }

  private parseChangeEvent(
    event: TaskHandlerArgs,
  ): DataChangeEventInput | null {
    const raw: unknown = event.content?.input;
    if (raw === undefined || raw === null) {
      this.logger.error('input 为空');
      return null;
    }

    let outer: AnyRecord;
    try {
      outer = (typeof raw === 'string' ? JSON.parse(raw) : raw) as AnyRecord;
    } catch (error) {
      this.logger.error(
        `input JSON 解析失败: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }

    // 平台 record_change 触发器的真实变更数据嵌套在 parameter 字段中
    // （parameter 本身可能是 JSON 字符串）；兼容无嵌套的历史结构
    const parameter = outer.parameter;
    if (parameter === undefined || parameter === null) {
      return outer as unknown as DataChangeEventInput;
    }
    try {
      const payload =
        typeof parameter === 'string' ? JSON.parse(parameter) : parameter;
      return payload as DataChangeEventInput;
    } catch (error) {
      this.logger.error(
        `parameter JSON 解析失败: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private buildFollowupContent(
    title: string,
    assignee: string | null,
    plannedSchedule: string | null,
  ): string {
    const scheduleText = plannedSchedule
      ? dayjs(plannedSchedule).format('YYYY-MM-DD')
      : '未排期';
    const assigneeLine = assignee
      ? `**负责人**：<person id="${assignee}">`
      : '**负责人**：未指定';
    return [
      '**您的需求正在跟进中**',
      '',
      `**需求标题**：${title || '未命名需求'}`,
      assigneeLine,
      `**预计排期**：${scheduleText}`,
      '',
      '相关同学正在处理，如有进展会同步给您。',
    ].join('\n');
  }

  private async getCategoryName(categoryId: string): Promise<string> {
    const rows = await this.db
      .select({ name: demandCategory.name })
      .from(demandCategory)
      .where(eq(demandCategory.id, categoryId))
      .limit(1);
    return rows[0]?.name ?? '未知栏目';
  }

  private async analyzeMergeability(
    newDemand: { title: string; background: string },
    existingDemands: SourceDemandItem[],
    mergedDemands: MergedDemand[],
  ): Promise<string> {
    if (existingDemands.length === 0 && mergedDemands.length === 0) {
      return '该栏目暂无其他需求，无可合并项。';
    }

    const prompt = this.buildPrompt(newDemand, existingDemands, mergedDemands);

    try {
      const streamResult = await this.capabilityService
        .load(MERGE_ANALYZER)
        .callStream('textGenerate', { prompt });
      const stream = this.normalizeStream(streamResult);

      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.content;
        if (typeof delta === 'string') {
          full += delta;
        }
      }
      const result = full.trim();
      return result.length > 0 ? result : 'AI 未返回分析结论，请人工查看。';
    } catch (error) {
      this.logger.error(
        `AI 合并分析失败: pluginInstanceId=${MERGE_ANALYZER}, actionKey=textGenerate, outputMode=stream, error=${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return 'AI 分析暂不可用，请人工查看是否可合并。';
    }
  }

  private buildPrompt(
    newDemand: { title: string; background: string },
    existingDemands: SourceDemandItem[],
    mergedDemands: MergedDemand[],
  ): string {
    const stripHtml = (html: string): string =>
      html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);

    const newDemandJson = {
      title: newDemand.title,
      background: stripHtml(newDemand.background),
    };
    const existingJson = existingDemands.map((d) => ({
      title: d.title,
      background: stripHtml(d.background),
    }));
    const mergedJson = mergedDemands.map((m) => ({
      title: m.title,
      reason: m.reason,
      includes: m.sources.map((s) => s.title),
    }));

    return [
      '你是企业需求管理助手。下面提供一条「新提交的需求」，以及同栏目下已存在的「原始需求列表」和「已整合需求列表」。',
      '请判断这条新需求是否可以与其中某条原始需求或某条整合需求进行合并（即主题/目标高度相似、可归为同一类）。',
      '',
      '输出要求（用简洁中文，控制在 120 字以内）：',
      '- 如果可以合并：明确指出建议与哪一条（给出其标题）合并，并用一句话说明理由。',
      '- 如果不可以合并：直接输出「暂无可合并项」并简述原因。',
      '- 不要输出 JSON，不要复述输入内容，只给结论。',
      '',
      `【新提交的需求】\n${JSON.stringify(newDemandJson, null, 2)}`,
      '',
      `【同栏目原始需求列表】\n${JSON.stringify(existingJson, null, 2)}`,
      '',
      `【同栏目已整合需求列表】\n${JSON.stringify(mergedJson, null, 2)}`,
    ].join('\n');
  }

  private buildContent(
    categoryName: string,
    title: string,
    department: string,
    creator: string,
    aiConclusion: string,
  ): string {
    return [
      `**栏目**：${categoryName}`,
      `**需求标题**：${title}`,
      `**提出部门**：${department || '未填写'}`,
      '',
      '**AI 合并建议**',
      aiConclusion,
      '',
      '如需合并，请点击下方按钮进入需求整合页处理。',
    ].join('\n');
  }

  private buildLinkUrl(categoryId: string): string {
    const domain = (
      process.env.FORCE_FRAMEWORK_DOMAIN_MAIN ?? ''
    ).replace(/\/$/, '');
    const basePath = (process.env.CLIENT_BASE_PATH ?? '/').replace(/\/$/, '');
    return `${domain}${basePath}/merged-demands/${categoryId}`;
  }

  private buildMyDemandsUrl(): string {
    const domain = (
      process.env.FORCE_FRAMEWORK_DOMAIN_MAIN ?? ''
    ).replace(/\/$/, '');
    const basePath = (process.env.CLIENT_BASE_PATH ?? '/').replace(/\/$/, '');
    return `${domain}${basePath}/my-demands`;
  }

  private async getAdminUserIds(): Promise<string[]> {
    const res = await this.authzSDK.members.list(ADMIN_ROLE, {
      type: 'User',
    });
    const userList = res.members.userList ?? [];
    this.logger.log(
      `authzSDK.members.list(${ADMIN_ROLE}) 原始返回成员数=${userList.length}`,
    );
    return userList
      .map((u) => u.userID)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  private async sendNotification(
    payload: DemandSubmitFeishuNotifyOneInput,
    pluginInstanceId: string = FEISHU_NOTIFY,
  ): Promise<void> {
    try {
      await this.capabilityService.load(pluginInstanceId).call(
        'send_feishu_message',
        payload,
      );
      this.logger.log(
        `飞书通知发送成功: pluginInstanceId=${pluginInstanceId}, receiverCount=${payload.receiverUserList.length}`,
      );
    } catch (error) {
      this.logger.error(
        `飞书通知发送失败: pluginInstanceId=${pluginInstanceId}, actionKey=send_feishu_message, outputMode=unary, receiverCount=${
          payload.receiverUserList.length
        }, error=${error instanceof Error ? error.stack ?? error.message : 'unknown'}`,
      );
    }
  }

  private normalizeStream(
    resultOrStream: unknown,
  ): AsyncIterable<AnyRecord> {
    if (this.isAsyncIterable(resultOrStream)) {
      return resultOrStream;
    }
    if (
      resultOrStream &&
      typeof resultOrStream === 'object' &&
      'output' in (resultOrStream as AnyRecord) &&
      this.isAsyncIterable((resultOrStream as AnyRecord).output)
    ) {
      return (resultOrStream as AnyRecord).output as AsyncIterable<AnyRecord>;
    }
    throw new Error('Invalid callStream result: cannot find AsyncIterable');
  }

  private isAsyncIterable(value: unknown): value is AsyncIterable<AnyRecord> {
    return (
      !!value &&
      typeof (value as Record<symbol, unknown>)[Symbol.asyncIterator] ===
        'function'
    );
  }
}
