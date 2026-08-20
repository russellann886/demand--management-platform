import { canManageSection } from '../auth/permissions';
import type { AuthUser } from '../auth/types';
import type { WorkerBindings } from '../db/types';
import { ApiError, requiredString } from '../http/request';
import { getDemandCategory } from '../repositories/demands';

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';
const MAX_DEMANDS = 100;
const MAX_FIELD_LENGTH = 500;
const MAX_PROMPT_LENGTH = 60_000;
const MAX_TITLE_LENGTH = 500;
const MAX_REASON_LENGTH = 4_000;
const OPENROUTER_TIMEOUT_MS = 30_000;

type MergeCandidate = {
  id: string;
  title: string;
  background: string;
  department: string;
};

export type MergeSuggestion = {
  title: string;
  reason: string;
  demandIds: string[];
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function getMergeSuggestions(
  env: WorkerBindings,
  user: AuthUser,
  body: Record<string, unknown>,
  fetcher: Fetcher = fetch,
): Promise<{ suggestions: MergeSuggestion[] }> {
  const categoryId = requiredString(body.categoryId, 'categoryId', 100);
  const category = await getDemandCategory(env.DB, categoryId);
  if (!category) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', '栏目不存在');
  }
  if (!canManageSection(user.roles, category.section)) {
    throw new ApiError(
      403,
      'SECTION_FORBIDDEN',
      '无权分析当前板块的需求',
    );
  }

  const candidates = await listUnmergedCandidates(env.DB, categoryId);
  if (candidates.length < 2) {
    throw new ApiError(
      400,
      'INSUFFICIENT_DEMANDS',
      '至少需要 2 条未整合需求才能进行 AI 分析',
    );
  }
  if (candidates.length > MAX_DEMANDS) {
    throw new ApiError(
      400,
      'AI_DEMAND_LIMIT_EXCEEDED',
      `单次 AI 分析最多支持 ${MAX_DEMANDS} 条需求`,
    );
  }

  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      'AI_NOT_CONFIGURED',
      'AI 服务尚未配置，请联系管理员',
    );
  }

  const prompt = buildMergePrompt(candidates);
  const content = await callOpenRouter(
    apiKey,
    normalizeModel(env.OPENROUTER_MODEL),
    prompt,
    fetcher,
  );
  return {
    suggestions: parseMergeSuggestions(
      content,
      new Set(candidates.map((candidate) => candidate.id)),
    ),
  };
}

async function listUnmergedCandidates(
  db: D1Database,
  categoryId: string,
): Promise<MergeCandidate[]> {
  const result = await db
    .prepare(
      `SELECT d.id, d.title, d.background, d.department
       FROM demand d
       LEFT JOIN merged_demand_source source ON source.demand_id = d.id
       WHERE d.category_id = ? AND source.demand_id IS NULL
       ORDER BY d._created_at DESC
       LIMIT ?`,
    )
    .bind(categoryId, MAX_DEMANDS + 1)
    .all<MergeCandidate>();
  return result.results;
}

export function buildMergePrompt(candidates: MergeCandidate[]): string {
  const demandData = candidates.map((candidate) => ({
    id: candidate.id,
    title: truncate(candidate.title),
    background: truncate(candidate.background),
    department: truncate(candidate.department),
  }));
  const prompt = [
    '你是一位资深的产品需求分析专家。',
    '请判断以下企业内部需求中，哪些需求在目标、功能或场景上高度相似，可以合并。',
    '只输出确实可以整合的分组，每组至少包含 2 条需求；没有可整合项时 suggestions 返回空数组。',
    'demandIds 只能引用输入中出现的 ID，且每个 ID 最多出现在一个分组中。',
    '严格返回 JSON 对象 {"suggestions":[]}，不要输出 Markdown 或解释文字。',
    '每项格式：{"title":"整合后的标题","reason":"整合理由","demandIds":["id"]}',
    JSON.stringify(demandData),
  ].join('\n');
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new ApiError(
      400,
      'AI_PROMPT_LIMIT_EXCEEDED',
      '需求内容过长，无法在单次 AI 分析中处理',
    );
  }
  return prompt;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  fetcher: Fetcher,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(504, 'AI_TIMEOUT', 'AI 分析超时，请稍后重试');
    }
    throw new ApiError(502, 'AI_UPSTREAM_ERROR', 'AI 服务暂时不可用');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error('OpenRouter request failed', response.status);
    throw new ApiError(502, 'AI_UPSTREAM_ERROR', 'AI 服务返回错误，请稍后重试');
  }

  let payload: OpenRouterResponse;
  try {
    payload = (await response.json()) as OpenRouterResponse;
  } catch {
    throw new ApiError(502, 'AI_INVALID_RESPONSE', 'AI 返回了无效响应');
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError(502, 'AI_INVALID_RESPONSE', 'AI 返回内容为空或格式错误');
  }
  return content;
}

export function parseMergeSuggestions(
  raw: string,
  validIds: ReadonlySet<string>,
): MergeSuggestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new ApiError(502, 'AI_INVALID_RESPONSE', 'AI 返回内容无法解析为 JSON');
  }
  const items =
    Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : null;
  if (!items) {
    throw new ApiError(502, 'AI_INVALID_RESPONSE', 'AI 返回结构不符合要求');
  }

  const usedIds = new Set<string>();
  const suggestions: MergeSuggestion[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const title = normalizedText(item.title, MAX_TITLE_LENGTH);
    const reason = normalizedText(item.reason, MAX_REASON_LENGTH);
    if (!title || !reason || !Array.isArray(item.demandIds)) continue;

    const localIds = new Set<string>();
    const demandIds = item.demandIds.filter((id): id is string => {
      if (
        typeof id !== 'string' ||
        !validIds.has(id) ||
        localIds.has(id) ||
        usedIds.has(id)
      ) {
        return false;
      }
      localIds.add(id);
      return true;
    });
    if (demandIds.length < 2) continue;
    demandIds.forEach((id) => usedIds.add(id));
    suggestions.push({ title, reason, demandIds });
  }
  return suggestions;
}

function normalizeModel(value: string | undefined): string {
  const model = value?.trim();
  return model && model.length <= 200 ? model : DEFAULT_OPENROUTER_MODEL;
}

function truncate(value: string): string {
  return value.length > MAX_FIELD_LENGTH
    ? `${value.slice(0, MAX_FIELD_LENGTH)}...`
    : value;
}

function extractJson(raw: string): string {
  const text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }
  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  return objectStart >= 0 && objectEnd > objectStart
    ? text.slice(objectStart, objectEnd + 1)
    : text;
}

function normalizedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result && result.length <= maxLength ? result : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
