import type {
  AddMergedSourcesRequest,
  CreateMergedDemandRequest,
  MergedDemandListResponse,
  MergedDemandMutationResponse,
  MergeSuggestionsResponse,
  ReleaseSourceResponse,
  SourceDemandListResponse,
  UpdateMergedDemandRequest,
} from '@shared/api.interface';
import { apiRequest } from './client';

export async function getSourceDemands(
  categoryId: string,
): Promise<SourceDemandListResponse> {
  const query = new URLSearchParams({ categoryId });
  return apiRequest<SourceDemandListResponse>(
    `/api/merged-demands/source-demands?${query}`,
    {
      method: 'GET',
    },
  );
}

export async function getMergedDemands(
  categoryId: string,
): Promise<MergedDemandListResponse> {
  const query = new URLSearchParams({ categoryId });
  return apiRequest<MergedDemandListResponse>(`/api/merged-demands?${query}`, {
    method: 'GET',
  });
}

export async function getMergeSuggestions(
  categoryId: string,
): Promise<MergeSuggestionsResponse> {
  return apiRequest<MergeSuggestionsResponse>('/api/ai/merge-suggestions', {
    method: 'POST',
    body: { categoryId },
  });
}

export async function createMergedDemand(
  body: CreateMergedDemandRequest,
): Promise<MergedDemandMutationResponse> {
  return apiRequest<MergedDemandMutationResponse>('/api/merged-demands', {
    method: 'POST',
    body,
  });
}

export async function updateMergedDemand(
  id: string,
  body: UpdateMergedDemandRequest,
): Promise<MergedDemandMutationResponse> {
  return apiRequest<MergedDemandMutationResponse>(
    `/api/merged-demands/${encodeURIComponent(id)}`,
    { method: 'PUT', body },
  );
}

export async function deleteMergedDemand(
  id: string,
): Promise<MergedDemandMutationResponse> {
  return apiRequest<MergedDemandMutationResponse>(
    `/api/merged-demands/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function releaseSource(
  mergedDemandId: string,
  demandId: string,
): Promise<ReleaseSourceResponse> {
  return apiRequest<ReleaseSourceResponse>(
    `/api/merged-demands/${encodeURIComponent(mergedDemandId)}/sources/${encodeURIComponent(demandId)}`,
    {
      method: 'DELETE',
    },
  );
}

export async function addSourcesToMerged(
  mergedDemandId: string,
  body: AddMergedSourcesRequest,
): Promise<MergedDemandMutationResponse> {
  return apiRequest<MergedDemandMutationResponse>(
    `/api/merged-demands/${encodeURIComponent(mergedDemandId)}/sources`,
    { method: 'POST', body },
  );
}
