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
import { getAdminNavigationGroups } from "@/config/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/lib/i18n"

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useAuth()
  const { t } = useLanguage()
  const navGroups = getAdminNavigationGroups()

  return (
    <Sidebar {...props} className="border-sidebar-border">
      {/* ── Logo / brand header ─────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-12 rounded-lg transition-colors duration-200 hover:bg-sidebar-accent/40"
            >
              <Link to="/operations">
                {/* Icon block */}
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <Logo size={20} className="text-current" />
                </div>
                {/* Text block */}
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-display text-[14px] font-semibold tracking-[-0.02em] text-sidebar-foreground">
                    DocuFlow AI
                  </span>
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
                    Admin console
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation items ────────────────────────────────────────────── */}
      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <NavMain key={group.label} label={group.label || ""} labelKey={group.labelKey} items={group.items} />
        ))}
      </SidebarContent>

      {/* ── User footer ─────────────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border px-2 py-2">
        <NavUser
          user={{
            name: session?.name ?? t("role.admin"),
            email: session?.email ?? "admin@docuflow.ai",
            avatar: "",
          }}
          role="admin"
        />
      </SidebarFooter>
    </Sidebar>
  )
}
