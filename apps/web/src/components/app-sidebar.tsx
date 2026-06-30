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
    <Sidebar {...props} className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-14 hover:bg-sidebar-accent">
              <Link to="/dashboard">
                <div className="flex aspect-square size-9 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                  <Logo size={25} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-display text-[15px] font-semibold tracking-[-0.025em]">DocuFlow AI</span>
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/55">{roleLabels[role]}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <div className="mx-3 mb-3 hidden rounded-sm border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden md:block">
        <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/55">
          <span className="size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_0_4px_rgba(216,255,114,.1)]" />
          Pipeline online
        </div>
        <div className="text-xs leading-5 text-sidebar-foreground/80">
          Textract + AI Proxy<br />asynchronous workflow
        </div>
      </div>
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
