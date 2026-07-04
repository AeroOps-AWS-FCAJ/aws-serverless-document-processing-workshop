"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileWarning,
  Filter,
  History,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import {
  formatDate,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

type ActivityKind = "UPLOAD" | "PROCESSING" | "REVIEW" | "APPROVAL"
type ActivityFilter = "ALL" | ActivityKind

interface ActivityEvent {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  timestamp: string
  document: DocumentRecord
  icon: typeof History
}

function buildEvents(
  document: DocumentRecord,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: `${document.documentId}-created`,
      kind: "UPLOAD",
      title: t("activity.eventUploaded"),
      detail: t("activity.eventUploadedBody", { name: document.originalFileName }),
      timestamp: document.createdAt,
      document,
      icon: UploadCloud,
    },
  ]

  if (document.status === "UPLOADED" || document.status === "QUEUED" || document.status === "PROCESSING") {
    events.push({
      id: `${document.documentId}-processing`,
      kind: "PROCESSING",
      title: t(`status.${document.status}` as TranslationKey),
      detail: document.errorMessage ?? t("activity.eventProcessingBody"),
      timestamp: document.updatedAt,
      document,
      icon: FileClock,
    })
  }

  if (document.status === "EXTRACTED") {
    events.push({
      id: `${document.documentId}-extracted`,
      kind: "PROCESSING",
      title: t("activity.eventExtracted"),
      detail: t("activity.eventExtractedBody", { vendor: document.vendorName, confidence: Math.round(document.confidenceScore * 100) }),
      timestamp: document.updatedAt,
      document,
      icon: CheckCircle2,
    })
  }

  if (document.status === "REVIEW_REQUIRED" || document.status === "FAILED") {
    events.push({
      id: `${document.documentId}-review`,
      kind: "REVIEW",
      title: document.status === "FAILED" ? t("activity.eventFailed") : t("activity.eventReview"),
      detail: document.reviewReasonCodes.length ? document.reviewReasonCodes.join("; ") : document.errorMessage ?? t("activity.eventManualReview"),
      timestamp: document.updatedAt,
      document,
      icon: FileWarning,
    })
  }

  if (document.status === "CORRECTED") {
    events.push({
      id: `${document.documentId}-corrected`,
      kind: "REVIEW",
      title: t("activity.eventCorrected"),
      detail: document.reviewerNote ?? t("activity.eventCorrectedBody"),
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      icon: FileCheck2,
    })
  }

  if (document.status === "APPROVED") {
    events.push({
      id: `${document.documentId}-approved`,
      kind: "APPROVAL",
      title: t("activity.eventApproved"),
      detail: document.reviewerNote ?? t("activity.eventApprovedBody"),
      timestamp: document.reviewedAt ?? document.updatedAt,
      document,
      icon: ShieldCheck,
    })
  }

  return events
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useLanguage()
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {t(`status.${status}` as TranslationKey)}
    </Badge>
  )
}

export default function ActivityPage() {
  const { documents, mergeDocuments } = useDocuFlowDocuments()
  const { session } = useAuth()
  const { t } = useLanguage()
  const { isSyncing, refreshDocuments, syncMessage } = useDocumentsSync(mergeDocuments, { loadAllPages: true })
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ActivityFilter>("ALL")
  
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const visibleDocuments = useMemo(
    () => documents.filter((document) => session?.role === "admin" || document.userId === session?.userId),
    [documents, session?.role, session?.userId]
  )

  const events = useMemo(
    () =>
      visibleDocuments
        .flatMap((document) => buildEvents(document, t))
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [t, visibleDocuments]
  )

  const filteredEvents = events.filter((event) => {
    const text = `${event.title} ${event.detail} ${event.document.originalFileName} ${event.document.vendorName}`.toLowerCase()
    return (filter === "ALL" || event.kind === filter) && (!query.trim() || text.includes(query.trim().toLowerCase()))
  })

  const totalItems = filteredEvents.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const uploadedCount = events.filter((event) => event.kind === "UPLOAD").length
  const reviewCount = events.filter((event) => event.kind === "REVIEW").length
  const approvalCount = events.filter((event) => event.kind === "APPROVAL").length
  const latestEvent = events[0]
  const filterItems = [
    { label: t("activity.all"), value: "ALL" as ActivityFilter },
    { label: t("activity.upload"), value: "UPLOAD" as ActivityFilter },
    { label: t("activity.processing"), value: "PROCESSING" as ActivityFilter },
    { label: t("activity.review"), value: "REVIEW" as ActivityFilter },
    { label: t("activity.approval"), value: "APPROVAL" as ActivityFilter },
  ]
  const kindLabels: Record<ActivityKind, string> = {
    UPLOAD: t("activity.upload"),
    PROCESSING: t("activity.processing"),
    REVIEW: t("activity.review"),
    APPROVAL: t("activity.approval"),
  }

  return (
    <BaseLayout title={t("activity.title")}>
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  {t("activity.badge")}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.name ?? t("profile.fallbackUser")}
                </Badge>
              </div>
              <h2 className="mt-2 max-w-3xl font-display text-lg font-semibold leading-snug tracking-tight text-white md:text-xl">
                {t("activity.heroTitle")}
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/62">
                {t("activity.heroBody")}
                {syncMessage && <span className="ml-2 text-[#d8ff72]">{syncMessage}</span>}
              </p>
              <div className="mt-4">
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => refreshDocuments()} disabled={isSyncing}>
                  <RefreshCw className={isSyncing ? "size-4 animate-spin" : "size-4"} />
                  {t("common.refresh")}
                </Button>
              </div>
            </div>
            {/* Right: KPI tiles */}
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: t("activity.totalEvents"), value: events.length, icon: History },
                { label: t("activity.uploaded"), value: uploadedCount, icon: FilePlus2 },
                { label: t("activity.reviewWaiting"), value: reviewCount, icon: FileWarning },
                { label: t("activity.approved"), value: approvalCount, icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-3 last:border-r-0 sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Icon className="size-3.5 text-[#d8ff72]" />
                    </div>
                    <div className="text-lg font-semibold text-white">{item.value}</div>
                    <div className="mt-0.5 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter + Timeline ────────────────────────────────────────────────── */}
      <section className="grid min-w-0 gap-5 px-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] lg:px-6">

        {/* Sidebar — hidden on mobile, shown on lg+ */}
        <div className="hidden lg:grid gap-5 content-start">
          <Card className="h-fit min-w-0">
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-5" />
                {t("activity.filters")}
              </CardTitle>
              <CardDescription>{t("activity.filtersBody")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} className="pl-9" placeholder={t("activity.searchNamePlaceholder")} />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                    onClick={() => { setQuery(""); setCurrentPage(1) }}
                  >
                    <X className="size-4" />
                    <span className="sr-only">{t("activity.clearSearch")}</span>
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                {filterItems.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={filter === item.value ? "default" : "outline"}
                    className="justify-between"
                    onClick={() => { setFilter(item.value); setCurrentPage(1) }}
                  >
                    {item.label}
                    <span className="font-mono text-xs">
                      {item.value === "ALL" ? events.length : events.filter((event) => event.kind === item.value).length}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Latest event */}
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-5" />
                {t("activity.latest")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {latestEvent ? (
                <div>
                  <div className="font-medium">{latestEvent.title}</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">{latestEvent.detail}</div>
                  <div className="mt-3 font-mono text-xs text-muted-foreground">{formatDate(latestEvent.timestamp)}</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t("activity.noActivity")}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline + Mobile Filters */}
        <Card className="min-w-0">
          <CardHeader className="border-b bg-muted/25">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" />
                  {t("activity.timeline")}
                </CardTitle>
                <CardDescription>
                  {t("activity.showing", { shown: paginatedEvents.length, total: events.length })}
                </CardDescription>
              </div>
              {/* Mobile-only: search + filter chips */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} className="pl-9" placeholder={t("activity.searchShortPlaceholder")} />
                  {query && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-7 -translate-y-1/2" onClick={() => { setQuery(""); setCurrentPage(1) }}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filterItems.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { setFilter(item.value); setCurrentPage(1) }}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                        filter === item.value
                          ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm"
                          : "bg-background hover:border-foreground/25 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {item.label}
                      <span className={`ml-1.5 font-mono text-[10px] ${filter === item.value ? "opacity-75" : "opacity-50"}`}>
                        {item.value === "ALL" ? events.length : events.filter((event) => event.kind === item.value).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {paginatedEvents.length ? (
              paginatedEvents.map((event) => {
                const Icon = event.icon
                return (
                  <div key={event.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex gap-4 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{event.title}</div>
                          <Badge variant="secondary" className="text-xs">{kindLabels[event.kind]}</Badge>
                          <StatusBadge status={event.document.status} />
                        </div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{event.detail}</div>
                        <div className="mt-1.5 truncate text-xs text-muted-foreground">
                          {event.document.originalFileName} · {formatDate(event.timestamp)}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 w-fit">
                      <Link to={`/documents/${event.document.documentId}`}>
                        {t("activity.view")} <ArrowRight className="ml-1 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <History className="mx-auto mb-3 size-8 text-muted-foreground" />
                <div className="font-medium">{t("activity.noMatch")}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("activity.noMatchHint")}</div>
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> / <span className="font-medium">{totalItems}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="sm">{t("activity.previous")}</Button>
                  <Button type="button" onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="sm">{t("activity.next")}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
