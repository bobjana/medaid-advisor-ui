import { describe, it, expect } from 'vitest';
import { extractError } from './parse';

describe('extractError', () => {
  it('formats ADK runtime errors with their error code', () => {
    expect(
      extractError({
        error_code: 'ClientError',
        error_message: '404 NOT_FOUND. Publisher model not found',
      }),
    ).toBe('ClientError: 404 NOT_FOUND. Publisher model not found');
  });

  it('returns just the message when no code is present', () => {
    expect(extractError({ error_message: 'upstream unavailable' })).toBe('upstream unavailable');
  });

  it('ignores a blank error message', () => {
    expect(extractError({ error_code: 'ClientError', error_message: '   ' })).toBeNull();
  });

  it('handles an API error envelope with a numeric code', () => {
    expect(extractError({ error: { code: 404, message: 'model not found' } })).toBe(
      '404: model not found',
    );
  });

  it('handles an API error envelope with a string code', () => {
    expect(extractError({ error: { code: 'NOT_FOUND', message: 'model not found' } })).toBe(
      'NOT_FOUND: model not found',
    );
  });

  it('falls back to the status field when no code is present', () => {
    expect(extractError({ error: { status: 'NOT_FOUND', message: 'model not found' } })).toBe(
      'NOT_FOUND: model not found',
    );
  });

  it('handles a string error envelope', () => {
    expect(extractError({ error: 'connection reset' })).toBe('connection reset');
  });

  it('trims surrounding whitespace', () => {
    expect(extractError({ error_message: '  boom  ' })).toBe('boom');
  });

  it('returns null for normal content events', () => {
    expect(extractError({ content: { parts: [{ text: 'hello' }] } })).toBeNull();
  });

  it('returns null for non-object events', () => {
    expect(extractError(null)).toBeNull();
    expect(extractError(undefined)).toBeNull();
    expect(extractError('error')).toBeNull();
    expect(extractError(42)).toBeNull();
  });

  it('returns null for an empty error envelope', () => {
    expect(extractError({ error: { message: '   ' } })).toBeNull();
    expect(extractError({ error: {} })).toBeNull();
  });
});
