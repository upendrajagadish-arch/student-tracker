import type { UserRole } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  Share2,
  ScrollText,
  FileText,
  Layers,
  Gauge,
  BarChart3,
  ClipboardCheck,
  CalendarDays,
  FileSpreadsheet,
  ListTodo,
  Github,
  Code2,
  Network,
  Plug,
} from "lucide-react";
import { getRolePrefix } from "@/lib/permissions";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export function getNavItems(role: UserRole): SidebarNavItem[] {
  const prefix = getRolePrefix(role);

  const items: SidebarNavItem[] = [
    {
      label: "Dashboard",
      href: `${prefix}/dashboard`,
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY", "HR"],
    },
    {
      label: "Students",
      href: `${prefix}/students`,
      icon: Users,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Resumes",
      href: `${prefix}/resumes`,
      icon: FileText,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Tech Stack",
      href: `${prefix}/tech-stack`,
      icon: Layers,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "GitHub",
      href: `${prefix}/github`,
      icon: Github,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Coding Platforms",
      href: `${prefix}/coding-platforms`,
      icon: Code2,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "API Integrations",
      href: `${prefix}/integrations/coding-platforms`,
      icon: Plug,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Skill Evidence",
      href: `${prefix}/skill-evidence`,
      icon: Network,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Readiness",
      href: `${prefix}/readiness`,
      icon: Gauge,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Analytics",
      href: `${prefix}/analytics`,
      icon: BarChart3,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Reports",
      href: `${prefix}/reports`,
      icon: FileSpreadsheet,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Background Jobs",
      href: `${prefix}/jobs`,
      icon: ListTodo,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Demo Checklist",
      href: `${prefix}/demo-checklist`,
      icon: ClipboardCheck,
      roles: ["SUPER_ADMIN", "TPO_ADMIN"],
    },
    {
      label: "Pilot Checklist",
      href: `${prefix}/pilot-checklist`,
      icon: ClipboardCheck,
      roles: ["SUPER_ADMIN", "TPO_ADMIN"],
    },
    {
      label: "Placement Drives",
      href: `${prefix}/placement-drives`,
      icon: CalendarDays,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Shared Students",
      href: `${prefix}/shared-students`,
      icon: Share2,
      roles: ["SUPER_ADMIN", "TPO_ADMIN"],
    },
    {
      label: "Talent Room",
      href: `${prefix}/talent-room`,
      icon: Users,
      roles: ["HR"],
    },
    {
      label: "Companies",
      href: `${prefix}/companies`,
      icon: Building2,
      roles: ["SUPER_ADMIN", "TPO_ADMIN", "FACULTY"],
    },
    {
      label: "Settings",
      href: `${prefix}/settings`,
      icon: Settings,
      roles: ["SUPER_ADMIN", "TPO_ADMIN"],
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ScrollText,
      roles: ["SUPER_ADMIN"],
    },
  ];

  return items.filter((item) => item.roles.includes(role));
}
