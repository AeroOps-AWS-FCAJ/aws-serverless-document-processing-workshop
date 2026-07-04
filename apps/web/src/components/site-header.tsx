"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import { BellDot, CheckCircle2, Clock3, FileWarning, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useAuth } from "@/contexts/auth-context"
import { formatDate, formatMoney, type DocumentRecord } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

function notificationMeta(document: DocumentRecord, t: ReturnType<typeof useLanguage>["t"]) {
  if (document.status === "FAILED") {
    return {
      title: t("header.syncFailed"),
      icon: ShieldAlert,
      tone: "border-red-200 bg-red-50 text-red-800",
    }
  }

  if (document.status === "CORRECTED") {
    return {
      title: t("header.correctedWaiting"),
      icon: FileWarning,
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    }
  }

  if (document.status === "REVIEW_REQUIRED") {
    return {
      title: t("header.reviewRequired"),
      icon: FileWarning,
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    }
  }

  if (document.status === "APPROVED" || document.status === "EXTRACTED") {
    return {
      title: document.status === "APPROVED" ? t("header.approved") : t("header.extracted"),
      icon: CheckCircle2,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    }
  }

  return {
    title: t(`status.${document.status}` as TranslationKey),
    icon: Clock3,
    tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
  }
}

function HeaderNotifications() {
  const { session } = useAuth()
  const { documents } = useDocuFlowDocuments()
  const { t } = useLanguage()
  const role = session?.role ?? "finance"

  const visibleDocuments = React.useMemo(
    () => documents.filter((document) => role === "admin" || document.userId === session?.userId),
    [documents, role, session?.userId]
  )

  const notifications = React.useMemo(
    () =>
      visibleDocuments
        .filter((document) => ["REVIEW_REQUIRED", "FAILED", "CORRECTED", "EXTRACTED", "APPROVED", "PROCESSING", "QUEUED"].includes(document.status))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 6),
    [visibleDocuments]
  )

  const actionCount = visibleDocuments.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 hover:bg-muted/80" aria-label={t("header.notificationsAria")}>
          <BellDot className="size-4" />
          {actionCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[#d8ff72] px-1 text-[10px] font-semibold leading-4 text-[#10261d]">
              {actionCount > 9 ? "9+" : actionCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{t("header.notifications")}</div>
            <div className="text-xs text-muted-foreground">{t("header.actionRequired", { count: actionCount })}</div>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link to="/settings?tab=notifications">{t("common.viewAll")}</Link>
          </Button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {notifications.length ? (
            notifications.map((document) => {
              const meta = notificationMeta(document, t)
              const Icon = meta.icon
              const needsAction = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)

              return (
                <Link
                  key={document.documentId}
                  to={`/documents/${document.documentId}`}
                  className="grid gap-2 rounded-xl p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium">{meta.title}</div>
                        {needsAction && <Badge className="bg-[#d8ff72] text-[#10261d]">{t("header.needsAction")}</Badge>}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{document.originalFileName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{document.vendorName || t("header.missingVendor")}</span>
                        <span>{formatMoney(document.totalAmount, document.currency)}</span>
                        <span>{formatDate(document.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed p-6 text-center">
              <CheckCircle2 className="mb-2 size-7 text-emerald-600" />
              <div className="text-sm font-medium">{t("header.noNotifications")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("header.notificationEmptyDetail")}</div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const { session } = useAuth()
  const { t } = useLanguage()
  const role = session?.role ?? "finance"
  const shortcuts =
    role === "admin"
      ? [
          { label: t("nav.operations"), url: "/operations" },
          { label: t("nav.evidence"), url: "/evidence" },
        ]
      : [
          { label: t("common.upload"), url: "/upload" },
          { label: t("nav.review"), url: "/review" },
        ]

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/60 backdrop-blur-2xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) shadow-sm dark:bg-black/40">
        <div className="flex w-full items-center px-4 py-3 lg:px-6 relative">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="-ml-1 hover-lift" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </div>
          
          <div className="flex-1 flex justify-center px-2">
            <div className="w-full max-w-[150px] sm:max-w-xs lg:max-w-sm transition-all duration-300">
              <SearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {shortcuts.map((shortcut) => (
              <Button key={shortcut.url} variant="ghost" asChild size="sm" className="hidden sm:flex transition-colors hover:bg-muted/80">
                <Link to={shortcut.url} className="dark:text-foreground">{shortcut.label}</Link>
              </Button>
            ))}
            <HeaderNotifications />
            <LanguageToggle className="hidden md:inline-flex" />
            <div className="hover-lift">
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
