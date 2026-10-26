import type { QuestionnaireData } from './questionnaire';
import type { AgentBackend } from '@/lib/api/backend';

export interface ChatRequest {
  message: string;
  sessionId?: string;
  /**
   * Agent backend picked in the chat UI. When set, the API routes proxy the
   * ADK wire contract to that backend's server; when omitted the server-wide
   * CHAT_BACKEND env default applies (Vertex or the local ADK dev server).
   */
  backend?: AgentBackend;
}

export interface ChatResponse {
  response: string;
  sessionId?: string;
}

/**
 * A source document backing an assistant answer (e.g. a Discovery plan guide PDF).
 * Emitted by the agent's RAG tool and surfaced as a numbered footnote in the
 * chat UI that links to the original PDF.
 *
 * The agent formats each retrieved excerpt as:
 *
 *     [Excerpt 1]
 *     Source: discovery-keycare-plan-guide.pdf
 *     Source URI: gs://bucket/plans/discovery-keycare-plan-guide.pdf
 *     Download: https://host/download?uri=gs%3A%2F%2Fbucket%2F...
 *
 * `Source URI` and `Download` are only emitted for `gs://` sources, so both are
 * optional here.
 */
export interface Citation {
  /** Human-readable name, e.g. the PDF filename. */
  title: string;
  /**
   * Absolute URL the browser can open to download/view the source. Absent when
   * the agent could not produce a download link (non-`gs://` storage URIs).
   */
  url?: string;
  /** Original storage URI (e.g. `gs://bucket/path/file.pdf`), when available. */
  uri?: string;
  /**
   * Short excerpt from the retrieved chunk, used as the preview text when the
   * reader inspects a citation. Captured from the same tool result.
   */
  excerpt?: string;
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