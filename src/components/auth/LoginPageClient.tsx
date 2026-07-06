"use client";

import { BrandingMark } from "@/components/branding/BrandingMark";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { GlassPanel } from "@/components/ui/premium/GlassPanel";
import { PremiumBadge } from "@/components/ui/premium/PremiumBadge";
import { ROLE_LOGIN_HINTS, USER_ROLE_LABELS } from "@/lib/constants";
import { parseApiErrorMessage } from "@/lib/api-errors";
import { loginSchema, type LoginInput } from "@/lib/validations/student";
import type { PublicBrandingSettings } from "@/types/branding";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { UserRole } from "@/types";

const DEMO_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "TPO_ADMIN",
  "FACULTY",
  "HR",
];

interface LoginPageClientProps {
  branding: PublicBrandingSettings;
}

export function LoginPageClient({ branding }: LoginPageClientProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      setServerError(parseApiErrorMessage(result, "Login failed."));
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  }

  function fillDemo(role: UserRole) {
    const hint = ROLE_LOGIN_HINTS[role];
    setValue("email", hint.email);
    setValue("password", hint.password);
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Ambient background accents */}
      <div
        className="pointer-events-none absolute inset-0 bg-app-gradient"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-luxury-cyan/10 blur-3xl"
        aria-hidden
      />

      {/* Hero panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-luxury-mesh p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[length:200%_200%] opacity-30 motion-safe:animate-gradient-shift"
          style={{
            backgroundImage:
              "linear-gradient(135deg, transparent 0%, rgb(34 211 238 / 0.08) 50%, transparent 100%)",
          }}
          aria-hidden
        />
        <div className="relative z-10">
          <BrandingMark branding={branding} size="lg" showProduct variant="onDark" />
        </div>
        <div className="relative z-10 space-y-6">
          <PremiumBadge tone="gold" className="mb-2">
            Enterprise Placement Intelligence
          </PremiumBadge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Placement Intelligence
            <br />
            <span className="text-luxury-gold-soft">for {branding.institutionName}</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-slate-300">
            {branding.reportHeaderText ??
              "Track readiness. Match talent. Share verified profiles with HR — all in one professional workspace."}
          </p>
        </div>
        <p className="relative z-10 text-sm text-slate-400">
          {branding.productName} · {branding.tagline}
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md animate-slide-up space-y-8">
          <div className="lg:hidden">
            <BrandingMark branding={branding} size="md" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-600">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Secure sign in
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500">
              {branding.placementCellName} · {branding.institutionName}
            </p>
          </div>

          <GlassPanel className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800">
                  {serverError}
                </div>
              )}

              <FormField
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />
              <FormField
                label="Password"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register("password")}
              />

              <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                Sign in
              </Button>
            </form>
          </GlassPanel>

          <GlassPanel className="p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Demo accounts
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEMO_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className="group rounded-xl border border-surface-border/80 bg-white/80 px-3 py-2.5 text-left text-xs transition-all duration-200 hover:border-brand-200 hover:bg-brand-50/50 hover:shadow-card motion-reduce:transition-none"
                >
                  <span className="font-semibold text-slate-900 group-hover:text-brand-800">
                    {USER_ROLE_LABELS[role]}
                  </span>
                  <span className="mt-0.5 block truncate text-slate-500">
                    {ROLE_LOGIN_HINTS[role].email}
                  </span>
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
