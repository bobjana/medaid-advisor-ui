import { describe, it, expect } from 'vitest';
import { extractContextState, extractError } from './parse';

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

describe('extractContextState', () => {
  const event = (state_delta: unknown) => ({ actions: { state_delta } });

  it('reads a scheme + plan delta', () => {
    expect(extractContextState(event({ selected_scheme: 'bonitas', selected_plan: 'boncomplete' }))).toEqual(
      { scheme: 'bonitas', plan: 'boncomplete' },
    );
  });

  it('treats null values as cleared', () => {
    expect(extractContextState(event({ selected_scheme: null, selected_plan: null }))).toEqual({
      scheme: null,
      plan: null,
    });
  });

  it('only includes keys present in the delta (absent = unchanged)', () => {
    expect(extractContextState(event({ selected_scheme: 'discovery' }))).toEqual({
      scheme: 'discovery',
    });
    expect(extractContextState(event({ selected_plan: null }))).toEqual({ plan: null });
  });

  it('accepts camelCase stateDelta (ADK dev server)', () => {
    expect(
      extractContextState({ actions: { stateDelta: { selected_scheme: 'bonitas' } } }),
    ).toEqual({ scheme: 'bonitas' });
  });

  it('ignores deltas that do not touch the scheme/plan keys', () => {
    expect(extractContextState(event({ rag_search_cache: { a: 1 } }))).toBeNull();
    expect(extractContextState(event({}))).toBeNull();
  });

  it('returns null without actions', () => {
    expect(extractContextState({ content: { parts: [{ text: 'hi' }] } })).toBeNull();
    expect(extractContextState({ actions: {} })).toBeNull();
    expect(extractContextState(null)).toBeNull();
  });
});
