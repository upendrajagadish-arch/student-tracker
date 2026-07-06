"use client";

import { BrandingMark } from "@/components/branding/BrandingMark";
import { PremiumBadge } from "@/components/ui/premium/PremiumBadge";
import { getNavItems } from "@/lib/navigation";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PublicBrandingSettings } from "@/types/branding";
import type { SessionUser } from "@/types";
import { LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppSidebarProps {
  user: SessionUser;
  branding: PublicBrandingSettings;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({
  user,
  branding,
  onLogout,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(user.role);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50/50 px-5">
        <BrandingMark branding={branding} size="sm" showProduct={false} />
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "premium-nav-item relative",
                isActive && "premium-nav-item-active"
              )}
            >
              <span className="premium-nav-indicator" aria-hidden />
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-brand-600" : "text-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/60 bg-gradient-to-t from-slate-50/50 to-transparent p-4">
        <div className="mb-3 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-3 shadow-inner-soft">
          <div className="mb-2">
            <PremiumBadge tone="info" className="text-[10px]">
              {USER_ROLE_LABELS[user.role]}
            </PremiumBadge>
          </div>
          <p className="truncate text-sm font-medium text-slate-900">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="premium-nav-item w-full text-slate-600 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/60 bg-gradient-to-b from-white via-white to-slate-50/80 shadow-card backdrop-blur-xl lg:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-luxury-navy/50 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden
          />
          <aside className="relative flex h-full w-72 flex-col bg-white/95 shadow-premium backdrop-blur-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
