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
export interface PlanOption {
  id: string;
  name: string;
}

export interface SchemeOption {
  slug: string;
  name: string;
  plans: PlanOption[];
}

export interface ContextOptions {
  type: 'scheme_selection' | 'plan_selection';
  schemes?: SchemeOption[];
  plans?: PlanOption[];
  scheme?: string;
}

/**
 * The agent's scheme/plan context, mirroring its session state. Streamed as
 * `actions.state_delta` on every turn so the UI can stay in sync even when the
 * context was inferred from free text (e.g. "I'm on Bonitas").
 *
 * An omitted key means "unchanged"; `null` means "cleared".
 */
export interface ContextState {
  /** Scheme slug (e.g. `bonitas`), or `null` when none is selected. */
  scheme?: string | null;
  /** Plan id (e.g. `boncomplete`), or `null` for scheme-wide / none. */
  plan?: string | null;
}

export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'session'; sessionId: string }
  | { type: 'context_options'; options: ContextOptions }
  | { type: 'context_state'; state: ContextState }
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