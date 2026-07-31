import { apiClient } from './client';
import type {
  PlanRecommendationRequest,
  PlanRecommendationResponse,
} from '@/types';

export async function getRecommendations(
  request: PlanRecommendationRequest,
): Promise<PlanRecommendationResponse> {
  return apiClient<PlanRecommendationResponse>('/recommend', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}