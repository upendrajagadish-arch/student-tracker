"use client";

import { PremiumBadge } from "@/components/ui/premium/PremiumBadge";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/types";
import { Bell, Menu, Search } from "lucide-react";

interface TopbarProps {
  user: SessionUser;
  title?: string;
  onMenuClick?: () => void;
}

export function Topbar({ user, title, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/75 px-4 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 lg:hidden">
            {title}
          </h2>
        )}
      </div>

      <div className="hidden max-w-md flex-1 px-8 lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Quick search..."
            className="h-10 w-full rounded-xl border border-surface-border/80 bg-white/60 pl-9 pr-4 text-sm text-slate-900 shadow-inner-soft placeholder:text-slate-400 focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
            disabled
            title="Global search coming in a future phase"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PremiumBadge tone="default" className="hidden sm:inline-flex">
          {USER_ROLE_LABELS[user.role]}
        </PremiumBadge>
        <button
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="Notifications"
          disabled
          title="Notifications coming in a future phase"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-200/60">
          {user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      </div>
    </header>
  );
}
