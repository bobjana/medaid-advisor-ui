import { apiClient } from './client';
import type { ChatRequest, ChatResponse } from '@/types';

export async function sendMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  return apiClient<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}