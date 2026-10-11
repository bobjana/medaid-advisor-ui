'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { Citation } from '@/types';
import { displayLabel } from '@/lib/chat/citations';

interface CitationPreviewProps {
  citation: Citation;
  number: number;
  /** How many times the answer cites this source inline. */
  uses: number;
  /** Secondary line, e.g. `Discovery Health › KeyCare · Plan guide`. */
  meta: string[];
  /** The marker the card is anchored to. */
  anchor: DOMRect;
  onDismiss: () => void;
}

const CARD_WIDTH = 300;
const GAP = 10;
const MARGIN = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * The card shown when a reader inspects an inline citation marker: which
 * document it is, which scheme and plan it covers, the excerpt the answer drew
 * on, and a link to the original PDF.
 *
 * Fixed-positioned and clamped to the viewport, so the transcript's scrolling
 * container cannot clip it. It prefers to sit above the marker and flips below
 * when there is no room; the position is measured before paint to avoid a
 * visible jump.
 */
export function CitationPreview({
  citation,
  number,
  uses,
  meta,
  anchor,
  onDismiss,
}: CitationPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const height = cardRef.current?.offsetHeight ?? 0;
    const left = clamp(
      anchor.left + anchor.width / 2 - CARD_WIDTH / 2,
      MARGIN,
      window.innerWidth - CARD_WIDTH - MARGIN,
    );
    const above = anchor.top - GAP - height;
    const below = anchor.bottom + GAP;
    const fitsAbove = above >= MARGIN;
    const top = fitsAbove ? above : below + height + MARGIN > window.innerHeight ? above : below;
    setPlacement({ left, top: Math.max(MARGIN, top) });
  }, [anchor]);

  return (
    <div
      ref={cardRef}
      role="tooltip"
      className="fixed z-50 rounded-xl border border-outline-variant/40 bg-popover p-3 shadow-lg"
      style={{ width: CARD_WIDTH, left: placement?.left ?? -9999, top: placement?.top ?? -9999 }}
      onMouseLeave={onDismiss}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
          {number}
        </span>
        <span className="text-xs leading-snug font-semibold break-words text-foreground">
          {displayLabel(citation)}
        </span>
      </div>

      {meta.length > 0 && (
        <div className="mt-1 pl-6 text-[10.5px] text-muted-foreground">{meta.join(' · ')}</div>
      )}

      {citation.excerpt && (
        <blockquote className="mt-2 border-l-2 border-primary/30 bg-surface-container-low py-1.5 pr-2 pl-2 text-[11.5px] leading-relaxed text-on-surface-variant">
          {citation.excerpt}
        </blockquote>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 pl-6">
        <span className="text-[10px] text-muted-foreground">Cited {uses}× in this answer</span>
        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10.5px] font-semibold text-primary hover:bg-primary/20"
          >
            <FileText className="h-3 w-3" />
            Open PDF
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}
      </div>
    </div>
  );
}
