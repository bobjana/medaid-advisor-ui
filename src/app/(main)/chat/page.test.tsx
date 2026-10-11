import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import type { ChatEvent, ContextOptions } from '@/types';
import ChatPage from './page';

vi.mock('@/lib/api', () => ({
  getOrCreateUserId: () => 'test-user',
  streamMessage: vi.fn(),
  setChatContext: vi.fn(),
}));

import { setChatContext, streamMessage } from '@/lib/api';

const streamMessageMock = vi.mocked(streamMessage);
const setChatContextMock = vi.mocked(setChatContext);

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

function contextChip() {
  return screen.getByRole('button', { name: /^Context:/ });
}

beforeEach(() => {
  streamMessageMock.mockReset();
  setChatContextMock.mockReset();
  setChatContextMock.mockResolvedValue({ sessionId: 's-test' });
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

    expect(screen.getByRole('button', { name: /Context: Bonitas\./ })).toBeInTheDocument();
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

    expect(
      screen.getByRole('button', { name: /Context: Bonitas › BonComplete/ }),
    ).toBeInTheDocument();
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

describe('ChatPage context picker', () => {
  it('starts on "All Schemes", inline before the prompt, and resets on New chat', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());
    streamMessageMock.mockReturnValueOnce(laterTurn());

    render(<ChatPage />);

    const chip = contextChip();
    expect(chip).toHaveTextContent('All Schemes');
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    const textarea = screen.getByPlaceholderText(/Ask about medical aid plans/i);
    expect(chip.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Still the default while the agent asks which scheme to use.
    await askSchemeQuestion();
    expect(contextChip()).toHaveTextContent('All Schemes');

    // Choosing a scheme via the message chips updates the composer chip.
    fireEvent.click(screen.getByRole('button', { name: 'Bonitas Medical Fund' }));
    await flush();
    expect(contextChip()).toHaveTextContent('Bonitas');

    // New chat returns to the default.
    fireEvent.click(screen.getByRole('button', { name: /New chat/i }));
    await flush();
    expect(contextChip()).toHaveTextContent('All Schemes');
  });

  it('opens a tree, keeps it open while expanding, and closes on selection', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());
    setChatContextMock.mockResolvedValue({ sessionId: 's-test' });

    render(<ChatPage />);
    await askSchemeQuestion();

    // Open the picker.
    fireEvent.click(contextChip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    expect(within(dialog).getByText('All Schemes')).toBeInTheDocument();
    expect(within(dialog).getByText('Bonitas Medical Fund')).toBeInTheDocument();
    // Plans for a non-selected scheme start collapsed.
    expect(within(dialog).queryByText('BonComplete')).not.toBeInTheDocument();

    // Expanding is not a selection: the popover stays open, no context call.
    fireEvent.click(within(dialog).getByRole('button', { name: /Expand Bonitas Medical Fund/ }));
    expect(within(dialog).getByText('BonComplete')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Scheme and plan context' })).toBeInTheDocument();
    expect(setChatContextMock).not.toHaveBeenCalled();
    expect(contextChip()).toHaveTextContent('All Schemes');

    // Selecting a plan closes the popover and applies the context silently.
    fireEvent.click(within(dialog).getByText('BonComplete'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await flush();
    expect(setChatContextMock).toHaveBeenCalledWith({
      sessionId: 's-test',
      scheme: 'bonitas',
      plan: 'boncomplete',
    });
    expect(contextChip()).toHaveTextContent('Bonitas › BonComplete');
  });

  it('"All Schemes" in the picker clears the context', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());
    setChatContextMock.mockResolvedValue({ sessionId: 's-test' });

    render(<ChatPage />);
    await askSchemeQuestion();

    fireEvent.click(contextChip());
    const dialog = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    fireEvent.click(within(dialog).getByText('Discovery Health Medical Scheme'));
    await flush();
    expect(setChatContextMock).toHaveBeenCalledWith({
      sessionId: 's-test',
      scheme: 'discovery',
      plan: null,
    });
    expect(contextChip()).toHaveTextContent('Discovery');

    fireEvent.click(contextChip());
    const reopened = screen.getByRole('dialog', { name: 'Scheme and plan context' });
    fireEvent.click(within(reopened).getByText('All Schemes'));
    await flush();
    expect(setChatContextMock).toHaveBeenLastCalledWith({
      sessionId: 's-test',
      scheme: null,
      plan: null,
    });
    expect(contextChip()).toHaveTextContent('All Schemes');
  });
});
