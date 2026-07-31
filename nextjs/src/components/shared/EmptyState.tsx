import { Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <Icon className="w-10 h-10 mx-auto text-muted-foreground" />
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}