import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recalculateStudentReadiness } from "@/lib/services/readiness";
import { getStudentById } from "@/lib/services/students";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "readiness:recalculate")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const snapshot = await recalculateStudentReadiness(id, {
      actorUserId: session.id,
      actorRole: session.role,
    });

    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json(
      { error: "Recalculation failed" },
      { status: 500 }
    );
  }
}
