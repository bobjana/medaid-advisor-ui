'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { streamMessage } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I can help you understand medical aid plans, benefits, and coverage options. What would you like to know?',
  timestamp: Date.now(),
};

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

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
    ]);

    try {
      const stream = await streamMessage({ message: trimmed });
      const reader = stream.getReader();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
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

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>Medical Aid Advisor Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <form
          onSubmit={handleSend}
          className="border-t p-4 flex gap-2 items-end"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about medical aid..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={loading}
          />
          <Button type="submit" disabled={!canSend} size="icon">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mt-2 text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}