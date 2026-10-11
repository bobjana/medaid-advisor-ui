import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Citation } from '@/types';
import { MarkdownMessage } from './MarkdownMessage';

const KEYCARE: Citation = {
  title: 'discovery-health-medical-scheme-keycare-plan-guide.pdf',
  uri: 'gs://bucket/plans/discovery-keycare-plan-guide.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fdiscovery-keycare-plan-guide.pdf',
  excerpt: 'Unlimited hospital cover in the KeyCare network.',
};

const PRIORITY: Citation = {
  title: 'discovery-health-medical-scheme-priority-plan-guide.pdf',
  uri: 'gs://bucket/plans/discovery-priority-plan-guide.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fdiscovery-priority-plan-guide.pdf',
};

const answer = (text: string) => (
  <MarkdownMessage content={text} citations={[KEYCARE, PRIORITY]} />
);

describe('MarkdownMessage citation markers', () => {
  it('renders a source link as a numbered marker instead of a link', () => {
    render(answer(`Cover is unlimited [keycare](${KEYCARE.url}) for network hospitals.`));

    const marker = screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` });
    expect(marker).toHaveTextContent('1');
    expect(screen.queryByRole('link', { name: 'keycare' })).not.toBeInTheDocument();
  });

  it('numbers sources in the order the answer cites them', () => {
    render(
      answer(`First [priority](${PRIORITY.url}) then [keycare](${KEYCARE.url}).`),
    );

    expect(screen.getByRole('button', { name: `Source 1: ${PRIORITY.title}` })).toHaveTextContent(
      '1',
    );
    expect(screen.getByRole('button', { name: `Source 2: ${KEYCARE.title}` })).toHaveTextContent(
      '2',
    );
  });

  it('reuses the same number for a source cited more than once', () => {
    render(answer(`A [1](${KEYCARE.url}) B [2](${KEYCARE.url})`));

    const markers = screen.getAllByRole('button', { name: `Source 1: ${KEYCARE.title}` });
    expect(markers).toHaveLength(2);
    expect(markers[0]).toHaveTextContent('1');
  });

  it('matches the citation when the model trimmed the download URL', () => {
    render(answer(`Cover is unlimited [keycare](${KEYCARE.uri}).`));
    expect(screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` })).toBeInTheDocument();
  });

  it('points a storage-URI citation at the PDF the reader can open', () => {
    // The agent is told to cite the download URL but sometimes echoes the
    // gs:// URI; the link still has to reach the PDF.
    render(answer(`Cover is unlimited [keycare](${KEYCARE.uri}).`));
    fireEvent.mouseEnter(screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` }));
    expect(screen.getByRole('link', { name: /Open PDF/ })).toHaveAttribute('href', KEYCARE.url);
  });

  it('separates two directly adjacent markers with a comma', () => {
    const { container } = render(
      answer(`Both plans share this. [a](${KEYCARE.url})[b](${PRIORITY.url})`),
    );
    expect(container.querySelector('.citation-marker-sep')).toHaveTextContent(',');
  });

  it('does not separate markers that are set apart by text', () => {
    const { container } = render(
      answer(`Both plans share this [a](${KEYCARE.url}) and also [b](${PRIORITY.url}).`),
    );
    expect(container.querySelector('.citation-marker-sep')).toBeNull();
  });

  it('leaves links that are not sources alone', () => {
    render(answer('See [the scheme site](https://example.com) for details.'));
    expect(screen.getByRole('link', { name: 'the scheme site' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
  });

  it('leaves a source link as a link when the answer never cites it', () => {
    const { container } = render(
      <MarkdownMessage content={`[other](${PRIORITY.url})`} citations={[KEYCARE]} />,
    );
    expect(container.querySelector('.citation-marker')).toBeNull();
  });

  it('renders no markers without a citation list', () => {
    const { container } = render(
      <MarkdownMessage content={`[keycare](${KEYCARE.url})`} />,
    );
    expect(container.querySelector('.citation-marker')).toBeNull();
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('reports the footnote number when a marker is clicked', () => {
    const onCitationSelect = vi.fn();
    render(
      <MarkdownMessage
        content={`Cover is unlimited [keycare](${KEYCARE.url}).`}
        citations={[KEYCARE]}
        onCitationSelect={onCitationSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` }));
    expect(onCitationSelect).toHaveBeenCalledWith(1);
  });
});

describe('MarkdownMessage citation preview', () => {
  it('shows the excerpt and a link to the PDF when a marker is hovered', () => {
    render(answer(`Cover is unlimited [keycare](${KEYCARE.url}).`));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` }));

    const preview = screen.getByRole('tooltip');
    expect(preview).toHaveTextContent('Unlimited hospital cover in the KeyCare network.');
    expect(preview).toHaveTextContent('Cited 1× in this answer');
    expect(screen.getByRole('link', { name: /Open PDF/ })).toHaveAttribute('href', KEYCARE.url);
  });

  it('keeps the marker in place when the preview opens', () => {
    // The preview is rendered by a state change above the marker. If the marker
    // were remounted by it, the pointer would leave the button under the cursor
    // and the preview would close again immediately.
    render(answer(`Cover is unlimited [keycare](${KEYCARE.url}).`));
    const marker = screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` });

    fireEvent.mouseEnter(marker);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` })).toBe(marker);
  });

  it('hides the preview when the pointer leaves the marker', () => {
    render(answer(`Cover is unlimited [keycare](${KEYCARE.url}).`));
    const marker = screen.getByRole('button', { name: `Source 1: ${KEYCARE.title}` });

    fireEvent.mouseEnter(marker);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(marker);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('omits the "Open PDF" link for a source with no download URL', () => {
    render(
      <MarkdownMessage
        content="Cover [x](gs://bucket/plans/local-only.pdf)."
        citations={[{ title: 'local-only.pdf', uri: 'gs://bucket/plans/local-only.pdf' }]}
      />,
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Source 1: local-only.pdf' }));

    expect(screen.getByRole('tooltip')).toHaveTextContent('local only');
    expect(screen.queryByRole('link', { name: /Open PDF/ })).not.toBeInTheDocument();
  });
});

describe('MarkdownMessage', () => {
  it('renders a level-3 heading instead of literal ### text', () => {
    render(<MarkdownMessage content="### BonComprehensive" />);
    const heading = screen.getByRole('heading', { level: 3, name: 'BonComprehensive' });
    expect(heading).toBeInTheDocument();
  });

  it('renders bullet lists', () => {
    render(<MarkdownMessage content={'- one\n- two'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders bold and inline code', () => {
    render(<MarkdownMessage content="**bold** and `code`" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('renders links', () => {
    render(<MarkdownMessage content="[link](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('does not render raw HTML (XSS-safe)', () => {
    const { container } = render(<MarkdownMessage content="<script>alert(1)</script>" />);
    expect(container.querySelector('script')).toBeNull();
  });
});
