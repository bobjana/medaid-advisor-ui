import { describe, it, expect } from 'vitest';
import { describeChatError } from './errors';

describe('describeChatError', () => {
  it('maps 429 quota errors to a rate-limit message', () => {
    const message = describeChatError(
      '429 RESOURCE_EXHAUSTED. Resource exhausted. Please try again later.',
    );
    expect(message).toMatch(/rate-limited/i);
    expect(message).toMatch(/try again/i);
  });

  it('maps 429s wrapped in transport prefixes', () => {
    expect(
      describeChatError('Unable to reach chat service: Chat failed: 429 — RESOURCE_EXHAUSTED'),
    ).toMatch(/rate-limited/i);
  });

  it('maps stalled or timed-out streams to a retry message', () => {
    expect(
      describeChatError('chat stream stalled: no response from the advisor for 150s'),
    ).toMatch(/took too long/i);
    expect(describeChatError('The request timed out')).toMatch(/took too long/i);
  });

  it('passes unknown messages through unchanged', () => {
    expect(describeChatError('Something else went wrong')).toBe('Something else went wrong');
  });

  it('handles empty input', () => {
    expect(describeChatError('')).toBe('');
    expect(describeChatError(undefined as unknown as string)).toBe('');
  });
});
