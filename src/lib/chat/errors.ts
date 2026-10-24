/**
 * Map raw backend error strings into user-facing chat messages.
 *
 * The stream surfaces low-level errors verbatim (e.g. Vertex AI's
 * "429 RESOURCE_EXHAUSTED" or a stalled upstream connection); users need
 * plain guidance instead of stack traces and status codes.
 */
export function describeChatError(raw: string): string {
  const text = String(raw ?? '');
  if (/\b429\b|RESOURCE_EXHAUSTED/i.test(text)) {
    return (
      'The advisor is rate-limited right now (quota exhausted). ' +
      'Please wait a minute and try again.'
    );
  }
  if (/stalled|timed?\s?out|deadline|aborted/i.test(text)) {
    return (
      'The advisor took too long to respond, so the turn was stopped. ' +
      'Please try again.'
    );
  }
  return text;
}
