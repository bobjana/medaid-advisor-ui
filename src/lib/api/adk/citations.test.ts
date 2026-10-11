import { describe, it, expect } from 'vitest';
import { extractCitations } from './parse';

/** Wrap a tool result the way the agent's `search_benefits` returns it. */
function eventWithResult(result: string) {
  return {
    content: {
      parts: [{ function_response: { name: 'search_benefits', response: { result } } }],
    },
  };
}

function block(options: {
  title: string;
  uri?: string;
  download?: string;
  body?: string;
  excerpt?: number;
}): string {
  const lines = [`[Excerpt ${options.excerpt ?? 1}]`, `Source: ${options.title}`];
  if (options.uri) lines.push(`Source URI: ${options.uri}`);
  if (options.download) lines.push(`Download: ${options.download}`);
  if (options.body) lines.push('', options.body);
  return lines.join('\n');
}

describe('extractCitations', () => {
  it('reads the source, storage URI, download link and excerpt', () => {
    expect(
      extractCitations(
        eventWithResult(
          block({
            title: 'discovery-keycare-plan-guide.pdf',
            uri: 'gs://bucket/plans/keycare.pdf',
            download: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fkeycare.pdf',
            body: 'Unlimited hospital cover in the KeyCare network.',
          }),
        ),
      ),
    ).toEqual([
      {
        title: 'discovery-keycare-plan-guide.pdf',
        uri: 'gs://bucket/plans/keycare.pdf',
        url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fkeycare.pdf',
        excerpt: 'Unlimited hospital cover in the KeyCare network.',
      },
    ]);
  });

  it('keeps a source that has no download link', () => {
    // The agent only emits `Download:` for gs:// sources, so a source without
    // one must still be listed — it just has nothing to open.
    const citations = extractCitations(
      eventWithResult(block({ title: 'local-guide.pdf', body: 'Some excerpt.' })),
    );
    expect(citations).toEqual([
      { title: 'local-guide.pdf', excerpt: 'Some excerpt.' },
    ]);
  });

  it('keeps a source that has a download link but no storage URI', () => {
    const citations = extractCitations(
      eventWithResult(
        block({ title: 'guide.pdf', download: 'https://host/download?uri=gs%3A%2F%2Fb%2Fg.pdf' }),
      ),
    );
    expect(citations[0]).toMatchObject({
      title: 'guide.pdf',
      url: 'https://host/download?uri=gs%3A%2F%2Fb%2Fg.pdf',
    });
    expect(citations[0].uri).toBeUndefined();
  });

  it('reads every excerpt in a multi-source result', () => {
    const result = [
      block({
        title: 'a.pdf',
        uri: 'gs://b/a.pdf',
        download: 'https://host/d?uri=a',
        body: 'First.',
        excerpt: 1,
      }),
      '---',
      block({
        title: 'b.pdf',
        uri: 'gs://b/b.pdf',
        download: 'https://host/d?uri=b',
        body: 'Second.',
        excerpt: 2,
      }),
    ].join('\n\n');

    expect(extractCitations(eventWithResult(result)).map((c) => c.title)).toEqual([
      'a.pdf',
      'b.pdf',
    ]);
  });

  it('merges repeated references to the same document', () => {
    const result = [
      block({ title: 'a.pdf', uri: 'gs://b/a.pdf', download: 'https://host/d?uri=a', excerpt: 1 }),
      '---',
      block({
        title: 'a.pdf',
        uri: 'gs://b/a.pdf',
        download: 'https://host/d?uri=a',
        body: 'Additional detail from a later chunk.',
        excerpt: 2,
      }),
    ].join('\n\n');

    // The first block wins, but nothing a later block knows is lost.
    expect(extractCitations(eventWithResult(result))).toEqual([
      {
        title: 'a.pdf',
        uri: 'gs://b/a.pdf',
        url: 'https://host/d?uri=a',
        excerpt: 'Additional detail from a later chunk.',
      },
    ]);
  });

  it('tolerates blank lines and whitespace inside the header block', () => {
    const result =
      '[Excerpt 1]\n\nSource:   spaced out.pdf  \n\nSource URI: gs://b/spaced.pdf\n' +
      'Download: https://host/d?uri=spaced\n\nBody text.';

    expect(extractCitations(eventWithResult(result))).toEqual([
      {
        title: 'spaced out.pdf',
        uri: 'gs://b/spaced.pdf',
        url: 'https://host/d?uri=spaced',
        excerpt: 'Body text.',
      },
    ]);
  });

  it('ignores the tool\'s "no excerpts found" message', () => {
    expect(
      extractCitations(
        eventWithResult('No relevant excerpts found in the plan guides. Please try rephrasing.'),
      ),
    ).toEqual([]);
  });

  it('does not mistake a quoted "Source:" line for a second citation', () => {
    const result = block({
      title: 'a.pdf',
      uri: 'gs://b/a.pdf',
      download: 'https://host/d?uri=a',
      body: 'The guide says:\nSource: something else\nwhich is worth noting.',
    });

    const citations = extractCitations(eventWithResult(result));
    expect(citations).toHaveLength(1);
    expect(citations[0].title).toBe('a.pdf');
    expect(citations[0].excerpt).toBe(
      'The guide says: Source: something else which is worth noting.',
    );
  });

  it('caps a very long excerpt', () => {
    const citations = extractCitations(
      eventWithResult(block({ title: 'a.pdf', body: 'x'.repeat(900) })),
    );
    expect(citations[0].excerpt).toHaveLength(400);
  });

  it('ignores events without a usable result', () => {
    expect(extractCitations(null)).toEqual([]);
    expect(extractCitations({ content: { parts: [] } })).toEqual([]);
    expect(extractCitations({ content: { parts: [{ function_response: {} }] } })).toEqual([]);
    expect(
      extractCitations({ content: { parts: [{ function_response: { response: { result: 42 } } }] } }),
    ).toEqual([]);
  });
});
