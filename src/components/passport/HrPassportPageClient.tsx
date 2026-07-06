"use client";

import { PlacementPassportDocument } from "@/components/passport/PlacementPassportDocument";
import { Button } from "@/components/ui/Button";
import type { PlacementPassportView } from "@/types/passport";
import type { PublicBrandingSettings } from "@/types/branding";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

interface HrPassportPageClientProps {
  passport: PlacementPassportView;
  branding: PublicBrandingSettings;
  backHref: string;
  shareId: string;
}

export function HrPassportPageClient({
  passport,
  branding,
  backHref,
  shareId,
}: HrPassportPageClientProps) {
  async function handlePrint() {
    await fetch(`/api/hr/talent-room/${shareId}/passport/print`, {
      method: "POST",
    }).catch(() => undefined);
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
            Back to Profile
          </Button>
        </Link>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>
      <PlacementPassportDocument passport={passport} branding={branding} />
    </div>
  );
}
