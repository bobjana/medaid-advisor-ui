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

const EXCERPT_MARKER_RE = /^\[Excerpt\s+\d+\]\s*$/im;
const SOURCE_LINE_RE = /^Source\s*:\s*(.+?)\s*$/i;
const URI_LINE_RE = /^Source\s+URI\s*:\s*(\S+)\s*$/i;
const DOWNLOAD_LINE_RE = /^Download\s*:\s*(\S+)\s*$/i;
const BLOCK_SEPARATOR_RE = /^\s*-{3,}\s*$/im;

/** Cap on the stored excerpt length — enough for a preview card. */
const MAX_EXCERPT_CHARS = 400;

interface RawCitation {
  title: string;
  uri?: string;
  url?: string;
  excerpt?: string;
}

/**
 * Parse one excerpt block's header lines.
 *
 * Headers are read from the top of the block and stop at the first line that is
 * neither blank nor a recognised header, which starts the excerpt body. Only
 * `Source:` is required: `Source URI:` and `Download:` are absent for sources
 * that don't live in Cloud Storage. Returns null for blocks with no source —
 * e.g. the tool's "No relevant excerpts found" message.
 */
function parseCitationBlock(block: string): RawCitation | null {
  let title: string | undefined;
  let uri: string | undefined;
  let url: string | undefined;
  const body: string[] = [];
  let inBody = false;

  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    if (!inBody) {
      if (!line) continue;
      const source = SOURCE_LINE_RE.exec(line);
      if (source && title === undefined) {
        title = source[1];
        continue;
      }
      const sourceUri = URI_LINE_RE.exec(line);
      if (sourceUri && uri === undefined) {
        uri = sourceUri[1];
        continue;
      }
      const download = DOWNLOAD_LINE_RE.exec(line);
      if (download && url === undefined) {
        url = download[1];
        continue;
      }
      inBody = true;
    }
    if (line) body.push(line);
  }

  if (!title) return null;

  const excerpt = body.join(' ').replace(/\s+/g, ' ').trim();
  return {
    title,
    ...(uri ? { uri } : {}),
    ...(url ? { url } : {}),
    ...(excerpt ? { excerpt: excerpt.slice(0, MAX_EXCERPT_CHARS) } : {}),
  };
}

/** Two citations are the same source when they share a download URL or URI. */
function sameSource(a: Citation, b: Citation): boolean {
  if (a.url && b.url) return a.url === b.url;
  if (a.uri && b.uri) return a.uri === b.uri;
  return false;
}

/**
 * Extract the sources a tool call drew on from its `function_response` result.
 *
 * The result advertises one block per excerpt (`[Excerpt N]`, separated by `---`
 * in the tool's formatted output); blocks are split tolerantly so a missing or
 * reordered header line does not silently drop the source. Later blocks for the
 * same document fill in anything the first block lacked.
 */
export function extractCitations(event: unknown): Citation[] {
  if (!event || typeof event !== 'object') return [];
  const content = (event as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return [];
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return [];

  const citations: Citation[] = [];
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const fr = (p as { function_response?: unknown }).function_response;
    if (!fr || typeof fr !== 'object') continue;
    const response = (fr as { response?: unknown }).response;
    if (!response || typeof response !== 'object') continue;
    const result = (response as { result?: unknown }).result;
    if (typeof result !== 'string') continue;

    for (const block of result.split(EXCERPT_MARKER_RE)) {
      for (const piece of block.split(BLOCK_SEPARATOR_RE)) {
        const parsed = parseCitationBlock(piece);
        if (!parsed) continue;
        const existing = citations.find((c) => sameSource(c, parsed));
        if (!existing) {
          citations.push(parsed);
          continue;
        }
        if (!existing.uri && parsed.uri) existing.uri = parsed.uri;
        if (!existing.url && parsed.url) existing.url = parsed.url;
        if (!existing.excerpt && parsed.excerpt) existing.excerpt = parsed.excerpt;
      }
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
