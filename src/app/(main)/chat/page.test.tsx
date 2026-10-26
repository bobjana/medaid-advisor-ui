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
  window.localStorage.clear();
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
      backend: 'adk',
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
      backend: 'adk',
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
      backend: 'adk',
    });
    expect(contextChip()).toHaveTextContent('All Schemes');
  });
});

describe('ChatPage mirrors the agent context', () => {
  it('updates the chip from a streamed state delta (free text) and clears it on reset', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(
      toStream([
        { type: 'session', sessionId: 's-test' },
        { type: 'context_state', state: { scheme: 'bonitas', plan: 'boncomplete' } },
        { type: 'text', delta: 'BonComplete covers…' },
        { type: 'done' },
      ]),
    );
    streamMessageMock.mockReturnValueOnce(
      toStream([
        { type: 'context_state', state: { scheme: null, plan: null } },
        { type: 'text', delta: 'Context cleared.' },
        { type: 'done' },
      ]),
    );

    render(<ChatPage />);

    // The user typed a scheme rather than using a chip; the agent echoes its
    // resulting context and the chip mirrors it.
    await askSchemeQuestion();
    expect(contextChip()).toHaveTextContent('Bonitas › BonComplete');

    const textarea = screen.getByPlaceholderText(/Ask about medical aid plans/i);
    fireEvent.change(textarea, { target: { value: 'forget my scheme' } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    await flush();

    expect(contextChip()).toHaveTextContent('All Schemes');
    // Mirroring never hits the context endpoint.
    expect(setChatContextMock).not.toHaveBeenCalled();
  });
});

describe('ChatPage busy indicator', () => {
  it('shows an investigating indicator until the assistant starts talking', async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    streamMessageMock.mockReturnValueOnce(
      (async function* () {
        yield { type: 'session', sessionId: 's-test' };
        await gate;
        yield { type: 'text', delta: 'Here you go.' };
        yield { type: 'done' };
      })(),
    );

    render(<ChatPage />);

    const textarea = screen.getByPlaceholderText(/Ask about medical aid plans/i);
    fireEvent.change(textarea, { target: { value: 'What is covered?' } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    await flush();

    // The turn is still running: the empty bubble shows a busy state.
    expect(screen.getByRole('status')).toHaveTextContent('Investigating');

    await act(async () => {
      release();
    });
    await flush();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Here you go.')).toBeInTheDocument();
  });
});

describe('ChatPage backend switch', () => {
  function backendToggle() {
    return screen.getByRole('group', { name: 'Chat backend' });
  }

  it('renders the ADK/Python toggle with ADK active by default', () => {
    render(<ChatPage />);

    expect(within(backendToggle()).getByRole('button', { name: 'ADK' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(backendToggle()).getByRole('button', { name: 'Python' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('remembers the last selection across a reload', () => {
    window.localStorage.setItem('medaid:chat-backend', 'python');

    render(<ChatPage />);

    expect(within(backendToggle()).getByRole('button', { name: 'Python' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches silently when no chat is in progress and tags the next turn', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(laterTurn());

    render(<ChatPage />);
    fireEvent.click(within(backendToggle()).getByRole('button', { name: 'Python' }));
    await flush();

    expect(
      within(backendToggle()).getByRole('button', { name: 'Python' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await askSchemeQuestion();
    expect(streamMessageMock.mock.calls[0][0]).toMatchObject({ backend: 'python' });
  });

  it('prompts that the chat will be reset when switching mid-chat, and resets on confirm', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());

    render(<ChatPage />);
    await askSchemeQuestion();
    expect(streamMessageMock.mock.calls[0][0]).toMatchObject({ backend: 'adk' });

    fireEvent.click(within(backendToggle()).getByRole('button', { name: 'Python' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/current chat will be reset/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Switch & reset chat/i }));
    await flush();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(backendToggle()).getByRole('button', { name: 'Python' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // The transcript is back to the welcome message only.
    expect(screen.getByText(/What would you like to know/)).toBeInTheDocument();
    expect(
      screen.queryByText('Which medical scheme are you on or considering?'),
    ).not.toBeInTheDocument();

    // The next turn goes to the newly selected backend with no session carried over.
    streamMessageMock.mockReturnValueOnce(laterTurn());
    await askSchemeQuestion();
    expect(streamMessageMock.mock.calls[1][0]).toMatchObject({
      message: 'I want to compare medical aid schemes',
      backend: 'python',
    });
    expect(streamMessageMock.mock.calls[1][0].sessionId).toBeUndefined();
  });

  it('keeps the conversation and backend when the switch is cancelled', async () => {
    vi.useFakeTimers();
    streamMessageMock.mockReturnValueOnce(firstTurn());

    render(<ChatPage />);
    await askSchemeQuestion();

    fireEvent.click(within(backendToggle()).getByRole('button', { name: 'Python' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await flush();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(backendToggle()).getByRole('button', { name: 'ADK' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByText('Which medical scheme are you on or considering?'),
    ).toBeInTheDocument();
  });
});
