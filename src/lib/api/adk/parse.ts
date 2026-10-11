import type { Citation, ContextOptions, ContextState, PlanOption, SchemeOption } from '@/types';

/**
 * Extract an in-band error from a backend stream event.
 *
 * Agent Engine / ADK report runtime failures *inside* the stream (with an
 * HTTP 200), e.g. when the configured model is unavailable:
 *
 *     {"error_code":"ClientError","error_message":"404 NOT_FOUND. ..."}
 *
 * Without this the event is silently dropped and the UI renders an empty
 * assistant bubble forever.
 */
export function extractError(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const obj = event as { error_code?: unknown; error_message?: unknown; error?: unknown };

  // ADK runtime error event: { error_code, error_message }
  if (typeof obj.error_message === 'string' && obj.error_message.trim()) {
    const code =
      typeof obj.error_code === 'string' && obj.error_code.trim() ? obj.error_code : undefined;
    return code ? `${code}: ${obj.error_message.trim()}` : obj.error_message.trim();
  }

  // API error envelope: { error: { code, message } } or { error: "message" }
  const err = obj.error;
  if (typeof err === 'string' && err.trim()) return err.trim();
  if (err && typeof err === 'object') {
    const e = err as { code?: unknown; message?: unknown; status?: unknown };
    if (typeof e.message === 'string' && e.message.trim()) {
      const code =
        typeof e.code === 'string' || typeof e.code === 'number'
          ? String(e.code)
          : typeof e.status === 'string'
            ? e.status
            : undefined;
      return code ? `${code}: ${e.message.trim()}` : e.message.trim();
    }
  }

  return null;
}

export function extractText(event: unknown): string {
  if (!event || typeof event !== 'object') return '';
  const content = (event as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return '';
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return '';
  let out = '';
  for (const p of parts) {
    if (p && typeof p === 'object' && 'text' in p && typeof (p as { text: unknown }).text === 'string') {
      out += (p as { text: string }).text;
    }
  }
  return out;
}

const CITATION_BLOCK_RE =
  /Source:\s*([^\n]+)\nSource URI:\s*(\S+)\nDownload:\s*(\S+)/g;

export function extractCitations(event: unknown): Citation[] {
  if (!event || typeof event !== 'object') return [];
  const content = (event as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return [];
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return [];

  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const fr = (p as { function_response?: unknown }).function_response;
    if (!fr || typeof fr !== 'object') continue;
    const response = (fr as { response?: unknown }).response;
    if (!response || typeof response !== 'object') continue;
    const result = (response as { result?: unknown }).result;
    if (typeof result !== 'string') continue;

    CITATION_BLOCK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CITATION_BLOCK_RE.exec(result)) !== null) {
      const title = match[1].trim();
      const uri = match[2];
      const url = match[3];
      if (seen.has(url)) continue;
      seen.add(url);
      citations.push({ title, url, uri });
    }
  }
  return citations;
}

const JSON_FENCE_RE = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;
export function extractContextOptions(event: unknown): ContextOptions | null {
  if (!event || typeof event !== 'object') return null;
  const content = (event as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return null;
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return null;

  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const text = (p as { text?: unknown }).text;
    if (typeof text !== 'string') continue;

    const match = JSON_FENCE_RE.exec(text);
    if (!match) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch { continue; }
    if (!parsed || typeof parsed !== 'object') continue;

    const obj = parsed as { type?: unknown; schemes?: unknown; plans?: unknown; scheme?: unknown };
    const type =
      obj.type === 'scheme_selection' || obj.type === 'plan_selection'
        ? obj.type
        : Array.isArray(obj.schemes) && obj.schemes.length > 0
          ? 'scheme_selection'
          : Array.isArray(obj.plans) && obj.plans.length > 0
            ? 'plan_selection'
            : null;
    if (!type) continue;

    return {
      type,
      schemes: Array.isArray(obj.schemes) ? (obj.schemes as SchemeOption[]) : undefined,
      plans: Array.isArray(obj.plans) ? (obj.plans as PlanOption[]) : undefined,
      scheme: typeof obj.scheme === 'string' ? obj.scheme : undefined,
    };
  }
  return null;
}

const SCHEME_STATE_KEY = 'selected_scheme';
const PLAN_STATE_KEY = 'selected_plan';

/**
 * Extract the agent's scheme/plan context from an event's `actions.state_delta`.
 *
 * ADK records context-guard state changes as a state delta on the turn's first
 * event (and a null delta when the context is reset), so the UI can mirror the
 * agent's context even when it was inferred from free text rather than a chip
 * click. Keys absent from the delta are left unchanged.
 */
export function extractContextState(event: unknown): ContextState | null {
  if (!event || typeof event !== 'object') return null;
  const actions = (event as { actions?: unknown }).actions;
  if (!actions || typeof actions !== 'object') return null;

  const raw = (actions as { state_delta?: unknown; stateDelta?: unknown });
  const delta = raw.state_delta ?? raw.stateDelta;
  if (!delta || typeof delta !== 'object' || Array.isArray(delta)) return null;

  const record = delta as Record<string, unknown>;
  const hasScheme = Object.prototype.hasOwnProperty.call(record, SCHEME_STATE_KEY);
  const hasPlan = Object.prototype.hasOwnProperty.call(record, PLAN_STATE_KEY);
  if (!hasScheme && !hasPlan) return null;

  const asSlug = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null;

  const state: ContextState = {};
  if (hasScheme) state.scheme = asSlug(record[SCHEME_STATE_KEY]);
  if (hasPlan) state.plan = asSlug(record[PLAN_STATE_KEY]);
  return state;
}
