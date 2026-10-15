import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CITATION_FLASH_CLASS, citationRowId, goToCitationMarker } from './citation-dom';

function renderDom(html: string) {
  document.body.innerHTML = html;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('citationRowId', () => {
  it('namespaces the row by message, so two answers can both cite source 1', () => {
    expect(citationRowId('m1', 1)).toBe('source-m1-1');
    expect(citationRowId('m2', 1)).toBe('source-m2-1');
  });
});

describe('goToCitationMarker', () => {
  it('scrolls to the first place the answer cites the source', () => {
    renderDom(`
      <div data-message-id="m1">
        <p>first <span data-citation-marker="1">1</span></p>
        <p>second <span data-citation-marker="1">1</span></p>
      </div>
    `);

    goToCitationMarker('m1', 1);

    const markers = document.querySelectorAll('[data-citation-marker="1"]');
    expect(markers[0]).toHaveClass(CITATION_FLASH_CLASS);
    expect(markers[1]).not.toHaveClass(CITATION_FLASH_CLASS);
    expect(markers[0].scrollIntoView).toHaveBeenCalled();
  });

  it('only looks inside the message it was given', () => {
    renderDom(`
      <div data-message-id="m1"><span data-citation-marker="1">1</span></div>
      <div data-message-id="m2"><span data-citation-marker="1">1</span></div>
    `);

    goToCitationMarker('m2', 1);

    const [first, second] = document.querySelectorAll('[data-citation-marker="1"]');
    expect(first).not.toHaveClass(CITATION_FLASH_CLASS);
    expect(second).toHaveClass(CITATION_FLASH_CLASS);
  });

  it('handles a message id that is not in the document', () => {
    renderDom('<div data-message-id="m1"><span data-citation-marker="1">1</span></div>');
    expect(() => goToCitationMarker('missing', 1)).not.toThrow();
    expect(() => goToCitationMarker('m1', 7)).not.toThrow();
  });
});
