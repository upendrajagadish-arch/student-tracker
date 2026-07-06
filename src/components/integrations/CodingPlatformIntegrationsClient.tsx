"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  ACCESS_REQUEST_STATUS_LABELS,
  API_STATUS_LABELS,
  CREDENTIAL_STATUS_LABELS,
  SYNC_MODE_LABELS,
} from "@/lib/coding-integration-constants";
import { formatDate } from "@/lib/utils";
import type {
  AccessRequestStatus,
  CodingPlatformIntegrationSafe,
} from "@/types/coding-platform-integrations";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  PlugZap,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

interface CodingPlatformIntegrationsClientProps {
  initialIntegrations: CodingPlatformIntegrationSafe[];
  canManage: boolean;
  canTest: boolean;
}

type PanelMode =
  | "configure"
  | "credentials"
  | "test"
  | "access"
  | "instructions"
  | null;

function statusPill(
  label: string,
  tone: "slate" | "green" | "amber" | "red" | "blue" | "violet"
) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function apiStatusTone(
  status: CodingPlatformIntegrationSafe["apiStatus"]
): "slate" | "green" | "amber" | "red" | "blue" | "violet" {
  switch (status) {
    case "TESTED":
      return "green";
    case "CONFIGURED":
      return "blue";
    case "FAILED":
    case "RATE_LIMITED":
      return "red";
    case "DISABLED":
      return "slate";
    default:
      return "amber";
  }
}

export function CodingPlatformIntegrationsClient({
  initialIntegrations,
  canManage,
  canTest,
}: CodingPlatformIntegrationsClientProps) {
  const { toast } = useToast();
  const [integrations, setIntegrations] =
    useState<CodingPlatformIntegrationSafe[]>(initialIntegrations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [busy, setBusy] = useState(false);

  const active = integrations.find((i) => i.platformId === activeId) ?? null;

  const [configureForm, setConfigureForm] = useState({
    enabled: false,
    baseUrl: "",
    contactPerson: "",
    vendorContactEmail: "",
    documentationUrl: "",
    accessRequestNotes: "",
  });

  const [credentialForm, setCredentialForm] = useState({
    apiKey: "",
    accessToken: "",
    teamId: "",
    clientId: "",
    clientSecret: "",
  });

  const [testForm, setTestForm] = useState({
    testHandle: "tourist",
    testId: "",
    candidateEmail: "",
  });

  const [accessForm, setAccessForm] = useState({
    accessRequestStatus: "NOT_REQUESTED" as AccessRequestStatus,
    contactPerson: "",
    vendorContactEmail: "",
    accessRequestNotes: "",
  });

  const openPanel = useCallback(
    (integration: CodingPlatformIntegrationSafe, mode: PanelMode) => {
      setActiveId(integration.platformId);
      setPanelMode(mode);
      setConfigureForm({
        enabled: integration.enabled,
        baseUrl: integration.baseUrl ?? "",
        contactPerson: integration.contactPerson ?? "",
        vendorContactEmail: integration.vendorContactEmail ?? "",
        documentationUrl: integration.documentationUrl ?? "",
        accessRequestNotes: integration.accessRequestNotes ?? "",
      });
      setCredentialForm({
        apiKey: "",
        accessToken: "",
        teamId: "",
        clientId: "",
        clientSecret: "",
      });
      setTestForm({
        testHandle: integration.platformSlug === "codeforces" ? "tourist" : "",
        testId: "",
        candidateEmail: "",
      });
      setAccessForm({
        accessRequestStatus: integration.accessRequestStatus,
        contactPerson: integration.contactPerson ?? "",
        vendorContactEmail: integration.vendorContactEmail ?? "",
        accessRequestNotes: integration.accessRequestNotes ?? "",
      });
    },
    []
  );

  const closePanel = () => {
    setActiveId(null);
    setPanelMode(null);
  };

  async function refreshList() {
    const res = await fetch("/api/integrations/coding-platforms");
    if (!res.ok) return;
    const data = await res.json();
    setIntegrations(data.integrations ?? []);
  }

  async function handleSaveSettings() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/integrations/coding-platforms/${active.platformId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: configureForm.enabled,
            baseUrl: configureForm.baseUrl || null,
            contactPerson: configureForm.contactPerson || null,
            vendorContactEmail: configureForm.vendorContactEmail || null,
            documentationUrl: configureForm.documentationUrl || null,
            accessRequestNotes: configureForm.accessRequestNotes || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save settings", "error");
        return;
      }
      toast("Integration settings saved", "success");
      await refreshList();
      closePanel();
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCredentials() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/integrations/coding-platforms/${active.platformId}/credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentialForm),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save credentials", "error");
        return;
      }
      toast("Credentials saved securely", "success");
      await refreshList();
      closePanel();
    } catch {
      toast("Failed to save credentials", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleTestConnection(integration: CodingPlatformIntegrationSafe) {
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (integration.platformSlug === "codeforces") {
        body.testHandle = testForm.testHandle || "tourist";
      }
      if (integration.platformSlug === "hackerearth") {
        if (testForm.testId) body.testId = testForm.testId;
        if (testForm.candidateEmail) body.candidateEmail = testForm.candidateEmail;
      }

      const res = await fetch(
        `/api/integrations/coding-platforms/${integration.platformId}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Connection test failed", "error");
        return;
      }
      toast(data.message, data.success ? "success" : "error");
      await refreshList();
    } catch {
      toast("Connection test failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccessRequest() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/integrations/coding-platforms/${active.platformId}/access-request`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accessForm),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to update access request", "error");
        return;
      }
      toast("Access request updated", "success");
      await refreshList();
      closePanel();
    } catch {
      toast("Failed to update access request", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{integration.platformName}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {SYNC_MODE_LABELS[integration.syncMode]}
                  </p>
                </div>
                {integration.liveSyncSupported
                  ? statusPill("Live sync", "green")
                  : statusPill("Manual/CSV", "slate")}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">API status</p>
                  {statusPill(
                    API_STATUS_LABELS[integration.apiStatus],
                    apiStatusTone(integration.apiStatus)
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Credentials</p>
                  {statusPill(
                    CREDENTIAL_STATUS_LABELS[integration.credentialStatus],
                    integration.credentialStatus === "CONFIGURED"
                      ? "green"
                      : integration.credentialStatus === "MISSING"
                        ? "amber"
                        : "slate"
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last tested</p>
                  <p className="text-sm text-slate-700">
                    {integration.lastTestedAt
                      ? formatDate(integration.lastTestedAt)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last sync</p>
                  <p className="text-sm text-slate-700">
                    {integration.lastSuccessfulSyncAt
                      ? formatDate(integration.lastSuccessfulSyncAt)
                      : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Access request</p>
                  {statusPill(
                    ACCESS_REQUEST_STATUS_LABELS[integration.accessRequestStatus],
                    integration.accessRequestStatus === "APPROVED"
                      ? "green"
                      : integration.accessRequestStatus === "REQUESTED" ||
                          integration.accessRequestStatus === "IN_REVIEW"
                        ? "blue"
                        : "slate"
                  )}
                </div>
              </div>

              {integration.testConnectionMessage && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {integration.testConnectionMessage}
                </p>
              )}

              {!integration.liveSyncSupported &&
                integration.requiredCredentialFields.length === 0 && (
                  <p className="text-xs text-amber-800">
                    Live API sync is not supported yet. Use manual/CSV import.
                  </p>
                )}

              <div className="flex flex-wrap gap-2">
                {canManage && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openPanel(integration, "configure")}
                  >
                    <Settings2 className="mr-1 h-3.5 w-3.5" />
                    Configure
                  </Button>
                )}
                {canManage &&
                  integration.requiredCredentialFields.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openPanel(integration, "credentials")}
                    >
                      <KeyRound className="mr-1 h-3.5 w-3.5" />
                      Credentials
                    </Button>
                  )}
                {canTest && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      openPanel(integration, "test");
                      if (
                        integration.platformSlug !== "hackerearth" ||
                        integration.hasCredentials
                      ) {
                        void handleTestConnection(integration);
                      }
                    }}
                  >
                    <PlugZap className="mr-1 h-3.5 w-3.5" />
                    Test
                  </Button>
                )}
                {(canManage || canTest) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openPanel(integration, "access")}
                  >
                    Access request
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openPanel(integration, "instructions")}
                >
                  Setup guide
                </Button>
                {integration.documentationUrl && (
                  <a
                    href={integration.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-medium text-brand-600 hover:underline"
                  >
                    Docs
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {active && panelMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {active.platformName}
                {panelMode === "configure" && " — Configure"}
                {panelMode === "credentials" && " — Credentials"}
                {panelMode === "test" && " — Test Connection"}
                {panelMode === "access" && " — API Access Request"}
                {panelMode === "instructions" && " — Setup Instructions"}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {panelMode === "configure" && canManage && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={configureForm.enabled}
                      onChange={(e) =>
                        setConfigureForm((f) => ({
                          ...f,
                          enabled: e.target.checked,
                        }))
                      }
                    />
                    Enable integration
                  </label>
                  <FormField label="Custom base URL (optional)">
                    <Input
                      value={configureForm.baseUrl}
                      onChange={(e) =>
                        setConfigureForm((f) => ({
                          ...f,
                          baseUrl: e.target.value,
                        }))
                      }
                      placeholder="Leave blank for default"
                    />
                  </FormField>
                  <FormField label="Contact person">
                    <Input
                      value={configureForm.contactPerson}
                      onChange={(e) =>
                        setConfigureForm((f) => ({
                          ...f,
                          contactPerson: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Vendor contact email">
                    <Input
                      type="email"
                      value={configureForm.vendorContactEmail}
                      onChange={(e) =>
                        setConfigureForm((f) => ({
                          ...f,
                          vendorContactEmail: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Documentation URL">
                    <Input
                      value={configureForm.documentationUrl}
                      onChange={(e) =>
                        setConfigureForm((f) => ({
                          ...f,
                          documentationUrl: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Notes">
                    <textarea
                      className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                      rows={3}
                      value={configureForm.accessRequestNotes}
                      onChange={(e) =>
                        setConfigureForm((f) => ({
                          ...f,
                          accessRequestNotes: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <Button onClick={handleSaveSettings} disabled={busy}>
                    Save settings
                  </Button>
                </>
              )}

              {panelMode === "credentials" && canManage && (
                <>
                  <p className="text-sm text-slate-600">
                    Secrets are encrypted server-side and never shown after saving.
                    {active.hasCredentials && (
                      <span className="mt-1 block text-emerald-700">
                        <CheckCircle2 className="mr-1 inline h-4 w-4" />
                        Configured fields:{" "}
                        {active.credentialFieldsConfigured.join(", ") || "none"}
                      </span>
                    )}
                  </p>
                  {active.platformSlug === "hackerrank" && (
                    <>
                      <FormField label="API key">
                        <Input
                          type="password"
                          autoComplete="off"
                          placeholder="Enter to update"
                          value={credentialForm.apiKey}
                          onChange={(e) =>
                            setCredentialForm((f) => ({
                              ...f,
                              apiKey: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Access token (alternative)">
                        <Input
                          type="password"
                          autoComplete="off"
                          placeholder="Enter to update"
                          value={credentialForm.accessToken}
                          onChange={(e) =>
                            setCredentialForm((f) => ({
                              ...f,
                              accessToken: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Team / workspace ID (optional)">
                        <Input
                          value={credentialForm.teamId}
                          onChange={(e) =>
                            setCredentialForm((f) => ({
                              ...f,
                              teamId: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                    </>
                  )}
                  {active.platformSlug === "hackerearth" && (
                    <>
                      <FormField label="Client ID">
                        <Input
                          type="password"
                          autoComplete="off"
                          placeholder="Enter to update"
                          value={credentialForm.clientId}
                          onChange={(e) =>
                            setCredentialForm((f) => ({
                              ...f,
                              clientId: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Client secret">
                        <Input
                          type="password"
                          autoComplete="off"
                          placeholder="Enter to update"
                          value={credentialForm.clientSecret}
                          onChange={(e) =>
                            setCredentialForm((f) => ({
                              ...f,
                              clientSecret: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                    </>
                  )}
                  <Button onClick={handleSaveCredentials} disabled={busy}>
                    Save credentials
                  </Button>
                </>
              )}

              {panelMode === "test" && canTest && (
                <>
                  {active.platformSlug === "codeforces" && (
                    <FormField label="Test handle">
                      <Input
                        value={testForm.testHandle}
                        onChange={(e) =>
                          setTestForm((f) => ({
                            ...f,
                            testHandle: e.target.value,
                          }))
                        }
                        placeholder="tourist"
                      />
                    </FormField>
                  )}
                  {active.platformSlug === "hackerearth" && (
                    <>
                      <FormField label="Test ID (optional)">
                        <Input
                          value={testForm.testId}
                          onChange={(e) =>
                            setTestForm((f) => ({
                              ...f,
                              testId: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Candidate email (optional)">
                        <Input
                          type="email"
                          value={testForm.candidateEmail}
                          onChange={(e) =>
                            setTestForm((f) => ({
                              ...f,
                              candidateEmail: e.target.value,
                            }))
                          }
                        />
                      </FormField>
                      <p className="text-xs text-slate-500">
                        Without test_id and email, only credential presence is
                        validated.
                      </p>
                    </>
                  )}
                  <Button
                    onClick={() => handleTestConnection(active)}
                    disabled={busy}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Run test
                  </Button>
                </>
              )}

              {panelMode === "access" && (canManage || canTest) && (
                <>
                  <FormField label="Access request status">
                    <Select
                      value={accessForm.accessRequestStatus}
                      onChange={(e) =>
                        setAccessForm((f) => ({
                          ...f,
                          accessRequestStatus: e.target
                            .value as AccessRequestStatus,
                        }))
                      }
                      disabled={!canManage}
                    >
                      {Object.entries(ACCESS_REQUEST_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </Select>
                  </FormField>
                  <FormField label="Contact person">
                    <Input
                      value={accessForm.contactPerson}
                      onChange={(e) =>
                        setAccessForm((f) => ({
                          ...f,
                          contactPerson: e.target.value,
                        }))
                      }
                      disabled={!canManage}
                    />
                  </FormField>
                  <FormField label="Vendor email">
                    <Input
                      type="email"
                      value={accessForm.vendorContactEmail}
                      onChange={(e) =>
                        setAccessForm((f) => ({
                          ...f,
                          vendorContactEmail: e.target.value,
                        }))
                      }
                      disabled={!canManage}
                    />
                  </FormField>
                  <FormField label="Notes (pricing, subscription, required credentials)">
                    <textarea
                      className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm disabled:bg-slate-50"
                      rows={4}
                      value={accessForm.accessRequestNotes}
                      onChange={(e) =>
                        setAccessForm((f) => ({
                          ...f,
                          accessRequestNotes: e.target.value,
                        }))
                      }
                      disabled={!canManage}
                    />
                  </FormField>
                  {canManage && (
                    <Button onClick={handleAccessRequest} disabled={busy}>
                      Save access request
                    </Button>
                  )}
                </>
              )}

              {panelMode === "instructions" && (
                <div className="space-y-3 text-sm text-slate-700">
                  <p>{active.setupInstructions}</p>
                  {active.requiredCredentialFields.length > 0 && (
                    <p>
                      <strong>Required credentials:</strong>{" "}
                      {active.requiredCredentialFields.join(", ")}
                    </p>
                  )}
                  {active.documentationUrl && (
                    <a
                      href={active.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-brand-600 hover:underline"
                    >
                      Official documentation
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
