'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Loader2, Stethoscope, RotateCcw, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Citation, ContextOptions } from '@/types';
import { getOrCreateUserId, streamMessage } from '@/lib/api';
import { randomUUID, nowMs } from '@/lib/utils';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { Citations } from '@/components/chat/Citations';
import { ContextSelector } from '@/components/chat/ContextSelector';

const JSON_BLOCK_RE = /```(?:json)?\s*\{[\s\S]*?"(?:schemes|plans|type)"[\s\S]*?\}\s*```/g;

const SCHEME_LABELS: Record<string, string> = {
  bonitas: 'Bonitas',
  discovery: 'Discovery',
};

/**
 * How long the user gets to pick a specific plan after choosing a scheme
 * before the turn continues with *all* of that scheme's plans.
 */
const PLAN_DECISION_MS = 3000;

function stripContextJson(text: string): string {
  return text.replace(JSON_BLOCK_RE, '').trim();
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  contextOptions?: ContextOptions;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I can help you understand medical aid plans, benefits, and coverage options. What would you like to know?',
};

interface PendingPlan {
  messageId: string;
  schemeSlug: string;
  schemeName: string;
  /** Epoch ms when the default "All plans" choice is applied. */
  deadline: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeContext, setActiveContext] = useState<{ scheme?: string; plan?: string }>({});
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // A page load always starts a fresh conversation: the session id is only
  // held in this ref for the lifetime of the page (set from the backend's
  // first `session` event). It is deliberately not persisted — restoring it
  // on reload silently resumed an old agent session (with its selected
  // scheme) while the transcript reset, so questions were answered for the
  // previous scheme instead of prompting for one.
  const sessionIdRef = useRef<string | undefined>(undefined);
  const pendingPlanRef = useRef<PendingPlan | null>(null);
  const planTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planResolvedRef = useRef(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(
    () => () => {
      if (planTimerRef.current) clearTimeout(planTimerRef.current);
    },
    [],
  );

  function clearPlanTimer() {
    if (planTimerRef.current) {
      clearTimeout(planTimerRef.current);
      planTimerRef.current = null;
    }
  }

  /**
   * Settle (or cancel) a pending plan decision and drop the plan chips from
   * the message they belong to. Returns the settled decision, or null.
   */
  function settlePlanDecision(): PendingPlan | null {
    const pending = pendingPlanRef.current;
    clearPlanTimer();
    planResolvedRef.current = true;
    pendingPlanRef.current = null;
    setPendingPlan(null);
    if (!pending) return null;
    setMessages((prev) =>
      prev.map((m) => (m.id === pending.messageId ? { ...m, contextOptions: undefined } : m)),
    );
    return pending;
  }

  function cancelPlanDecision() {
    settlePlanDecision();
  }

  function startPlanDecision(messageId: string, schemeSlug: string, schemeName: string) {
    clearPlanTimer();
    planResolvedRef.current = false;
    const pending: PendingPlan = {
      messageId,
      schemeSlug,
      schemeName,
      deadline: nowMs() + PLAN_DECISION_MS,
    };
    pendingPlanRef.current = pending;
    setPendingPlan(pending);
    planTimerRef.current = setTimeout(() => {
      resolvePlanDecision({ kind: 'all' });
    }, PLAN_DECISION_MS);
  }

  function resolvePlanDecision(choice: { kind: 'all' } | { kind: 'plan'; label: string }) {
    if (planResolvedRef.current) return;
    const pending = settlePlanDecision();
    if (!pending) return;
    if (choice.kind === 'all') {
      setActiveContext({ scheme: pending.schemeSlug, plan: 'All plans' });
      // Naming the scheme here makes the backend treat it as scheme-wide
      // (plan unset), i.e. "all plans" for that scheme.
      sendMessage(`All ${pending.schemeName} plans`);
    } else {
      setActiveContext({ scheme: pending.schemeSlug, plan: choice.label });
      sendMessage(choice.label);
    }
  }

  function handleContextSelect(
    messageId: string,
    options: ContextOptions | undefined,
    selection: string,
    type: 'scheme' | 'plan',
  ) {
    if (type === 'plan') {
      if (pendingPlanRef.current) {
        resolvePlanDecision({ kind: 'plan', label: selection });
      } else {
        // Plan options supplied directly by the backend (no default window).
        setActiveContext((prev) => ({ ...prev, plan: selection }));
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, contextOptions: undefined } : m)),
        );
        sendMessage(selection);
      }
      return;
    }

    const scheme = options?.schemes?.find((s) => s.name === selection);
    if (scheme && scheme.plans.length > 0) {
      // Show this scheme's plans *below* it and give the user a short window
      // to narrow down before continuing with all of them. Crucially, we do
      // NOT hit the backend yet — otherwise the turn is answered for the whole
      // scheme before the user has had a chance to pick a plan.
      const planOptions: ContextOptions = {
        type: 'plan_selection',
        scheme: scheme.slug,
        plans: scheme.plans,
        schemes: options?.schemes,
      };
      setActiveContext({ scheme: scheme.slug });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, contextOptions: planOptions } : m)),
      );
      startPlanDecision(messageId, scheme.slug, scheme.name);
      return;
    }

    setActiveContext({ scheme: scheme?.slug ?? selection.toLowerCase() });
    sendMessage(selection);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // A new turn supersedes any pending plan decision.
    if (pendingPlanRef.current) cancelPlanDecision();

    const userMessage: Message = {
      id: randomUUID(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    const assistantId = randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      const stream = streamMessage({ message: trimmed, sessionId: sessionIdRef.current });
      let finalContent = '';
      let finalCitations: Citation[] | undefined;
      let finalOptions: ContextOptions | undefined;

      for await (const event of stream) {
        if (event.type === 'text') {
          finalContent += event.delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: stripContextJson(finalContent) }
                : m,
            ),
          );
        } else if (event.type === 'citations') {
          finalCitations = event.citations;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, citations: event.citations } : m,
            ),
          );
        } else if (event.type === 'session') {
          sessionIdRef.current = event.sessionId;
        } else if (event.type === 'context_options') {
          finalOptions = event.options;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, contextOptions: event.options } : m,
            ),
          );
        } else if (event.type === 'error') {
          setError(event.message);
        }
      }

      // Final pass to clean up JSON blocks from rendered content.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: stripContextJson(m.content), citations: finalCitations, contextOptions: finalOptions }
            : m,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? `Unable to reach chat service: ${err.message}`
          : 'An unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function resetConversation() {
    cancelPlanDecision();
    sessionIdRef.current = undefined;
    setMessages([WELCOME_MESSAGE]);
    setActiveContext({});
    setError(null);
  }

  async function clearContext() {
    cancelPlanDecision();
    setActiveContext({});
    setMessages((prev) =>
      prev.map((m) => (m.contextOptions ? { ...m, contextOptions: undefined } : m)),
    );
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      await fetch('/api/chat/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getOrCreateUserId(),
        },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      return;
    }
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
      <Card className="flex-1 flex flex-col border-outline-variant/30 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-surface-container-lowest/80 backdrop-blur-md px-4 py-2 pb-2! flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Stethoscope className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground">
                Medical Aid Advisor Chat
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Grounded advice &amp; scheme comparison engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetConversation}
              title="Start a new conversation"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New chat
            </button>
            {activeContext.scheme && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {SCHEME_LABELS[activeContext.scheme] ?? activeContext.scheme}
                {activeContext.plan && ` › ${activeContext.plan}`}
                <button
                  type="button"
                  onClick={clearContext}
                  title="Clear scheme context"
                  aria-label="Clear scheme context"
                  className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface/50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-container-high border border-outline-variant/20'
                }`}
              >
                {message.contextOptions && (
                  <ContextSelector
                    options={message.contextOptions}
                    onSelect={(selection, type) =>
                      handleContextSelect(message.id, message.contextOptions, selection, type)
                    }
                    planDecision={
                      pendingPlan && pendingPlan.messageId === message.id
                        ? {
                            durationMs: PLAN_DECISION_MS,
                            deadline: pendingPlan.deadline,
                            onSelectAll: () => resolvePlanDecision({ kind: 'all' }),
                          }
                        : undefined
                    }
                  />
                )}
                {message.content && (
                  <MarkdownMessage
                    content={message.content}
                    className={message.role === 'user' ? 'text-primary-foreground' : ''}
                  />
                )}
                {message.citations && message.citations.length > 0 && (
                  <Citations citations={message.citations} />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t bg-surface-container-lowest/80 backdrop-blur-md p-4">
          {error && (
            <div
              title={error}
              className="mb-2 px-3 py-1.5 text-xs text-destructive bg-destructive/10 rounded-lg whitespace-pre-wrap break-words max-h-32 overflow-y-auto"
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about medical aid plans, benefits, or coverage..."
              className="min-h-[44px] max-h-32 resize-none rounded-xl border-outline-variant/30 bg-surface"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              className="h-11 w-11 rounded-xl shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
