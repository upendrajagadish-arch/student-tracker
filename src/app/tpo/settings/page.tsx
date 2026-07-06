import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function TpoSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="View institution configuration."
      />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <p className="font-medium text-slate-900">Institution branding</p>
            <p className="text-sm text-slate-500">
              View logo, college name, and report branding (read-only).
            </p>
          </div>
          <Link href="/tpo/settings/branding">
            <Button variant="secondary">View branding</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
