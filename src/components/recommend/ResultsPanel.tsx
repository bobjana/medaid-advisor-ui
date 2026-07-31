'use client';

import type { PlanRecommendationResponse } from '@/types';
import { PlanCard } from './PlanCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResultsPanelProps {
  results: PlanRecommendationResponse;
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xl font-semibold mb-3">Top Recommendations</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {results.recommendations.map((plan, idx) => (
            <PlanCard key={plan.planId} plan={plan} rank={idx + 1} />
          ))}
        </div>
      </section>

      {results.alternatives.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Alternatives</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {results.alternatives.map((plan) => (
              <PlanCard key={plan.planId} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {results.reasoning.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Why these plans?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.reasoning.map((reason, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}