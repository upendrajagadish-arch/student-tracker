"use client";

import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SKILL_CATEGORY_LABELS } from "@/lib/tech-constants";
import { READINESS_STATUS_LABELS, RISK_LEVEL_LABELS } from "@/lib/readiness-constants";
import { formatScore } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import type { SkillCategory } from "@/types/tech-stack";
import type { ReadinessStatus, RiskLevel } from "@/types/readiness";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Code2,
  FileText,
  Gauge,
  MessageSquare,
  ShieldCheck,
  Target,
  Users,
  Zap,
  Briefcase,
  Github,
  Network,
} from "lucide-react";

interface DashboardStatsGridProps {
  stats: DashboardStats;
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const topWeaklyEvidencedSkills = stats.topWeaklyEvidencedSkills ?? [];
  const topVerifiedEvidenceSkills = stats.topVerifiedEvidenceSkills ?? [];
  const studentsWithStrongEvidence = stats.studentsWithStrongEvidence ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} />
        <StatCard
          title="Placement Ready"
          value={stats.readinessPlacementReady}
          subtitle="Readiness engine: ready or highly ready"
          icon={Target}
        />
        <StatCard
          title="High Risk Students"
          value={stats.readinessHighRisk}
          subtitle="High or critical risk level"
          icon={AlertTriangle}
        />
        <StatCard
          title="Needs Attention"
          value={stats.needsAttention}
          icon={AlertTriangle}
        />
        <StatCard
          title="Resume Uploaded"
          value={stats.resumeUploaded}
          subtitle="Active resume on file"
          icon={FileText}
        />
        <StatCard
          title="Resume Approved"
          value={stats.resumeApproved}
          icon={CheckCircle2}
        />
        <StatCard
          title="Avg Resume Score"
          value={formatScore(stats.avgResumeScore)}
          icon={Award}
        />
        <StatCard
          title="Students with Tech Stack"
          value={stats.studentsWithTechStack}
          subtitle="At least one skill recorded"
          icon={Code2}
        />
        <StatCard
          title="Avg Verified Skills"
          value={formatScore(stats.avgVerifiedSkillsPerStudent)}
          subtitle="Per student with verified skills"
          icon={ShieldCheck}
        />
        <StatCard
          title="Avg Placement Readiness"
          value={formatScore(stats.readinessAvgScore)}
          subtitle="System-calculated from latest snapshots"
          icon={Gauge}
        />
        <StatCard
          title="Avg Technical Score"
          value={formatScore(stats.avgTechnicalScore)}
          icon={Zap}
        />
        <StatCard
          title="Avg Communication Score"
          value={formatScore(stats.avgCommunicationScore)}
          icon={MessageSquare}
        />
      </div>

      {(stats.activeCompanyRequirements > 0 ||
        stats.strongMatchesThisMonth > 0 ||
        stats.topMissingSkillsAcrossRequirements.length > 0) && (
        <Card className="premium-hover-lift">
          <CardHeader>
            <CardTitle className="text-sm">Company Matching</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Active Requirements"
                value={stats.activeCompanyRequirements}
                icon={Briefcase}
                compact
              />
              <StatCard
                title="Strong Matches (This Month)"
                value={stats.strongMatchesThisMonth}
                subtitle="Across active requirements"
                icon={Target}
                compact
              />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Top Missing Skills
                </p>
                {stats.topMissingSkillsAcrossRequirements.length === 0 ? (
                  <p className="text-sm text-slate-500">No gap data yet</p>
                ) : (
                  <div className="space-y-1">
                    {stats.topMissingSkillsAcrossRequirements.map((item) => (
                      <div
                        key={item.skill}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-slate-600">{item.skill}</span>
                        <span className="font-medium text-slate-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(stats.studentsWithGitHubSynced > 0 ||
        stats.topGitHubLanguages.length > 0) && (
        <Card className="premium-hover-lift">
          <CardHeader>
            <CardTitle className="text-sm">GitHub Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="GitHub Synced"
                value={stats.studentsWithGitHubSynced}
                icon={Github}
                compact
              />
              <StatCard
                title="Avg Evidence Score"
                value={formatScore(stats.avgGitHubEvidenceScore)}
                subtitle="Synced profiles only"
                icon={Github}
                compact
              />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Top GitHub Languages
                </p>
                {stats.topGitHubLanguages.length === 0 ? (
                  <p className="text-sm text-slate-500">No language data yet</p>
                ) : (
                  <div className="space-y-1">
                    {stats.topGitHubLanguages.map((item) => (
                      <div
                        key={item.name}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-slate-600">{item.name}</span>
                        <span className="font-medium text-slate-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {stats.recentlyActiveGitHubStudents.length > 0 && (
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recently Active on GitHub
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.recentlyActiveGitHubStudents.map((s) => (
                    <span
                      key={s.rollNumber}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {s.fullName} ({s.rollNumber})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(stats.studentsWithCodingProfiles > 0 ||
        stats.topCodingPlatforms.length > 0) && (
        <Card className="premium-hover-lift">
          <CardHeader>
            <CardTitle className="text-sm">Coding Platform Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Coding Profiles"
                value={stats.studentsWithCodingProfiles}
                subtitle="Students with at least one profile"
                icon={Code2}
                compact
              />
              <StatCard
                title="Avg Evidence Score"
                value={formatScore(stats.avgCodingEvidenceScore)}
                icon={Code2}
                compact
              />
              <StatCard
                title="Inactive Profiles"
                value={stats.inactiveCodingProfiles}
                subtitle="No activity in 180+ days"
                icon={Code2}
                compact
              />
            </div>
            {stats.topCodingPlatforms.length > 0 && (
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Top Platforms
                </p>
                <div className="space-y-1">
                  {stats.topCodingPlatforms.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-medium text-slate-900">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(studentsWithStrongEvidence > 0 ||
        topWeaklyEvidencedSkills.length > 0 ||
        topVerifiedEvidenceSkills.length > 0) && (
        <Card className="premium-hover-lift">
          <CardHeader>
            <CardTitle className="text-sm">Skill Evidence Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                title="Strong Evidence"
                value={studentsWithStrongEvidence}
                subtitle="Students with strong/verified skills"
                icon={Network}
                compact
              />
              {topVerifiedEvidenceSkills.length > 0 && (
                <div className="border-t border-surface-border pt-4 sm:border-t-0 sm:pt-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Top Verified Skills
                  </p>
                  <div className="space-y-1">
                    {topVerifiedEvidenceSkills.map((item) => (
                      <div
                        key={item.skill}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-slate-600">{item.skill}</span>
                        <span className="font-medium text-slate-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {topWeaklyEvidencedSkills.length > 0 && (
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Most Claimed but Weakly Evidenced
                </p>
                <div className="space-y-1">
                  {topWeaklyEvidencedSkills.map((item) => (
                    <div
                      key={item.skill}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.skill}</span>
                      <span className="font-medium text-slate-900">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(stats.readinessStatusDistribution.length > 0 ||
        stats.readinessRiskDistribution.length > 0 ||
        stats.readinessTopGaps.length > 0 ||
        stats.topSkills.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {stats.readinessStatusDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Readiness Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.readinessStatusDistribution.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600">
                        {READINESS_STATUS_LABELS[item.status as ReadinessStatus]}
                      </span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.readinessRiskDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.readinessRiskDistribution.map((item) => (
                    <div
                      key={item.risk}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600">
                        {RISK_LEVEL_LABELS[item.risk as RiskLevel]}
                      </span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.readinessTopGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Readiness Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.readinessTopGaps.map((item) => (
                    <div
                      key={item.gap}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.gap}</span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.topSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top 5 Skills by Student Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSkills.map((skill, i) => (
                    <div key={skill.name} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-medium text-slate-400">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {skill.name}
                          </span>
                          <span className="text-slate-500">{skill.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{
                              width: `${Math.min(100, (skill.count / (stats.topSkills[0]?.count || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.categoryDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Skill Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.categoryDistribution.slice(0, 6).map((item) => (
                    <div key={item.category} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {SKILL_CATEGORY_LABELS[item.category as SkillCategory]}
                      </span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
