'use client';

import { ExternalLink, FileText } from 'lucide-react';
import type { Citation, SchemeOption } from '@/types';
import { buildCitationViews, type CitationView } from '@/lib/chat/citations';
import { citationRowId, goToCitationMarker } from '@/lib/chat/citation-dom';

interface CitationsProps {
  citations: Citation[];
  /**
   * The answer text. Sources are numbered in the order the answer first cites
   * them, so the list needs the same text the markers were rendered from.
   */
  content: string;
  /** Id of the message these sources belong to, used to address the list rows. */
  messageId: string;
  /** Scheme catalogue used to label each source, e.g. `Discovery Health › KeyCare`. */
  catalog?: SchemeOption[];
  className?: string;
}

/**
 * The numbered list of sources at the foot of an answer, linking to the original
 * PDFs.
 *
 * Numbers match the inline footnote markers in the answer text. The list shows
 * exactly what the answer cites: a document the agent retrieved but never
 * referred to is not a source of the answer. If the answer cites nothing inline
 * — the model is asked to, but is not obliged to — every retrieved document is
 * listed unnumbered instead, so the answer still shows what it was grounded in.
 */
export function Citations({
  citations,
  content,
  messageId,
  catalog,
  className = '',
}: CitationsProps) {
  if (citations.length === 0) return null;

  const { cited, uncited } = buildCitationViews(citations, content, catalog);
  const fallback = cited.length === 0;
  const rows = fallback ? uncited : cited;

  return (
    <div className={`mt-3 border-t border-dashed border-outline-variant/40 pt-2.5 ${className}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
          Sources
        </span>
        {!fallback && (
          <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
            {cited.length}
          </span>
        )}
      </div>

      {rows.map((view) => (
        <CitationRow
          key={view.key}
          view={view}
          messageId={messageId}
          showStatus={!fallback}
        />
      ))}
    </div>
  );
}

function CitationRow({
  view,
  messageId,
  showStatus,
}: {
  view: CitationView;
  messageId: string;
  showStatus: boolean;
}) {
  // Unnumbered when the answer cites nothing inline at all: the document is
  // listed because it was retrieved, not because it has a footnote.
  const number = showStatus ? view.number : null;

  return (
    <div
      id={number !== null ? citationRowId(messageId, number) : undefined}
      className="flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 hover:border-outline-variant/40 hover:bg-surface-container-low/60"
    >
      {number !== null ? (
        <button
          type="button"
          onClick={() => goToCitationMarker(messageId, number)}
          aria-label={`Jump to where the answer cites source ${number}`}
          className="mt-px flex h-[17px] w-[17px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-primary/20 bg-primary/10 text-[10px] font-bold text-primary hover:bg-primary/20"
        >
          {number}
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="mt-px flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border border-outline-variant/40 bg-surface-container-low text-[10px] font-bold text-muted-foreground"
        >
          –
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-xs ${number !== null ? 'font-semibold' : 'font-medium'} text-foreground`}
          title={view.citation.title}
        >
          {view.label}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center text-[10.5px] text-muted-foreground">
          {[
            ...view.meta,
            ...(showStatus ? [number !== null ? `cited ${view.uses}×` : 'not cited inline'] : []),
          ].map((part, i) => (
            <span key={`${part}-${i}`} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className="px-1.5 text-outline-variant">
                  ·
                </span>
              )}
              {part}
            </span>
          ))}
        </div>
      </div>

      {view.href && (
        <a
          href={view.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10.5px] font-semibold text-primary hover:bg-primary/20"
        >
          <FileText className="h-3 w-3" />
          Open PDF
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      )}
    </div>
  );
}
