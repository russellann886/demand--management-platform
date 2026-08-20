import type {
  Rule,
  RuleListResponse,
  CreateRuleRequest,
  UpdateRuleRequest,
  UpdateRuleStatusRequest,
  RuleType,
  RuleStatus,
} from '@shared/api.interface';
import { apiRequest } from './client';

interface RuleListParams {
  section?: string;
  type?: RuleType;
  status?: RuleStatus;
  creator?: string;
  page?: number;
  pageSize?: number;
}

export async function list(params: RuleListParams): Promise<RuleListResponse> {
  const query = new URLSearchParams();
  if (params.section) query.set('section', params.section);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.creator) query.set('creator', params.creator);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.pageSize !== undefined)
    query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return apiRequest<RuleListResponse>(qs ? `/api/rules?${qs}` : '/api/rules', {
    method: 'GET',
  });
}

export async function getById(id: string): Promise<Rule> {
  return apiRequest<Rule>(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function create(body: CreateRuleRequest): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/api/rules', {
    method: 'POST',
    body,
  });
}

export async function update(
  id: string,
  body: UpdateRuleRequest,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  });
}

export async function remove(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/api/rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateStatus(
  id: string,
  body: UpdateRuleStatusRequest,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/api/rules/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body },
  );
}
