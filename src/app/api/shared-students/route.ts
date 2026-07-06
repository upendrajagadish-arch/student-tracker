import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import { getRequirementById } from "@/lib/services/companies";
import {
  bulkShareByMatchFilter,
  getInternalSharedStudents,
  revokeShares,
  shareStudentsWithHr,
  updateSharePermissions,
} from "@/lib/services/student-sharing";
import {
  bulkShareSchema,
  revokeSharesSchema,
  shareStudentsSchema,
  updateShareSchema,
} from "@/lib/validations/sharing";
import type { HRDecision, ShareStatus } from "@/types/sharing";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "sharing:view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getInternalSharedStudents({
    companyId: searchParams.get("companyId") ?? undefined,
    requirementId: searchParams.get("requirementId") ?? undefined,
    shareStatus: (searchParams.get("shareStatus") as ShareStatus) || undefined,
    hrDecision: (searchParams.get("hrDecision") as HRDecision) || undefined,
    branch: searchParams.get("branch") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "sharing:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.matchFilter) {
      const parsed = bulkShareSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid input" },
          { status: 400 }
        );
      }

      const requirement = await getRequirementById(
        parsed.data.companyRequirementId
      );
      if (!requirement) {
        return NextResponse.json(
          { error: "Requirement not found" },
          { status: 404 }
        );
      }

      const result = await bulkShareByMatchFilter({
        companyId: parsed.data.companyId,
        companyRequirementId: parsed.data.companyRequirementId,
        matchFilter: parsed.data.matchFilter,
        sharedByUserId: session.id,
        sharedWithUserId: parsed.data.sharedWithUserId,
        allowResumeDownload: parsed.data.allowResumeDownload,
        allowPlacementPassport: parsed.data.allowPlacementPassport,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
        sharingNote: parsed.data.sharingNote,
      });

      await logAudit({
        actorUserId: session.id,
        actorRole: session.role,
        action: "STUDENT_SHARED_WITH_HR",
        entityType: "CompanyRequirement",
        entityId: parsed.data.companyRequirementId,
        description: `Bulk shared ${result.count} students (${parsed.data.matchFilter}) for ${requirement.roleTitle}`,
      });

      return NextResponse.json(result, { status: 201 });
    }

    const parsed = shareStudentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const requirement = await getRequirementById(
      parsed.data.companyRequirementId
    );
    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      );
    }

    const result = await shareStudentsWithHr({
      companyId: parsed.data.companyId,
      companyRequirementId: parsed.data.companyRequirementId,
      studentIds: parsed.data.studentIds,
      sharedByUserId: session.id,
      sharedWithUserId: parsed.data.sharedWithUserId,
      allowResumeDownload: parsed.data.allowResumeDownload,
      allowPlacementPassport: parsed.data.allowPlacementPassport,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
      sharingNote: parsed.data.sharingNote,
    });

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_SHARED_WITH_HR",
      entityType: "CompanyRequirement",
      entityId: parsed.data.companyRequirementId,
      description: `Shared ${result.created + result.updated} students for ${requirement.roleTitle} at ${requirement.companyName}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Share failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "sharing:manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.shareIds && body.action === "revoke") {
      const parsed = revokeSharesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }

      const count = await revokeShares(parsed.data.shareIds);

      await logAudit({
        actorUserId: session.id,
        actorRole: session.role,
        action: "STUDENT_SHARE_REVOKED",
        entityType: "SharedStudentProfile",
        description: `Revoked ${count} shared student profile(s)`,
      });

      return NextResponse.json({ count });
    }

    const { shareId, ...updates } = body;
    if (!shareId) {
      return NextResponse.json({ error: "shareId required" }, { status: 400 });
    }

    const parsed = updateShareSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    await updateSharePermissions(shareId, {
      allowResumeDownload: parsed.data.allowResumeDownload,
      allowPlacementPassport: parsed.data.allowPlacementPassport,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : parsed.data.expiresAt === null
          ? null
          : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
