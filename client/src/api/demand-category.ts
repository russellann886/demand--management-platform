import type {
  BoardAdmins,
  CreateDemandCategoryRequest,
  DemandCategoryListResponse,
  DemandCategoryMutationResponse,
  UpdateDemandCategoryRequest,
} from '@shared/api.interface';
import { apiRequest } from './client';

export async function getCategories(): Promise<DemandCategoryListResponse> {
  return apiRequest<DemandCategoryListResponse>('/api/demand-categories', {
    method: 'GET',
  });
}

export async function getAllCategories(): Promise<DemandCategoryListResponse> {
  return apiRequest<DemandCategoryListResponse>('/api/demand-categories/all', {
    method: 'GET',
  });
}

export async function createCategory(
  body: CreateDemandCategoryRequest,
): Promise<DemandCategoryMutationResponse> {
  return apiRequest<DemandCategoryMutationResponse>('/api/demand-categories', {
    method: 'POST',
    body,
  });
}

export async function updateCategory(
  id: string,
  body: UpdateDemandCategoryRequest,
): Promise<DemandCategoryMutationResponse> {
  return apiRequest<DemandCategoryMutationResponse>(
    `/api/demand-categories/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body,
    },
  );
}

export async function getBoardAdmins(): Promise<BoardAdmins> {
  return apiRequest<BoardAdmins>('/api/demand-categories/board-admins', {
    method: 'GET',
  });
}
