"use client";

import { AnimatedGrid } from "@/components/premium/AnimatedGrid";
import { PremiumBadge } from "@/components/premium/PremiumBadge";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { SpotlightCard } from "@/components/premium/SpotlightCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PaginatedResult } from "@/types";
import type { CompanyListItem } from "@/types/company";
import { Building2, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface CompaniesPageClientProps {
  result: PaginatedResult<CompanyListItem>;
  basePath: string;
  canManage: boolean;
}

export function CompaniesPageClient({
  result,
  basePath,
  canManage,
}: CompaniesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applySearch() {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        title="Companies"
        description="Manage recruiting partners and role requirements."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`${basePath}/parse-jd`}>
                <PremiumButton variant="secondary">
                  <Sparkles className="h-4 w-4" />
                  Parse JD
                </PremiumButton>
              </Link>
              <Link href={`${basePath}/new`}>
                <PremiumButton>
                  <Plus className="h-4 w-4" />
                  Add Company
                </PremiumButton>
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-full rounded-lg border border-surface-border py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <Button variant="secondary" onClick={applySearch}>
          Search
        </Button>
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description={
            canManage
              ? "Add your first recruiting partner to start creating role requirements."
              : "No companies have been added yet."
          }
          action={
            canManage ? (
              <Link href={`${basePath}/new`}>
                <Button>Add Company</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <AnimatedGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.data.map((company) => (
            <Link key={company.id} href={`${basePath}/${company.id}`}>
              <SpotlightCard gradientBorder hoverLift className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {company.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {company.industry ?? "Industry not set"}
                        {company.location ? ` · ${company.location}` : ""}
                      </p>
                    </div>
                    <PremiumBadge tone={company.isActive ? "success" : "default"}>
                      {company.isActive ? "Active" : "Inactive"}
                    </PremiumBadge>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-slate-500">
                    <span>{company.requirementCount} requirements</span>
                    <span>{company.activeRequirementCount} active</span>
                  </div>
              </SpotlightCard>
            </Link>
          ))}
        </AnimatedGrid>
      )}

      {result.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={`${basePath}?${new URLSearchParams({
                  ...Object.fromEntries(searchParams.entries()),
                  page: String(p),
                }).toString()}`}
              >
                <Button
                  variant={p === result.page ? "primary" : "secondary"}
                  size="sm"
                >
                  {p}
                </Button>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
