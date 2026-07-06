import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Institution configuration and operational preferences."
      />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <p className="font-medium text-slate-900">Institution branding</p>
            <p className="text-sm text-slate-500">
              Logo, college name, report headers, and contact details for
              passports and print reports.
            </p>
          </div>
          <Link href="/admin/settings/branding">
            <Button>Manage branding</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
