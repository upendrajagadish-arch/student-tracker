"use client";

import { BrandingMark } from "@/components/branding/BrandingMark";
import {
  AnimatedText,
  LuxuryBackground,
  PremiumBadge,
  PremiumButton,
  SpotlightCard,
} from "@/components/premium";
import { FormField } from "@/components/ui/FormField";
import { GlassPanel } from "@/components/ui/premium/GlassPanel";
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
    <div className="relative flex min-h-screen overflow-hidden bg-luxury-navy">
      <LuxuryBackground variant="hero" className="opacity-90" />

      {/* Hero panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/5 bg-luxury-mesh p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[length:200%_200%] opacity-30 motion-safe:animate-gradient-shift"
          style={{
            backgroundImage:
              "linear-gradient(135deg, transparent 0%, rgb(34 211 238 / 0.08) 50%, transparent 100%)",
          }}
          aria-hidden
        />
        <AnimatedText className="relative z-10">
          <BrandingMark branding={branding} size="lg" showProduct variant="onDark" />
        </AnimatedText>
        <div className="relative z-10 space-y-6">
          <PremiumBadge tone="gold" className="mb-2">
            Placement Intelligence OS
          </PremiumBadge>
          <AnimatedText as="h1" delay={80} className="text-4xl font-semibold leading-tight tracking-tight">
            {branding.productName}
            <br />
            <span className="text-luxury-gold-soft">for {branding.institutionName}</span>
          </AnimatedText>
          <AnimatedText as="p" delay={140} className="max-w-md text-lg leading-relaxed text-slate-300">
            {branding.reportHeaderText ??
              "Track readiness. Match talent. Share verified profiles with HR — all in one professional workspace."}
          </AnimatedText>
        </div>
        <AnimatedText as="p" delay={200} className="relative z-10 text-sm text-slate-400">
          {branding.placementCellName} · {branding.tagline}
        </AnimatedText>
      </div>

      {/* Sign-in panel */}
      <div className="relative flex w-full flex-col justify-center bg-white/95 px-6 py-12 backdrop-blur-sm lg:w-1/2 lg:bg-white/80 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <BrandingMark branding={branding} size="md" />
          </div>

          <div className="space-y-2">
            <AnimatedText className="flex items-center gap-2 text-brand-600">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Secure sign in
              </span>
            </AnimatedText>
            <AnimatedText as="h2" delay={60} className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </AnimatedText>
            <AnimatedText as="p" delay={100} className="text-sm text-slate-500">
              {branding.placementCellName} · {branding.institutionName}
            </AnimatedText>
          </div>

          <SpotlightCard gradientBorder className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div
                  className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800"
                  role="alert"
                >
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

              <PremiumButton type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                Sign in
              </PremiumButton>
            </form>
          </SpotlightCard>

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
