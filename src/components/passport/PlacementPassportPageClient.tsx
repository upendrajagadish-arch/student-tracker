"use client";

import { PlacementPassportDocument } from "@/components/passport/PlacementPassportDocument";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { PlacementPassportView } from "@/types/passport";
import type { PublicBrandingSettings } from "@/types/branding";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PlacementPassportPageClientProps {
  passport: PlacementPassportView | null;
  branding: PublicBrandingSettings;
  backHref: string;
  studentId: string;
  requirementId?: string | null;
  canGenerate?: boolean;
  canPrint?: boolean;
  onPrintAuditUrl?: string;
}

export function PlacementPassportPageClient({
  passport: initialPassport,
  branding,
  backHref,
  studentId,
  requirementId,
  canGenerate = false,
  canPrint = true,
  onPrintAuditUrl,
}: PlacementPassportPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [passport, setPassport] = useState(initialPassport);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/students/${studentId}/passport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirementId: requirementId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to generate passport", "error");
        return;
      }
      setPassport(data.passport);
      toast("Placement Passport generated", "success");
      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePrint() {
    if (onPrintAuditUrl) {
      await fetch(onPrintAuditUrl, { method: "POST" }).catch(() => undefined);
    }
    window.print();
  }

  return (
    <div className="space-y-6">
      <div
        data-print-hide
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Link href={backHref}>
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          {canGenerate && (
            <Button
              variant="secondary"
              onClick={handleGenerate}
              isLoading={isGenerating}
            >
              <RefreshCw className="h-4 w-4" />
              {passport ? "Regenerate Passport" : "Generate Passport"}
            </Button>
          )}
          {canPrint && passport && (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          )}
        </div>
      </div>

      {!passport ? (
        <div className="rounded-xl border border-surface-border bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-900">
            No Placement Passport yet
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Generate a passport snapshot to create a stable, shareable readiness
            summary for this student.
          </p>
          {canGenerate && (
            <Button className="mt-6" onClick={handleGenerate} isLoading={isGenerating}>
              Generate Passport
            </Button>
          )}
        </div>
      ) : (
        <PlacementPassportDocument passport={passport} branding={branding} />
      )}
    </div>
  );
}
