'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';

interface UserMenuProps {
  username: string | null;
  collapsed?: boolean;
}

export function UserMenu({ username, collapsed = false }: UserMenuProps) {
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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-full flex items-center gap-2.5 rounded-xl border border-outline-variant/40 hover:bg-sidebar-accent transition-colors ${
          collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
        }`}
      >
        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0 flex flex-col items-start leading-tight text-left">
              <span className="w-full truncate text-sm font-semibold text-sidebar-foreground">
                {displayName}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Broker
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-150 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 bottom-full mb-2 w-60 rounded-xl border border-outline-variant/30 bg-card shadow-lg shadow-black/5 overflow-hidden"
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
  );
}
