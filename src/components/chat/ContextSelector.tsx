'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { ContextOptions, SchemeOption } from '@/types';
import { nowMs } from '@/lib/utils';

const CHIP_CLASS =
  'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors';

export interface PlanDecision {
  /** Total countdown length in milliseconds (drives the progress bar). */
  durationMs: number;
  /** Epoch timestamp in ms when the default "All plans" choice is applied. */
  deadline: number;
  /** Invoked when the user explicitly picks "All plans". */
  onSelectAll: () => void;
}

interface ContextSelectorProps {
  options: ContextOptions;
  onSelect: (selection: string, type: 'scheme' | 'plan') => void;
  /**
   * Present while a scheme has just been chosen and we are giving the user a
   * short window to narrow down to a specific plan before continuing with all
   * of them. Renders an "All plans" chip selected by default plus a countdown.
   */
  planDecision?: PlanDecision;
}

/** Ticks down to `deadline`, clamped to `[0, durationMs]`. */
function useRemainingMs(deadline: number | undefined, durationMs: number): number {
  const [now, setNow] = useState(() => nowMs());

  useEffect(() => {
    if (deadline === undefined) return;
    const id = setInterval(() => setNow(nowMs()), 100);
    return () => clearInterval(id);
  }, [deadline]);

  if (deadline === undefined) return 0;
  return Math.min(durationMs, Math.max(0, deadline - now));
}

function SchemeChips({
  schemes,
  selectedSlug,
}: {
  schemes: SchemeOption[];
  selectedSlug?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {schemes.map((scheme) => {
        const selected = scheme.slug === selectedSlug;
        return (
          <span
            key={scheme.slug}
            aria-current={selected ? 'true' : undefined}
            className={
              selected
                ? 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/40'
                : 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-container-high text-muted-foreground border border-outline-variant/30'
            }
          >
            {selected && <Check className="w-3 h-3" aria-hidden="true" />}
            {scheme.name}
          </span>
        );
      })}
    </div>
  );
}

export function ContextSelector({ options, onSelect, planDecision }: ContextSelectorProps) {
  const remaining = useRemainingMs(planDecision?.deadline, planDecision?.durationMs ?? 0);

  if (options.type === 'scheme_selection' && options.schemes) {
    return (
      <div className="mb-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Select a scheme</p>
        <div className="flex flex-wrap gap-2">
          {options.schemes.map((scheme) => (
            <button
              key={scheme.slug}
              type="button"
              onClick={() => onSelect(scheme.name, 'scheme')}
              className={CHIP_CLASS}
            >
              {scheme.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (options.type === 'plan_selection' && options.plans) {
    const seconds = Math.ceil(remaining / 1000);
    const pct = planDecision && planDecision.durationMs > 0
      ? (remaining / planDecision.durationMs) * 100
      : 0;

    return (
      <div className="mb-3 space-y-3">
        {options.schemes && options.schemes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Scheme</p>
            <SchemeChips schemes={options.schemes} selectedSlug={options.scheme} />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Select a plan</p>
          <div className="flex flex-wrap gap-2">
            {planDecision && (
              <button
                type="button"
                onClick={planDecision.onSelectAll}
                aria-label="Use all plans"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground border border-primary shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                All plans
                <span className="tabular-nums" aria-hidden="true">
                  {seconds}s
                </span>
              </button>
            )}
            {options.plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelect(plan.name, 'plan')}
                className={CHIP_CLASS}
              >
                {plan.name}
              </button>
            ))}
          </div>
          {planDecision && (
            <div className="mt-2 max-w-xs">
              <div className="h-1 w-full rounded-full bg-primary/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%`, transition: 'width 100ms linear' }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">
                Using all plans by default — continuing in {seconds}s
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
