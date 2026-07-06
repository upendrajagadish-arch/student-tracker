import { NextResponse } from "next/server";
import { unauthorizedMessage } from "@/lib/api-errors";
import { apiError, apiErrorFromUnknown } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { canManageDrives, canViewDrives } from "@/lib/permissions";
import { logAudit } from "@/lib/services/audit";
import {
  addStudentsToDrive,
  getDriveFunnel,
  getDriveStages,
  getPlacementDriveById,
} from "@/lib/services/placement-drives";
import { addStudentsSchema } from "@/lib/validations/placement-drive";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canViewDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;
  const drive = await getPlacementDriveById(id);
  if (!drive) return apiError("NOT_FOUND", "Placement drive not found.", 404);

  const url = new URL(request.url);
  const [funnel, stages] = await Promise.all([
    getDriveFunnel(id),
    getDriveStages(id, {
      search: url.searchParams.get("search") ?? undefined,
      branch: url.searchParams.get("branch") ?? undefined,
      batch: url.searchParams.get("batch") ?? undefined,
      currentStage: (url.searchParams.get("currentStage") as never) ?? undefined,
      finalOutcome: (url.searchParams.get("finalOutcome") as never) ?? undefined,
      attendanceStatus:
        (url.searchParams.get("attendanceStatus") as never) ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 20),
    }),
  ]);

  return NextResponse.json({
    success: true,
    drive,
    funnel,
    ...stages,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !canManageDrives(session.role)) {
    return apiError("UNAUTHORIZED", unauthorizedMessage(session?.role), 401);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = addStudentsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      );
    }

    const result = await addStudentsToDrive(
      id,
      parsed.data.studentIds,
      session.id
    );

    await logAudit({
      actorUserId: session.id,
      actorRole: session.role,
      action: "STUDENT_ADDED_TO_DRIVE",
      entityType: "PlacementDrive",
      entityId: id,
      description: `Added ${result.added} students to drive (${result.skipped} skipped)`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      route: "/api/placement-drives/[id]/students",
      action: "add_students",
    });
  }
}
