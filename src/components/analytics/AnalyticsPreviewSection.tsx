"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AnalyticsPreview } from "@/types/analytics";
import { ArrowRight, BarChart3 } from "lucide-react";
import Link from "next/link";

export function AnalyticsPreviewSection({
  preview,
  analyticsPath,
}: {
  preview: AnalyticsPreview;
  analyticsPath: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" />
          <CardTitle className="text-base">Analytics Preview</CardTitle>
        </div>
        <Link href={analyticsPath}>
          <Button variant="secondary" size="sm">
            Full Analytics
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              HR Funnel
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">
                  {preview.hrFunnel.shared}
                </p>
                <p className="text-xs text-slate-500">Shared</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">
                  {preview.hrFunnel.interested}
                </p>
                <p className="text-xs text-slate-500">Interested</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-semibold text-slate-900">
                  {preview.hrFunnel.shortlisted}
                </p>
                <p className="text-xs text-slate-500">Shortlisted</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              View rate: {preview.hrFunnel.viewedRate}%
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Top Missing Skills
            </p>
            {preview.topMissingSkills.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No gap data yet</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {preview.topMissingSkills.map((s) => (
                  <li
                    key={s.skill}
                    className="flex justify-between text-sm text-slate-700"
                  >
                    <span>{s.skill}</span>
                    <span className="font-medium">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Top Branch Readiness
            </p>
            {preview.topBranch ? (
              <div className="mt-2 rounded-lg bg-brand-50 p-4">
                <p className="text-lg font-semibold text-slate-900">
                  {preview.topBranch.branch}
                </p>
                <p className="text-sm text-brand-700">
                  Avg readiness {preview.topBranch.avgReadiness.toFixed(1)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No readiness data</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
