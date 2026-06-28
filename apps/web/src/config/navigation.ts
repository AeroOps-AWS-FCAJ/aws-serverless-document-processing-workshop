import {
  Activity,
  Bell,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  Settings2,
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

const navigationGroups: AppNavigationGroup[] = [
  {
    label: "Document workspace",
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
        roles: ["finance", "admin"],
      },
      {
        title: "Upload document",
        url: "/upload",
        icon: UploadCloud,
        roles: ["finance", "admin"],
      },
      {
        title: "Documents",
        url: "/documents",
        icon: FileSearch,
        roles: ["finance", "admin"],
      },
      {
        title: "Review queue",
        url: "/review",
        icon: Bell,
        roles: ["finance", "admin"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Operations",
        url: "/operations",
        icon: Activity,
        roles: ["admin"],
      },
      {
        title: "Project evidence",
        url: "/evidence",
        icon: ClipboardList,
        roles: ["admin"],
      },
      {
        title: "Alert settings",
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
