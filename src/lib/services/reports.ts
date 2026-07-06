import { prisma } from "@/lib/db";
import { ACTIVE_SHARE_STATUSES } from "@/lib/sharing-constants";
import {
  FINAL_OUTCOME_LABELS,
  PLACEMENT_STAGE_LABELS,
  PIPELINE_STATUS_LABELS,
} from "@/lib/placement-constants";
import {
  getDriveFunnel,
  getDriveStages,
  getPlacementDriveById,
} from "@/lib/services/placement-drives";
import { HR_DECISION_LABELS, SHARE_STATUS_LABELS } from "@/lib/sharing-constants";
import { RESUME_REVIEW_STATUS_LABELS } from "@/lib/resume-constants";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import type {
  ReportFilterOptions,
  ReportFilters,
  ReportResult,
  ReportSection,
  ReportSummaryItem,
  ReportType,
} from "@/types/reports";
import type { Prisma } from "@prisma/client";
import { getReportRowLimit, getPrintReportRowLimit } from "@/lib/export-limits";
import { getCompanyMatchingDashboardStats } from "@/lib/services/company-matching";
import { getGitHubDashboardStats } from "@/lib/services/github";
import { getCodingDashboardStats } from "@/lib/services/coding-platforms";
import { getSkillEvidenceDashboardStats } from "@/lib/services/skill-evidence";

function applyRowCap(report: ReportResult, cap: number): ReportResult {
  let truncated = false;
  const sections = report.sections.map((section) => {
    if (section.rows.length <= cap) return section;
    truncated = true;
    return { ...section, rows: section.rows.slice(0, cap) };
  });
  return {
    ...report,
    sections,
    rowCap: cap,
    truncated,
    warnings: [
      ...(report.warnings ?? []),
      ...(truncated
        ? [`Displaying first ${cap.toLocaleString()} rows per section. Apply filters or export for capped data.`]
        : []),
    ],
  };
}

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return round((num / den) * 100);
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function studentWhere(filters: ReportFilters): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};
  if (filters.branch) where.branch = filters.branch;
  if (filters.batch) where.batch = filters.batch;
  return where;
}

function stageWhere(filters: ReportFilters): Prisma.StudentPlacementStageWhereInput {
  const driveWhere: Prisma.PlacementDriveWhereInput = {};
  if (filters.companyId) driveWhere.companyId = filters.companyId;
  if (filters.driveId) driveWhere.id = filters.driveId;
  if (filters.requirementId) driveWhere.companyRequirementId = filters.requirementId;
  if (filters.dateFrom || filters.dateTo) {
    driveWhere.driveDate = {};
    if (filters.dateFrom) driveWhere.driveDate.gte = filters.dateFrom;
    if (filters.dateTo) driveWhere.driveDate.lte = filters.dateTo;
  }

  const where: Prisma.StudentPlacementStageWhereInput = { drive: driveWhere };
  if (filters.branch || filters.batch) where.student = studentWhere(filters);
  if (filters.finalOutcome) where.finalOutcome = filters.finalOutcome;
  return where;
}

function labelStage(stage: string): string {
  return PLACEMENT_STAGE_LABELS[stage as keyof typeof PLACEMENT_STAGE_LABELS] ?? stage;
}

function labelOutcome(outcome: string): string {
  return FINAL_OUTCOME_LABELS[outcome as keyof typeof FINAL_OUTCOME_LABELS] ?? outcome;
}

function labelPipeline(status: string): string {
  return PIPELINE_STATUS_LABELS[status as keyof typeof PIPELINE_STATUS_LABELS] ?? status;
}

export function parseReportFilters(
  params: Record<string, string | undefined>
): ReportFilters {
  const filters: ReportFilters = {};
  if (params.branch) filters.branch = params.branch;
  if (params.batch) filters.batch = params.batch;
  if (params.companyId) filters.companyId = params.companyId;
  if (params.driveId) filters.driveId = params.driveId;
  if (params.requirementId) filters.requirementId = params.requirementId;
  if (params.finalOutcome) {
    filters.finalOutcome = params.finalOutcome as ReportFilters["finalOutcome"];
  }
  if (params.dateFrom) filters.dateFrom = new Date(params.dateFrom);
  if (params.dateTo) {
    const d = new Date(params.dateTo);
    d.setHours(23, 59, 59, 999);
    filters.dateTo = d;
  }
  return filters;
}

export function parsePrintReportParams(
  params: Record<string, string | undefined>
): { type: ReportType; filters: ReportFilters } {
  const type = (params.reportType ?? params.type) as ReportType;
  return {
    type,
    filters: parseReportFilters({
      branch: params.branch,
      batch: params.batch,
      companyId: params.companyId,
      driveId: params.driveId,
      requirementId: params.requirementId,
      finalOutcome: params.finalOutcome,
      dateFrom: params.fromDate ?? params.dateFrom,
      dateTo: params.toDate ?? params.dateTo,
    }),
  };
}

export interface ReportFilterLabels {
  branch?: string;
  batch?: string;
  company?: string;
  drive?: string;
  requirement?: string;
  finalOutcome?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getReportFilterLabels(
  filters: ReportFilters
): Promise<ReportFilterLabels> {
  const labels: ReportFilterLabels = {};
  if (filters.branch) labels.branch = filters.branch;
  if (filters.batch) labels.batch = filters.batch;
  if (filters.finalOutcome) {
    labels.finalOutcome =
      FINAL_OUTCOME_LABELS[filters.finalOutcome] ?? filters.finalOutcome;
  }
  if (filters.dateFrom) labels.dateFrom = filters.dateFrom.toLocaleDateString();
  if (filters.dateTo) labels.dateTo = filters.dateTo.toLocaleDateString();

  if (filters.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: filters.companyId },
      select: { name: true },
    });
    if (company) labels.company = company.name;
  }
  if (filters.driveId) {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: filters.driveId },
      select: { driveTitle: true },
    });
    if (drive) labels.drive = drive.driveTitle;
  }
  if (filters.requirementId) {
    const req = await prisma.companyRequirement.findUnique({
      where: { id: filters.requirementId },
      select: { roleTitle: true },
    });
    if (req) labels.requirement = req.roleTitle;
  }
  return labels;
}

export function formatFilterLabelsAsText(labels: ReportFilterLabels): string {
  const parts = [
    labels.branch && `Branch: ${labels.branch}`,
    labels.batch && `Batch: ${labels.batch}`,
    labels.company && `Company: ${labels.company}`,
    labels.drive && `Drive: ${labels.drive}`,
    labels.requirement && `Requirement: ${labels.requirement}`,
    labels.finalOutcome && `Outcome: ${labels.finalOutcome}`,
    labels.dateFrom && `From: ${labels.dateFrom}`,
    labels.dateTo && `To: ${labels.dateTo}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "All records (no filters)";
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const [branches, batches, companies, drives, requirements] = await Promise.all([
    prisma.student.findMany({
      select: { branch: true },
      distinct: ["branch"],
      orderBy: { branch: "asc" },
    }),
    prisma.student.findMany({
      select: { batch: true },
      distinct: ["batch"],
      orderBy: { batch: "desc" },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.placementDrive.findMany({
      where: { status: { notIn: ["ARCHIVED"] } },
      include: { company: { select: { name: true } } },
      orderBy: [{ driveDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.companyRequirement.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    branches: branches.map((b) => b.branch),
    batches: batches.map((b) => b.batch),
    companies,
    drives: drives.map((d) => ({
      id: d.id,
      companyId: d.companyId,
      label: `${d.driveTitle} (${d.company.name})`,
    })),
    requirements: requirements.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      label: `${r.company.name} · ${r.roleTitle}`,
    })),
    finalOutcomes: (
      Object.keys(FINAL_OUTCOME_LABELS) as (keyof typeof FINAL_OUTCOME_LABELS)[]
    ).map((value) => ({ value, label: FINAL_OUTCOME_LABELS[value] })),
  };
}

async function buildDriveSummaryReport(
  filters: ReportFilters
): Promise<ReportResult> {
  if (!filters.driveId) {
    return {
      type: "DRIVE_SUMMARY",
      title: "Drive Summary Report",
      description: "Select a placement drive to generate this report.",
      generatedAt: new Date().toISOString(),
      summary: [],
      sections: [],
      warnings: ["Please select a placement drive using the filter above."],
    };
  }

  const drive = await getPlacementDriveById(filters.driveId);
  if (!drive) {
    return emptyReport("DRIVE_SUMMARY", "Drive Summary Report", "Drive not found.");
  }

  const [funnel, stagesResult] = await Promise.all([
    getDriveFunnel(filters.driveId),
    getDriveStages(filters.driveId, {
      branch: filters.branch,
      batch: filters.batch,
      finalOutcome: filters.finalOutcome,
      pageSize: 500,
    }),
  ]);

  const total = funnel.total || 1;
  const summary: ReportSummaryItem[] = [
    { label: "Drive", value: drive.driveTitle },
    { label: "Company", value: drive.companyName },
    { label: "Role", value: drive.roleTitle ?? "—" },
    {
      label: "Drive Date",
      value: drive.driveDate
        ? new Date(drive.driveDate).toLocaleDateString()
        : "—",
    },
    { label: "Students Added", value: funnel.total },
    { label: "Registered", value: funnel.registered },
    { label: "Attended", value: funnel.attended },
    { label: "Shortlisted", value: funnel.shortlisted },
    { label: "Technical Cleared", value: funnel.technicalCleared },
    { label: "HR Cleared", value: funnel.hrCleared },
    { label: "Selected", value: funnel.selected },
    { label: "Offered", value: funnel.offered },
    { label: "Joined", value: funnel.joined },
    { label: "Rejected", value: funnel.rejected },
    { label: "Reg → Join %", value: `${pct(funnel.joined, funnel.registered)}%` },
    { label: "Shortlist → Join %", value: `${pct(funnel.joined, funnel.shortlisted)}%` },
  ];

  const branchMap = new Map<
    string,
    { total: number; joined: number; selected: number }
  >();
  for (const s of stagesResult.data) {
    const entry = branchMap.get(s.branch) ?? { total: 0, joined: 0, selected: 0 };
    entry.total += 1;
    if (s.currentStage === "JOINED") entry.joined += 1;
    if (["SELECTED", "OFFERED", "JOINED"].includes(s.currentStage)) {
      entry.selected += 1;
    }
    branchMap.set(s.branch, entry);
  }

  const sections: ReportSection[] = [
    {
      title: "Branch-wise Breakdown",
      headers: ["Branch", "Students", "Selected", "Joined", "Join Rate %"],
      rows: [...branchMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([branch, d]) => [
          branch,
          d.total,
          d.selected,
          d.joined,
          `${pct(d.joined, d.total)}%`,
        ]),
    },
    {
      title: "Student Pipeline",
      headers: [
        "Student",
        "Roll No",
        "Branch",
        "Batch",
        "Stage",
        "Outcome",
        "Attendance",
        "Tech Round",
        "HR Round",
        "Package LPA",
      ],
      rows: stagesResult.data.map((s) => [
        s.fullName,
        s.rollNumber,
        s.branch,
        s.batch,
        labelStage(s.currentStage),
        labelOutcome(s.finalOutcome),
        labelPipeline(s.attendanceStatus),
        labelPipeline(s.technicalRoundStatus),
        labelPipeline(s.hrRoundStatus),
        s.packageLpa,
      ]),
    },
  ];

  return {
    type: "DRIVE_SUMMARY",
    title: "Drive Summary Report",
    description: `${drive.driveTitle} — ${drive.companyName}`,
    generatedAt: new Date().toISOString(),
    summary,
    sections,
  };
}

async function buildCompanyPlacementReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const companyWhere: Prisma.CompanyWhereInput = { isActive: true };
  if (filters.companyId) companyWhere.id = filters.companyId;

  const companies = await prisma.company.findMany({
    where: companyWhere,
    include: {
      requirements: {
        where: filters.requirementId ? { id: filters.requirementId } : undefined,
        select: { id: true, roleTitle: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows: (string | number | null)[][] = [];
  let totalSelected = 0;
  let totalJoined = 0;
  const packages: number[] = [];

  for (const company of companies) {
    const reqIds = company.requirements.map((r) => r.id);
    if (reqIds.length === 0) continue;

    const [matched, shared, interested, shortlisted, stages] = await Promise.all([
      prisma.companyMatchSnapshot.count({
        where: {
          companyRequirementId: { in: reqIds },
          ...(filters.branch || filters.batch
            ? { student: studentWhere(filters) }
            : {}),
        },
      }),
      prisma.sharedStudentProfile.count({
        where: {
          companyId: company.id,
          companyRequirementId: { in: reqIds },
          shareStatus: { in: ACTIVE_SHARE_STATUSES },
          revokedAt: null,
        },
      }),
      prisma.sharedStudentProfile.count({
        where: {
          companyId: company.id,
          hrDecision: "INTERESTED",
          shareStatus: { in: ACTIVE_SHARE_STATUSES },
        },
      }),
      prisma.sharedStudentProfile.count({
        where: {
          companyId: company.id,
          OR: [{ hrDecision: "SHORTLISTED" }, { shareStatus: "SHORTLISTED" }],
        },
      }),
      prisma.studentPlacementStage.findMany({
        where: {
          drive: { companyId: company.id },
          ...(filters.branch || filters.batch
            ? { student: studentWhere(filters) }
            : {}),
        },
        select: {
          currentStage: true,
          finalOutcome: true,
          packageLpa: true,
        },
      }),
    ]);

    const selected = stages.filter((s) =>
      ["SELECTED", "OFFERED", "JOINED"].includes(s.currentStage)
    ).length;
    const offered = stages.filter(
      (s) => s.currentStage === "OFFERED" || s.currentStage === "JOINED"
    ).length;
    const joined = stages.filter((s) => s.currentStage === "JOINED").length;
    const pkgs = stages
      .map((s) => s.packageLpa)
      .filter((p): p is number => p != null);
    const avgPkg =
      pkgs.length > 0 ? round(pkgs.reduce((a, b) => a + b, 0) / pkgs.length, 2) : null;
    const maxPkg = pkgs.length > 0 ? Math.max(...pkgs) : null;

    totalSelected += selected;
    totalJoined += joined;
    packages.push(...pkgs);

    rows.push([
      company.name,
      company.requirements.map((r) => r.roleTitle).join("; ") || "—",
      matched,
      shared,
      interested,
      shortlisted,
      selected,
      offered,
      joined,
      avgPkg,
      maxPkg,
    ]);
  }

  const branchSelections = await getBranchSelectionRows(filters, filters.companyId);

  return {
    type: "COMPANY_PLACEMENT",
    title: "Company-wise Placement Report",
    description: "Matching, HR funnel, and placement outcomes by company.",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Companies", value: rows.length },
      { label: "Total Selected", value: totalSelected },
      { label: "Total Joined", value: totalJoined },
      {
        label: "Avg Package (LPA)",
        value:
          packages.length > 0
            ? round(packages.reduce((a, b) => a + b, 0) / packages.length, 2)
            : "—",
      },
    ],
    sections: [
      {
        title: "Company Summary",
        headers: [
          "Company",
          "Roles",
          "Matched",
          "Shared",
          "Interested",
          "Shortlisted",
          "Selected",
          "Offered",
          "Joined",
          "Avg Package",
          "Highest Package",
        ],
        rows,
      },
      {
        title: "Branch-wise Selections",
        headers: ["Branch", "Selections"],
        rows: branchSelections,
      },
    ],
  };
}

async function getBranchSelectionRows(
  filters: ReportFilters,
  companyId?: string
): Promise<(string | number | null)[][]> {
  const stages = await prisma.studentPlacementStage.findMany({
    where: {
      ...stageWhere(filters),
      ...(companyId ? { drive: { companyId } } : {}),
      currentStage: { in: ["SELECTED", "OFFERED", "JOINED"] },
    },
    include: { student: { select: { branch: true } } },
  });
  const map = new Map<string, number>();
  for (const s of stages) {
    map.set(s.student.branch, (map.get(s.student.branch) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([branch, count]) => [branch, count]);
}

async function buildBranchPlacementReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const branches = filters.branch
    ? [filters.branch]
    : (
        await prisma.student.findMany({
          select: { branch: true },
          distinct: ["branch"],
          orderBy: { branch: "asc" },
        })
      ).map((b) => b.branch);

  const rows: (string | number | null)[][] = [];
  let totalJoined = 0;

  for (const branch of branches) {
    const sw = { branch };

    const [students, snapshots, stages] = await Promise.all([
      prisma.student.findMany({
        where: { ...sw, ...(filters.batch ? { batch: filters.batch } : {}) },
        select: {
          id: true,
          technicalScore: true,
          communicationScore: true,
        },
      }),
      prisma.readinessSnapshot.findMany({
        where: {
          student: { ...sw, ...(filters.batch ? { batch: filters.batch } : {}) },
        },
        orderBy: { calculatedAt: "desc" },
        distinct: ["studentId"],
        select: {
          overallScore: true,
          readinessStatus: true,
          riskLevel: true,
        },
      }),
      prisma.studentPlacementStage.findMany({
        where: {
          student: { ...sw, ...(filters.batch ? { batch: filters.batch } : {}) },
          ...(filters.companyId || filters.driveId
            ? { drive: { ...(filters.companyId ? { companyId: filters.companyId } : {}), ...(filters.driveId ? { id: filters.driveId } : {}) } }
            : {}),
        },
        select: {
          attendanceStatus: true,
          currentStage: true,
          packageLpa: true,
        },
      }),
    ]);

    const placementReady = snapshots.filter(
      (s) =>
        s.readinessStatus === "PLACEMENT_READY" ||
        s.readinessStatus === "HIGHLY_READY"
    ).length;
    const highRisk = snapshots.filter(
      (s) => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL"
    ).length;
    const drivesAttended = stages.filter((s) => s.attendanceStatus === "PASSED").length;
    const selected = stages.filter((s) =>
      ["SELECTED", "OFFERED", "JOINED"].includes(s.currentStage)
    ).length;
    const offered = stages.filter(
      (s) => s.currentStage === "OFFERED" || s.currentStage === "JOINED"
    ).length;
    const joined = stages.filter((s) => s.currentStage === "JOINED").length;
    totalJoined += joined;

    const avgReadiness =
      snapshots.length > 0
        ? round(snapshots.reduce((a, s) => a + s.overallScore, 0) / snapshots.length)
        : 0;
    const avgTech =
      students.length > 0
        ? round(students.reduce((a, s) => a + s.technicalScore, 0) / students.length)
        : 0;
    const avgComm =
      students.length > 0
        ? round(
            students.reduce((a, s) => a + s.communicationScore, 0) / students.length
          )
        : 0;
    const pkgs = stages.map((s) => s.packageLpa).filter((p): p is number => p != null);
    const avgPkg =
      pkgs.length > 0 ? round(pkgs.reduce((a, b) => a + b, 0) / pkgs.length, 2) : null;

    rows.push([
      branch,
      students.length,
      placementReady,
      highRisk,
      drivesAttended,
      selected,
      offered,
      joined,
      avgReadiness,
      avgTech,
      avgComm,
      avgPkg,
    ]);
  }

  return {
    type: "BRANCH_PLACEMENT",
    title: "Branch-wise Placement Report",
    description: "Readiness and placement outcomes grouped by branch.",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Branches", value: rows.length },
      { label: "Total Joined", value: totalJoined },
    ],
    sections: [
      {
        title: "Branch Details",
        headers: [
          "Branch",
          "Students",
          "Placement Ready",
          "High Risk",
          "Drives Attended",
          "Selected",
          "Offered",
          "Joined",
          "Avg Readiness",
          "Avg Technical",
          "Avg Communication",
          "Avg Package",
        ],
        rows,
      },
    ],
  };
}

async function buildBatchReadinessReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const batches = filters.batch
    ? [filters.batch]
    : (
        await prisma.student.findMany({
          select: { batch: true },
          distinct: ["batch"],
          orderBy: { batch: "desc" },
        })
      ).map((b) => b.batch);

  const rows: (string | number | null)[][] = [];

  for (const batch of batches) {
    const sw = { batch, ...(filters.branch ? { branch: filters.branch } : {}) };

    const [students, snapshots, resumes, techSkills] = await Promise.all([
      prisma.student.count({ where: sw }),
      prisma.readinessSnapshot.findMany({
        where: { student: sw },
        orderBy: { calculatedAt: "desc" },
        distinct: ["studentId"],
        select: { overallScore: true, readinessStatus: true, riskLevel: true },
      }),
      prisma.resume.findMany({
        where: { isActive: true, student: sw },
        select: { reviewStatus: true, studentId: true },
      }),
      prisma.studentTechSkill.findMany({
        where: { student: sw },
        select: { studentId: true, verificationStatus: true },
      }),
    ]);

    const avgReadiness =
      snapshots.length > 0
        ? round(snapshots.reduce((a, s) => a + s.overallScore, 0) / snapshots.length)
        : 0;
    const placementReady = snapshots.filter(
      (s) =>
        s.readinessStatus === "PLACEMENT_READY" ||
        s.readinessStatus === "HIGHLY_READY"
    ).length;
    const needsImprovement = snapshots.filter(
      (s) => s.readinessStatus === "NEEDS_IMPROVEMENT"
    ).length;
    const highRisk = snapshots.filter(
      (s) => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL"
    ).length;
    const resumeApproved = resumes.filter((r) => r.reviewStatus === "APPROVED").length;
    const studentsWithTech = new Set(techSkills.map((s) => s.studentId)).size;
    const verifiedCounts = techSkills.filter((s) =>
      (VERIFIED_STATUSES as string[]).includes(s.verificationStatus)
    );
    const avgVerified =
      students > 0
        ? round(
            verifiedCounts.length / Math.max(studentsWithTech, 1),
            1
          )
        : 0;

    rows.push([
      batch,
      students,
      avgReadiness,
      placementReady,
      needsImprovement,
      highRisk,
      resumeApproved,
      studentsWithTech,
      avgVerified,
    ]);
  }

  return {
    type: "BATCH_READINESS",
    title: "Batch Readiness Report",
    description: "Readiness, resume, and tech stack metrics by batch.",
    generatedAt: new Date().toISOString(),
    summary: [{ label: "Batches", value: rows.length }],
    sections: [
      {
        title: "Batch Details",
        headers: [
          "Batch",
          "Students",
          "Avg Readiness",
          "Placement Ready",
          "Needs Improvement",
          "High Risk",
          "Resume Approved",
          "Tech Stack Added",
          "Avg Verified Skills",
        ],
        rows,
      },
    ],
  };
}

async function buildStudentPlacementHistoryReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const stages = await prisma.studentPlacementStage.findMany({
    where: stageWhere(filters),
    include: {
      student: {
        select: {
          fullName: true,
          rollNumber: true,
          branch: true,
          batch: true,
        },
      },
      drive: {
        include: {
          company: { select: { name: true } },
          requirement: { select: { roleTitle: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: getReportRowLimit(),
  });

  return {
    type: "STUDENT_PLACEMENT_HISTORY",
    title: "Student Placement History Report",
    description: "Drive participation and outcomes for each student.",
    generatedAt: new Date().toISOString(),
    summary: [{ label: "Records", value: stages.length }],
    sections: [
      {
        title: "Placement History",
        headers: [
          "Student",
          "Roll No",
          "Branch",
          "Batch",
          "Company",
          "Drive",
          "Role",
          "Stage",
          "Outcome",
          "Offer Status",
          "Package LPA",
          "Joining Status",
          "Notes",
        ],
        rows: stages.map((s) => [
          s.student.fullName,
          s.student.rollNumber,
          s.student.branch,
          s.student.batch,
          s.drive.company.name,
          s.drive.driveTitle,
          s.drive.requirement?.roleTitle ?? "—",
          labelStage(s.currentStage),
          labelOutcome(s.finalOutcome),
          labelPipeline(s.offerStatus),
          s.packageLpa,
          labelPipeline(s.joiningStatus),
          s.notes,
        ]),
      },
    ],
  };
}

async function buildResumeReadinessReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const sw = studentWhere(filters);
  const students = await prisma.student.findMany({
    where: sw,
    include: {
      resumes: {
        where: { isActive: true },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
    take: getReportRowLimit(),
  });

  const uploaded = students.filter((s) => s.resumes.length > 0).length;
  const approved = students.filter(
    (s) => s.resumes[0]?.reviewStatus === "APPROVED"
  ).length;

  return {
    type: "RESUME_READINESS",
    title: "Resume Readiness Report",
    description: "Resume upload status, scores, and profile completeness.",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Students", value: students.length },
      { label: "Resumes Uploaded", value: uploaded },
      { label: "Approved", value: approved },
    ],
    sections: [
      {
        title: "Resume Details",
        headers: [
          "Student",
          "Roll No",
          "Branch",
          "Batch",
          "Uploaded",
          "Review Status",
          "Score",
          "ATS Friendly",
          "LinkedIn",
          "GitHub",
          "Projects",
          "Certifications",
          "Reviewer Comments",
        ],
        rows: students.map((s) => {
          const r = s.resumes[0];
          return [
            s.fullName,
            s.rollNumber,
            s.branch,
            s.batch,
            r ? "Yes" : "No",
            r
              ? RESUME_REVIEW_STATUS_LABELS[r.reviewStatus] ?? r.reviewStatus
              : "Not uploaded",
            r?.resumeScore ?? "—",
            r ? (r.atsFriendly ? "Yes" : "No") : "—",
            r ? (r.hasLinkedIn ? "Yes" : "No") : "—",
            r ? (r.hasGitHub ? "Yes" : "No") : "—",
            r ? (r.hasProjects ? "Yes" : "No") : "—",
            r ? (r.hasCertifications ? "Yes" : "No") : "—",
            r?.reviewerComments ?? "—",
          ];
        }),
      },
    ],
  };
}

async function buildSkillGapReport(filters: ReportFilters): Promise<ReportResult> {
  const reqWhere: Prisma.CompanyRequirementWhereInput = {
    status: "ACTIVE",
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.requirementId ? { id: filters.requirementId } : {}),
  };

  const requirements = await prisma.companyRequirement.findMany({
    where: reqWhere,
    include: { company: { select: { name: true } } },
  });
  const reqIds = requirements.map((r) => r.id);
  const reqLabelMap = new Map(
    requirements.map((r) => [r.id, `${r.company.name} · ${r.roleTitle}`])
  );

  if (reqIds.length === 0) {
    return emptyReport(
      "SKILL_GAP",
      "Skill Gap Report",
      "No active requirements match the selected filters."
    );
  }

  const matches = await prisma.companyMatchSnapshot.findMany({
    where: {
      companyRequirementId: { in: reqIds },
      ...(filters.branch || filters.batch
        ? { student: studentWhere(filters) }
        : {}),
    },
    select: {
      missingSkillsJson: true,
      companyRequirementId: true,
      studentId: true,
      student: { select: { branch: true } },
    },
  });

  const skillMap = new Map<
    string,
    {
      studentIds: Set<string>;
      reqs: Set<string>;
      branches: Map<string, number>;
    }
  >();

  for (const m of matches) {
    for (const skill of parseJsonArray(m.missingSkillsJson)) {
      const key = skill.trim();
      if (!key) continue;
      const entry = skillMap.get(key) ?? {
        studentIds: new Set<string>(),
        reqs: new Set<string>(),
        branches: new Map<string, number>(),
      };
      entry.studentIds.add(m.studentId);
      entry.reqs.add(m.companyRequirementId);
      entry.branches.set(
        m.student.branch,
        (entry.branches.get(m.student.branch) ?? 0) + 1
      );
      skillMap.set(key, entry);
    }
  }

  const rows = [...skillMap.entries()]
    .sort((a, b) => b[1].studentIds.size - a[1].studentIds.size)
    .slice(0, 50)
    .map(([skill, data]) => {
      const topBranches = [...data.branches.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([b]) => b)
        .join(", ");
      const relatedReqs = [...data.reqs]
        .map((id) => reqLabelMap.get(id) ?? id)
        .slice(0, 3)
        .join("; ");
      return [
        skill,
        data.reqs.size,
        data.studentIds.size,
        topBranches || "—",
        relatedReqs || "—",
        data.studentIds.size >= 5 ? "High priority training" : "Monitor",
      ];
    });

  return {
    type: "SKILL_GAP",
    title: "Skill Gap Report",
    description: "Skills missing across matched students and requirements.",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Skills Tracked", value: rows.length },
      { label: "Requirements", value: reqIds.length },
    ],
    sections: [
      {
        title: "Skill Gaps",
        headers: [
          "Skill",
          "Required By (# reqs)",
          "Affected Students",
          "Affected Branches",
          "Related Requirements",
          "Training Focus",
        ],
        rows,
      },
    ],
  };
}

async function buildHrSharingReport(filters: ReportFilters): Promise<ReportResult> {
  const where: Prisma.SharedStudentProfileWhereInput = {
    shareStatus: { in: ACTIVE_SHARE_STATUSES },
    revokedAt: null,
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.requirementId ? { companyRequirementId: filters.requirementId } : {}),
    ...(filters.branch || filters.batch ? { student: studentWhere(filters) } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          sharedAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        }
      : {}),
  };

  const shares = await prisma.sharedStudentProfile.findMany({
    where,
    include: {
      company: { select: { name: true } },
      requirement: { select: { roleTitle: true } },
      student: {
        select: { fullName: true, rollNumber: true, branch: true },
      },
    },
    orderBy: { sharedAt: "desc" },
    take: getReportRowLimit(),
  });

  return {
    type: "HR_SHARING",
    title: "HR Sharing Report",
    description: "Students shared with HR partners and review outcomes.",
    generatedAt: new Date().toISOString(),
    summary: [{ label: "Shared Profiles", value: shares.length }],
    sections: [
      {
        title: "HR Shares",
        headers: [
          "Company",
          "Requirement",
          "Student",
          "Roll No",
          "Branch",
          "Shared Date",
          "Share Status",
          "HR Decision",
          "HR Comments",
          "Resume Download",
          "Passport Access",
        ],
        rows: shares.map((s) => [
          s.company.name,
          s.requirement.roleTitle,
          s.student.fullName,
          s.student.rollNumber,
          s.student.branch,
          s.sharedAt.toLocaleDateString(),
          SHARE_STATUS_LABELS[s.shareStatus] ?? s.shareStatus,
          HR_DECISION_LABELS[s.hrDecision] ?? s.hrDecision,
          s.hrComments ?? "—",
          s.allowResumeDownload ? "Yes" : "No",
          s.allowPlacementPassport ? "Yes" : "No",
        ]),
      },
    ],
  };
}

async function buildFinalPlacementOutcomeReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const stages = await prisma.studentPlacementStage.findMany({
    where: stageWhere(filters),
    include: {
      student: { select: { branch: true } },
      drive: {
        include: {
          company: { select: { name: true } },
        },
      },
    },
  });

  const selected = stages.filter(
    (s) =>
      s.currentStage === "SELECTED" ||
      s.finalOutcome === "SELECTED" ||
      ["OFFERED", "JOINED"].includes(s.currentStage)
  ).length;
  const offered = stages.filter(
    (s) =>
      s.currentStage === "OFFERED" ||
      s.finalOutcome === "OFFERED" ||
      s.currentStage === "JOINED"
  ).length;
  const joined = stages.filter(
    (s) => s.currentStage === "JOINED" || s.finalOutcome === "JOINED"
  ).length;
  const rejected = stages.filter(
    (s) => s.finalOutcome === "REJECTED" || s.currentStage === "REJECTED"
  ).length;
  const withdrawn = stages.filter(
    (s) => s.finalOutcome === "WITHDRAWN" || s.currentStage === "WITHDRAWN"
  ).length;

  const packages = stages
    .map((s) => s.packageLpa)
    .filter((p): p is number => p != null);
  const avgPkg =
    packages.length > 0
      ? round(packages.reduce((a, b) => a + b, 0) / packages.length, 2)
      : null;
  const maxPkg = packages.length > 0 ? Math.max(...packages) : null;

  const companyOffers = new Map<string, number>();
  const branchOffers = new Map<string, number>();
  for (const s of stages) {
    if (["OFFERED", "JOINED"].includes(s.currentStage)) {
      companyOffers.set(
        s.drive.company.name,
        (companyOffers.get(s.drive.company.name) ?? 0) + 1
      );
      branchOffers.set(
        s.student.branch,
        (branchOffers.get(s.student.branch) ?? 0) + 1
      );
    }
  }

  return {
    type: "FINAL_PLACEMENT_OUTCOME",
    title: "Final Placement Outcome Report",
    description: "Aggregate offers, joins, packages, and conversion rates.",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Selected", value: selected },
      { label: "Offered", value: offered },
      { label: "Joined", value: joined },
      { label: "Rejected", value: rejected },
      { label: "Withdrawn", value: withdrawn },
      { label: "Highest Package (LPA)", value: maxPkg ?? "—" },
      { label: "Average Package (LPA)", value: avgPkg ?? "—" },
      {
        label: "Offer → Join %",
        value: `${pct(joined, offered)}%`,
      },
    ],
    sections: [
      {
        title: "Company-wise Offers",
        headers: ["Company", "Offers"],
        rows: [...companyOffers.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([company, count]) => [company, count]),
      },
      {
        title: "Branch-wise Offers",
        headers: ["Branch", "Offers"],
        rows: [...branchOffers.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([branch, count]) => [branch, count]),
      },
    ],
  };
}

async function buildManagementSummaryReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const sw = studentWhere(filters);

  const [
    totalStudents,
    totalCompanies,
    activeRequirements,
    totalDrives,
    studentsWithSnapshots,
    stages,
    hrShares,
    matchingStats,
    githubStats,
    codingStats,
    evidenceStats,
  ] = await Promise.all([
    prisma.student.count({ where: sw }),
    prisma.company.count({ where: { isActive: true } }),
    prisma.companyRequirement.count({ where: { status: "ACTIVE" } }),
    prisma.placementDrive.count({
      where: { status: { notIn: ["ARCHIVED", "CANCELLED"] } },
    }),
    prisma.student.findMany({
      where: sw,
      select: {
        branch: true,
        readinessSnapshots: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
          select: { readinessStatus: true, riskLevel: true },
        },
      },
    }),
    prisma.studentPlacementStage.findMany({
      where: stageWhere(filters),
      select: {
        currentStage: true,
        finalOutcome: true,
        packageLpa: true,
        student: { select: { branch: true } },
      },
    }),
    prisma.sharedStudentProfile.findMany({
      where: {
        shareStatus: { in: ACTIVE_SHARE_STATUSES },
        revokedAt: null,
        ...(filters.branch || filters.batch ? { student: studentWhere(filters) } : {}),
      },
      select: { hrDecision: true, shareStatus: true },
    }),
    getCompanyMatchingDashboardStats(),
    getGitHubDashboardStats(),
    getCodingDashboardStats(),
    getSkillEvidenceDashboardStats(),
  ]);

  const snapshots = studentsWithSnapshots
    .map((s) => s.readinessSnapshots[0])
    .filter(Boolean);

  const placementReady = snapshots.filter(
    (s) =>
      s!.readinessStatus === "PLACEMENT_READY" ||
      s!.readinessStatus === "HIGHLY_READY"
  ).length;

  const highRisk = snapshots.filter(
    (s) => s!.riskLevel === "HIGH" || s!.riskLevel === "CRITICAL"
  ).length;

  const selected = stages.filter(
    (s) =>
      s.currentStage === "SELECTED" ||
      s.finalOutcome === "SELECTED" ||
      ["OFFERED", "JOINED"].includes(s.currentStage)
  ).length;

  const offered = stages.filter(
    (s) =>
      s.currentStage === "OFFERED" ||
      s.finalOutcome === "OFFERED" ||
      s.currentStage === "JOINED"
  ).length;

  const joined = stages.filter(
    (s) => s.currentStage === "JOINED" || s.finalOutcome === "JOINED"
  ).length;

  const packages = stages
    .map((s) => s.packageLpa)
    .filter((p): p is number => p != null);
  const highestPackage = packages.length ? Math.max(...packages) : null;
  const avgPackage =
    packages.length > 0
      ? round(packages.reduce((a, b) => a + b, 0) / packages.length, 2)
      : null;

  const branchMap = new Map<
    string,
    { students: number; ready: number; joined: number }
  >();
  for (const st of studentsWithSnapshots) {
    const entry = branchMap.get(st.branch) ?? {
      students: 0,
      ready: 0,
      joined: 0,
    };
    entry.students += 1;
    const snap = st.readinessSnapshots[0];
    if (
      snap &&
      (snap.readinessStatus === "PLACEMENT_READY" ||
        snap.readinessStatus === "HIGHLY_READY")
    ) {
      entry.ready += 1;
    }
    branchMap.set(st.branch, entry);
  }
  for (const s of stages) {
    if (s.currentStage === "JOINED" || s.finalOutcome === "JOINED") {
      const entry = branchMap.get(s.student.branch) ?? {
        students: 0,
        ready: 0,
        joined: 0,
      };
      entry.joined += 1;
      branchMap.set(s.student.branch, entry);
    }
  }

  const branchRows = [...branchMap.entries()]
    .sort((a, b) => b[1].students - a[1].students)
    .map(([branch, v]) => [
      branch,
      v.students,
      v.ready,
      v.joined,
      `${pct(v.joined, v.students)}%`,
    ]);

  const topSkillRows = matchingStats.topMissingSkills.map((s) => [
    s.skill,
    s.count,
  ]);

  const hrPending = hrShares.filter((s) => s.hrDecision === "PENDING").length;
  const hrInterested = hrShares.filter(
    (s) => s.hrDecision === "INTERESTED"
  ).length;
  const hrShortlisted = hrShares.filter(
    (s) => s.hrDecision === "SHORTLISTED" || s.shareStatus === "SHORTLISTED"
  ).length;
  const hrRejected = hrShares.filter(
    (s) => s.hrDecision === "NOT_INTERESTED"
  ).length;

  const outcomeMap = new Map<string, number>();
  for (const s of stages) {
    const o = s.finalOutcome ?? "PENDING";
    outcomeMap.set(o, (outcomeMap.get(o) ?? 0) + 1);
  }
  const outcomeRows = [...outcomeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([outcome, count]) => [labelOutcome(outcome), count]);

  return {
    type: "MANAGEMENT_SUMMARY",
    title: "Management Summary Report",
    description:
      "Executive overview for leadership, HODs, and placement review meetings.",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Students", value: totalStudents },
      { label: "Placement Ready", value: placementReady },
      { label: "High Risk Students", value: highRisk },
      { label: "Active Companies", value: totalCompanies },
      { label: "Active Requirements", value: activeRequirements },
      { label: "Active Drives", value: totalDrives },
      { label: "Selected", value: selected },
      { label: "Offered", value: offered },
      { label: "Joined", value: joined },
      { label: "Highest Package (LPA)", value: highestPackage ?? "—" },
      { label: "Average Package (LPA)", value: avgPackage ?? "—" },
      { label: "Shared with HR", value: hrShares.length },
      { label: "GitHub Profiles Synced", value: githubStats.studentsWithGitHubSynced },
      {
        label: "Avg GitHub Evidence Score",
        value: githubStats.avgGitHubEvidenceScore || "—",
      },
      {
        label: "Students with Coding Profiles",
        value: codingStats.studentsWithCodingProfiles,
      },
      {
        label: "Avg Coding Evidence Score",
        value: codingStats.avgCodingEvidenceScore || "—",
      },
      {
        label: "Students with Strong Evidence",
        value: evidenceStats.studentsWithStrongEvidence,
      },
    ],
    sections: [
      {
        title: "Branch-wise Placement Summary",
        headers: ["Branch", "Students", "Ready", "Joined", "Join Rate"],
        rows: branchRows,
      },
      {
        title: "Top Missing Skills",
        headers: ["Skill", "Gap Occurrences"],
        rows: topSkillRows,
      },
      {
        title: "Top GitHub Languages",
        headers: ["Language", "Synced Profiles"],
        rows: githubStats.topGitHubLanguages.map((l) => [l.name, l.count]),
      },
      {
        title: "Top Coding Platforms",
        headers: ["Platform", "Profiles"],
        rows: codingStats.topPlatforms.map((p) => [p.name, p.count]),
      },
      {
        title: "Most Weakly Evidenced Skills",
        headers: ["Skill", "Weak Count"],
        rows: evidenceStats.weaklyEvidencedSkills.map((s) => [s.skill, s.count]),
      },
      {
        title: "Top Verified Evidence Skills",
        headers: ["Skill", "Verified Count"],
        rows: evidenceStats.topVerifiedSkills.map((s) => [s.skill, s.count]),
      },
      {
        title: "HR Funnel Summary",
        headers: ["Metric", "Count"],
        rows: [
          ["Total Shared", hrShares.length],
          ["Pending Review", hrPending],
          ["Interested", hrInterested],
          ["Shortlisted", hrShortlisted],
          ["Not Interested", hrRejected],
        ],
      },
      {
        title: "Final Outcome Summary",
        headers: ["Outcome", "Count"],
        rows: outcomeRows,
      },
    ],
  };
}

function emptyReport(
  type: ReportType,
  title: string,
  warning: string
): ReportResult {
  return {
    type,
    title,
    description: warning,
    generatedAt: new Date().toISOString(),
    summary: [],
    sections: [],
    warnings: [warning],
  };
}

export async function buildReportUncapped(
  type: ReportType,
  filters: ReportFilters = {}
): Promise<ReportResult> {
  switch (type) {
    case "DRIVE_SUMMARY":
      return buildDriveSummaryReport(filters);
    case "COMPANY_PLACEMENT":
      return buildCompanyPlacementReport(filters);
    case "BRANCH_PLACEMENT":
      return buildBranchPlacementReport(filters);
    case "BATCH_READINESS":
      return buildBatchReadinessReport(filters);
    case "STUDENT_PLACEMENT_HISTORY":
      return buildStudentPlacementHistoryReport(filters);
    case "RESUME_READINESS":
      return buildResumeReadinessReport(filters);
    case "SKILL_GAP":
      return buildSkillGapReport(filters);
    case "HR_SHARING":
      return buildHrSharingReport(filters);
    case "FINAL_PLACEMENT_OUTCOME":
      return buildFinalPlacementOutcomeReport(filters);
    case "MANAGEMENT_SUMMARY":
      return buildManagementSummaryReport(filters);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

export async function getReport(
  type: ReportType,
  filters: ReportFilters = {}
): Promise<ReportResult> {
  const report = await buildReportUncapped(type, filters);
  return applyRowCap(report, getReportRowLimit());
}

export async function getReportForPrint(
  type: ReportType,
  filters: ReportFilters = {}
): Promise<ReportResult> {
  const report = await buildReportUncapped(type, filters);
  return applyRowCap(report, getPrintReportRowLimit());
}
