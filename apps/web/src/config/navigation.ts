import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  ClipboardList,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  Route,
  Settings2,
  ShieldCheck,
  UploadCloud,
  type LucideIcon,
} from "lucide-react"
import type { DocuFlowRole } from "@/lib/auth"
import type { TranslationKey } from "@/lib/i18n"

export interface AppNavigationItem {
  title: string
  titleKey: TranslationKey
  url: string
  icon: LucideIcon
  roles: DocuFlowRole[]
}

export interface AppNavigationGroup {
  label?: string
  labelKey: TranslationKey
  items: AppNavigationItem[]
}

// ─── Finance (regular user) navigation ───────────────────────────────────────
const financeNavigationGroups: AppNavigationGroup[] = [
  {
    labelKey: "nav.finance.group",
    items: [
      { title: "Overview", titleKey: "nav.overview", url: "/dashboard", icon: LayoutDashboard, roles: ["finance"] },
      { title: "Upload", titleKey: "nav.upload", url: "/upload", icon: UploadCloud, roles: ["finance"] },
      { title: "Documents", titleKey: "nav.documents", url: "/documents", icon: FileSearch, roles: ["finance"] },
      { title: "Review", titleKey: "nav.review", url: "/review", icon: Bell, roles: ["finance"] },
      { title: "Reports", titleKey: "nav.reports", url: "/reports", icon: BadgeDollarSign, roles: ["finance"] },
      { title: "Settings", titleKey: "nav.settings", url: "/settings", icon: Settings2, roles: ["finance"] },
    ],
  },
]

// ─── Admin navigation ─────────────────────────────────────────────────────────
const adminNavigationGroups: AppNavigationGroup[] = [
  {
    labelKey: "nav.admin.group",
    items: [
      { title: "Operations", titleKey: "nav.operations", url: "/operations", icon: Activity, roles: ["admin"] },
      { title: "Ingestion", titleKey: "nav.ingestion", url: "/admin/ingestion", icon: Route, roles: ["admin"] },
      { title: "Workflow", titleKey: "nav.workflow", url: "/admin/workflow", icon: GitBranch, roles: ["admin"] },
      { title: "Observability", titleKey: "nav.observability", url: "/admin/observability", icon: BarChart3, roles: ["admin"] },
      { title: "Governance", titleKey: "nav.governance", url: "/admin/governance", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
  {
    labelKey: "nav.admin.resources",
    items: [
      { title: "Evidence", titleKey: "nav.evidence", url: "/evidence", icon: ClipboardList, roles: ["admin"] },
      { title: "Notifications", titleKey: "nav.notifications", url: "/settings/notifications", icon: Settings2, roles: ["admin"] },
    ],
  },
]

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns navigation groups for Finance (regular) users only */
export function getFinanceNavigationGroups(): AppNavigationGroup[] {
  return financeNavigationGroups
}

/** Returns navigation groups for Admin users only */
export function getAdminNavigationGroups(): AppNavigationGroup[] {
  return adminNavigationGroups
}

/**
 * @deprecated Use getFinanceNavigationGroups() or getAdminNavigationGroups() directly.
 * Kept for backwards compat during migration.
 */
export function getNavigationGroups(role: DocuFlowRole): AppNavigationGroup[] {
  return role === "admin" ? adminNavigationGroups : financeNavigationGroups
}

export function getNavigationItems(role: DocuFlowRole) {
  return getNavigationGroups(role).flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label }))
  )
}
