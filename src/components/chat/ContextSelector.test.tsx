import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextSelector, type PlanDecision } from './ContextSelector';
import type { ContextOptions } from '@/types';

const SCHEME_OPTIONS: ContextOptions = {
  type: 'scheme_selection',
  schemes: [
    {
      slug: 'discovery',
      name: 'Discovery Health Medical Scheme',
      plans: [{ id: 'executive', name: 'Executive Plan' }],
    },
    {
      slug: 'bonitas',
      name: 'Bonitas Medical Fund',
      plans: [{ id: 'boncomplete', name: 'BonComplete' }],
    },
  ],
};

const PLAN_OPTIONS: ContextOptions = {
  type: 'plan_selection',
  plans: [
    { id: 'executive', name: 'Executive Plan' },
    { id: 'classic_comprehensive', name: 'Classic Comprehensive' },
  ],
};

const PLAN_OPTIONS_WITH_SCHEME: ContextOptions = {
  type: 'plan_selection',
  scheme: 'bonitas',
  schemes: SCHEME_OPTIONS.schemes,
  plans: [
    { id: 'boncomplete', name: 'BonComplete' },
    { id: 'boncap', name: 'BonCap' },
  ],
};

function planDecision(overrides: Partial<PlanDecision> = {}): PlanDecision {
  return {
    durationMs: 3000,
    deadline: Date.now() + 3000,
    onSelectAll: vi.fn(),
    ...overrides,
  };
}

describe('ContextSelector', () => {
  it('renders scheme chips', () => {
    const onSelect = vi.fn();
    render(<ContextSelector options={SCHEME_OPTIONS} onSelect={onSelect} />);

    expect(screen.getByText('Select a scheme')).toBeInTheDocument();
    expect(screen.getByText('Discovery Health Medical Scheme')).toBeInTheDocument();
    expect(screen.getByText('Bonitas Medical Fund')).toBeInTheDocument();
  });

  it('calls onSelect with the scheme name on chip click', () => {
    const onSelect = vi.fn();
    render(<ContextSelector options={SCHEME_OPTIONS} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Discovery Health Medical Scheme'));
    expect(onSelect).toHaveBeenCalledWith('Discovery Health Medical Scheme', 'scheme');
  });

  it('renders plan chips', () => {
    const onSelect = vi.fn();
    render(<ContextSelector options={PLAN_OPTIONS} onSelect={onSelect} />);

    expect(screen.getByText('Select a plan')).toBeInTheDocument();
    expect(screen.getByText('Executive Plan')).toBeInTheDocument();
    expect(screen.getByText('Classic Comprehensive')).toBeInTheDocument();
  });

  it('calls onSelect with the plan name on chip click', () => {
    const onSelect = vi.fn();
    render(<ContextSelector options={PLAN_OPTIONS} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Executive Plan'));
    expect(onSelect).toHaveBeenCalledWith('Executive Plan', 'plan');
  });

  it('shows the chosen scheme above its plans, marked as selected', () => {
    render(<ContextSelector options={PLAN_OPTIONS_WITH_SCHEME} onSelect={vi.fn()} />);

    const schemeLabel = screen.getByText('Scheme');
    const planLabel = screen.getByText('Select a plan');
    expect(schemeLabel).toBeInTheDocument();
    expect(planLabel).toBeInTheDocument();
    // The scheme row must come first, plans below it.
    expect(
      schemeLabel.compareDocumentPosition(planLabel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const selected = screen.getByText('Bonitas Medical Fund');
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Discovery Health Medical Scheme')).not.toHaveAttribute('aria-current');
  });

  it('defaults to "All plans" with a countdown when a decision is pending', () => {
    const onSelectAll = vi.fn();
    render(
      <ContextSelector
        options={PLAN_OPTIONS_WITH_SCHEME}
        onSelect={vi.fn()}
        planDecision={planDecision({ onSelectAll })}
      />,
    );

    const all = screen.getByRole('button', { name: 'Use all plans' });
    expect(all).toBeInTheDocument();
    expect(screen.getByText(/Using all plans by default/)).toBeInTheDocument();

    fireEvent.click(all);
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('picking a specific plan still calls onSelect before the default expires', () => {
    const onSelect = vi.fn();
    render(
      <ContextSelector
        options={PLAN_OPTIONS_WITH_SCHEME}
        onSelect={onSelect}
        planDecision={planDecision()}
      />,
    );

    fireEvent.click(screen.getByText('BonCap'));
    expect(onSelect).toHaveBeenCalledWith('BonCap', 'plan');
  });

  it('omits the "All plans" default when no decision is pending', () => {
    render(<ContextSelector options={PLAN_OPTIONS_WITH_SCHEME} onSelect={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Use all plans' })).not.toBeInTheDocument();
  });

  it('renders nothing for unknown option types', () => {
    const { container } = render(
      <ContextSelector options={{ type: 'unknown' } as unknown as ContextOptions} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
