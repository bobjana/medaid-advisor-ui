import { Target, ArrowLeft, Sparkles, Upload, FileSearch, ClipboardCheck, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <Link
        href="/chat"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Chat
      </Link>

      <Card className="bg-card rounded-2xl border-outline-variant/30 overflow-hidden shadow-sm">
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
                Preview Mode
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
          {/* Sample Match Card Preview */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Sample Recommendation Preview:
            </p>
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-emerald-500/30 shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[11px] font-extrabold rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 98% Match
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    Discovery Health — Executive Plan
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Comprehensive cover with unlimited in-hospital benefits &amp; 100% MSA.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20 text-xs">
                <div className="bg-surface-container-low p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Est. Monthly</p>
                  <p className="font-extrabold text-foreground text-sm mt-0.5">R8,450 /mo</p>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Maternity</p>
                  <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">Comprehensive</p>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Chronic Cover</p>
                  <p className="font-extrabold text-foreground text-sm mt-0.5">27 CDL Conditions</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Match Reasoning:
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                  Selected because client requested maternity coverage without waiting periods, private hospital network access in Western Cape, and full chronic medication cover within budget range.
                </p>
              </div>
            </div>
          </div>

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
                  className="flex gap-4 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/20 hover:border-emerald-500/30 transition-colors"
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

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between">
            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed pr-4">
              The recommendation engine is designed to complement — not replace —
              advisor judgment. Every result includes the reasoning chain so you
              can explain the &ldquo;why&rdquo; behind each match to your client
              with confidence.
            </p>
            <Link
              href="/chat"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 inline-flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              Ask Chat Assistant <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

