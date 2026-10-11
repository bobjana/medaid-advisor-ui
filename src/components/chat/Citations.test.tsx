import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Citation } from '@/types';
import { Citations } from './Citations';

const KEYCARE: Citation = {
  title: 'discovery-health-medical-scheme-keycare-plan-guide.pdf',
  uri: 'gs://bucket/plans/discovery-keycare-plan-guide.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fdiscovery-keycare-plan-guide.pdf',
  excerpt: 'Unlimited hospital cover.',
};

const PRIORITY: Citation = {
  title: 'discovery-health-medical-scheme-priority-plan-guide.pdf',
  uri: 'gs://bucket/plans/discovery-priority-plan-guide.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fdiscovery-priority-plan-guide.pdf',
};

const BONCAP: Citation = {
  title: 'Boncap-2026.pdf',
  uri: 'gs://bucket/plans/bonitas/Boncap-2026.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fbonitas%2FBoncap-2026.pdf',
};

function list(citations: Citation[], content: string) {
  return (
    <Citations citations={citations} content={content} messageId="m1" catalog={undefined} />
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Citations', () => {
  it('renders nothing when the answer has no sources', () => {
    const { container } = render(list([], ''));
    expect(container).toBeEmptyDOMElement();
  });

  it('numbers the sources the answer cites, in reading order', () => {
    render(
      list(
        [KEYCARE, PRIORITY],
        `First [a](${PRIORITY.url}) then [b](${KEYCARE.url}).`,
      ),
    );

    const rows = screen.getAllByRole('link', { name: /Open PDF/ });
    expect(rows[0]).toHaveAttribute('href', PRIORITY.url);
    expect(rows[1]).toHaveAttribute('href', KEYCARE.url);
    expect(screen.getByText('discovery health medical scheme priority plan guide')).toBeInTheDocument();
  });

  it('links each row to the original PDF', () => {
    render(list([KEYCARE], `Cover [a](${KEYCARE.url}).`));

    const open = screen.getByRole('link', { name: /Open PDF/ });
    expect(open).toHaveAttribute('href', KEYCARE.url);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows how many times the answer cites each source', () => {
    render(list([KEYCARE], `A [1](${KEYCARE.url}) B [2](${KEYCARE.url}).`));
    expect(screen.getByText('cited 2×')).toBeInTheDocument();
  });

  it('does not list retrieved sources the answer never cites', () => {
    render(list([KEYCARE, BONCAP], `Cover [a](${KEYCARE.url}).`));

    expect(screen.queryByText('Boncap 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Also consulted')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open PDF/ })).toHaveLength(1);
  });

  it('lists every retrieved source when the answer cites none of them', () => {
    // The model is not obliged to inline-link. Showing nothing would hide the
    // documents the answer was grounded in, so they are listed unnumbered.
    render(list([KEYCARE, BONCAP], 'Cover is unlimited.'));

    expect(screen.getByText('discovery health medical scheme keycare plan guide')).toBeInTheDocument();
    expect(screen.getByText('Boncap 2026')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open PDF/ })).toHaveLength(2);
    // No numbers and no "cited" claim, because nothing is cited inline.
    expect(screen.queryByText(/^cited/)).not.toBeInTheDocument();
    expect(screen.queryByText('not cited inline')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Jump to where/ })).not.toBeInTheDocument();
  });

  it('renders no download link for a source without one', () => {
    render(
      list(
        [{ title: 'local.pdf', uri: 'gs://bucket/plans/local.pdf' }],
        'Cover [a](gs://bucket/plans/local.pdf).',
      ),
    );

    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open PDF/ })).not.toBeInTheDocument();
  });

  it('describes each source with its scheme and plan where the catalogue knows it', () => {
    render(list([KEYCARE, BONCAP], `[a](${KEYCARE.url}) [b](${BONCAP.url})`));

    // `Boncap-2026.pdf` names its plan; the KeyCare guide names a plan the
    // catalogue does not list (`keycare_plus`), so only the scheme is shown —
    // better a partial label than an invented plan.
    expect(screen.getByText('Discovery Health Medical Scheme')).toBeInTheDocument();
    expect(screen.getByText('Bonitas Medical Fund › BonCap')).toBeInTheDocument();
  });

  it('jumps to the first inline use when a row number is clicked', () => {
    render(
      <>
        <div data-message-id="m1">
          <span data-citation-marker="1">1</span>
          <Citations citations={[KEYCARE]} content={`[a](${KEYCARE.url})`} messageId="m1" />
        </div>
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Jump to where the answer cites source 1/ }));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(document.querySelector('[data-citation-marker="1"]')?.className).toContain(
      'citation-flash',
    );
  });

  it('applies the flash class to the row a marker jumped to', () => {
    render(
      <Citations citations={[KEYCARE]} content={`[a](${KEYCARE.url})`} messageId="m1" />,
    );

    const row = document.getElementById('source-m1-1');
    expect(row).not.toBeNull();
    expect(row?.className).not.toContain('citation-flash');
  });
});
