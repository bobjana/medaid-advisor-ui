import { Target, ArrowLeft, Sparkles, Upload, FileSearch, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RecommendPage() {
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
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

        <CardHeader className="space-y-6 pb-4 pt-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center shadow-sm">
            <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl tracking-tight">
                Plan Recommendation Engine
              </CardTitle>
              <span className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                Coming Soon
              </span>
            </div>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              Broker-grade plan matching that analyses client needs against the
              full medical aid market and returns scored recommendations with
              transparent reasoning.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">
              How it will work:
            </p>
            <div className="grid gap-4">
              {[
                {
                  icon: Upload,
                  title: 'Data Ingestion',
                  description:
                    'Upload client data from a completed questionnaire, import a JSON export from your CRM, or enter details manually through a structured form.',
                },
                {
                  icon: FileSearch,
                  title: 'Market Matching',
                  description:
                    'The engine compares the client profile against every plan across Discovery, Bonitas, Momentum, Medihelp, Bestmed, and other major schemes — scoring on benefit alignment, network coverage, and budget fit.',
                },
                {
                  icon: Sparkles,
                  title: 'Scored Results',
                  description:
                    'Receive a ranked list of the top 5 plans, each with a match score, monthly premium, key covered benefits, and plain-English reasoning for why it was selected.',
                },
                {
                  icon: ClipboardCheck,
                  title: 'Advisor Handoff',
                  description:
                    'Compare plans side-by-side, adjust weighting preferences on the fly, and export a client-ready summary with your practice branding.',
                },
              ].map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-4 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/20"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  </div>
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

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30">
            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
              The recommendation engine is designed to complement — not replace —
              advisor judgment. Every result includes the reasoning chain so you
              can explain the &ldquo;why&rdquo; behind each match to your client
              with confidence.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
