import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  ClipboardList,
  FileSearch,
  GitBranch,
  History,
  LayoutDashboard,
  MailCheck,
  Route,
  Settings2,
  ShieldCheck,
  UploadCloud,
  UserRound,
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

const navigationGroups: AppNavigationGroup[] = [
  {
    label: "Không gian tài liệu",
    items: [
      {
        title: "Tổng quan",
        url: "/dashboard",
        icon: LayoutDashboard,
        roles: ["finance", "admin"],
      },
      {
        title: "Tải tài liệu lên",
        url: "/upload",
        icon: UploadCloud,
        roles: ["finance", "admin"],
      },
      {
        title: "Tài liệu",
        url: "/documents",
        icon: FileSearch,
        roles: ["finance", "admin"],
      },
      {
        title: "Hàng đợi duyệt",
        url: "/review",
        icon: Bell,
        roles: ["finance", "admin"],
      },
      {
        title: "Báo cáo",
        url: "/reports",
        icon: BadgeDollarSign,
        roles: ["finance", "admin"],
      },
      {
        title: "Thông báo",
        url: "/notifications",
        icon: MailCheck,
        roles: ["finance", "admin"],
      },
      {
        title: "Hoạt động của tôi",
        url: "/activity",
        icon: History,
        roles: ["finance", "admin"],
      },
      {
        title: "Hồ sơ",
        url: "/profile",
        icon: UserRound,
        roles: ["finance", "admin"],
      },
    ],
  },
  {
    label: "Quản trị hệ thống",
    items: [
      {
        title: "Vận hành",
        url: "/operations",
        icon: Activity,
        roles: ["admin"],
      },
      {
        title: "Tiếp nhận",
        url: "/admin/ingestion",
        icon: Route,
        roles: ["admin"],
      },
      {
        title: "Quy trình",
        url: "/admin/workflow",
        icon: GitBranch,
        roles: ["admin"],
      },
      {
        title: "Quan sát",
        url: "/admin/observability",
        icon: BarChart3,
        roles: ["admin"],
      },
      {
        title: "Quản trị",
        url: "/admin/governance",
        icon: ShieldCheck,
        roles: ["admin"],
      },
      {
        title: "Bằng chứng dự án",
        url: "/evidence",
        icon: ClipboardList,
        roles: ["admin"],
      },
      {
        title: "Cài đặt cảnh báo",
        url: "/settings/notifications",
        icon: Settings2,
        roles: ["admin"],
      },
    ],
  },
]

export function getNavigationGroups(role: DocuFlowRole) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}

export function getNavigationItems(role: DocuFlowRole) {
  return getNavigationGroups(role).flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label }))
  )
}
