'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn, Stethoscope, KeyRound, Sparkles } from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const hasError = searchParams.get('error') === '1';

  function fillDemoAccount() {
    setUsername('advisor');
    setPassword('medaid-demo-2024');
  }

  return (
    <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl rounded-2xl border border-outline-variant/40 shadow-xl overflow-hidden relative transition-all duration-300">
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary-container to-secondary" />

      <CardHeader className="space-y-5 pb-4 pt-8">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-primary-foreground flex items-center justify-center shadow-md ring-4 ring-primary/10">
            <Stethoscope className="w-7 h-7" strokeWidth={2.25} />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
            MedAid Advisor
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            Editorial Care Workspace for healthcare advisors
          </CardDescription>
        </div>

        {/* Quick Demo Fill Badge */}
        <div className="pt-1">
          <button
            type="button"
            onClick={fillDemoAccount}
            className="w-full py-2 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 text-xs font-semibold text-primary flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Fill Demo Credentials (advisor)
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-8">
        <form action="/api/login" method="POST" className="space-y-5">
          {hasError && (
            <div
              role="alert"
              className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 text-sm font-medium text-destructive flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Invalid username or password. Please try again.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="e.g. advisor"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-surface-container-lowest border-outline-variant/40 focus-visible:ring-primary rounded-xl text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10 bg-surface-container-lowest border-outline-variant/40 focus-visible:ring-primary rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] font-semibold"
          >
            <LogIn className="w-4 h-4" />
            Sign In to Workspace
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface bg-[radial-gradient(ellipse_at_top,_oklch(34%_0.13_256_/_0.15)_0%,_transparent_70%)]">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

