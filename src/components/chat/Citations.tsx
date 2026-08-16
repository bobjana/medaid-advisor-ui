'use client';

import type { Citation } from '@/types';
import { FileText, ExternalLink } from 'lucide-react';

interface CitationsProps {
  citations: Citation[];
  className?: string;
}

export function Citations({ citations, className = '' }: CitationsProps) {
  if (citations.length === 0) return null;

  return (
    <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Sources
      </span>
      {citations.map((citation, i) => (
        <a
          key={`${citation.url}-${i}`}
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          title={citation.uri ?? citation.title}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <FileText className="w-3 h-3" />
          {citation.title}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      ))}
    </div>
  );
}
