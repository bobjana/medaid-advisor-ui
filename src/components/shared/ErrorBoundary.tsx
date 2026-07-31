'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message ?? 'An unexpected error occurred'}
              </p>
              <Button onClick={this.reset}>Try again</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}