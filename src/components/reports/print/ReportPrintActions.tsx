"use client";

import { Button } from "@/components/ui/Button";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface ReportPrintActionsProps {
  reportsBasePath: string;
  reportType: string;
  canPrint: boolean;
}

export function ReportPrintActions({
  reportsBasePath,
  reportType,
  canPrint,
}: ReportPrintActionsProps) {
  useEffect(() => {
    document.body.classList.add("report-print-page");
    return () => document.body.classList.remove("report-print-page");
  }, []);

  async function handlePrint() {
    try {
      await fetch("/api/reports/print-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, action: "PRINT_TRIGGERED" }),
      });
    } catch {
      // Non-blocking — still open print dialog
    }
    window.print();
  }

  return (
    <>
      <Link href={reportsBasePath}>
        <Button variant="secondary" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
      </Link>
      {canPrint && (
        <Button size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      )}
    </>
  );
}
