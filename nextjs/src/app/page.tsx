import Link from 'next/link';
import {
  ClipboardList,
  MessageSquare,
  Upload,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ActionCard {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const actions: ActionCard[] = [
  {
    href: '/questionnaire',
    title: 'Start Questionnaire',
    description: 'Complete a new medical aid needs assessment',
    icon: ClipboardList,
  },
  {
    href: '/chat',
    title: 'New Chat',
    description: 'Ask questions about medical aid plans and coverage',
    icon: MessageSquare,
  },
  {
    href: '/recommend',
    title: 'Upload Client Data',
    description: 'Upload client data and get plan recommendations',
    icon: Upload,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Choose an action to get started
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="group">
              <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="mt-4">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="px-0">
                    Open
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent actions will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity yet. Complete a questionnaire or get a
              recommendation to see activity here.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}