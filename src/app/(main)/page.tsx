import Link from 'next/link';
import {
  ClipboardList,
  MessageSquare,
  Upload,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ActionCard {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
  accent: 'primary' | 'secondary' | 'tertiary';
}

const accentMap: Record<ActionCard['accent'], string> = {
  primary: 'from-primary to-primary-container text-primary-foreground',
  secondary: 'from-secondary to-secondary-container text-secondary-foreground',
  tertiary: 'from-tertiary to-tertiary-fixed text-tertiary-foreground',
};

const actions: ActionCard[] = [
  {
    href: '/questionnaire',
    title: 'Start Questionnaire',
    description: 'Complete a guided needs assessment across seven clinical sections.',
    icon: ClipboardList,
    external: true,
    accent: 'primary',
  },
  {
    href: '/chat',
    title: 'Open a Conversation',
    description: 'Ask grounded questions about medical aid plans and coverage.',
    icon: MessageSquare,
    accent: 'secondary',
  },
  {
    href: '/recommend',
    title: 'Recommend a Plan',
    description: 'Upload client data and receive broker-grade plan matches.',
    icon: Upload,
    accent: 'tertiary',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-12 pb-16">
      <section className="grid gap-6 md:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const externalProps = action.external
            ? {
                target: '_blank',
                rel: 'noopener noreferrer',
              }
            : {};
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group block focus:outline-none"
              {...externalProps}
            >
              <Card className="h-full bg-card rounded-2xl transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_48px_-24px_oklch(34%_0.13_256_/_0.18)]">
                <CardHeader className="space-y-6 pb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentMap[action.accent]} flex items-center justify-center shadow-sm`}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.25} />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl tracking-tight">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {action.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center text-sm font-semibold text-primary">
                    Open
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="bg-surface-container-low rounded-2xl p-8 md:p-10">
        <div className="grid md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
              Recent Activity
            </p>
            <h3 className="text-2xl font-bold tracking-tight">
              Nothing captured yet.
            </h3>
          </div>
          <div className="md:col-span-8 md:pt-1">
            <p className="text-base text-muted-foreground leading-relaxed">
              When you complete a questionnaire or generate a recommendation,
              it will appear here as a curated journal entry — never as a noisy
              row in a table.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}