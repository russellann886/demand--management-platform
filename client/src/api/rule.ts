import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Rule,
  RuleListResponse,
  CreateRuleRequest,
  UpdateRuleRequest,
  UpdateRuleStatusRequest,
  RuleType,
  RuleStatus,
} from '@shared/api.interface';

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
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  const res = await axiosForBackend({
    url: qs ? `/api/rules?${qs}` : '/api/rules',
    method: 'GET',
  });
  return res.data;
}

export async function getById(id: string): Promise<Rule> {
  const res = await axiosForBackend({
    url: `/api/rules/${id}`,
    method: 'GET',
  });
  return res.data;
}

export async function create(
  body: CreateRuleRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend({
    url: '/api/rules',
    method: 'POST',
    data: body,
  });
  return res.data;
}

export async function update(
  id: string,
  body: UpdateRuleRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend({
    url: `/api/rules/${id}`,
    method: 'PUT',
    data: body,
  });
  return res.data;
}

export async function remove(id: string): Promise<{ id: string }> {
  const res = await axiosForBackend({
    url: `/api/rules/${id}`,
    method: 'DELETE',
  });
  return res.data;
}

export async function updateStatus(
  id: string,
  body: UpdateRuleStatusRequest,
): Promise<{ id: string }> {
  const res = await axiosForBackend({
    url: `/api/rules/${id}/status`,
    method: 'PATCH',
    data: body,
  });
  return res.data;
}
