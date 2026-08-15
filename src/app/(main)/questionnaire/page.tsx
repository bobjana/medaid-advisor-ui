'use client';

import { useState } from 'react';
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Section {
  step: string;
  title: string;
  description: string;
  question: string;
  sampleAnswer: string;
}

const SECTIONS: Section[] = [
  {
    step: '1',
    title: 'Introduction & Consent',
    description: 'Client overview, advisor notes, and consent confirmation before proceeding.',
    question: 'Has the client provided consent to proceed with the assessment?',
    sampleAnswer: 'Yes — verbal consent recorded by the advisor.',
  },
  {
    step: '2',
    title: 'Personal Demographics',
    description: 'Age, dependants, income bracket, and geographic region.',
    question: 'What is the client\u2019s age bracket and dependant count?',
    sampleAnswer: '35\u201344 years old, 2 dependants, Western Cape.',
  },
  {
    step: '3',
    title: 'Health Status',
    description: 'Existing conditions, chronic medication, and disability declarations.',
    question: 'Are there any chronic conditions or disabilities to declare?',
    sampleAnswer: 'Hypertension (managed), no disability declaration.',
  },
  {
    step: '4',
    title: 'Healthcare Utilization',
    description: 'Expected GP visits, specialist referrals, hospitalisation likelihood, and dental or optical needs.',
    question: 'How often does the client expect to use GP and specialist services?',
    sampleAnswer: '4\u20136 GP visits/year, occasional specialist referrals.',
  },
  {
    step: '5',
    title: 'Coverage Preferences',
    description: 'Budget range, preferred hospital networks, gap cover, and benefit priorities.',
    question: 'What monthly premium range and hospital network are preferred?',
    sampleAnswer: 'R6,000\u2013R9,000/month, private network, gap cover included.',
  },
  {
    step: '6',
    title: 'Family Planning',
    description: 'Maternity needs, child dependant requirements, and future planning considerations.',
    question: 'Is the client planning to expand their family in the next 12 months?',
    sampleAnswer: 'Yes — maternity cover needed within 12 months.',
  },
  {
    step: '7',
    title: 'Review & Submit',
    description: 'Full summary with edit capability before submission to the recommendation engine.',
    question: 'Is the summary ready to submit for plan matching?',
    sampleAnswer: 'Reviewing summary before submitting to the recommendation engine.',
  },
];

export default function QuestionnairePage() {
  const [activeStep, setActiveStep] = useState(0);
  const section = SECTIONS[activeStep];
  const isFirst = activeStep === 0;
  const isLast = activeStep === SECTIONS.length - 1;

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
                Preview Mode
              </span>
            </div>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              A guided, seven-section needs assessment that captures a client&apos;s
              medical aid requirements in a structured, advisor-friendly format.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
          {/* Sample Questionnaire Preview */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Sample Questionnaire Preview:
            </p>

            {/* Step navigator */}
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s, idx) => {
                const isActive = idx === activeStep;
                const isComplete = idx < activeStep;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    aria-label={`Go to section ${s.step}: ${s.title}`}
                    aria-current={isActive ? 'step' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700/40'
                        : isComplete
                          ? 'bg-surface-container-low text-foreground border-outline-variant/30 hover:border-amber-400/40'
                          : 'bg-surface-container-lowest text-muted-foreground border-outline-variant/30 hover:border-amber-400/40'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-current/15 flex items-center justify-center text-[10px]">
                        {s.step}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active section card */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-amber-500/30 shadow-md space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[11px] font-extrabold rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Section {section.step} of {SECTIONS.length}
              </div>

              <div className="pr-20">
                <h4 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  {section.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                <p className="text-sm font-semibold text-foreground">{section.question}</p>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                    {section.sampleAnswer}
                  </p>
                </div>
              </div>
            </div>

            {/* Prev / Next controls */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                disabled={isFirst}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveStep((s) => Math.min(SECTIONS.length - 1, s + 1))}
                disabled={isLast}
                className="gap-1.5"
              >
                Next Section
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30">
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              Progress through each section is automatically saved to your
              browser. You can pause and resume at any time. Once completed, the
              questionnaire data feeds directly into the Plan Recommendation
              Engine.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
