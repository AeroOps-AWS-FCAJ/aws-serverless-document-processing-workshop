"use client"

import * as React from "react"
import {
  Activity,
  AlertTriangle,
  Bell,
  FileSearch,
  LayoutDashboard,
  Shield,
  UploadCloud,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Logo } from "@/components/logo"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "DocuFlow Review Team",
    email: "reviewer@docuflow.ai",
    avatar: "",
  },
  navGroups: [
    {
      label: "Workspace",
      items: [
        {
          title: "Overview",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Upload",
          url: "/upload",
          icon: UploadCloud,
        },
        {
          title: "Documents",
          url: "/documents",
          icon: FileSearch,
        },
        {
          title: "Review Queue",
          url: "/review",
          icon: Users,
        },
      ],
    },
    {
      label: "Control",
      items: [
        {
          title: "Operations",
          url: "/operations",
          icon: Activity,
        },
        {
          title: "Auth",
          url: "#",
          icon: Shield,
          items: [
            {
              title: "Sign In",
              url: "/auth/sign-in",
            },
            {
              title: "Sign Up",
              url: "/auth/sign-up",
            },
            {
              title: "Forgot Password",
              url: "/auth/forgot-password",
            }
          ],
        },
        {
          title: "Errors",
          url: "#",
          icon: AlertTriangle,
          items: [
            {
              title: "Unauthorized",
              url: "/errors/unauthorized",
            },
            {
              title: "Forbidden",
              url: "/errors/forbidden",
            },
            {
              title: "Not Found",
              url: "/errors/not-found",
            },
            {
              title: "Internal Server Error",
              url: "/errors/internal-server-error",
            },
            {
              title: "Under Maintenance",
              url: "/errors/under-maintenance",
            },
          ],
        },
        {
          title: "Notifications",
          url: "/settings/notifications",
          icon: Bell,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">DocuFlow AI</span>
                  <span className="truncate text-xs">Invoice Processing</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
