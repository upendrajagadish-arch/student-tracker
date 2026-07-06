"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { GITHUB_SYNC_STATUS_LABELS } from "@/lib/github-constants";
import { formatDate, formatScore } from "@/lib/utils";
import type {
  GitHubProfileItem,
  GitHubRepositoryItem,
  GitHubSyncStatus,
} from "@/types/github";
import {
  AlertTriangle,
  ExternalLink,
  Github,
  RefreshCw,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface GitHubEvidenceCardProps {
  studentId: string;
  githubUrl: string | null;
  initialProfile: GitHubProfileItem | null;
  canSync: boolean;
  canEditUsername: boolean;
}

export function GitHubEvidenceCard({
  studentId,
  githubUrl,
  initialProfile,
  canSync,
  canEditUsername,
}: GitHubEvidenceCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [usernameInput, setUsernameInput] = useState(
    profile?.username ?? githubUrl ?? ""
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [showUsernameForm, setShowUsernameForm] = useState(
    !githubUrl && !profile?.username
  );

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/students/${studentId}/github/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "GitHub sync failed", "error");
        if (data.profile) setProfile(data.profile);
        return;
      }
      setProfile(data.profile);
      toast(
        data.success
          ? "GitHub profile synced successfully"
          : data.error ?? "Sync completed with issues",
        data.success ? "success" : "error"
      );
      router.refresh();
    } catch {
      toast("GitHub sync failed", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleSaveUsername() {
    setIsSavingUsername(true);
    try {
      const res = await fetch(`/api/students/${studentId}/github`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrUrl: usernameInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save GitHub username", "error");
        return;
      }
      setProfile(data.profile);
      setShowUsernameForm(false);
      toast("GitHub username saved", "success");
      router.refresh();
    } catch {
      toast("Failed to save GitHub username", "error");
    } finally {
      setIsSavingUsername(false);
    }
  }

  const syncStatus = (profile?.syncStatus ?? "NOT_SYNCED") as GitHubSyncStatus;
  const rateLimitWarning = profile?.rateLimitWarning;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Evidence
            </CardTitle>
            <CardDescription>
              Project and language evidence from official GitHub API
            </CardDescription>
          </div>
          {canSync && (
            <Button
              variant="secondary"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing…" : "Sync GitHub"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {rateLimitWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{rateLimitWarning}</span>
          </div>
        )}

        {canEditUsername && showUsernameForm && (
          <div className="rounded-lg border border-surface-border bg-slate-50/50 p-4 space-y-3">
            <FormField label="GitHub username or profile URL">
              <Input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="octocat or https://github.com/octocat"
              />
            </FormField>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveUsername}
                disabled={isSavingUsername || !usernameInput.trim()}
              >
                Save GitHub
              </Button>
              {profile?.username && (
                <Button
                  variant="secondary"
                  onClick={() => setShowUsernameForm(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {!profile && !githubUrl && !showUsernameForm ? (
          <EmptyState
            icon={Github}
            title="No GitHub profile linked"
            description="Add a GitHub username to track project evidence."
            className="py-8"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              {profile?.avatarUrl && (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full border border-surface-border"
                />
              )}
              <div className="space-y-1">
                {(profile?.profileUrl || githubUrl) && (
                  <a
                    href={profile?.profileUrl ?? githubUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    @{profile?.username ?? "—"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <SyncStatusBadge status={syncStatus} />
                  {profile?.lastSyncedAt && (
                    <span className="text-slate-500">
                      Last synced {formatDate(profile.lastSyncedAt)}
                    </span>
                  )}
                </div>
                {profile?.syncError && syncStatus !== "SYNCED" && (
                  <p className="text-xs text-red-600">{profile.syncError}</p>
                )}
              </div>
              {canEditUsername && !showUsernameForm && (
                <Button
                  variant="secondary"
                  className="ml-auto"
                  onClick={() => setShowUsernameForm(true)}
                >
                  Edit username
                </Button>
              )}
            </div>

            {profile && syncStatus === "SYNCED" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ScoreBadge label="Evidence" score={profile.evidenceScore} />
                  <ScoreBadge label="Activity" score={profile.activityScore} />
                  <ScoreBadge label="Projects" score={profile.projectScore} />
                  <ScoreBadge
                    label="Consistency"
                    score={profile.consistencyScore}
                  />
                </div>

                <dl className="grid gap-3 sm:grid-cols-3 text-sm">
                  <MetaItem label="Public repos" value={String(profile.publicRepos)} />
                  <MetaItem
                    label="Last active repo"
                    value={
                      profile.repositories[0]?.lastPushedAt
                        ? formatDate(profile.repositories[0].lastPushedAt)
                        : "—"
                    }
                  />
                  <MetaItem
                    label="Followers"
                    value={String(profile.followers)}
                  />
                </dl>

                {profile.topLanguages.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Top languages
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.topLanguages.map((lang) => (
                        <span
                          key={lang.name}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {lang.name}
                          <span className="ml-1 text-slate-400">
                            {lang.percentage}%
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.repositories.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Repositories ({profile.repositories.length})
                    </p>
                    <div className="space-y-2">
                      {profile.repositories.slice(0, 8).map((repo) => (
                        <RepositoryRow key={repo.id} repo={repo} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SyncStatusBadge({ status }: { status: GitHubSyncStatus }) {
  const colors: Record<GitHubSyncStatus, string> = {
    NOT_SYNCED: "bg-slate-100 text-slate-600",
    SYNCED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
    RATE_LIMITED: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-medium ${colors[status]}`}
    >
      {GITHUB_SYNC_STATUS_LABELS[status]}
    </span>
  );
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-lg border border-surface-border bg-white p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">
        {formatScore(score)}
      </p>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function RepositoryRow({ repo }: { repo: GitHubRepositoryItem }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-surface-border bg-slate-50/50 p-3">
      <div className="min-w-0 space-y-1">
        <a
          href={repo.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {repo.repoName}
          {repo.isFork && (
            <span className="ml-2 text-xs text-slate-400">fork</span>
          )}
        </a>
        {repo.description && (
          <p className="text-xs text-slate-600 line-clamp-2">
            {repo.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {repo.primaryLanguage && (
            <span className="rounded bg-white px-2 py-0.5 border">
              {repo.primaryLanguage}
            </span>
          )}
          {repo.hasReadme && <span>README</span>}
          {repo.lastPushedAt && (
            <span>Pushed {formatDate(repo.lastPushedAt)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {repo.stars}
        </span>
        {repo.projectQualityScore != null && (
          <span className="font-medium text-slate-700">
            Q {formatScore(repo.projectQualityScore)}
          </span>
        )}
      </div>
    </div>
  );
}
