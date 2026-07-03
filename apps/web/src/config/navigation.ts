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

export interface AppNavigationItem {
  title: string
  url: string
  icon: LucideIcon
  roles: DocuFlowRole[]
}

export interface AppNavigationGroup {
  label: string
  items: AppNavigationItem[]
}

// ─── Finance (regular user) navigation ───────────────────────────────────────
const financeNavigationGroups: AppNavigationGroup[] = [
  {
    label: "Không gian tài liệu",
    items: [
      { title: "Tổng quan", url: "/dashboard", icon: LayoutDashboard, roles: ["finance"] },
      { title: "Tải tài liệu lên", url: "/upload", icon: UploadCloud, roles: ["finance"] },
      { title: "Tài liệu", url: "/documents", icon: FileSearch, roles: ["finance"] },
      { title: "Hàng đợi duyệt", url: "/review", icon: Bell, roles: ["finance"] },
      { title: "Báo cáo", url: "/reports", icon: BadgeDollarSign, roles: ["finance"] },
      { title: "Settings", url: "/settings", icon: Settings2, roles: ["finance"] },
    ],
  },
]

// ─── Admin navigation ─────────────────────────────────────────────────────────
const adminNavigationGroups: AppNavigationGroup[] = [
  {
    label: "Bảng điều khiển",
    items: [
      { title: "Vận hành", url: "/operations", icon: Activity, roles: ["admin"] },
      { title: "Tiếp nhận tài liệu", url: "/admin/ingestion", icon: Route, roles: ["admin"] },
      { title: "Quy trình xử lý", url: "/admin/workflow", icon: GitBranch, roles: ["admin"] },
      { title: "Quan sát hệ thống", url: "/admin/observability", icon: BarChart3, roles: ["admin"] },
      { title: "Quản trị & Bảo mật", url: "/admin/governance", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
  {
    label: "Tài nguyên",
    items: [
      { title: "Bằng chứng dự án", url: "/evidence", icon: ClipboardList, roles: ["admin"] },
      { title: "Cài đặt cảnh báo", url: "/settings/notifications", icon: Settings2, roles: ["admin"] },
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
