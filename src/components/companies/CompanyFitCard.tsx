"use client";

import {
  EligibilityStatusBadge,
  MatchStatusBadge,
  SkillChip,
} from "@/components/companies/MatchBadges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatDate, formatScore } from "@/lib/utils";
import type { StudentCompanyMatchItem } from "@/types/company";
import type { CompanySkillEvidenceFit } from "@/types/skill-evidence";
import { Briefcase, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CompanySkillEvidenceSection } from "@/components/skill-evidence/CompanySkillEvidenceSection";

interface CompanyFitCardProps {
  matches: StudentCompanyMatchItem[];
  requirementsBasePath: string;
  evidenceFits?: Record<string, CompanySkillEvidenceFit>;
}

export function CompanyFitCard({
  matches,
  requirementsBasePath,
  evidenceFits = {},
}: CompanyFitCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-brand-600" />
          Company Fit
        </CardTitle>
        <CardDescription>
          Latest matches against active company requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No company matches yet"
            description="Run matching on company requirements to see fit results for this student."
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="rounded-xl border border-surface-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {match.companyName}
                    </p>
                    <p className="text-sm text-slate-500">{match.roleTitle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      {formatScore(match.matchScore)}
                    </span>
                    <MatchStatusBadge status={match.matchStatus} />
                    <EligibilityStatusBadge status={match.eligibilityStatus} />
                  </div>
                </div>
                {match.missingSkills.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">
                      Missing skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.missingSkills.map((s) => (
                        <SkillChip key={s} label={s} variant="missing" />
                      ))}
                    </div>
                  </div>
                )}
                {match.risks.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-slate-500">
                      Risks
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.risks.slice(0, 3).map((r) => (
                        <SkillChip key={r} label={r} variant="risk" />
                      ))}
                    </div>
                  </div>
                )}
                {evidenceFits[match.companyRequirementId] && (
                  <CompanySkillEvidenceSection
                    fit={evidenceFits[match.companyRequirementId]}
                  />
                )}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Matched {formatDate(match.calculatedAt)}
                  </p>
                  <Link
                    href={`${requirementsBasePath}/${match.companyId}/requirements/${match.companyRequirementId}`}
                  >
                    <Button variant="ghost" size="sm">
                      View requirement
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
