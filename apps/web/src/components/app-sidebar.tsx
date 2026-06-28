"use client"

import * as React from "react"
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
import { getNavigationGroups } from "@/config/navigation"
import { getDocuFlowSession, roleLabels } from "@/lib/auth"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = getDocuFlowSession()
  const role = session?.role ?? "finance"
  const navGroups = getNavigationGroups(role)

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
                  <span className="truncate text-xs">{roleLabels[role]}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: session?.name ?? "Finance User",
            email: session?.email ?? "finance@docuflow.ai",
            avatar: "",
          }}
          role={role}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
