import type { Citation, SchemeOption } from '@/types';
import { SCHEME_CATALOG } from './scheme-catalog';

/**
 * Citation numbering and matching.
 *
 * An answer's sources are numbered by *first inline use* — the order in which
 * the answer links to them — which is also the order they are listed in at the
 * foot of the message. Numbers therefore follow reading order, and no source is
 * listed that the answer never cites; sources the agent retrieved but never
 * referenced are reported separately as "also consulted".
 *
 * The sources list and the inline markers in the rendered markdown must agree
 * on those numbers. Both derive them from the same two inputs — the citation
 * list and the answer text — through the pure functions here, so they stay in
 * agreement without sharing state.
 */

/** A citation with the presentation details the UI needs. */
export interface CitationView {
  /** Stable identity, as produced by `citationKey`. */
  key: string;
  citation: Citation;
  /** 1-based footnote number in reading order, or null when never cited. */
  number: number | null;
  /** Display title: the filename without its extension or corpus cruft. */
  label: string;
  /** Secondary line fragments, e.g. `Discovery Health › KeyCare`, `Plan guide`. */
  meta: string[];
  /** How many times the answer cites this source inline. */
  uses: number;
  /** Download link for the original PDF, when the agent provided one. */
  href?: string;
}

export interface CitationViews {
  /** Sources the answer cites, in reading order and numbered. */
  cited: CitationView[];
  /** Sources the agent retrieved but the answer never cites. */
  uncited: CitationView[];
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Normalise a URL, URI or filename for comparison. */
function normalize(value: string): string {
  return decode(value).trim().toLowerCase().replace(/\/+$/, '');
}

/** The last path segment of a URL/URI, with any query string removed. */
function fileName(value: string): string {
  const withoutQuery = value.split(/[?#]/, 1)[0];
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1] ?? '';
}

/** The storage URI the download endpoint was asked for (`?uri=gs://…`). */
function uriFromDownloadUrl(url: string): string | undefined {
  const query = url.split('?')[1];
  if (!query) return undefined;
  for (const pair of query.split('&')) {
    const [rawKey, rawValue] = pair.split('=');
    if (rawKey === 'uri' && rawValue) return decode(rawValue);
  }
  return undefined;
}

/**
 * Every string that should resolve to this source: its download URL, storage
 * URI and filename. The agent occasionally re-encodes or trims the long
 * download URL it was given, so matching cannot rely on the URL alone.
 */
export function citationKeys(citation: Citation): string[] {
  const keys: string[] = [];
  const add = (key: string) => {
    if (key && !keys.includes(key)) keys.push(key);
  };

  if (citation.url) add(normalize(citation.url));
  if (citation.uri) add(normalize(citation.uri));
  if (citation.url) {
    const embedded = uriFromDownloadUrl(citation.url);
    if (embedded) add(normalize(embedded));
  }
  for (const value of [citation.uri, citation.url, citation.title]) {
    if (!value) continue;
    const name = fileName(value);
    // Only filenames are matched by name alone: a bare host or folder name
    // would make unrelated sources collide.
    if (name.includes('.')) add(normalize(name));
  }
  return keys;
}

/** Stable identity for a citation, used as a map key and React key. */
export function citationKey(citation: Citation): string {
  return citationKeys(citation)[0] ?? `title:${normalize(citation.title)}`;
}

/** Index citations by every string that may match them in the answer text. */
export function indexCitations(citations: Citation[]): Map<string, Citation> {
  const index = new Map<string, Citation>();
  for (const citation of citations) {
    for (const key of citationKeys(citation)) {
      if (!index.has(key)) index.set(key, citation);
    }
  }
  return index;
}

/**
 * Resolve a markdown link in the answer to one of the retrieved sources.
 * The link target is authoritative; the link text is a fallback, for answers
 * that name a filename but link to a URL we don't recognise.
 */
export function resolveCitation(
  href: string | undefined,
  label: string | undefined,
  index: Map<string, Citation>,
): Citation | undefined {
  const candidates = [href, label].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const direct = index.get(normalize(candidate));
    if (direct) return direct;
    const name = normalize(fileName(candidate));
    if (name) {
      const byName = index.get(name);
      if (byName) return byName;
    }
    const embedded = candidate.includes('?') ? uriFromDownloadUrl(candidate) : undefined;
    if (embedded) {
      const byUri = index.get(normalize(embedded));
      if (byUri) return byUri;
    }
  }
  return undefined;
}

/** Fenced code blocks are not rendered as links, so they must not be scanned. */
function stripFencedCode(content: string): string {
  return content.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '').replace(/^~~~[\s\S]*?^~~~/gm, '');
}

const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(\s*<?([^()\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const BARE_URL_RE = /\bhttps?:\/\/[^\s<>()"']+/g;

interface Use {
  position: number;
  citation: Citation;
}

/**
 * Every inline citation in the answer, in document order, repeats included.
 *
 * Scans markdown links and bare URLs — the same things the renderer turns into
 * anchors — so numbering agrees with what the reader sees. URLs inside a
 * markdown link are skipped by the second pass, so each link counts once.
 */
function scanUses(content: string, index: Map<string, Citation>): Use[] {
  const text = stripFencedCode(content);
  const uses: Use[] = [];
  /** Ranges already claimed by a markdown link, so bare URLs can skip them. */
  const linkRanges: Array<[number, number]> = [];

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const position = match.index ?? 0;
    linkRanges.push([position, position + match[0].length]);
    const citation = resolveCitation(match[2], match[1], index);
    if (citation) uses.push({ position, citation });
  }

  for (const match of text.matchAll(BARE_URL_RE)) {
    const position = match.index ?? 0;
    if (linkRanges.some(([start, end]) => position >= start && position < end)) continue;
    const citation = resolveCitation(match[0], undefined, index);
    if (citation) uses.push({ position, citation });
  }

  return uses.sort((a, b) => a.position - b.position);
}

interface Numbering {
  /** Sources in reading order, unique. */
  order: Citation[];
  /** Inline reference count per `citationKey`. */
  uses: Map<string, number>;
}

/** Number the cited sources in reading order, counting inline references. */
function numberCitations(content: string, index: Map<string, Citation>): Numbering {
  const order: Citation[] = [];
  const uses = new Map<string, number>();
  for (const use of scanUses(content, index)) {
    const key = citationKey(use.citation);
    if (!uses.has(key)) order.push(use.citation);
    uses.set(key, (uses.get(key) ?? 0) + 1);
  }
  return { order, uses };
}

/**
 * Number the sources an answer cites and build the rows for its sources list.
 * Sources the answer never cites are returned separately, unnumbered.
 */
export function buildCitationViews(
  citations: Citation[],
  content: string,
  catalog: SchemeOption[] = SCHEME_CATALOG,
): CitationViews {
  const index = indexCitations(citations);
  const { order, uses } = numberCitations(content, index);

  const toView = (citation: Citation, number: number | null): CitationView => ({
    key: citationKey(citation),
    citation,
    number,
    label: displayLabel(citation),
    meta: describeCitation(citation, catalog),
    uses: uses.get(citationKey(citation)) ?? 0,
    href: citation.url,
  });

  const cited = order.map((citation, i) => toView(citation, i + 1));
  const citedKeys = new Set(cited.map((view) => view.key));
  const uncited = citations
    .filter((citation) => !citedKeys.has(citationKey(citation)))
    .map((citation) => toView(citation, null));

  return { cited, uncited };
}

/**
 * Footnote number per `citationKey`, for the markdown renderer to place inline
 * markers without re-deriving the reading order itself.
 */
export function citationNumbers(citations: Citation[], content: string): Map<string, number> {
  const index = indexCitations(citations);
  const { order } = numberCitations(content, index);
  const numbers = new Map<string, number>();
  order.forEach((citation, i) => numbers.set(citationKey(citation), i + 1));
  return numbers;
}

/**
 * Resolver for the markdown renderer: turns a link in the answer into a
 * numbered source when it points at one, and answers the numbering questions
 * the renderer needs.
 */
export interface CitationResolver {
  resolve(href: string | undefined, label: string | undefined): Citation | undefined;
  numberOf(citation: Citation): number | undefined;
  usesOf(citation: Citation): number;
  describe(citation: Citation): string[];
}

export function citationResolver(
  citations: Citation[],
  content: string,
  catalog: SchemeOption[] = SCHEME_CATALOG,
): CitationResolver {
  const index = indexCitations(citations);
  const { order, uses } = numberCitations(content, index);
  const numbers = new Map<string, number>();
  order.forEach((citation, i) => numbers.set(citationKey(citation), i + 1));
  return {
    resolve: (href, label) => resolveCitation(href, label, index),
    numberOf: (citation) => numbers.get(citationKey(citation)),
    usesOf: (citation) => uses.get(citationKey(citation)) ?? 0,
    describe: (citation) => describeCitation(citation, catalog),
  };
}

/**
 * Display title for a source: drop the extension, drop the `(1)` that crawling
 * tools append, and turn separators into spaces.
 *
 *     discovery-health-medical-scheme-keycare-plan-guide.pdf
 *       → discovery health medical scheme keycare plan guide
 *     Bestmed 2026 Comparative Guide (1).pdf
 *       → Bestmed 2026 Comparative Guide
 */
export function displayLabel(citation: Citation): string {
  const cleaned = citation.title
    .replace(/\.pdf$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Source';
}

function normalizeForMatch(value: string): string {
  return value.replace(/[-_]+/g, ' ').toLowerCase();
}

function containsWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(haystack);
}

/**
 * Describe a source as `Scheme › Plan` plus its kind, e.g.
 * `Discovery Health › KeyCare`, `Plan guide`.
 *
 * Plan guide filenames don't always name their scheme — the Bonitas guides are
 * `Boncap-2026.pdf` and `Boncomprehensive-Boncomplete-2026.pdf` — so a source is
 * attributed by scheme slug, scheme name *or* plan id, the same way the agent
 * attributes an excerpt to a scheme. Nothing is guessed: an unrecognised source
 * simply gets no scheme line.
 */
export function describeCitation(
  citation: Citation,
  catalog: SchemeOption[] = SCHEME_CATALOG,
): string[] {
  const source = citation.uri ?? citation.url ?? citation.title;
  const haystack = normalizeForMatch(source);
  const meta: string[] = [];

  for (const scheme of catalog) {
    const schemeMatches =
      containsWord(haystack, normalizeForMatch(scheme.slug)) ||
      containsWord(haystack, normalizeForMatch(scheme.name));
    const plan = scheme.plans.find(
      (candidate) =>
        containsWord(haystack, normalizeForMatch(candidate.id)) ||
        containsWord(haystack, normalizeForMatch(candidate.name)),
    );
    if (!schemeMatches && !plan) continue;
    meta.push(plan ? `${scheme.name} › ${plan.name}` : scheme.name);
    break;
  }

  if (/\.pdf$/i.test(fileName(source))) meta.push('Plan guide');
  return meta;
}

/**
 * Combine citation lists from several tool calls in one turn. The agent may
 * search the knowledge base more than once while answering, and every search's
 * sources should be available — not just the last one's.
 */
export function mergeCitations(...lists: (Citation[] | undefined)[]): Citation[] {
  const merged: Citation[] = [];
  const seen = new Map<string, Citation>();

  for (const list of lists) {
    for (const citation of list ?? []) {
      // A document is the same document whether it is described by URL, URI or
      // filename, so look it up by every key rather than one canonical key —
      // otherwise a source found by URL in one search and by filename in the
      // next would be listed twice.
      const existing = citationKeys(citation)
        .map((key) => seen.get(key))
        .find((candidate): candidate is Citation => candidate !== undefined);

      if (!existing) {
        const entry = { ...citation };
        merged.push(entry);
        for (const key of citationKeys(entry)) seen.set(key, entry);
        continue;
      }

      if (!existing.uri && citation.uri) existing.uri = citation.uri;
      if (!existing.url && citation.url) existing.url = citation.url;
      if (!existing.excerpt && citation.excerpt) existing.excerpt = citation.excerpt;
      for (const key of citationKeys(existing)) seen.set(key, existing);
    }
  }
  return merged;
}
