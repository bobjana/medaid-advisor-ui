'use client';

import {
  Children,
  Fragment,
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation, SchemeOption } from '@/types';
import { citationResolver, type CitationResolver } from '@/lib/chat/citations';
import { CitationPreview } from './CitationPreview';

interface MarkdownMessageProps {
  content: string;
  className?: string;
  /**
   * Sources retrieved for this answer. A link in the content that points at one
   * of them renders as a numbered footnote marker instead of a plain link;
   * every other link renders normally.
   */
  citations?: Citation[];
  /** Scheme catalogue used to describe a source (`Discovery Health › KeyCare`). */
  catalog?: SchemeOption[];
  /** Called with the footnote number when a citation marker is activated. */
  onCitationSelect?: (number: number) => void;
}

/** The citation marker being inspected, and where to anchor its preview card. */
interface Inspected {
  citation: Citation;
  number: number;
  uses: number;
  meta: string[];
  anchor: DOMRect;
}

/**
 * Element overrides that don't depend on the message. They live at module scope
 * so their component identity — and therefore the DOM nodes react-markdown
 * reconciles them to — is stable across renders; recreating them on every
 * render would remount any marker under the pointer and drop its hover state.
 */
const STATIC_COMPONENTS = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-xl font-bold text-foreground mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-lg font-bold text-foreground mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-base font-semibold text-foreground mt-2 mb-1">{children}</h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h4>
  ),
  h5: ({ children }: { children?: ReactNode }) => (
    <h5 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h5>
  ),
  h6: ({ children }: { children?: ReactNode }) => (
    <h6 className="text-sm font-semibold text-muted-foreground mt-2 mb-1">{children}</h6>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc pl-5 space-y-1.5 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal pl-5 space-y-1.5 my-2">{children}</ol>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-4 border-primary/30 pl-3 italic text-muted-foreground my-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-3" />,
  pre: ({ children }: { children?: ReactNode }) => {
    const text = textOf(children);
    if (
      text.includes('scheme_selection') ||
      text.includes('plan_selection') ||
      text.includes('"schemes"') ||
      text.includes('"plans"')
    ) {
      return null;
    }
    return (
      <pre className="bg-muted-foreground/10 rounded-lg p-3 overflow-x-auto my-2">{children}</pre>
    );
  },
  code: ({ className, children }: ComponentProps<'code'>) => {
    const isBlock = className?.includes('language-') || String(children).includes('\n');
    if (isBlock) {
      return <code className={`text-xs font-mono ${className ?? ''}`}>{children}</code>;
    }
    return (
      <code className="px-1.5 py-0.5 rounded bg-muted-foreground/15 text-primary text-xs font-mono font-medium border border-primary/20">
        {children}
      </code>
    );
  },
  table: ({ children }: { children?: ReactNode }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
  ),
};

export function MarkdownMessage({
  content,
  className = '',
  citations,
  catalog,
  onCitationSelect,
}: MarkdownMessageProps) {
  const [inspected, setInspected] = useState<Inspected | null>(null);
  const dismiss = useCallback(() => setInspected(null), []);

  // Numbering is derived from the citation list and the answer text — the same
  // inputs the sources list uses — so the markers and the list agree.
  const resolver = useMemo(
    () =>
      citations && citations.length > 0 ? citationResolver(citations, content, catalog) : null,
    [citations, content, catalog],
  );

  const inspect = useCallback(
    (citation: Citation, number: number, element: HTMLElement) => {
      if (!resolver) return;
      setInspected({
        citation,
        number,
        uses: resolver.usesOf(citation),
        meta: resolver.describe(citation),
        anchor: element.getBoundingClientRect(),
      });
    },
    [resolver],
  );

  /**
   * Inline containers whose children run together on a single line. Two markers
   * directly next to each other get a comma between them, so that "1" followed
   * by "2" does not read as the number 12; markers separated by any text — even
   * a single space — are left alone.
   */
  const inline = useCallback(
    (children: ReactNode) => <CitationRun resolver={resolver}>{children}</CitationRun>,
    [resolver],
  );

  const components = useMemo(() => {
    const link = ({ children, href }: ComponentProps<'a'>) => {
      const citation = resolver?.resolve(href, textOf(children));
      const number = citation ? resolver?.numberOf(citation) : undefined;
      // An unnumbered match means the citation list has not caught up with the
      // text yet (still streaming): render a normal link rather than a marker
      // pointing at a row that does not exist.
      if (citation && number !== undefined) {
        return (
          <CitationMarker
            citation={citation}
            number={number}
            onSelect={onCitationSelect}
            onInspect={(element) => inspect(citation, number, element)}
            onDismiss={dismiss}
          />
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        >
          {children}
        </a>
      );
    };

    return {
      ...STATIC_COMPONENTS,
      a: link,
      p: ({ children }: { children?: ReactNode }) => (
        <p className="leading-relaxed my-1">{inline(children)}</p>
      ),
      li: ({ children }: { children?: ReactNode }) => (
        <li className="leading-relaxed">{inline(children)}</li>
      ),
      td: ({ children }: { children?: ReactNode }) => (
        <td className="border border-border px-2 py-1">{inline(children)}</td>
      ),
    };
  }, [resolver, inspect, dismiss, inline, onCitationSelect]);

  /**
   * Keep the answer's own safety filtering, but let a link that points at a
   * retrieved source through: the agent sometimes cites the `gs://` storage URI
   * it was given, which the default transform would blank out. Rewriting such a
   * link to the source's download URL fixes it and gives the reader the PDF.
   */
  const urlTransform = useCallback(
    (url: string) => {
      const citation = resolver?.resolve(url, undefined);
      if (!citation) return defaultUrlTransform(url);
      // A source with no download link of its own keeps the URL it was cited
      // with, so its marker still resolves to the right row.
      return citation.url ?? url;
    },
    [resolver],
  );

  if (!content) return null;

  return (
    <div className={`space-y-1 text-sm ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={urlTransform}
      >
        {content}
      </ReactMarkdown>

      {inspected && (
        <CitationPreview
          citation={inspected.citation}
          number={inspected.number}
          uses={inspected.uses}
          meta={inspected.meta}
          anchor={inspected.anchor}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

/**
 * Comma pass for the inline containers of a markdown block.
 *
 * The markers themselves are produced by the `a` override; this only decides
 * where a separator belongs, by resolving each child back to its citation the
 * same way the override does. Any child that is not a citation marker, or any
 * text between two markers, resets the run.
 */
function CitationRun({
  children,
  resolver,
}: {
  children: ReactNode;
  resolver: CitationResolver | null;
}) {
  const items: ReactNode[] = [];
  let previousWasMarker = false;

  Children.forEach(children, (child, index) => {
    const isMarker = isCitationMarkerChild(child, resolver);
    if (isMarker && previousWasMarker) {
      items.push(
        <span key={`citation-sep-${index}`} aria-hidden="true" className="citation-marker-sep">
          ,
        </span>,
      );
    }
    items.push(<Fragment key={`citation-node-${index}`}>{child}</Fragment>);
    previousWasMarker = isMarker;
  });

  return <>{items}</>;
}

/**
 * Whether a child of an inline container renders as a citation marker. The child
 * is the element react-markdown created for a link, so it carries the link's
 * `href` and text even though the `a` override renders it.
 */
function isCitationMarkerChild(child: ReactNode, resolver: CitationResolver | null): boolean {
  if (!resolver || !child || typeof child !== 'object' || !('props' in child)) return false;
  const props = (child as { props?: { href?: unknown; children?: ReactNode } }).props;
  const href = typeof props?.href === 'string' ? props.href : undefined;
  if (!href) return false;
  const citation = resolver.resolve(href, textOf(props?.children));
  return citation !== undefined && resolver.numberOf(citation) !== undefined;
}

interface CitationMarkerProps {
  citation: Citation;
  number: number;
  onSelect?: (number: number) => void;
  onInspect: (element: HTMLElement) => void;
  onDismiss: () => void;
}

/**
 * A numbered footnote marker in the answer text. It is a button, not a link: it
 * moves the reader within the transcript to the source's row, rather than
 * leaving the page.
 */
export function CitationMarker({
  citation,
  number,
  onSelect,
  onInspect,
  onDismiss,
}: CitationMarkerProps) {
  return (
    <button
      type="button"
      data-citation-marker={number}
      aria-label={`Source ${number}: ${citation.title}`}
      title={`${citation.title} — click to jump to the source`}
      className="citation-marker"
      onClick={() => onSelect?.(number)}
      onMouseEnter={(event) => onInspect(event.currentTarget)}
      onMouseLeave={onDismiss}
      onFocus={(event) => onInspect(event.currentTarget)}
      onBlur={onDismiss}
    >
      <sup>{number}</sup>
    </button>
  );
}

function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return textOf(props?.children);
  }
  return '';
}
