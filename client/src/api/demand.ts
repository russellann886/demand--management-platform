import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
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

export async function getDemands(
  categoryId: string,
  page: number,
  pageSize: number,
): Promise<DemandListResponse> {
  const res = await axiosForBackend({
    url: `/api/demands?categoryId=${categoryId}&page=${page}&pageSize=${pageSize}`,
    method: 'GET',
  });
  return res.data;
}

export async function getMyDemands(): Promise<MyDemandListResponse> {
  const res = await axiosForBackend({
    url: '/api/demands/my',
    method: 'GET',
  });
  return res.data;
}

export async function getDemandDetail(id: string): Promise<DemandDetail> {
  const res = await axiosForBackend({
    url: `/api/demands/${id}`,
    method: 'GET',
  });
  return res.data;
}

export async function createDemand(
  body: CreateDemandRequest,
): Promise<CreateDemandResponse> {
  const res = await axiosForBackend({
    url: '/api/demands',
    method: 'POST',
    data: body,
  });
  return res.data;
}

export async function getDemandComments(
  id: string,
  page: number,
  pageSize: number,
): Promise<DemandCommentListResponse> {
  const res = await axiosForBackend({
    url: `/api/demands/${id}/comments?page=${page}&pageSize=${pageSize}`,
    method: 'GET',
  });
  return res.data;
}

export async function createComment(
  id: string,
  body: CreateCommentRequest,
): Promise<CreateCommentResponse> {
  const res = await axiosForBackend({
    url: `/api/demands/${id}/comments`,
    method: 'POST',
    data: body,
  });
  return res.data;
}

export async function updateDemandStatus(
  id: string,
  status: string,
  plannedSchedule?: string | null,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend({
    url: `/api/demands/${id}/status`,
    method: 'PATCH',
    data: { status, plannedSchedule },
  });
  return res.data;
}

export async function updateDemandScore(
  id: string,
  body: UpdateDemandScoreRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend({
    url: `/api/demands/${id}/score`,
    method: 'PATCH',
    data: body,
  });
  return res.data;
}

export async function updateDemandAssignee(
  id: string,
  body: UpdateDemandAssigneeRequest,
): Promise<{ success: boolean }> {
  const res = await axiosForBackend({
    url: `/api/demands/${id}/assignee`,
    method: 'PATCH',
    data: body,
  });
  return res.data;
}
