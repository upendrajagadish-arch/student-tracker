import { prisma } from "@/lib/db";
import type { UserRole } from "@/types";

export type AuditAction =
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_DELETED"
  | "SCORE_UPDATED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "STUDENTS_IMPORTED"
  | "STUDENTS_EXPORTED"
  | "RESUME_UPLOADED"
  | "RESUME_DOWNLOADED"
  | "RESUME_REVIEWED"
  | "RESUME_STATUS_UPDATED"
  | "RESUME_DEACTIVATED"
  | "SKILL_ADDED"
  | "SKILL_UPDATED"
  | "SKILL_REMOVED"
  | "SKILL_VERIFIED"
  | "SKILL_MASTER_CREATED"
  | "SKILL_MASTER_UPDATED"
  | "ROLE_INTEREST_ADDED"
  | "ROLE_INTEREST_UPDATED"
  | "ROLE_INTEREST_REMOVED"
  | "READINESS_RECALCULATED"
  | "READINESS_BULK_RECALCULATED"
  | "READINESS_STATUS_CHANGED"
  | "RISK_LEVEL_CHANGED"
  | "COMPANY_CREATED"
  | "COMPANY_UPDATED"
  | "COMPANY_DEACTIVATED"
  | "COMPANY_ACTIVATED"
  | "REQUIREMENT_CREATED"
  | "REQUIREMENT_UPDATED"
  | "REQUIREMENT_CLOSED"
  | "MATCHING_RUN"
  | "MATCHING_EXPORTED"
  | "HR_ACCESS_ASSIGNED"
  | "HR_ACCESS_DEACTIVATED"
  | "STUDENT_SHARED_WITH_HR"
  | "STUDENT_SHARE_REVOKED"
  | "SHARE_VIEWED_BY_HR"
  | "HR_DECISION_UPDATED"
  | "HR_RESUME_DOWNLOADED"
  | "PLACEMENT_PASSPORT_GENERATED"
  | "PLACEMENT_PASSPORT_VIEWED_INTERNAL"
  | "PLACEMENT_PASSPORT_VIEWED_BY_HR"
  | "PLACEMENT_PASSPORT_PRINTED"
  | "HR_PASSPORT_ACCESS_DENIED"
  | "ANALYTICS_VIEWED"
  | "ANALYTICS_EXPORTED"
  | "PLACEMENT_DRIVE_CREATED"
  | "PLACEMENT_DRIVE_UPDATED"
  | "PLACEMENT_DRIVE_ARCHIVED"
  | "STUDENT_ADDED_TO_DRIVE"
  | "STUDENT_REMOVED_FROM_DRIVE"
  | "STUDENT_STAGE_UPDATED"
  | "BULK_STAGE_UPDATE"
  | "DRIVE_PIPELINE_EXPORTED"
  | "REPORT_VIEWED"
  | "REPORT_EXPORTED"
  | "REPORT_PRINT_VIEWED"
  | "REPORT_PRINT_TRIGGERED"
  | "BRANDING_SETTINGS_UPDATED"
  | "INSTITUTION_LOGO_UPLOADED"
  | "JD_PARSED"
  | "JD_PARSE_FAILED"
  | "REQUIREMENT_CREATED_FROM_JD_PARSER"
  | "RESUME_INSIGHT_GENERATED"
  | "RESUME_INSIGHT_FAILED"
  | "RESUME_INSIGHT_REVIEWED"
  | "RESUME_INSIGHT_APPLIED"
  | "RESUME_INSIGHT_DISMISSED"
  | "JOB_CREATED"
  | "JOB_STARTED"
  | "JOB_COMPLETED"
  | "JOB_FAILED"
  | "GITHUB_PROFILE_SYNCED"
  | "GITHUB_SYNC_FAILED"
  | "GITHUB_USERNAME_UPDATED"
  | "GITHUB_BULK_SYNC_STARTED"
  | "GITHUB_BULK_SYNC_COMPLETED"
  | "CODING_PROFILE_ADDED"
  | "CODING_PROFILE_UPDATED"
  | "CODING_PROFILE_REMOVED"
  | "CODING_PROFILE_VERIFIED"
  | "CODING_PLATFORM_CSV_IMPORTED"
  | "CODING_PROFILE_SYNC_FAILED"
  | "SKILL_EVIDENCE_REFRESHED"
  | "SKILL_EVIDENCE_BULK_REFRESH_STARTED"
  | "SKILL_EVIDENCE_BULK_REFRESH_COMPLETED"
  | "CODING_INTEGRATION_SETTINGS_UPDATED"
  | "CODING_INTEGRATION_CREDENTIALS_SAVED"
  | "CODING_INTEGRATION_CONNECTION_TESTED"
  | "CODING_INTEGRATION_CONNECTION_FAILED"
  | "CODING_INTEGRATION_ACCESS_REQUEST_UPDATED";

interface LogAuditParams {
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  description: string;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      description: params.description,
    },
  });
}

export interface AuditLogItem {
  id: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  createdAt: Date;
  actorName?: string | null;
  actorEmail?: string | null;
}

export async function getAuditLogs(options?: {
  page?: number;
  pageSize?: number;
}): Promise<{
  data: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count(),
  ]);

  const actorIds = [
    ...new Set(logs.map((l) => l.actorUserId).filter(Boolean)),
  ] as string[];

  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const data: AuditLogItem[] = logs.map((log) => {
    const actor = log.actorUserId ? actorMap.get(log.actorUserId) : null;
    return {
      id: log.id,
      actorUserId: log.actorUserId,
      actorRole: log.actorRole as UserRole | null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      createdAt: log.createdAt,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
    };
  });

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  STUDENT_CREATED: "Student Created",
  STUDENT_UPDATED: "Student Updated",
  STUDENT_DELETED: "Student Deleted",
  SCORE_UPDATED: "Score Updated",
  LOGIN_SUCCESS: "Login Success",
  LOGIN_FAILED: "Login Failed",
  STUDENTS_IMPORTED: "Students Imported",
  STUDENTS_EXPORTED: "Students Exported",
  RESUME_UPLOADED: "Resume Uploaded",
  RESUME_DOWNLOADED: "Resume Downloaded",
  RESUME_REVIEWED: "Resume Reviewed",
  RESUME_STATUS_UPDATED: "Resume Status Updated",
  RESUME_DEACTIVATED: "Resume Deactivated",
  SKILL_ADDED: "Skill Added",
  SKILL_UPDATED: "Skill Updated",
  SKILL_REMOVED: "Skill Removed",
  SKILL_VERIFIED: "Skill Verified",
  SKILL_MASTER_CREATED: "Skill Master Created",
  SKILL_MASTER_UPDATED: "Skill Master Updated",
  ROLE_INTEREST_ADDED: "Role Interest Added",
  ROLE_INTEREST_UPDATED: "Role Interest Updated",
  ROLE_INTEREST_REMOVED: "Role Interest Removed",
  READINESS_RECALCULATED: "Readiness Recalculated",
  READINESS_BULK_RECALCULATED: "Bulk Readiness Recalculated",
  READINESS_STATUS_CHANGED: "Readiness Status Changed",
  RISK_LEVEL_CHANGED: "Risk Level Changed",
  COMPANY_CREATED: "Company Created",
  COMPANY_UPDATED: "Company Updated",
  COMPANY_DEACTIVATED: "Company Deactivated",
  COMPANY_ACTIVATED: "Company Activated",
  REQUIREMENT_CREATED: "Requirement Created",
  REQUIREMENT_UPDATED: "Requirement Updated",
  REQUIREMENT_CLOSED: "Requirement Closed",
  MATCHING_RUN: "Matching Run",
  MATCHING_EXPORTED: "Matching Exported",
  HR_ACCESS_ASSIGNED: "HR Access Assigned",
  HR_ACCESS_DEACTIVATED: "HR Access Deactivated",
  STUDENT_SHARED_WITH_HR: "Student Shared With HR",
  STUDENT_SHARE_REVOKED: "Student Share Revoked",
  SHARE_VIEWED_BY_HR: "Share Viewed By HR",
  HR_DECISION_UPDATED: "HR Decision Updated",
  HR_RESUME_DOWNLOADED: "HR Resume Downloaded",
  PLACEMENT_PASSPORT_GENERATED: "Placement Passport Generated",
  PLACEMENT_PASSPORT_VIEWED_INTERNAL: "Placement Passport Viewed (Internal)",
  PLACEMENT_PASSPORT_VIEWED_BY_HR: "Placement Passport Viewed By HR",
  PLACEMENT_PASSPORT_PRINTED: "Placement Passport Printed",
  HR_PASSPORT_ACCESS_DENIED: "HR Passport Access Denied",
  ANALYTICS_VIEWED: "Analytics Viewed",
  ANALYTICS_EXPORTED: "Analytics Exported",
  PLACEMENT_DRIVE_CREATED: "Placement Drive Created",
  PLACEMENT_DRIVE_UPDATED: "Placement Drive Updated",
  PLACEMENT_DRIVE_ARCHIVED: "Placement Drive Archived/Cancelled",
  STUDENT_ADDED_TO_DRIVE: "Student Added To Drive",
  STUDENT_REMOVED_FROM_DRIVE: "Student Removed From Drive",
  STUDENT_STAGE_UPDATED: "Student Stage Updated",
  BULK_STAGE_UPDATE: "Bulk Stage Update",
  DRIVE_PIPELINE_EXPORTED: "Drive Pipeline Exported",
  REPORT_VIEWED: "Report Viewed",
  REPORT_EXPORTED: "Report Exported",
  REPORT_PRINT_VIEWED: "Report Print View Opened",
  REPORT_PRINT_TRIGGERED: "Report Print / PDF Triggered",
  BRANDING_SETTINGS_UPDATED: "Branding Settings Updated",
  INSTITUTION_LOGO_UPLOADED: "Institution Logo Uploaded",
  JD_PARSED: "JD Parsed",
  JD_PARSE_FAILED: "JD Parse Failed",
  REQUIREMENT_CREATED_FROM_JD_PARSER: "Requirement Created from JD Parser",
  RESUME_INSIGHT_GENERATED: "Resume Insight Generated",
  RESUME_INSIGHT_FAILED: "Resume Insight Failed",
  RESUME_INSIGHT_REVIEWED: "Resume Insight Reviewed",
  RESUME_INSIGHT_APPLIED: "Resume Insight Applied",
  RESUME_INSIGHT_DISMISSED: "Resume Insight Dismissed",
  JOB_CREATED: "Job Created",
  JOB_STARTED: "Job Started",
  JOB_COMPLETED: "Job Completed",
  JOB_FAILED: "Job Failed",
  GITHUB_PROFILE_SYNCED: "GitHub Profile Synced",
  GITHUB_SYNC_FAILED: "GitHub Sync Failed",
  GITHUB_USERNAME_UPDATED: "GitHub Username Updated",
  GITHUB_BULK_SYNC_STARTED: "Bulk GitHub Sync Started",
  GITHUB_BULK_SYNC_COMPLETED: "Bulk GitHub Sync Completed",
  CODING_PROFILE_ADDED: "Coding Profile Added",
  CODING_PROFILE_UPDATED: "Coding Profile Updated",
  CODING_PROFILE_REMOVED: "Coding Profile Removed",
  CODING_PROFILE_VERIFIED: "Coding Profile Verified",
  CODING_PLATFORM_CSV_IMPORTED: "Coding Platform CSV Imported",
  CODING_PROFILE_SYNC_FAILED: "Coding Profile Sync Failed",
  SKILL_EVIDENCE_REFRESHED: "Skill Evidence Refreshed",
  SKILL_EVIDENCE_BULK_REFRESH_STARTED: "Bulk Skill Evidence Refresh Started",
  SKILL_EVIDENCE_BULK_REFRESH_COMPLETED: "Bulk Skill Evidence Refresh Completed",
  CODING_INTEGRATION_SETTINGS_UPDATED: "Coding Integration Settings Updated",
  CODING_INTEGRATION_CREDENTIALS_SAVED: "Coding Integration Credentials Saved",
  CODING_INTEGRATION_CONNECTION_TESTED: "Coding Integration Connection Tested",
  CODING_INTEGRATION_CONNECTION_FAILED: "Coding Integration Connection Failed",
  CODING_INTEGRATION_ACCESS_REQUEST_UPDATED: "Coding Integration Access Request Updated",
};
