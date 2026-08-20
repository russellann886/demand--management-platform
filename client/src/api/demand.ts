import type {
  CreateCommentRequest,
  CreateCommentResponse,
  CreateDemandRequest,
  CreateDemandResponse,
  DemandCommentListResponse,
  DemandDetail,
  DemandListResponse,
  MyDemandListResponse,
  UpdateDemandAssigneeRequest,
  UpdateDemandScoreRequest,
} from '@shared/api.interface';
import { apiRequest } from './client';

export async function getDemands(
  categoryId: string,
  page: number,
  pageSize: number,
): Promise<DemandListResponse> {
  const query = new URLSearchParams({
    categoryId,
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiRequest<DemandListResponse>(`/api/demands?${query}`, {
    method: 'GET',
  });
}

export async function getMyDemands(): Promise<MyDemandListResponse> {
  return apiRequest<MyDemandListResponse>('/api/demands/my', {
    method: 'GET',
  });
}

export async function getDemandDetail(id: string): Promise<DemandDetail> {
  return apiRequest<DemandDetail>(`/api/demands/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function createDemand(
  body: CreateDemandRequest,
): Promise<CreateDemandResponse> {
  return apiRequest<CreateDemandResponse>('/api/demands', {
    method: 'POST',
    body,
  });
}

export async function getDemandComments(
  id: string,
  page: number,
  pageSize: number,
): Promise<DemandCommentListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiRequest<DemandCommentListResponse>(
    `/api/demands/${encodeURIComponent(id)}/comments?${query}`,
    { method: 'GET' },
  );
}

export async function createComment(
  id: string,
  body: CreateCommentRequest,
): Promise<CreateCommentResponse> {
  return apiRequest<CreateCommentResponse>(
    `/api/demands/${encodeURIComponent(id)}/comments`,
    { method: 'POST', body },
  );
}

export async function updateDemandStatus(
  id: string,
  status: string,
  plannedSchedule?: string | null,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/api/demands/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: { status, plannedSchedule } },
  );
}

export async function updateDemandScore(
  id: string,
  body: UpdateDemandScoreRequest,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/api/demands/${encodeURIComponent(id)}/score`,
    { method: 'PATCH', body },
  );
}

export async function updateDemandAssignee(
  id: string,
  body: UpdateDemandAssigneeRequest,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/api/demands/${encodeURIComponent(id)}/assignee`,
    { method: 'PATCH', body },
  );
}
