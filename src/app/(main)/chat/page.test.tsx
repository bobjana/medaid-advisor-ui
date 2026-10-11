import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ChatEvent, ContextOptions } from '@/types';
import ChatPage from './page';

vi.mock('@/lib/api', () => ({
  getOrCreateUserId: () => 'test-user',
  streamMessage: vi.fn(),
}));

import { streamMessage } from '@/lib/api';

const streamMessageMock = vi.mocked(streamMessage);

const SCHEME_OPTIONS: ContextOptions = {
  type: 'scheme_selection',
  schemes: [
    {
      slug: 'bonitas',
      name: 'Bonitas Medical Fund',
      plans: [
        { id: 'boncomplete', name: 'BonComplete' },
        { id: 'boncap', name: 'BonCap' },
      ],
    },
    { slug: 'discovery', name: 'Discovery Health Medical Scheme', plans: [] },
  ],
};

async function* toStream(events: ChatEvent[]): AsyncGenerator<ChatEvent> {
  for (const event of events) yield event;
}

/** Turn 1: the agent asks which scheme the user is on. */
function firstTurn(): AsyncGenerator<ChatEvent> {
  return toStream([
    { type: 'session', sessionId: 's-test' },
    { type: 'text', delta: 'Which medical scheme are you on or considering?' },
    { type: 'context_options', options: SCHEME_OPTIONS },
    { type: 'done' },
  ]);
}

function laterTurn(text = 'Here is everything about that.'): AsyncGenerator<ChatEvent> {
  return toStream([{ type: 'text', delta: text }, { type: 'done' }]);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function askSchemeQuestion() {
  const textarea = screen.getByPlaceholderText(/Ask about medical aid plans/i);
  fireEvent.change(textarea, { target: { value: 'I want to compare medical aid schemes' } });
  await act(async () => {
    fireEvent.keyDown(textarea, { key: 'Enter' });
  });
  await flush();
}

beforeEach(() => {
  streamMessageMock.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChatPage scheme → plan flow', () => {
  it('waits for the 3s "all plans" default before continuing, instead of sending on scheme click', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());
    streamMessageMock.mockReturnValueOnce(laterTurn());

    render(<ChatPage />);
    await askSchemeQuestion();

    // The agent's scheme prompt is on screen.
    const bonitas = screen.getByRole('button', { name: 'Bonitas Medical Fund' });
    expect(streamMessageMock).toHaveBeenCalledTimes(1);

    // Choosing a scheme reveals its plans (below the scheme) with "All plans"
    // selected by default — but must NOT hit the backend yet.
    fireEvent.click(bonitas);
    await flush();
    expect(screen.getByText('Select a plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use all plans' })).toBeInTheDocument();
    expect(screen.getByText(/Using all plans by default/)).toBeInTheDocument();
    expect(streamMessageMock).toHaveBeenCalledTimes(1);

    // After the countdown elapses the turn continues scheme-wide.
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await flush();
    expect(streamMessageMock).toHaveBeenCalledTimes(2);
    expect(streamMessageMock.mock.calls[1][0]).toMatchObject({
      message: 'All Bonitas Medical Fund plans',
      sessionId: 's-test',
    });

    const clear = screen.getByRole('button', { name: 'Clear scheme context' });
    expect(clear.parentElement?.textContent).toContain('Bonitas');
    expect(clear.parentElement?.textContent).toContain('All plans');
  });

  it('sends the specific plan if the user picks one before the default expires', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());
    streamMessageMock.mockReturnValueOnce(laterTurn());

    render(<ChatPage />);
    await askSchemeQuestion();

    fireEvent.click(screen.getByRole('button', { name: 'Bonitas Medical Fund' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'BonComplete' }));
    await flush();

    expect(streamMessageMock).toHaveBeenCalledTimes(2);
    expect(streamMessageMock.mock.calls[1][0]).toMatchObject({ message: 'BonComplete' });

    // The default timer must not fire a second turn afterwards.
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    await flush();
    expect(streamMessageMock).toHaveBeenCalledTimes(2);

    const clear = screen.getByRole('button', { name: 'Clear scheme context' });
    expect(clear.parentElement?.textContent).toContain('BonComplete');
  });

  it('continues immediately when the user clicks "All plans"', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());
    streamMessageMock.mockReturnValueOnce(laterTurn());

    render(<ChatPage />);
    await askSchemeQuestion();

    fireEvent.click(screen.getByRole('button', { name: 'Bonitas Medical Fund' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Use all plans' }));
    await flush();

    expect(streamMessageMock).toHaveBeenCalledTimes(2);
    expect(streamMessageMock.mock.calls[1][0]).toMatchObject({
      message: 'All Bonitas Medical Fund plans',
    });
  });

  it('does not show an "All plans" default when the backend supplies plan options directly', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(
      toStream([
        { type: 'session', sessionId: 's-test' },
        {
          type: 'context_options',
          options: { type: 'plan_selection', plans: [{ id: 'executive', name: 'Executive Plan' }] },
        },
        { type: 'done' },
      ]),
    );
    streamMessageMock.mockReturnValueOnce(laterTurn());

    render(<ChatPage />);
    await askSchemeQuestion();

    fireEvent.click(screen.getByRole('button', { name: 'Executive Plan' }));
    await flush();

    expect(streamMessageMock).toHaveBeenCalledTimes(2);
    expect(streamMessageMock.mock.calls[1][0]).toMatchObject({ message: 'Executive Plan' });
  });
});
