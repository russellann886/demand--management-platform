import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  BoardAdmins,
  CreateDemandCategoryRequest,
  DemandCategoryListResponse,
  DemandCategoryMutationResponse,
  UpdateDemandCategoryRequest,
} from '@shared/api.interface';

function ensureAuthorized(status: number): void {
  if (status === 403) {
    throw new Error('无操作权限，请联系管理员分配「需求管理员」角色');
  }
}

export async function getCategories(): Promise<DemandCategoryListResponse> {
  const res = await axiosForBackend({
    url: '/api/demand-categories',
    method: 'GET',
  });
  return res.data;
}

export async function getAllCategories(): Promise<DemandCategoryListResponse> {
  const res = await axiosForBackend({
    url: '/api/demand-categories/all',
    method: 'GET',
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function createCategory(
  body: CreateDemandCategoryRequest,
): Promise<DemandCategoryMutationResponse> {
  const res = await axiosForBackend({
    url: '/api/demand-categories',
    method: 'POST',
    data: body,
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function updateCategory(
  id: string,
  body: UpdateDemandCategoryRequest,
): Promise<DemandCategoryMutationResponse> {
  const res = await axiosForBackend({
    url: `/api/demand-categories/${id}`,
    method: 'PUT',
    data: body,
  });
  ensureAuthorized(res.status);
  return res.data;
}

export async function getBoardAdmins(): Promise<BoardAdmins> {
  const res = await axiosForBackend({
    url: '/api/demand-categories/board-admins',
    method: 'GET',
  });
  ensureAuthorized(res.status);
  return res.data;
}
