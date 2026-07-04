"use client"

import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BadgeCheck,
  BellDot,
  FileSearch,
  LogOut,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Workflow,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { clearDocuFlowSession, roleLabels } from "@/lib/auth"
import { roleCapabilities } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

type WorkspaceLink = {
  labelKey: TranslationKey
  to: string
  icon: LucideIcon
}

const financeWorkspaceLinks: WorkspaceLink[] = [
  { labelKey: "nav.upload", to: "/upload", icon: UploadCloud },
  { labelKey: "nav.documents", to: "/documents", icon: FileSearch },
  { labelKey: "nav.review", to: "/review", icon: BellDot },
  { labelKey: "nav.reports", to: "/reports", icon: BadgeCheck },
  { labelKey: "nav.notifications", to: "/notifications", icon: BellDot },
  { labelKey: "nav.activity", to: "/activity", icon: Workflow },
]

const adminWorkspaceLinks: WorkspaceLink[] = [
  { labelKey: "nav.operations", to: "/operations", icon: Workflow },
  { labelKey: "nav.review", to: "/review", icon: BellDot },
  { labelKey: "nav.ingestion", to: "/admin/ingestion", icon: UploadCloud },
  { labelKey: "nav.workflow", to: "/admin/workflow", icon: Workflow },
  { labelKey: "nav.observability", to: "/admin/observability", icon: ShieldCheck },
  { labelKey: "nav.governance", to: "/admin/governance", icon: BadgeCheck },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { t } = useLanguage()
  const { documents } = useDocuFlowDocuments()
  const role = session?.role ?? "finance"
  const capability = roleCapabilities.find((item) => item.role === role)
  const workspaceLinks = role === "admin" ? adminWorkspaceLinks : financeWorkspaceLinks
  const visibleDocuments = documents.filter((document) => role === "admin" || document.userId === session?.userId)
  const reviewCount = visibleDocuments.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length

  const handleLogout = async () => {
    await clearDocuFlowSession()
    navigate("/auth/sign-in", { replace: true })
  }

  return (
    <BaseLayout title={t("profile.title")}>
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  {t("profile.account")}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {roleLabels[role]}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                {session?.name ?? t("profile.fallbackUser")}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                {t("profile.body")}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]">
                  <Link to="/documents">
                    {t("profile.myDocuments")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  {t("common.signOut")}
                </Button>
              </div>
            </div>
            {/* Right: KPI tiles */}
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { labelKey: "profile.role", value: roleLabels[role], icon: UserRound },
                { labelKey: "profile.documents", value: visibleDocuments.length, icon: FileSearch },
                { labelKey: "profile.needsAction", value: reviewCount, icon: BellDot },
                { labelKey: "profile.status", value: t("profile.active"), icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={t(item.labelKey as TranslationKey)} className="border-b border-r border-white/12 p-3 last:border-r-0 sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Icon className="size-3.5 text-[#d8ff72]" />
                    </div>
                    <div className="truncate text-lg font-semibold text-white">{item.value}</div>
                    <div className="mt-0.5 text-xs text-white/50">{t(item.labelKey as TranslationKey)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Profile details ──────────────────────────────────────────────────── */}
      <section className="grid gap-5 px-4 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)] xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)] lg:px-6">
        {/* Account info */}
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5" />
              {t("profile.accountInfo")}
            </CardTitle>
            <CardDescription>{t("profile.accountInfoBody")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {[
              [t("profile.fullName"), session?.name ?? t("profile.unknown")],
              ["Email", session?.email ?? t("profile.unknown")],
              [t("profile.role"), roleLabels[role]],
              [t("profile.userId"), session?.userId ?? t("profile.unknown")],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-xl border p-3">
                <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
                <div className="break-all text-sm font-medium">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          {/* Role capabilities */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                {t("profile.access")}
              </CardTitle>
              <CardDescription>{capability?.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
              {[
                { labelKey: "profile.uploadAccess", enabled: capability?.canUpload },
                { labelKey: "profile.reviewAccess", enabled: capability?.canReview },
                { labelKey: "profile.adminAccess", enabled: capability?.canOperate },
              ].map(({ labelKey, enabled }) => (
                <div key={labelKey} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-medium text-sm">{t(labelKey as TranslationKey)}</span>
                    <Badge variant="outline" className={enabled ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300" : "border-muted-foreground/30 text-muted-foreground"}>
                      {enabled ? t("profile.allowed") : t("profile.restricted")}
                    </Badge>
                  </div>
                  <div className="text-xs leading-5 text-muted-foreground">
                    {enabled ? t("profile.enabledDetail") : t("profile.adminOnly")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick navigation */}
          <Card className="border-white/10 bg-[#10261d] text-white shadow-lg">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <Workflow className="size-5" />
                {t("profile.quickAccess")}
              </CardTitle>
              <CardDescription className="text-white/60">{t("profile.quickAccessBody")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {workspaceLinks.map((link) => {
                const Icon = link.icon
                const label = ({
                  "/upload": t("nav.upload"),
                  "/documents": t("nav.documents"),
                  "/review": t("nav.review"),
                  "/reports": t("nav.reports"),
                  "/notifications": t("notifications.title"),
                  "/activity": t("activity.title"),
                  "/operations": t("nav.operations"),
                  "/admin/ingestion": t("nav.ingestion"),
                  "/admin/workflow": t("nav.workflow"),
                  "/admin/observability": t("nav.observability"),
                  "/admin/governance": t("nav.governance"),
                } as Record<string, string>)[link.to] ?? t(link.labelKey as TranslationKey)
                return (
                  <Button key={link.to} asChild variant="outline" className="h-auto w-full min-w-0 cursor-pointer justify-between border-white/10 bg-white/5 p-4 text-white transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white">
                    <Link to={link.to} className="flex w-full items-center justify-between overflow-hidden">
                      <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                        <Icon className="size-4 shrink-0 opacity-80" />
                        <span className="truncate">{label}</span>
                      </span>
                      <ArrowRight className="ml-2 size-4 shrink-0 opacity-80" />
                    </Link>
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </section>
    </BaseLayout>
  )
}
