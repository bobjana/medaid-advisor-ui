/**
 * Scrolling and highlighting between an inline citation marker and its row in
 * the sources list at the foot of the message.
 *
 * Both directions are transient view concerns — a scroll and a short highlight
 * — so they are handled directly on the DOM rather than through React state,
 * which would re-render the whole transcript for a visual effect.
 */

/** Class applied briefly to the marker or row a jump landed on. */
export const CITATION_FLASH_CLASS = 'citation-flash';

const FLASH_MS = 1200;

/** Id of the sources-list row for a numbered citation in a given message. */
export function citationRowId(messageId: string, number: number): string {
  return `source-${messageId}-${number}`;
}

function flash(element: Element | null): void {
  if (!element) return;
  element.classList.add(CITATION_FLASH_CLASS);
  setTimeout(() => element.classList.remove(CITATION_FLASH_CLASS), FLASH_MS);
}

function scrollIntoView(element: Element | null): void {
  element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Follow a citation marker down to its row in the sources list. */
export function goToCitationRow(messageId: string, number: number): void {
  const row = document.getElementById(citationRowId(messageId, number));
  scrollIntoView(row);
  flash(row);
}

/**
 * Follow a row in the sources list back up to the first place the answer cites
 * it. Markers carry a `data-citation-marker` attribute rather than an id, since
 * one source is usually cited more than once.
 */
export function goToCitationMarker(messageId: string, number: number): void {
  // Compare the dataset rather than interpolating into a selector: message ids
  // are opaque strings that may contain characters a selector would choke on.
  const container = [...document.querySelectorAll('[data-message-id]')].find(
    (element) => (element as HTMLElement).dataset.messageId === messageId,
  );
  const marker = container?.querySelector(`[data-citation-marker="${number}"]`) ?? null;
  scrollIntoView(marker);
  flash(marker);
}
