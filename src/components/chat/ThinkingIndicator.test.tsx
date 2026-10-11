import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThinkingIndicator } from './ThinkingIndicator';

afterEach(() => {
  vi.useRealTimers();
});

describe('ThinkingIndicator', () => {
  it('announces that it is investigating', () => {
    render(<ThinkingIndicator />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Investigating');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('switches to a reassurance wording after a while', () => {
    vi.useFakeTimers();
    render(<ThinkingIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Investigating');

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Still investigating');
  });
});
