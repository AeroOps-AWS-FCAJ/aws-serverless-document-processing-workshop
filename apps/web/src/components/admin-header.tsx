"use client"


import { Link, useLocation } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

const adminRouteLabels: Record<string, TranslationKey> = {
  "/operations": "nav.operations",
  "/admin/ingestion": "nav.ingestion",
  "/admin/workflow": "nav.workflow",
  "/admin/observability": "nav.observability",
  "/admin/governance": "nav.governance",
  "/evidence": "nav.evidence",
  "/settings/notifications": "nav.notifications",
}

export function AdminHeader() {
  const { session } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  const pageLabel = adminRouteLabels[location.pathname]
    ? t(adminRouteLabels[location.pathname])
    : t("role.admin")

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear shadow-sm">
      <div className="flex w-full items-center px-4 py-3 lg:px-6">
        {/* Sidebar trigger + separator */}
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:bg-muted hover:text-foreground" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4"
          />
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            to="/operations"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Admin
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground font-semibold">
            {pageLabel}
          </span>
        </div>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-3">
          <Badge
            variant="outline"
            className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] sm:flex"
          >
            <Shield className="size-3" />
            {session?.name ?? "Admin"}
          </Badge>
          <LanguageToggle className="hidden sm:inline-flex" />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
