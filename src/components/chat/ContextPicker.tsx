'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, X } from 'lucide-react';
import type { SchemeOption } from '@/types';

export interface ContextSelection {
  /** Scheme slug, or undefined for "All Schemes". */
  schemeSlug?: string;
  /** Scheme display name. */
  schemeName?: string;
  /** Plan id, or undefined for scheme-wide. */
  planId?: string;
  /** Plan display name. */
  planName?: string;
}

interface ContextPickerProps {
  selection: ContextSelection;
  schemes: SchemeOption[];
  /** Called when the user commits a selection. Closes the popover first. */
  onSelect: (next: ContextSelection) => void;
  /** True while the context update is in flight. */
  busy?: boolean;
}

/** Short labels for the chip; the tree always shows the full scheme name. */
const SCHEME_SHORT: Record<string, string> = {
  bonitas: 'Bonitas',
  discovery: 'Discovery',
};

export function contextLabel(selection: ContextSelection): string {
  if (!selection.schemeSlug) return 'All Schemes';
  const short =
    SCHEME_SHORT[selection.schemeSlug] ?? selection.schemeName ?? selection.schemeSlug;
  return selection.planName ? `${short} › ${selection.planName}` : short;
}

function nodeClass(selected: boolean): string {
  return [
    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors',
    selected
      ? 'bg-primary/10 text-primary font-semibold'
      : 'text-foreground hover:bg-surface-container-high',
  ].join(' ');
}

export function ContextPicker({ selection, schemes, onSelect, busy = false }: ContextPickerProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(selection.schemeSlug ? [selection.schemeSlug] : []),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const label = contextLabel(selection);
  const isAll = !selection.schemeSlug;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggleOpen() {
    // Make sure the currently selected scheme is expanded when re-opening.
    if (!open && selection.schemeSlug) {
      setExpanded((prev) => new Set(prev).add(selection.schemeSlug as string));
    }
    setOpen((value) => !value);
  }

  function toggleScheme(slug: string) {
    // Expanding/collapsing is NOT a selection — the popover stays open.
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function choose(next: ContextSelection) {
    if (next.schemeSlug) {
      setExpanded((prev) => new Set(prev).add(next.schemeSlug as string));
    }
    setOpen(false);
    onSelect(next);
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={busy}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Context: ${label}. Change scheme or plan`}
        title="Change scheme or plan context"
        className={[
          'inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs transition-colors disabled:opacity-60',
          isAll
            ? 'border-outline-variant/40 bg-surface-container-high font-medium text-muted-foreground hover:bg-surface-container-high/70'
            : 'border-primary/30 bg-primary/10 font-semibold text-primary hover:bg-primary/20',
        ].join(' ')}
      >
        <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="max-w-[180px] truncate">{label}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Scheme and plan context"
          className="absolute bottom-[calc(100%+8px)] left-0 z-30 flex max-h-96 w-80 flex-col overflow-hidden rounded-xl border border-outline-variant/40 bg-card shadow-xl"
        >
          <div className="flex items-start justify-between gap-2 border-b border-outline-variant/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold text-foreground">Scheme &amp; plan</p>
              <p className="text-[10px] text-muted-foreground">Applies to your next question</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            <button type="button" onClick={() => choose({})} className={nodeClass(isAll)}>
              <span className="w-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">All Schemes</span>
              {isAll && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            </button>

            <div className="my-1.5 h-px bg-outline-variant/30" />

            {schemes.map((scheme) => {
              const schemeSelected = selection.schemeSlug === scheme.slug && !selection.planId;
              const isExpanded = expanded.has(scheme.slug);
              return (
                <div key={scheme.slug}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container-high">
                    <button
                      type="button"
                      onClick={() => toggleScheme(scheme.slug)}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${scheme.name}`}
                      aria-expanded={isExpanded}
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded text-muted-foreground hover:bg-primary/10"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => choose({ schemeSlug: scheme.slug, schemeName: scheme.name })}
                      className={`flex-1 truncate text-left text-[13px] ${
                        schemeSelected ? 'font-semibold text-primary' : 'text-foreground'
                      }`}
                    >
                      {scheme.name}
                    </button>
                    {schemeSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="pl-6">
                      <button
                        type="button"
                        onClick={() => choose({ schemeSlug: scheme.slug, schemeName: scheme.name })}
                        className={nodeClass(!selection.planId && selection.schemeSlug === scheme.slug)}
                      >
                        <span className="w-[18px] shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">All plans</span>
                        {!selection.planId && selection.schemeSlug === scheme.slug && (
                          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                      {scheme.plans.map((plan) => {
                        const planSelected =
                          selection.schemeSlug === scheme.slug && selection.planId === plan.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() =>
                              choose({
                                schemeSlug: scheme.slug,
                                schemeName: scheme.name,
                                planId: plan.id,
                                planName: plan.name,
                              })
                            }
                            className={nodeClass(planSelected)}
                          >
                            <span className="w-[18px] shrink-0" aria-hidden="true" />
                            <span className="flex-1 truncate font-normal">{plan.name}</span>
                            {planSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-outline-variant/30 px-3 py-2 text-[10px] text-muted-foreground">
            Selecting applies it to your next question
          </div>
        </div>
      )}
    </div>
  );
}
