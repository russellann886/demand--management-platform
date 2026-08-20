import dayjs from 'dayjs';
import type { DemandExtraDisplay } from './unified-rows';

const GMV_SCORE: Record<string, number> = {
  '10万以下': 1,
  '10-50万': 2,
  '50-100万': 3,
  '100-500万': 4,
  '500万以上': 5,
};

const AFFECTED_SCORE: Record<string, number> = {
  '10人以下': 1,
  '10-50人': 2,
  '50-100人': 3,
  '100-500人': 4,
  '500人以上': 5,
};

const SAVED_MINUTES_SCORE: Record<string, number> = {
  '5分钟以下': 1,
  '5-15分钟': 2,
  '15-30分钟': 3,
  '30-60分钟': 4,
  '60分钟以上': 5,
};

const PRIORITY_SCORE: Record<string, number> = {
  P0紧急: 4,
  P1高: 3,
  P2中: 2,
  P3低: 1,
};

function scoreExpectedValue(fields: DemandExtraDisplay): number {
  if (fields.valueType === 'gmv') {
    return fields.gmvLevel ? (GMV_SCORE[fields.gmvLevel] ?? 0) : 0;
  }
  if (fields.valueType === 'efficiency') {
    const affected = fields.efficiencyAffected
      ? (AFFECTED_SCORE[fields.efficiencyAffected] ?? 0)
      : 0;
    const saved = fields.efficiencySavedMinutes
      ? (SAVED_MINUTES_SCORE[fields.efficiencySavedMinutes] ?? 0)
      : 0;
    return affected + saved;
  }
  return 0;
}

function scoreOnlineTime(
  expectedOnlineTime: string | null,
  submitTime: string | null,
): number {
  if (!expectedOnlineTime || !submitTime) return 0;
  const days = dayjs(expectedOnlineTime).diff(dayjs(submitTime), 'day');
  if (days <= 7) return 5;
  if (days <= 30) return 4;
  if (days <= 90) return 3;
  if (days <= 180) return 2;
  return 1;
}

function scoreBlocking(isBlocking: boolean | null): number {
  return isBlocking === true ? 3 : 0;
}

function scorePriority(priority: string | null): number {
  return priority ? (PRIORITY_SCORE[priority] ?? 0) : 0;
}

export function scoreRawDemand(
  fields: DemandExtraDisplay,
  submitTime: string | null,
): number {
  return (
    scoreExpectedValue(fields) +
    scoreOnlineTime(fields.expectedOnlineTime, submitTime) +
    scoreBlocking(fields.isBlocking) +
    scorePriority(fields.priority)
  );
}

export interface ScorableSource extends DemandExtraDisplay {
  createdAt: string;
}

export function scoreMergedRow(sources: ScorableSource[]): number {
  const n = sources.length;
  if (n === 0) return 0;
  const total = sources.reduce(
    (sum, s) => sum + scoreRawDemand(s, s.createdAt),
    0,
  );
  return total / n + n;
}

export type ScoreLevel = 'high' | 'mid' | 'low';

// 按分数降序排名生成百分位标签等级：
// 前 10%（至少 1 个，向下取整）为 high，前 20%（向下取整）为 mid，其余为 low
export function getPercentileLevels(count: number): ScoreLevel[] {
  if (count <= 0) return [];
  const redCount = Math.max(1, Math.floor(count * 0.1));
  const yellowCount = Math.floor(count * 0.2);
  const levels: ScoreLevel[] = [];
  for (let i = 0; i < count; i += 1) {
    if (i < redCount) {
      levels.push('high');
    } else if (i < yellowCount) {
      levels.push('mid');
    } else {
      levels.push('low');
    }
  }
  return levels;
}

export const SCORE_LEVEL_META: Record<ScoreLevel, { className: string }> = {
  high: {
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  mid: {
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  low: {
    className: 'bg-green-100 text-green-700 border-green-200',
  },
};
