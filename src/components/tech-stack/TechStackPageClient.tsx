"use client";

import { SkillMasterPanel } from "@/components/tech-stack/SkillMasterPanel";
import {
  TechStackFilterBarSuspense,
  TechStackTable,
} from "@/components/tech-stack/TechStackManagement";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";
import type { PaginatedResult } from "@/types";
import type { StudentTechStackSummary, TechSkillItem } from "@/types/tech-stack";
import { Code2 } from "lucide-react";
import { Suspense, useState } from "react";

interface TechStackPageClientProps {
  result: PaginatedResult<StudentTechStackSummary>;
  branches: string[];
  batches: string[];
  masterSkills: TechSkillItem[];
  allMasterSkills: TechSkillItem[];
  basePath: string;
  studentsBasePath: string;
  canManageMaster: boolean;
}

export function TechStackPageClient({
  result,
  branches,
  batches,
  masterSkills,
  allMasterSkills,
  basePath,
  studentsBasePath,
  canManageMaster,
}: TechStackPageClientProps) {
  const [tab, setTab] = useState<"overview" | "master">("overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tech Stack Tracking"
        description="Track student skills, proficiency, verification, and role interests."
      />

      {canManageMaster && (
        <div className="flex gap-2 border-b border-surface-border">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Student Overview
          </TabButton>
          <TabButton
            active={tab === "master"}
            onClick={() => setTab("master")}
          >
            Skill Master
          </TabButton>
        </div>
      )}

      {tab === "overview" ? (
        <>
          <TechStackFilterBarSuspense
            branches={branches}
            batches={batches}
            masterSkills={masterSkills}
            basePath={basePath}
          />

          {result.data.length === 0 ? (
            <EmptyState
              icon={Code2}
              title="No students match filters"
              description="Adjust filters or add skills from student detail pages."
            />
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Showing {result.data.length} of {result.total} students
              </p>
              <Suspense fallback={<TableSkeleton />}>
                <TechStackTable
                  rows={result.data}
                  studentsBasePath={studentsBasePath}
                  basePath={basePath}
                  page={result.page}
                  totalPages={result.totalPages}
                />
              </Suspense>
            </>
          )}
        </>
      ) : (
        <SkillMasterPanel skills={allMasterSkills} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
