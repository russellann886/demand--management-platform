import type { SourceDemandItem, MergedDemand, FileAttachment, DemandValueType, CustomFields } from '@shared/api.interface';
import { scoreRawDemand, scoreMergedRow } from './demand-scoring';

export interface DemandExtraDisplay {
  valueType: DemandValueType | null;
  gmvLevel: string | null;
  efficiencyAffected: string | null;
  efficiencySavedMinutes: string | null;
  expectedOnlineTime: string | null;
  demandType: string | null;
  isBlocking: boolean | null;
  priority: string | null;
  plannedSchedule: string | null;
}

export interface ResolvedSource extends DemandExtraDisplay {
  demandId: string;
  title: string;
  department: string;
  creator: string | null;
  submitterName: string | null;
  background: string;
  exists: boolean;
  createdAt: string;
  customFields: CustomFields;
}

export interface UnifiedRow extends DemandExtraDisplay {
  key: string;
  type: 'raw' | 'merged';
  id: string;
  title: string;
  background: string;
  image: FileAttachment | null;
  department: string;
  creator: string | null;
  submitterName: string | null;
  updatedAt: string;
  status: string;
  assignee: string | null;
  followUpFeedback: string | null;
  manualScore: number | null;
  customFields: CustomFields;
  sources?: ResolvedSource[];
}

export function buildUnifiedRows(
  merged: MergedDemand[],
  raw: SourceDemandItem[],
): UnifiedRow[] {
  const demandMap = new Map<string, SourceDemandItem>();
  for (const item of raw) {
    demandMap.set(item.id, item);
  }

  const mergedDemandIds = new Set<string>();
  for (const m of merged) {
    for (const s of m.sources) {
      mergedDemandIds.add(s.demandId);
    }
  }

  const mergedRows: UnifiedRow[] = merged.map((m) => ({
    key: `merged-${m.id}`,
    type: 'merged',
    id: m.id,
    title: m.title,
    background: '',
    image: null,
    department: '—',
    creator: null,
    submitterName: null,
    updatedAt: m.updatedAt,
    status: m.status,
    assignee: m.assignee,
    followUpFeedback: m.followUpFeedback,
    manualScore: m.manualScore,
    valueType: null,
    gmvLevel: null,
    efficiencyAffected: null,
    efficiencySavedMinutes: null,
    expectedOnlineTime: null,
    demandType: null,
    isBlocking: null,
    priority: null,
    plannedSchedule: m.plannedSchedule,
    customFields: null,
    sources: m.sources.map((s) => {
      const detail = demandMap.get(s.demandId);
      return {
        demandId: s.demandId,
        title: detail?.title ?? s.title,
        department: detail?.department ?? '',
        creator: detail?.creator ?? '',
        submitterName: detail?.submitterName ?? null,
        background: detail?.background ?? '',
        exists: Boolean(detail),
        createdAt: detail?.createdAt ?? '',
        customFields: detail?.customFields ?? null,
        valueType: detail?.valueType ?? null,
        gmvLevel: detail?.gmvLevel ?? null,
        efficiencyAffected: detail?.efficiencyAffected ?? null,
        efficiencySavedMinutes: detail?.efficiencySavedMinutes ?? null,
        expectedOnlineTime: detail?.expectedOnlineTime ?? null,
        demandType: detail?.demandType ?? null,
        isBlocking: detail?.isBlocking ?? null,
        priority: detail?.priority ?? null,
        plannedSchedule: detail?.plannedSchedule ?? null,
      };
    }),
  }));

  const rawRows: UnifiedRow[] = raw
    .filter((item) => !mergedDemandIds.has(item.id))
    .map((item) => ({
      key: `raw-${item.id}`,
      type: 'raw',
      id: item.id,
      title: item.title,
      background: item.background || '',
      image: item.image,
      department: item.department || '',
      creator: item.creator,
      submitterName: item.submitterName,
      updatedAt: item.createdAt || '',
      status: item.status || '待处理',
      assignee: item.assignee,
      followUpFeedback: item.followUpFeedback,
      manualScore: item.manualScore,
      valueType: item.valueType,
      gmvLevel: item.gmvLevel,
      efficiencyAffected: item.efficiencyAffected,
      efficiencySavedMinutes: item.efficiencySavedMinutes,
      expectedOnlineTime: item.expectedOnlineTime,
      demandType: item.demandType,
      isBlocking: item.isBlocking,
      priority: item.priority,
      plannedSchedule: item.plannedSchedule,
      customFields: item.customFields ?? null,
    }));

  const rowScore = (row: UnifiedRow): number =>
    row.type === 'merged'
      ? scoreMergedRow(row.sources ?? [])
      : scoreRawDemand(row, row.updatedAt);

  return [...mergedRows, ...rawRows].sort(
    (a, b) => getRowFinalScore(b, rowScore) - getRowFinalScore(a, rowScore),
  );
}

// 自动计算分（不含手动分）
export function computeAutoScore(row: UnifiedRow): number {
  return row.type === 'merged'
    ? scoreMergedRow(row.sources ?? [])
    : scoreRawDemand(row, row.updatedAt);
}

// 最终分：手动分优先，否则自动计算
export function getRowFinalScore(
  row: UnifiedRow,
  autoScore: (row: UnifiedRow) => number = computeAutoScore,
): number {
  return row.manualScore !== null && row.manualScore !== undefined
    ? row.manualScore
    : autoScore(row);
}

export function getMergedDemandIds(merged: MergedDemand[]): Set<string> {
  const set = new Set<string>();
  for (const m of merged) {
    for (const s of m.sources) {
      set.add(s.demandId);
    }
  }
  return set;
}
