'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const hasError = searchParams.get('error') === '1';

  return (
    <Card className="w-full max-w-md bg-card rounded-2xl border-outline-variant/30 overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary to-primary-container" />

      <CardHeader className="space-y-6 pb-4 pt-8">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-primary-foreground flex items-center justify-center shadow-sm">
            <Stethoscope className="w-6 h-6" strokeWidth={2.25} />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <CardTitle className="text-2xl tracking-tight">
            MedAid Advisor
          </CardTitle>
          <CardDescription className="text-base leading-relaxed text-muted-foreground">
            Sign in to continue to your workspace.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-8">
        <form action="/api/login" method="POST" className="space-y-5">
          {hasError && (
            <div
              role="alert"
              className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 text-sm font-medium text-destructive"
            >
              Invalid username or password. Please try again.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full">
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
