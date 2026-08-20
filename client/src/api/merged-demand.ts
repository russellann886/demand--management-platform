import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AddMergedSourcesRequest,
  CreateMergedDemandRequest,
  MergedDemandListResponse,
  MergedDemandMutationResponse,
  ReleaseSourceResponse,
  SourceDemandListResponse,
  UpdateMergedDemandRequest,
} from '@shared/api.interface';

function ensureAuthorized(status: number): void {
  if (status === 403) {
    throw new Error('无操作权限，请联系管理员分配「需求管理员」角色');
  }
}

export async function getSourceDemands(
  categoryId: string,
): Promise<SourceDemandListResponse> {
  const res = await axiosForBackend({
    url: `/api/merged-demands/source-demands?categoryId=${categoryId}`,
    method: 'GET',
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function getMergedDemands(
  categoryId: string,
): Promise<MergedDemandListResponse> {
  const res = await axiosForBackend({
    url: `/api/merged-demands?categoryId=${categoryId}`,
    method: 'GET',
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function createMergedDemand(
  body: CreateMergedDemandRequest,
): Promise<MergedDemandMutationResponse> {
  const res = await axiosForBackend({
    url: '/api/merged-demands',
    method: 'POST',
    data: body,
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function updateMergedDemand(
  id: string,
  body: UpdateMergedDemandRequest,
): Promise<MergedDemandMutationResponse> {
  const res = await axiosForBackend({
    url: `/api/merged-demands/${id}`,
    method: 'PUT',
    data: body,
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function deleteMergedDemand(
  id: string,
): Promise<MergedDemandMutationResponse> {
  const res = await axiosForBackend({
    url: `/api/merged-demands/${id}`,
    method: 'DELETE',
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function releaseSource(
  mergedDemandId: string,
  demandId: string,
): Promise<ReleaseSourceResponse> {
  const res = await axiosForBackend({
    url: `/api/merged-demands/${mergedDemandId}/sources/${demandId}`,
    method: 'DELETE',
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function addSourcesToMerged(
  mergedDemandId: string,
  body: AddMergedSourcesRequest,
): Promise<MergedDemandMutationResponse> {
  const res = await axiosForBackend({
    url: `/api/merged-demands/${mergedDemandId}/sources`,
    method: 'POST',
    data: body,
  });
  ensureAuthorized(res.status);
  return res.data;
}
