"use client"

import * as React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/i18n"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useLanguage()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="sidebar" collapsible="icon" side="left" />
      <SidebarInset className="min-w-0 bg-background/88">
        <AdminHeader />
        <div className="paper-noise flex flex-1 flex-col overflow-hidden">
          <div className="@container/main flex flex-1 flex-col gap-2 min-w-0">
            <main className="reveal-in mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-5 py-5 md:gap-7 md:py-7">
              {children}
            </main>
          </div>
        </div>
        {/* Admin footer */}
        <footer className="border-t px-6 py-3 bg-muted/20">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            DocuFlow AI · {t("admin.console")} · {t("admin.footer")}
          </p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
