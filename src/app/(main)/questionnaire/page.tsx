import { ClipboardList, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function QuestionnairePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link
        href="/chat"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Chat
      </Link>

      <Card className="bg-card rounded-2xl border-outline-variant/30 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

        <CardHeader className="space-y-6 pb-4 pt-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center shadow-sm">
            <ClipboardList className="w-6 h-6 text-amber-600 dark:text-amber-400" strokeWidth={2.25} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl tracking-tight">
                Needs Assessment Questionnaire
              </CardTitle>
              <span className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">
                Coming Soon
              </span>
            </div>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              A guided, seven-section needs assessment that captures a client&apos;s
              medical aid requirements in a structured, advisor-friendly format.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">
              What this feature will entail:
            </p>
            <div className="grid gap-3">
              {[
                {
                  step: '1',
                  title: 'Introduction & Consent',
                  description: 'Client overview, advisor notes, and consent confirmation before proceeding.',
                },
                {
                  step: '2',
                  title: 'Personal Demographics',
                  description: 'Age, dependants, income bracket, and geographic region.',
                },
                {
                  step: '3',
                  title: 'Health Status',
                  description: 'Existing conditions, chronic medication, and disability declarations.',
                },
                {
                  step: '4',
                  title: 'Healthcare Utilization',
                  description: 'Expected GP visits, specialist referrals, hospitalisation likelihood, and dental or optical needs.',
                },
                {
                  step: '5',
                  title: 'Coverage Preferences',
                  description: 'Budget range, preferred hospital networks, gap cover, and benefit priorities.',
                },
                {
                  step: '6',
                  title: 'Family Planning',
                  description: 'Maternity needs, child dependant requirements, and future planning considerations.',
                },
                {
                  step: '7',
                  title: 'Review & Submit',
                  description: 'Full summary with edit capability before submission to the recommendation engine.',
                },
              ].map(({ step, title, description }) => (
                <div
                  key={step}
                  className="flex gap-4 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/20"
                >
                  <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30">
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              Progress through each section is automatically saved to your
              browser. You can pause and resume at any time. Once completed, the
              questionnaire data feeds directly into the Plan Recommendation
              engine for broker-grade matching.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
