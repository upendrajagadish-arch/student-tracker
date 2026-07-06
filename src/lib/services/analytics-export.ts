import ExcelJS from "exceljs";
import type { AnalyticsBundle } from "@/types/analytics";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF1E293B" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
}

export async function exportAnalyticsToExcel(
  data: AnalyticsBundle
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PlacementIQ";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Overview");
  overview.addRow(["Metric", "Value"]);
  overview.addRow(["Total Students", data.overview.totalStudents]);
  overview.addRow(["Placement Ready", data.overview.placementReady]);
  overview.addRow(["High Risk Students", data.overview.highRiskStudents]);
  overview.addRow(["Active Requirements", data.overview.activeRequirements]);
  overview.addRow(["Shared With HR", data.overview.sharedWithHr]);
  overview.addRow(["HR Interested", data.overview.hrInterested]);
  overview.addRow(["HR Shortlisted", data.overview.hrShortlisted]);
  overview.addRow(["Avg Readiness Score", data.overview.avgReadinessScore]);
  styleHeader(overview.getRow(1));
  overview.columns = [{ width: 28 }, { width: 16 }];

  const funnel = workbook.addWorksheet("HR Funnel");
  funnel.addRow(["Stage", "Count", "Conversion %"]);
  funnel.addRow(["Shared", data.hrFunnel.shared, ""]);
  funnel.addRow([
    "Viewed",
    data.hrFunnel.viewed,
    data.hrFunnel.conversionViewedRate,
  ]);
  funnel.addRow([
    "Interested",
    data.hrFunnel.interested,
    data.hrFunnel.conversionInterestedRate,
  ]);
  funnel.addRow([
    "Shortlisted",
    data.hrFunnel.shortlisted,
    data.hrFunnel.conversionShortlistedRate,
  ]);
  funnel.addRow(["Rejected / Not Interested", data.hrFunnel.rejected, ""]);
  styleHeader(funnel.getRow(1));
  funnel.columns = [{ width: 24 }, { width: 12 }, { width: 14 }];

  const reqSheet = workbook.addWorksheet("Company Requirements");
  reqSheet.addRow([
    "Company",
    "Role",
    "Total Matched",
    "Strong Fit",
    "Good Fit",
    "Average Fit",
    "Risk Fit",
    "Not Eligible",
    "Shared",
    "HR Interested",
    "HR Shortlisted",
  ]);
  for (const r of data.companyRequirements) {
    reqSheet.addRow([
      r.companyName,
      r.roleTitle,
      r.totalMatched,
      r.strongFit,
      r.goodFit,
      r.averageFit,
      r.riskFit,
      r.notEligible,
      r.sharedCount,
      r.hrInterestedCount,
      r.hrShortlistedCount,
    ]);
  }
  styleHeader(reqSheet.getRow(1));

  const branchSheet = workbook.addWorksheet("Branch Readiness");
  branchSheet.addRow([
    "Branch",
    "Students",
    "Avg Readiness",
    "Avg Technical",
    "Avg Communication",
    "Resume Approved",
    "Avg Verified Skills",
    "High Risk",
  ]);
  for (const b of data.branchReadiness) {
    branchSheet.addRow([
      b.branch,
      b.totalStudents,
      b.avgReadiness,
      b.avgTechnical,
      b.avgCommunication,
      b.resumeApprovedCount,
      b.avgVerifiedSkills,
      b.highRiskCount,
    ]);
  }
  styleHeader(branchSheet.getRow(1));

  const skillsSheet = workbook.addWorksheet("Top Missing Skills");
  skillsSheet.addRow([
    "Skill",
    "Missing Count",
    "Affected Requirements",
    "Top Branches",
  ]);
  for (const s of data.skillGaps) {
    skillsSheet.addRow([
      s.skill,
      s.missingCount,
      s.affectedRequirements,
      s.topBranches.join(", "),
    ]);
  }
  styleHeader(skillsSheet.getRow(1));

  const resumeSheet = workbook.addWorksheet("Resume Analytics");
  resumeSheet.addRow(["Metric", "Value"]);
  resumeSheet.addRow(["Uploaded", data.resume.uploadedCount]);
  resumeSheet.addRow(["Approved", data.resume.approvedCount]);
  resumeSheet.addRow(["Needs Improvement", data.resume.needsImprovementCount]);
  resumeSheet.addRow(["Avg Resume Score", data.resume.avgResumeScore]);
  resumeSheet.addRow(["ATS Friendly", data.resume.atsFriendlyCount]);
  resumeSheet.addRow(["Missing LinkedIn", data.resume.missingLinkedInCount]);
  resumeSheet.addRow(["Missing GitHub", data.resume.missingGitHubCount]);
  styleHeader(resumeSheet.getRow(1));

  const techSheet = workbook.addWorksheet("Tech Stack Analytics");
  techSheet.addRow(["Metric", "Value"]);
  techSheet.addRow(["Students With Tech Stack", data.techStack.studentsWithTechStack]);
  techSheet.addRow([
    "Avg Verified Skills / Student",
    data.techStack.avgVerifiedSkillsPerStudent,
  ]);
  techSheet.addRow(["Unverified Skill Count", data.techStack.unverifiedSkillCount]);
  techSheet.addRow([]);
  techSheet.addRow(["Top Verified Skills", "Count"]);
  for (const s of data.techStack.topVerifiedSkills) {
    techSheet.addRow([s.skill, s.count]);
  }
  techSheet.addRow([]);
  techSheet.addRow(["Top Role Interests", "Count"]);
  for (const r of data.techStack.topRoleInterests) {
    techSheet.addRow([r.role, r.count]);
  }
  styleHeader(techSheet.getRow(1));

  const passportSheet = workbook.addWorksheet("Passport Analytics");
  passportSheet.addRow(["Metric", "Value"]);
  passportSheet.addRow(["Passports Generated", data.passport.passportsGenerated]);
  passportSheet.addRow(["HR Passport Views", data.passport.hrPassportViews]);
  passportSheet.addRow([
    "Internal Passport Views",
    data.passport.internalPassportViews,
  ]);
  passportSheet.addRow([
    "Print / Download Actions",
    data.passport.printDownloadActions,
  ]);
  styleHeader(passportSheet.getRow(1));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
