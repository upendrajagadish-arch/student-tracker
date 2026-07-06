"use client";

import {
  EvidenceSourceChip,
  EvidenceStrengthBadge,
} from "@/components/skill-evidence/EvidenceBadges";
import type { CompanySkillEvidenceFit } from "@/types/skill-evidence";

interface CompanySkillEvidenceSectionProps {
  fit: CompanySkillEvidenceFit;
}

export function CompanySkillEvidenceSection({
  fit,
}: CompanySkillEvidenceSectionProps) {
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-surface-border bg-slate-50/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Skill Evidence Fit
      </p>

      {fit.verifiedMatching.length > 0 && (
        <FitGroup
          title="Verified / Strong Matching"
          skills={fit.verifiedMatching}
          variant="positive"
        />
      )}

      {fit.missingRequired.length > 0 && (
        <FitGroup
          title="Missing Required"
          skills={fit.missingRequired}
          variant="missing"
        />
      )}

      {fit.weakEvidenceSkills.length > 0 && (
        <FitGroup
          title="Weak Evidence"
          skills={fit.weakEvidenceSkills}
          variant="weak"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SkillFitList title="Required Skills" rows={fit.requiredSkills} />
        <SkillFitList title="Preferred Skills" rows={fit.preferredSkills} />
      </div>
    </div>
  );
}

function FitGroup({
  title,
  skills,
  variant,
}: {
  title: string;
  skills: string[];
  variant: "positive" | "missing" | "weak";
}) {
  const styles = {
    positive: "text-emerald-700",
    missing: "text-red-700",
    weak: "text-amber-700",
  };
  return (
    <div>
      <p className={`text-xs font-medium ${styles[variant]}`}>{title}</p>
      <p className="mt-0.5 text-sm text-slate-700">{skills.join(", ")}</p>
    </div>
  );
}

function SkillFitList({
  title,
  rows,
}: {
  title: string;
  rows: CompanySkillEvidenceFit["requiredSkills"];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">{title}</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.skillName}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span className="font-medium text-slate-800">{row.skillName}</span>
            <EvidenceStrengthBadge strength={row.evidenceStrength} />
            {row.evidenceSources.slice(0, 3).map((s) => (
              <EvidenceSourceChip key={s} source={s} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
