'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Loader2, Sparkles, Stethoscope, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { streamMessage } from '@/lib/api';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I can help you understand medical aid plans, benefits, and coverage options. What would you like to know?',
};

const PROMPT_SUGGESTIONS = [
  '🏥 Compare Discovery Comprehensive vs Classic Saver',
  '👶 Which medical aid plans offer full maternity coverage?',
  '💊 What plans provide 100% chronic medication benefits?',
  '📊 Explain gap cover vs main medical aid plan benefits',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Reserved for when the server emits a session id — plumbed, not used this PR.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sessionIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      const stream = await streamMessage({ message: trimmed });
      const reader = stream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + value } : m,
          ),
        );
      }
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

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Card className="flex-1 flex flex-col border-outline-variant/30 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-surface-container-lowest/80 backdrop-blur-md px-6 py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                Medical Aid Advisor Chat
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Grounded advice &amp; scheme comparison engine
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            AI Active
          </span>
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
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Stethoscope className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xs transition-all ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-xs'
                    : 'bg-card border border-outline-variant/30 text-card-foreground rounded-tl-xs'
                }`}
              >
                {message.role === 'assistant' ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="bg-card border border-outline-variant/30 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2.5 shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Analyzing scheme options &amp; formulating advice...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t bg-card/90 backdrop-blur-md p-4 space-y-3">
          {/* Prompt Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-primary" /> Suggestions:
            </span>
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5 text-foreground transition-all duration-150 shrink-0 font-medium active:scale-95 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about medical aid plans, benefits, or coverage..."
              className="min-h-[56px] max-h-[160px] resize-none bg-surface-container-lowest border-outline-variant/40 focus-visible:ring-primary rounded-xl text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={!canSend}
              size="icon"
              className="h-[56px] w-[56px] rounded-xl shrink-0 shadow-sm transition-transform active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="sr-only">Send Message</span>
            </Button>
          </form>
        </div>
      </Card>

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-sm text-destructive font-medium">
          {error}
        </div>
      )}
    </div>
  );
}