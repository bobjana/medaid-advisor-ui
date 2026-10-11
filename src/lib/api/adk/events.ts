import type { Citation, ContextOptions, ContextState } from '@/types';

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'session'; sessionId: string }
  | { type: 'context_options'; options: ContextOptions }
  | { type: 'context_state'; state: ContextState }
  | { type: 'done' }
  | { type: 'error'; message: string };
