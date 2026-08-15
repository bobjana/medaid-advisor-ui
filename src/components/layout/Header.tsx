'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';

interface HeaderProps {
  username: string | null;
}

export function Header({ username }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = username ?? 'Advisor';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 glass-header">
      <div className="flex items-center justify-between px-4 md:px-8 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            MedAid Advisor
          </h1>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mt-0.5">
            Editorial Care Workspace
          </p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold">
              {initials}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight text-left">
              <span className="text-sm font-semibold text-foreground">{displayName}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Broker
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-150 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-xl border border-outline-variant/30 bg-card shadow-lg shadow-black/5 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-outline-variant/20">
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Signed in as broker</p>
              </div>
              <form action="/api/logout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-surface-container-low transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
