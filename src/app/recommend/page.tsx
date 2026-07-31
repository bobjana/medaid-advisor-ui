'use client';

import { useState } from 'react';
import { Sparkles, Loader2, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadZone, ResultsPanel } from '@/components/recommend';
import { getRecommendations } from '@/lib/api';
import type {
  QuestionnaireData,
  PlanRecommendationResponse,
  ChatRequest,
  ChatResponse,
} from '@/types';
import { sendMessage } from '@/lib/api';

const MOCK_RECOMMENDATIONS: PlanRecommendationResponse = {
  recommendations: [
    {
      planId: 'disc-essent',
      planName: 'Discovery Essential',
      score: 92,
      monthlyPremium: 3200,
      keyBenefits: [
        'Full hospital cover',
        'Chronic condition cover',
        'GP visits',
      ],
    },
    {
      planId: 'bon-comp',
      planName: 'Bonitas Comprehensive',
      score: 87,
      monthlyPremium: 2900,
      keyBenefits: ['Hospital cover', 'Chronic cover', 'Dental'],
    },
  ],
  reasoning: [
    'Matches your budget range of R2000-R4000',
    'Covers your declared chronic conditions',
    'Includes your preferred hospital group',
  ],
  alternatives: [
    {
      planId: 'medihelp-plus',
      planName: 'Medihelp Plus',
      score: 78,
      monthlyPremium: 2500,
      keyBenefits: ['Hospital cover', 'Day-to-day benefits'],
    },
  ],
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function RecommendPage() {
  const [clientData, setClientData] = useState<QuestionnaireData | null>(null);
  const [results, setResults] = useState<PlanRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  async function handleAnalyze() {
    if (!clientData) return;
    setLoading(true);
    setError(null);

    try {
      const response = await getRecommendations({ clientData });
      setResults(response);
    } catch {
      setResults(MOCK_RECOMMENDATIONS);
      setError(
        'Live recommendation service unavailable. Showing sample results.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleChatSend() {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const request: ChatRequest = {
        message: trimmed,
        sessionId: 'recommend-context',
      };
      const response: ChatResponse = await sendMessage(request);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach chat service. Please try again.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">
          Plan Recommendation
        </h2>
        <p className="text-muted-foreground mt-1">
          Upload client data to get AI-powered plan recommendations
        </p>
      </header>

      {!results && (
        <div className="grid gap-6 md:grid-cols-2">
          <UploadZone onDataLoaded={setClientData} />

          <Card>
            <CardHeader>
              <CardTitle>Client Summary</CardTitle>
              <CardDescription>
                {clientData
                  ? `${clientData.personalDetails.fullName || 'Anonymous'} — data loaded`
                  : 'No data loaded yet'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!clientData ? (
                <p className="text-sm text-muted-foreground">
                  Upload JSON or use questionnaire data to begin analysis.
                </p>
              ) : (
                <>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Coverage:</dt>
                      <dd>{clientData.coverageType.replace(/_/g, ' ')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Dependents:</dt>
                      <dd>{clientData.dependents.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Budget:</dt>
                      <dd>{clientData.budgetRange.replace(/_/g, ' ')}</dd>
                    </div>
                  </dl>
                  <Button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze Plans
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {results && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ResultsPanel results={results} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4" />
                Refine with Chat
              </CardTitle>
              <CardDescription>
                Ask follow-up questions about these recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ask about coverage, costs, or alternatives.
                  </p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-sm rounded p-2 ${
                        msg.role === 'user'
                          ? 'bg-primary/10'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about these plans..."
                  className="min-h-[60px] resize-none text-sm"
                  disabled={chatLoading}
                />
                <Button
                  size="icon"
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && <p className="text-sm text-muted-foreground">{error}</p>}
    </div>
  );
}