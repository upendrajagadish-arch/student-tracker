"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";

export function AuditLogsEmptyState() {
  return (
    <EmptyState
      icon={ScrollText}
      title="No audit logs yet"
      description="Actions such as student changes and login events will appear here."
    />
  );
}
