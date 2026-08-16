import type { QuestionnaireData } from './questionnaire';

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId?: string;
}

/**
 * A source document backing an assistant answer (e.g. a Discovery plan guide PDF).
 * Emitted by the agent's RAG tool and surfaced as a small link in the chat UI.
 */
export interface Citation {
  /** Human-readable name, e.g. the PDF filename. */
  title: string;
  /** Absolute URL the browser can open to download/view the source. */
  url: string;
  /** Original storage URI (e.g. `gs://bucket/path/file.pdf`), when available. */
  uri?: string;
}

/**
 * Events emitted by the chat stream, after the raw Vertex/Agent-Engine stream
 * has been parsed and re-framed as NDJSON for the browser.
 */
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'session'; sessionId: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface PlanScore {
  planId: string;
  planName: string;
  score: number;
  monthlyPremium: number;
  keyBenefits: string[];
}

export interface PlanRecommendationRequest {
  clientData: QuestionnaireData;
}

export interface PlanRecommendationResponse {
  recommendations: PlanScore[];
  reasoning: string[];
  alternatives: PlanScore[];
}