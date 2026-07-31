'use client';

export function Header() {
  return (
    <header className="sticky top-0 z-30 glass-header">
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        <div className="md:ml-0 ml-12">
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            MedAid Advisor
          </h1>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mt-0.5">
            Editorial Care Workspace
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            v0.1.0
          </span>
        </div>
      </div>
    </header>
  );
}