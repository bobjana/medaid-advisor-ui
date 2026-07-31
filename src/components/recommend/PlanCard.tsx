'use client';

import type { PlanScore } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlanCardProps {
  plan: PlanScore;
  rank?: number;
}

export function PlanCard({ plan, rank }: PlanCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            {rank && (
              <Badge variant="secondary" className="mb-2">
                Rank #{rank}
              </Badge>
            )}
            <CardTitle className="text-lg">{plan.planName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              R{plan.monthlyPremium.toLocaleString()}/month
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {plan.score}
            </div>
            <p className="text-xs text-muted-foreground">match score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {plan.keyBenefits.map((benefit, idx) => (
            <li
              key={idx}
              className="text-sm text-muted-foreground flex items-start gap-2"
            >
              <span className="text-primary mt-1">•</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}