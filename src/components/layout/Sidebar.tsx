'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  Target,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Stethoscope,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/questionnaire',
    label: 'Questionnaire',
    icon: ClipboardList,
  },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/recommend', label: 'Recommend', icon: Target },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-foreground/40 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen bg-sidebar text-sidebar-foreground
          z-50 flex flex-col py-6 shrink-0
          transition-[width,transform] duration-200 ease-in-out
          ${collapsed ? 'md:w-20' : 'md:w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          w-64
        `}
      >
        <div className={`mb-8 flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
            <Stethoscope className="w-5 h-5" strokeWidth={2.25} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-black text-primary leading-none tracking-tight">
                MedAid Advisor
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5 font-semibold">
                Editorial Care
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden ml-auto p-1 rounded hover:bg-sidebar-accent"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 mb-6">
            <Link
              href="/chat"
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-sm"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
              New Conversation
            </Link>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const externalProps = item.external
              ? {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {};
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                data-active={active}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 py-3 px-4 rounded-xl text-sm
                  transition-all duration-200 mx-2
                  ${collapsed ? 'justify-center px-2' : ''}
                  ${active
                    ? 'bg-card text-primary shadow-sm font-medium'
                    : 'text-sidebar-foreground/80 hover:bg-card/60 hover:translate-x-0.5'
                  }
                `}
                {...externalProps}
              >
                <Icon
                  className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`}
                  strokeWidth={active ? 2.25 as const : 2 as const}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center justify-end px-4 pt-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}