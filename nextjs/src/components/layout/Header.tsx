'use client';

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <h1 className="text-lg font-semibold md:ml-0 ml-12">
          MedAid Advisor
        </h1>
        <div className="text-sm text-muted-foreground">
          v0.1.0
        </div>
      </div>
    </header>
  );
}