import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ContextPicker, contextLabel } from './ContextPicker';
import { SCHEME_CATALOG } from '@/lib/chat/scheme-catalog';

describe('contextLabel', () => {
  it('defaults to "All Schemes"', () => {
    expect(contextLabel({})).toBe('All Schemes');
  });

  it('uses the short scheme name', () => {
    expect(
      contextLabel({ schemeSlug: 'discovery', schemeName: 'Discovery Health Medical Scheme' }),
    ).toBe('Discovery');
  });

  it('appends the plan', () => {
    expect(
      contextLabel({
        schemeSlug: 'bonitas',
        schemeName: 'Bonitas Medical Fund',
        planId: 'boncomplete',
        planName: 'BonComplete',
      }),
    ).toBe('Bonitas › BonComplete');
  });
});

function chip() {
  return screen.getByRole('button', { name: /^Context:/ });
}

describe('ContextPicker', () => {
  it('renders the current selection on the chip', () => {
    render(
      <ContextPicker
        selection={{ schemeSlug: 'bonitas', schemeName: 'Bonitas Medical Fund' }}
        schemes={SCHEME_CATALOG}
        onSelect={vi.fn()}
      />,
    );

    expect(chip()).toHaveTextContent('Bonitas');
    expect(chip()).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('opens a tree with All Schemes as the root and only the selected scheme expanded', () => {
    render(
      <ContextPicker
        selection={{ schemeSlug: 'discovery', schemeName: 'Discovery Health Medical Scheme' }}
        schemes={SCHEME_CATALOG}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(chip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });

    expect(within(dialog).getByText('All Schemes')).toBeInTheDocument();
    expect(within(dialog).getByText('Bonitas Medical Fund')).toBeInTheDocument();
    // Selected scheme is expanded…
    expect(within(dialog).getByText('Executive Plan')).toBeInTheDocument();
    // …the other is collapsed.
    expect(within(dialog).queryByText('BonComplete')).not.toBeInTheDocument();
  });

  it('expanding a scheme is not a selection and keeps the popover open', () => {
    const onSelect = vi.fn();
    render(<ContextPicker selection={{}} schemes={SCHEME_CATALOG} onSelect={onSelect} />);

    fireEvent.click(chip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    expect(within(dialog).queryByText('BonComplete')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Expand Bonitas Medical Fund/ }));

    expect(within(dialog).getByText('BonComplete')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Scheme and plan context' })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selecting a scheme closes the popover and reports the slug', () => {
    const onSelect = vi.fn();
    render(<ContextPicker selection={{}} schemes={SCHEME_CATALOG} onSelect={onSelect} />);

    fireEvent.click(chip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    fireEvent.click(within(dialog).getByText('Bonitas Medical Fund'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith({
      schemeSlug: 'bonitas',
      schemeName: 'Bonitas Medical Fund',
    });
  });

  it('selecting a plan reports the scheme and plan id', () => {
    const onSelect = vi.fn();
    render(<ContextPicker selection={{}} schemes={SCHEME_CATALOG} onSelect={onSelect} />);

    fireEvent.click(chip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    fireEvent.click(within(dialog).getByRole('button', { name: /Expand Bonitas Medical Fund/ }));
    fireEvent.click(within(dialog).getByText('BonComplete'));

    expect(onSelect).toHaveBeenCalledWith({
      schemeSlug: 'bonitas',
      schemeName: 'Bonitas Medical Fund',
      planId: 'boncomplete',
      planName: 'BonComplete',
    });
  });

  it('selecting All Schemes clears the context', () => {
    const onSelect = vi.fn();
    render(
      <ContextPicker
        selection={{ schemeSlug: 'bonitas', schemeName: 'Bonitas Medical Fund' }}
        schemes={SCHEME_CATALOG}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(chip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    fireEvent.click(within(dialog).getByText('All Schemes'));

    expect(onSelect).toHaveBeenCalledWith({});
  });

  it('closes via the visible ✕ button (no need to know Esc)', () => {
    render(<ContextPicker selection={{}} schemes={SCHEME_CATALOG} onSelect={vi.fn()} />);

    fireEvent.click(chip());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
