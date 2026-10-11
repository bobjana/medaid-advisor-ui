import { describe, it, expect } from 'vitest';
import type { Citation, SchemeOption } from '@/types';
import {
  buildCitationViews,
  citationKey,
  citationKeys,
  citationNumbers,
  citationResolver,
  describeCitation,
  displayLabel,
  indexCitations,
  mergeCitations,
  resolveCitation,
} from './citations';

const KEYCARE: Citation = {
  title: 'discovery-health-medical-scheme-keycare-plan-guide.pdf',
  uri: 'gs://medaid-plan-guides/discovery/discovery-health-medical-scheme-keycare-plan-guide.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fmedaid-plan-guides%2Fdiscovery%2Fdiscovery-health-medical-scheme-keycare-plan-guide.pdf',
  excerpt: 'Unlimited hospital cover at KeyCare network hospitals.',
};

const PRIORITY: Citation = {
  title: 'discovery-health-medical-scheme-priority-plan-guide.pdf',
  uri: 'gs://medaid-plan-guides/discovery/discovery-health-medical-scheme-priority-plan-guide.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fmedaid-plan-guides%2Fdiscovery%2Fdiscovery-health-medical-scheme-priority-plan-guide.pdf',
};

const BONCAP: Citation = {
  title: 'Boncap-2026.pdf',
  uri: 'gs://medaid-plan-guides/bonitas/Boncap-2026.pdf',
  url: 'https://host/download?uri=gs%3A%2F%2Fmedaid-plan-guides%2Fbonitas%2FBoncap-2026.pdf',
};

const CATALOG: SchemeOption[] = [
  {
    slug: 'bonitas',
    name: 'Bonitas Medical Fund',
    plans: [{ id: 'boncap', name: 'BonCap' }],
  },
  {
    slug: 'discovery',
    name: 'Discovery Health Medical Scheme',
    plans: [
      { id: 'keycare', name: 'KeyCare' },
      { id: 'priority', name: 'Priority' },
    ],
  },
];

describe('displayLabel', () => {
  it('strips the extension and turns separators into spaces', () => {
    expect(displayLabel(KEYCARE)).toBe('discovery health medical scheme keycare plan guide');
  });

  it('drops the (1) that crawling tools append', () => {
    expect(displayLabel({ title: 'Bestmed 2026 Comparative Guide (1).pdf' })).toBe(
      'Bestmed 2026 Comparative Guide',
    );
  });

  it('falls back to "Source" when there is no usable title', () => {
    expect(displayLabel({ title: '   ' })).toBe('Source');
  });
});

describe('citationKeys', () => {
  it('keys a citation by its URL, URI and filename', () => {
    const keys = citationKeys(KEYCARE);
    // Keys are normalised (decoded, lower-cased) so that matching does not
    // depend on how the model happened to encode the URL.
    expect(keys).toContain(KEYCARE.uri);
    expect(keys.some((key) => key.includes('/download?'))).toBe(true);
    expect(keys.some((key) => key.endsWith('keycare-plan-guide.pdf'))).toBe(true);
  });

  it('recovers the storage URI embedded in a download URL', () => {
    const keys = citationKeys(KEYCARE);
    expect(keys).toContain(
      'gs://medaid-plan-guides/discovery/discovery-health-medical-scheme-keycare-plan-guide.pdf',
    );
  });

  it('is stable regardless of URL encoding or trailing slashes', () => {
    const encoded = citationKeys(KEYCARE)[0];
    expect(encoded).toBe(encoded.toLowerCase());
    expect(citationKey(KEYCARE)).toBe(encoded);
    expect(citationKey({ ...KEYCARE, url: `${KEYCARE.url}/` })).toBe(encoded);
  });

  it('lists a title-only citation under its filename', () => {
    expect(citationKey({ title: 'Boncap-2026.pdf' })).toBe('boncap-2026.pdf');
  });
});

describe('resolveCitation', () => {
  const index = indexCitations([KEYCARE, PRIORITY]);

  it('matches on the exact download URL', () => {
    expect(resolveCitation(KEYCARE.url, KEYCARE.title, index)).toBe(KEYCARE);
  });

  it('matches when the model trims the URL back to the storage URI', () => {
    expect(resolveCitation(KEYCARE.uri, undefined, index)).toBe(KEYCARE);
  });

  it('matches when the model re-encodes the download URL', () => {
    const reEncoded = KEYCARE.url!.replace('gs%3A%2F%2F', 'gs://');
    expect(resolveCitation(reEncoded, undefined, index)).toBe(KEYCARE);
  });

  it('falls back to the link text when the target is unrecognised', () => {
    expect(resolveCitation('https://example.com/redirect', KEYCARE.title, index)).toBe(KEYCARE);
  });

  it('does not match unrelated links', () => {
    expect(resolveCitation('https://example.com/other.pdf', 'other.pdf', index)).toBeUndefined();
    expect(resolveCitation(undefined, undefined, index)).toBeUndefined();
  });
});

describe('buildCitationViews', () => {
  const citations = [KEYCARE, PRIORITY, BONCAP];

  it('numbers sources in the order the answer first cites them', () => {
    const content =
      `Cover is unlimited. [keycare](${KEYCARE.url}) ` +
      `Priority is capped. [priority](${PRIORITY.url})`;

    const { cited, uncited } = buildCitationViews(citations, content, CATALOG);

    expect(cited.map((view) => [view.number, view.label.split(' ').pop()])).toEqual([
      [1, 'guide'],
      [2, 'guide'],
    ]);
    expect(cited[0].citation).toBe(KEYCARE);
    expect(cited[1].citation).toBe(PRIORITY);
    expect(uncited.map((view) => view.citation)).toEqual([BONCAP]);
    expect(uncited[0].number).toBeNull();
  });

  it('numbers by reading order, not by the order of the citation list', () => {
    const content = `See [a](${PRIORITY.url}) then [b](${KEYCARE.url})`;
    const { cited } = buildCitationViews(citations, content, CATALOG);
    expect(cited.map((view) => view.citation)).toEqual([PRIORITY, KEYCARE]);
    expect(cited.map((view) => view.number)).toEqual([1, 2]);
  });

  it('counts repeated references to one source under a single number', () => {
    const content = `A [1](${KEYCARE.url}) B [2](${KEYCARE.url}) C [3](${KEYCARE.url})`;
    const { cited } = buildCitationViews(citations, content, CATALOG);
    expect(cited).toHaveLength(1);
    expect(cited[0].number).toBe(1);
    expect(cited[0].uses).toBe(3);
  });

  it('counts a bare URL once', () => {
    const content = `See [keycare](${KEYCARE.url}) and also ${KEYCARE.url} for detail.`;
    const { cited } = buildCitationViews([KEYCARE], content, CATALOG);
    expect(cited[0].uses).toBe(2);
  });

  it('ignores links inside fenced code blocks', () => {
    const content = '```\n' + `[keycare](${KEYCARE.url})` + '\n```\nNo citation here.';
    const { cited, uncited } = buildCitationViews([KEYCARE], content, CATALOG);
    expect(cited).toEqual([]);
    expect(uncited).toHaveLength(1);
  });

  it('ignores markdown links that are not sources', () => {
    const { cited, uncited } = buildCitationViews(
      citations,
      'See [the scheme website](https://example.com) for more.',
      CATALOG,
    );
    expect(cited).toEqual([]);
    expect(uncited).toHaveLength(3);
  });

  it('describes each source with its scheme and plan', () => {
    const { cited } = buildCitationViews(
      [KEYCARE, BONCAP],
      `[a](${KEYCARE.url}) [b](${BONCAP.url})`,
      CATALOG,
    );
    expect(cited[0].meta).toEqual(['Discovery Health Medical Scheme › KeyCare', 'Plan guide']);
    // Filenames like `Boncap-2026.pdf` name the plan, not the scheme.
    expect(cited[1].meta).toEqual(['Bonitas Medical Fund › BonCap', 'Plan guide']);
  });

  it('handles an empty answer and an empty source list', () => {
    expect(buildCitationViews([], '', CATALOG)).toEqual({ cited: [], uncited: [] });
    expect(buildCitationViews([KEYCARE], '', CATALOG).uncited).toHaveLength(1);
  });
});

describe('citationNumbers', () => {
  it('maps each cited source to its footnote number', () => {
    const numbers = citationNumbers(
      [KEYCARE, PRIORITY],
      `[a](${PRIORITY.url}) [b](${KEYCARE.url})`,
    );
    expect(numbers.get(citationKey(PRIORITY))).toBe(1);
    expect(numbers.get(citationKey(KEYCARE))).toBe(2);
  });
});

describe('citationResolver', () => {
  const content = `A [1](${KEYCARE.url}) B [2](${KEYCARE.url}) C [3](${PRIORITY.url})`;
  const resolver = citationResolver([KEYCARE, PRIORITY, BONCAP], content, CATALOG);

  it('resolves a link to its citation and number', () => {
    const citation = resolver.resolve(KEYCARE.url, KEYCARE.title);
    expect(citation).toBe(KEYCARE);
    expect(resolver.numberOf(citation!)).toBe(1);
  });

  it('reports how many times a source is cited', () => {
    expect(resolver.usesOf(KEYCARE)).toBe(2);
    expect(resolver.usesOf(PRIORITY)).toBe(1);
  });

  it('has no number for a source the answer never cites', () => {
    expect(resolver.numberOf(BONCAP)).toBeUndefined();
    expect(resolver.resolve(BONCAP.url, BONCAP.title)).toBe(BONCAP);
  });

  it('describes a source for the preview card', () => {
    expect(resolver.describe(KEYCARE)).toEqual([
      'Discovery Health Medical Scheme › KeyCare',
      'Plan guide',
    ]);
  });
});

describe('describeCitation', () => {
  it('returns nothing for an unrecognised source', () => {
    expect(describeCitation({ title: 'Some Other Scheme Guide.pdf' }, CATALOG)).toEqual([
      'Plan guide',
    ]);
  });

  it('omits the kind for a source that is not a PDF', () => {
    expect(describeCitation({ title: 'benefits-page', uri: 'gs://b/discovery/benefits' }, CATALOG)).toEqual(
      ['Discovery Health Medical Scheme'],
    );
  });

  it('falls back to the default catalogue', () => {
    expect(describeCitation(KEYCARE)).toContain('Plan guide');
  });
});

describe('mergeCitations', () => {
  it('keeps every search\'s sources', () => {
    expect(mergeCitations([KEYCARE], [PRIORITY], [BONCAP])).toEqual([KEYCARE, PRIORITY, BONCAP]);
  });

  it('collapses the same document found twice into one entry', () => {
    const merged = mergeCitations([{ title: KEYCARE.title }], [KEYCARE]);
    expect(merged).toHaveLength(1);
    expect(merged[0].url).toBe(KEYCARE.url);
    expect(merged[0].uri).toBe(KEYCARE.uri);
  });

  it('collapses a document described by URL in one search and by URI in the next', () => {
    const merged = mergeCitations([{ title: 'keycare.pdf', url: KEYCARE.url }], [KEYCARE]);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('keycare.pdf');
    expect(merged[0].uri).toBe(KEYCARE.uri);
  });

  it('fills in a missing excerpt from a later search', () => {
    const merged = mergeCitations([{ ...KEYCARE, excerpt: undefined }], [KEYCARE]);
    expect(merged[0].excerpt).toBe(KEYCARE.excerpt);
  });

  it('does not mutate the citations it was given', () => {
    const first: Citation = { title: KEYCARE.title };
    mergeCitations([first], [KEYCARE]);
    expect(first).toEqual({ title: KEYCARE.title });
  });

  it('tolerates missing lists', () => {
    expect(mergeCitations(undefined, [KEYCARE], undefined)).toEqual([KEYCARE]);
    expect(mergeCitations()).toEqual([]);
  });
});
