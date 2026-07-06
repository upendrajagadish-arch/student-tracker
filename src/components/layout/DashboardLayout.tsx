"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import type { PublicBrandingSettings } from "@/types/branding";
import type { SessionUser } from "@/types";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

interface DashboardLayoutProps {
  user: SessionUser;
  branding: PublicBrandingSettings;
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({
  user,
  branding,
  children,
  title,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <ToastProvider>
      <div className="app-shell-bg flex min-h-screen">
        <div data-print-hide>
          <AppSidebar
            user={user}
            branding={branding}
            onLogout={handleLogout}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div data-print-hide>
            <Topbar
              user={user}
              title={title ?? branding.institutionName}
              onMenuClick={() => setMobileOpen(true)}
            />
          </div>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:pb-10">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
