"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  Files,
  Gauge,
  RefreshCw,
  ScanText,
  Sparkles,
  UploadCloud,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useAuth } from "@/contexts/auth-context"
import {
  convertDemoCurrency,
  demoCurrencyRateDetail,
  formatDate,
  formatMoney,
  monthlyVolume,
  statusMeta,
  type DocumentRecord,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { SpotlightCard } from "@/components/spotlight-card"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import { useLanguage, type TranslationKey } from "@/lib/i18n"
import { DEFAULT_REPORTING_CURRENCY, getUserDefaultCurrency } from "@/lib/user-preferences"

type TrendWindow = "30d" | "90d" | "6m"

const statusChartPalette: Record<DocumentRecord["status"], string> = {
  UPLOADED: "#94a3b8",
  QUEUED: "#06b6d4",
  PROCESSING: "#2f80ed",
  EXTRACTED: "#12b981",
  REVIEW_REQUIRED: "#f59e0b",
  FAILED: "#ef4444",
  CORRECTED: "#8b5cf6",
  APPROVED: "#153f30",
}

const percentOf = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DocumentRecord["status"] }) {
  const { t } = useLanguage()
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className={status === "PROCESSING" ? "size-3 animate-spin" : "size-3"} />
      {t(`status.${status}` as TranslationKey)}
    </Badge>
  )
}

/** Compact KPI tile inside the unified strip */
function KpiTile({
  label, value, detail, icon: Icon, alert = false,
}: {
  label: string; value: string | number; detail: string; icon: typeof Files; alert?: boolean
}) {
  return (
    <SpotlightCard className="group relative overflow-hidden border-b p-5 transition-colors duration-200 hover:bg-muted/25 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      {/* Watermark icon */}
      <Icon className="pointer-events-none absolute -bottom-3 -right-2 size-[72px] stroke-[0.8] text-foreground/[0.035] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1" />
      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {alert
            ? <span className="pulse-indicator text-orange-500 mr-0.5" />
            : <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />}
          {label}
        </div>
        <div>
          <div className="font-display text-[2rem] font-semibold leading-none tracking-[-0.05em]">{value}</div>
          <p className="mt-1.5 max-w-[10rem] text-[11px] leading-[1.45] text-muted-foreground">{detail}</p>
        </div>
      </div>
    </SpotlightCard>
  )
}

function csvCell(v: string | number | null) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { documents: allDocuments, mergeDocuments } = useDocuFlowDocuments()
  const { session } = useAuth()
  const { language, t } = useLanguage()
  const role        = session?.role ?? "finance"
  const locale      = language === "vi" ? "vi-VN" : "en-US"
  const roleLabel   = role === "admin" ? t("role.admin") : t("role.finance")
  const { apiMode, isSyncing, refreshDocuments, syncError, syncMessage } = useDocumentsSync(mergeDocuments, { loadAllPages: true })

  const [trendWindow, setTrendWindow] = useState<TrendWindow>("6m")
  const [lastSync,    setLastSync]    = useState(() => new Date())
  const [reportingCurrency, setReportingCurrency] = useState(DEFAULT_REPORTING_CURRENCY)

  useEffect(() => {
    setReportingCurrency(getUserDefaultCurrency(session?.userId))
  }, [session?.userId])

  const trendConfig = {
    extracted: { label: t("header.extracted"), color: "#153f30" },
    review:    { label: t("header.reviewRequired"), color: "#d97706" },
    failed:    { label: t("header.syncFailed"), color: "#dc2626" },
  } satisfies ChartConfig
  const premiumChartConfig = {
    extracted: { label: t("header.extracted"), color: "#153f30" },
    review:    { label: t("header.reviewRequired"), color: "#8b5cf6" },
    failed:    { label: t("header.syncFailed"), color: "#111827" },
    queued:    { label: t("common.processing"), color: "#06b6d4" },
    ready:     { label: t("common.ready"), color: "#baff17" },
    created:   { label: t("dashboard.document"), color: "#8b5cf6" },
    confidence:{ label: t("dashboard.confidence"), color: "#8b5cf6" },
    risk:      { label: t("dashboard.riskMap"), color: "#0ea5e9" },
  } satisfies ChartConfig
  const pipeline = [
    { label: t("workflow.upload"), detail: "S3 Raw", icon: UploadCloud },
    { label: t("workflow.extract"), detail: "Textract", icon: ScanText },
    { label: t("workflow.normalize"), detail: "AI Proxy", icon: Sparkles },
    { label: t("workflow.review"), detail: "Schema", icon: FileCheck2 },
    { label: t("workflow.store"), detail: "DynamoDB", icon: Check },
  ]

  const documents = useMemo(
    () => role === "finance"
      ? allDocuments.filter((d) => d.userId === session?.userId)
      : allDocuments,
    [allDocuments, role, session?.userId],
  )

  useEffect(() => {
    if (!apiMode) return
    const t = window.setInterval(() => void refreshDocuments(), 15_000)
    return () => window.clearInterval(t)
  }, [apiMode, refreshDocuments])

  useEffect(() => {
    if (syncMessage && !syncError) setLastSync(new Date())
  }, [syncError, syncMessage])

  const handleRefresh = async () => {
    const toastId = toast.loading(t("toast.refreshStarted"))
    const result = await refreshDocuments()
    toast.success(result.count > 0 ? t("sync.success", { total: result.count }) : t("toast.refreshComplete"), {
      id: toastId,
    })
  }

  // ── Derived numbers ───────────────────────────────────────────────────────
  const processingCount = documents.filter((d) => ["UPLOADED","QUEUED","PROCESSING"].includes(d.status)).length
  const reviewCount     = documents.filter((d) => d.status === "REVIEW_REQUIRED").length
  const correctedCount  = documents.filter((d) => d.status === "CORRECTED").length
  const failedCount     = documents.filter((d) => d.status === "FAILED").length
  const readyCount      = documents.filter((d) => ["EXTRACTED","APPROVED"].includes(d.status)).length
  const attentionCount  = reviewCount + failedCount + correctedCount
  const completionRate  = documents.length ? Math.round((readyCount / documents.length) * 100) : 0
  const confDocs        = documents.filter((d) => d.confidenceScore > 0)
  const avgConf         = confDocs.length
    ? Math.round((confDocs.reduce((s, d) => s + d.confidenceScore, 0) / confDocs.length) * 100) : 0
  const totalValue      = documents.reduce((s, d) => s + convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency), 0)
  const attentionValue  = documents
    .filter((d) => ["REVIEW_REQUIRED","CORRECTED"].includes(d.status))
    .reduce((s, d) => s + convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency), 0)

  const attentionQueue = [...documents]
    .filter((d) => ["REVIEW_REQUIRED","FAILED","CORRECTED"].includes(d.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const activeDocs = recentDocs.filter((d) => ["UPLOADED","QUEUED","PROCESSING"].includes(d.status))
  const latestDocument = recentDocs[0] ?? null
  const heroFocusDocument = attentionQueue[0] ?? activeDocs[0] ?? recentDocs[0] ?? null
  const heroFocusStatus = heroFocusDocument ? statusMeta[heroFocusDocument.status] : null
  const HeroFocusIcon = heroFocusStatus?.icon ?? Files

  const visibleTrend   = monthlyVolume.slice(trendWindow === "30d" ? -1 : trendWindow === "90d" ? -3 : -6)
  const trendTotal     = visibleTrend.reduce((s, i) => s + i.extracted + i.review + i.failed, 0)
  const trendSuccRate  = trendTotal
    ? Math.round((visibleTrend.reduce((s, i) => s + i.extracted, 0) / trendTotal) * 100) : 0

  const vendorSpend = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of documents) {
      if (!d.totalAmount || d.vendorName === "Pending extraction" || d.vendorName === "Unknown") continue
      const amt = convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency)
      m.set(d.vendorName, (m.get(d.vendorName) ?? 0) + amt)
    }
    return [...m.entries()].map(([vendor, amount]) => ({ vendor, amount })).sort((a, b) => b.amount - a.amount).slice(0, 4)
  }, [documents, reportingCurrency])
  const maxVendor = vendorSpend[0]?.amount ?? 1

  const confDist = [
    { band: t("dashboard.highConfidence"),       range: "90–100%",   count: documents.filter((d) => d.confidenceScore >= 0.9).length },
    { band: t("dashboard.mediumConfidence"),     range: "80–89%",    count: documents.filter((d) => d.confidenceScore >= 0.8 && d.confidenceScore < 0.9).length },
    { band: t("dashboard.lowConfidence"),        range: "< 80%",     count: documents.filter((d) => d.confidenceScore > 0 && d.confidenceScore < 0.8).length },
  ]

  const statusRows = useMemo(() => {
    const order: DocumentRecord["status"][] = ["APPROVED","EXTRACTED","CORRECTED","REVIEW_REQUIRED","PROCESSING","QUEUED","UPLOADED","FAILED"]
    return order
      .map((status) => {
        const matching = documents.filter((d) => d.status === status)
        return {
          status,
          label: t(`status.${status}` as TranslationKey),
          count: matching.length,
          value: matching.reduce((s, d) => s + convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency), 0),
          color: statusChartPalette[status],
        }
      })
      .filter((row) => row.count > 0)
  }, [documents, reportingCurrency, t])
  const statusTotal = documents.length
  const statusConicStyle = {
    background: statusRows.length
      ? `conic-gradient(${statusRows.reduce<{ start: number; parts: string[] }>((acc, row) => {
          const size = (row.count / Math.max(1, statusTotal)) * 100
          acc.parts.push(`${row.color} ${acc.start}% ${acc.start + size}%`)
          acc.start += size
          return acc
        }, { start: 0, parts: [] }).parts.join(", ")})`
      : "conic-gradient(#e5e7eb 0 100%)",
  } satisfies CSSProperties

  const typeValueRows = useMemo(() => {
    const totals = new Map<DocumentRecord["documentType"], number>()
    for (const d of documents) {
      totals.set(d.documentType, (totals.get(d.documentType) ?? 0) + convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency))
    }
    return [...totals.entries()]
      .map(([type, amount]) => ({
        type,
        label: type === "INVOICE" ? t("detail.invoice") : t("detail.receipt"),
        amount,
        color: type === "INVOICE" ? "#8b5cf6" : "#06b6d4",
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [documents, reportingCurrency, t])
  const maxTypeValue = Math.max(1, ...typeValueRows.map((row) => row.amount))
  const approvedValue = documents
    .filter((d) => d.status === "APPROVED")
    .reduce((s, d) => s + convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency), 0)
  const approvedValuePercent = percentOf(approvedValue, totalValue)

  const qualityRadar = useMemo(() => {
    const amountCoverage = percentOf(documents.filter((d) => d.totalAmount > 0).length, documents.length)
    const noFailureRate = percentOf(documents.length - failedCount, documents.length)
    const reviewClearRate = percentOf(documents.length - attentionCount, documents.length)
    return [
      { metric: language === "vi" ? "Tin cậy" : "Confidence", score: avgConf },
      { metric: language === "vi" ? "Sẵn sàng" : "Readiness", score: completionRate },
      { metric: language === "vi" ? "Ít lỗi" : "Low failure", score: noFailureRate },
      { metric: language === "vi" ? "Có số tiền" : "Value coverage", score: amountCoverage },
      { metric: language === "vi" ? "Sạch hàng đợi" : "Queue clear", score: reviewClearRate },
    ]
  }, [attentionCount, avgConf, completionRate, documents, failedCount, language])

  const weeklyActivity = useMemo(() => {
    const labels = language === "vi" ? ["T2","T3","T4","T5","T6","T7","CN"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    const rows = labels.map((day) => ({ day, created: 0, ready: 0, review: 0 }))
    for (const d of documents) {
      const dayIndex = (new Date(d.updatedAt).getDay() + 6) % 7
      rows[dayIndex].created += 1
      if (["EXTRACTED","APPROVED"].includes(d.status)) rows[dayIndex].ready += 1
      if (["REVIEW_REQUIRED","CORRECTED","FAILED"].includes(d.status)) rows[dayIndex].review += 1
    }
    return rows
  }, [documents, language])

  const riskScatter = useMemo(() => documents
    .filter((d) => d.confidenceScore > 0)
    .map((d) => ({
      document: d.originalFileName,
      confidence: Math.round(d.confidenceScore * 100),
      amount: convertDemoCurrency(d.totalAmount, d.currency, reportingCurrency),
      status: d.status,
      fill: statusChartPalette[d.status],
    }))
    .slice(0, 18), [documents, reportingCurrency])

  const confidenceDots = useMemo(() => Array.from({ length: 72 }, (_, index) => {
    const d = documents.length ? documents[index % documents.length] : null
    const active = index < documents.length * 8
    return {
      id: `${d?.documentId ?? "empty"}-${index}`,
      color: d ? statusChartPalette[d.status] : "#e5e7eb",
      opacity: d && active ? Math.max(0.28, d.confidenceScore || 0.22) : 0.12,
      scale: d && d.confidenceScore >= 0.9 ? 1.18 : 1,
    }
  }), [documents])

  const trendAreaData = visibleTrend.map((item, index) => ({
    ...item,
    total: item.extracted + item.review + item.failed,
    ready: item.extracted,
    confidence: Math.min(98, Math.max(62, avgConf ? avgConf + index - visibleTrend.length + 1 : 72 + index * 3)),
  }))

  const primaryAction = role === "admin"
    ? { label: t("dashboard.systemOperations"),   url: "/operations", icon: Activity }
    : attentionQueue.length
      ? { label: t("dashboard.continueReview"), url: "/review",    icon: CheckCircle2 }
      : { label: t("dashboard.uploadDocument"),    url: "/upload",    icon: UploadCloud }
  const PrimaryIcon = primaryAction.icon
  const PipelineHealthIcon = syncError ? WifiOff : apiMode ? Wifi : Activity
  const pipelineHealthLabel = syncError
    ? t("dashboard.syncCheck")
    : activeDocs.length
      ? t("dashboard.pipelineProcessing")
      : t("dashboard.pipelineReady")
  const nextActionTitle = role === "admin"
    ? t("dashboard.nextAdminTitle")
    : attentionQueue.length
      ? t("dashboard.nextReviewTitle")
      : t("dashboard.nextUploadTitle")
  const nextActionDetail = role === "admin"
    ? t("dashboard.nextAdminDetail")
    : attentionQueue.length
      ? t("dashboard.nextReviewDetail", { count: attentionQueue.length })
      : t("dashboard.nextUploadDetail")

  const exportCsv = () => {
    const hdr  = ["documentId","originalFileName","type","status","vendor","currency","totalAmount","confidence","updatedAt"]
    const rows = documents.map((d) => [d.documentId,d.originalFileName,d.documentType,d.status,d.vendorName,d.currency,d.totalAmount,d.confidenceScore,d.updatedAt])
    const csv  = [hdr,...rows].map((r) => r.map(csvCell).join(",")).join("\n")
    const url  = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}))
    const a    = document.createElement("a"); a.href=url; a.download=`docuflow-dashboard-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success(t("toast.exportedCsv"))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <BaseLayout
      title={t("dashboard.title")}
      description={t("dashboard.description")}
    >
      <div className="grid min-w-0 gap-5 px-4 lg:px-6">

        {/* ── SECTION 1: Hero + inline sync ─────────────────────────────────
            Compact hero. Left = context + CTA. Right = quick stats strip.
            Sync status is embedded here so it's visible but not dominant.
        ──────────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-4 -top-12 size-52 rounded-full border border-[#d8ff72]/20" />

          <div className="relative flex flex-col gap-0 lg:grid lg:grid-cols-[1fr_auto]">
            {/* Left: headline + CTA */}
            <div className="flex flex-col justify-between gap-4 p-4 md:p-5 lg:border-r lg:border-white/10">
              {/* Top row: role badge + sync pill */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Badge className="border-[#d8ff72]/30 bg-[#d8ff72] font-semibold text-[11px] text-[#10261d]">
                    {roleLabel}
                  </Badge>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                    {t("dashboard.async")}
                  </span>
                </div>
                {/* Sync pill — small, unobtrusive */}
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1">
                  {apiMode
                    ? <Wifi className="size-3 text-emerald-400" />
                    : <WifiOff className="size-3 text-amber-400" />}
                  <span className={`font-mono text-[9px] ${syncError ? "text-red-300" : "text-white/50"}`} title={syncError ?? syncMessage}>
                    {syncError ? t("dashboard.syncError") : lastSync.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isSyncing}
                    className="ml-0.5 rounded text-white/40 transition hover:text-white/80 disabled:opacity-30"
                    aria-label={t("common.refresh")}
                  >
                    <RefreshCw className={isSyncing ? "size-3 animate-spin" : "size-3"} />
                  </button>
                </div>
              </div>

              {/* Headline */}
              <div>
                <h2 className="font-display text-lg font-semibold leading-snug tracking-[-0.04em] md:text-xl">
                  {attentionCount
                    ? t("dashboard.heroAttention")
                    : t("dashboard.heroReady")}
                </h2>
                <p className="mt-1.5 max-w-md text-xs leading-6 text-white/55">
                  {role === "admin"
                    ? t("dashboard.adminBody")
                    : attentionCount
                      ? t("dashboard.attentionBody", { count: attentionCount })
                      : t("dashboard.readyBody")}
                </p>
              </div>

              <div className="grid gap-2.5 rounded-xl border border-white/10 bg-black/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:grid-cols-[1.25fr_0.85fr_0.85fr]">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
                    <HeroFocusIcon className="size-3 text-[#d8ff72]" />
                    {t("dashboard.priorityCase")}
                  </div>
                  {heroFocusDocument ? (
                    <Link to={`/documents/${heroFocusDocument.documentId}`} className="group block min-w-0">
                      <div className="truncate text-sm font-semibold text-white group-hover:underline" title={heroFocusDocument.originalFileName}>
                        {heroFocusDocument.originalFileName}
                      </div>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-white/45">
                        <span className="truncate">{heroFocusDocument.vendorName}</span>
                        <span className="text-white/20">·</span>
                        <span>{formatDate(heroFocusDocument.updatedAt)}</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="text-sm font-medium text-white/70">{t("dashboard.noDocuments")}</div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{t("dashboard.valueToConfirm")}</div>
                  <div className="mt-1 truncate text-base font-semibold tracking-[-0.03em] text-white">
                    {formatMoney(attentionValue, reportingCurrency)}
                  </div>
                  <div className="mt-1 text-[11px] text-white/40">{t("dashboard.waitingDecision", { count: reviewCount + correctedCount })}</div>
                </div>

                <div className="border-t border-white/10 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{t("dashboard.avgConfidence")}</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-base font-semibold tracking-[-0.03em] text-white">{avgConf}%</span>
                    <span className="pb-0.5 text-[11px] text-white/40">{t("dashboard.scoredDocs", { count: confDocs.length })}</span>
                  </div>
                  <Progress value={avgConf} className="mt-2 h-1.5 bg-white/10 [&>div]:bg-[#d8ff72]" />
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button asChild className="bg-[#d8ff72] font-semibold text-[#10261d] hover:bg-[#e8ff9e] shadow-sm">
                  <Link to={primaryAction.url}>
                    <PrimaryIcon className="size-4" />
                    {primaryAction.label}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/8 hover:text-white">
                  <Link to="/documents">{t("dashboard.viewDocuments")}</Link>
                </Button>
                <Button variant="ghost" size="icon" className="ml-auto text-white/40 hover:text-white/80" onClick={exportCsv} title={t("common.exportCsv")} disabled={!documents.length}>
                  <Download className="size-4" />
                </Button>
              </div>
            </div>

            {/* Right: live pipeline steps */}
            <div className="flex min-w-[220px] flex-col justify-center gap-0 border-t border-white/10 p-4 md:p-5 lg:border-t-0">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                  <Zap className="size-3 text-[#d8ff72]" />
                  {t("dashboard.livePipeline")}
                </span>
                {activeDocs.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-[#d8ff72]/25 bg-[#d8ff72]/10 px-2 py-0.5 font-mono text-[9px] text-[#d8ff72]">
                    <span className="pulse-indicator bg-[#d8ff72]" />
                    {t("dashboard.running", { count: activeDocs.length })}
                  </span>
                )}
              </div>

              {pipeline.map((step, i) => {
                const Icon = step.icon
                // highlight steps that have active docs
                const active = activeDocs.length > 0 && i <= 1
                return (
                  <div
                    key={step.label}
                    className={`grid grid-cols-[20px_1fr_auto] items-center gap-2.5 border-t border-white/[0.08] py-1.5 first:border-t-0 ${active ? "opacity-100" : "opacity-50"}`}
                  >
                    <div className="font-mono text-[8px] text-white/25">0{i + 1}</div>
                    <div className="flex items-center gap-2">
                      <Icon className={`size-3.5 ${active ? "text-[#d8ff72]" : "text-white/40"}`} />
                      <span className={`text-sm font-medium ${active ? "text-white" : "text-white/60"}`}>{step.label}</span>
                    </div>
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-white/30">{step.detail}</span>
                  </div>
                )
              })}

              {/* Active doc quick link */}
              {activeDocs[0] && (
                <Link
                  to={`/documents/${activeDocs[0].documentId}`}
                  className="mt-3 flex items-center justify-between rounded-lg border border-[#d8ff72]/20 bg-[#d8ff72]/8 px-3 py-2 text-xs transition-colors hover:bg-[#d8ff72]/14"
                >
                  <span className="truncate pr-3 text-white/60">{activeDocs[0].originalFileName}</span>
                  <StatusBadge status={activeDocs[0].status} />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: KPI strip ──────────────────────────────────────────
            4 tiles in a single unified card. Most important numbers,
            visible above the fold without scrolling.
        ──────────────────────────────────────────────────────────────────── */}
        <section
          aria-label={t("dashboard.todayWork")}
          className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <KpiTile
            label={t("dashboard.totalDocuments")}
            value={documents.length}
            detail={t("dashboard.processingInProgress", { count: processingCount })}
            icon={Files}
          />
          <KpiTile
            label={t("dashboard.processedValue")}
            value={formatMoney(totalValue, reportingCurrency)}
            detail={demoCurrencyRateDetail()}
            icon={Banknote}
          />
          <KpiTile
            label={t("dashboard.needsHandling")}
            value={attentionCount}
            detail={t("dashboard.reviewErrorCorrected", { review: reviewCount, failed: failedCount, corrected: correctedCount })}
            icon={AlertTriangle}
            alert={attentionCount > 0}
          />
          <KpiTile
            label={t("dashboard.avgConfidenceShort")}
            value={`${avgConf}%`}
            detail={t("dashboard.readyForUse", { percent: completionRate })}
            icon={Gauge}
            alert={avgConf > 0 && avgConf < 80}
          />
        </section>

        <section aria-label={t("dashboard.insightBoard")} className="grid gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {t("dashboard.insightBoard")}
              </div>
              <h3 className="text-lg font-semibold tracking-[-0.03em]">{t("dashboard.analyticsBoard")}</h3>
            </div>
            <p className="max-w-xl text-xs leading-5 text-muted-foreground">{t("dashboard.insightBoardBody")}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_.82fr_1.15fr]">
            <article className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.processingFootprint")}</div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.05em]">{documents.length}</div>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {completionRate}% {t("dashboard.readyLabel").toLowerCase()}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-[168px_1fr]">
                <div className="flex items-center justify-center">
                  <div className="relative size-36 rounded-full p-3" style={statusConicStyle}>
                    <div className="flex size-full flex-col items-center justify-center rounded-full border bg-card text-center shadow-inner">
                      <span className="font-display text-4xl font-bold tracking-[-0.07em]">{completionRate}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{t("dashboard.cleared")}</span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{t("dashboard.statusMix")}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t("dashboard.liveDocuments")}</span>
                  </div>
                  <div className="grid gap-2">
                    {statusRows.length ? statusRows.slice(0, 5).map((row) => (
                      <div key={row.status} className="grid gap-1">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="size-2 rounded-sm" style={{ backgroundColor: row.color }} />
                            <span className="truncate text-muted-foreground">{row.label}</span>
                          </span>
                          <span className="font-mono font-semibold">{row.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(6, percentOf(row.count, statusTotal))}%`, backgroundColor: row.color }} />
                        </div>
                      </div>
                    )) : (
                      <div className="py-6 text-center text-xs text-muted-foreground">{t("common.empty")}</div>
                    )}
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              <article className="min-w-0 overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.activityPulse")}</div>
                    <div className="mt-1 text-sm font-semibold">{t("dashboard.weeklyFlow")}</div>
                  </div>
                  <Activity className="size-4 text-primary" />
                </div>
                <ChartContainer config={premiumChartConfig} className="h-[118px] w-full aspect-auto">
                  <BarChart data={weeklyActivity} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="created" fill="var(--color-created)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="ready" fill="var(--color-ready)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="review" fill="var(--color-review)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </article>

              <article className="min-w-0 overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.dataQuality")}</div>
                    <div className="mt-1 text-sm font-semibold">{t("dashboard.qualityRadar")}</div>
                  </div>
                  <Gauge className="size-4 text-primary" />
                </div>
                <ChartContainer config={premiumChartConfig} className="h-[154px] w-full aspect-auto">
                  <RadarChart data={qualityRadar} margin={{ top: 4, right: 18, bottom: 4, left: 18 }}>
                    <PolarGrid gridType="polygon" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" stroke="var(--color-confidence)" fill="var(--color-confidence)" fillOpacity={0.22} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              </article>
            </div>

            <article className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.valueStack")}</div>
                    <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{formatMoney(totalValue, reportingCurrency)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t("dashboard.approvedValue")}</div>
                    <div className="text-sm font-semibold">{approvedValuePercent}%</div>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("dashboard.valueStackBody")}</p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[1fr_150px]">
                <div className="grid gap-3">
                  {typeValueRows.length ? typeValueRows.map((row) => (
                    <div key={row.type} className="grid gap-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-sm" style={{ backgroundColor: row.color }} />
                          <span className="text-muted-foreground">{row.label}</span>
                        </span>
                        <span className="font-mono font-semibold tabular-nums">{formatMoney(row.amount, reportingCurrency)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(8, (row.amount / maxTypeValue) * 100)}%`, backgroundColor: row.color }} />
                      </div>
                    </div>
                  )) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">{t("common.empty")}</div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t("dashboard.attention")}</div>
                      <div className="mt-1 text-lg font-semibold tracking-[-0.04em]">{attentionCount}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t("dashboard.reviewLoad")}</div>
                      <div className="mt-1 text-lg font-semibold tracking-[-0.04em]">{formatMoney(attentionValue, reportingCurrency)}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1 self-center rounded-xl border bg-muted/20 p-3">
                  {confidenceDots.map((dot) => (
                    <span
                      key={dot.id}
                      className="aspect-square rounded-full transition-transform duration-300"
                      style={{ backgroundColor: dot.color, opacity: dot.opacity, transform: `scale(${dot.scale})` }}
                    />
                  ))}
                </div>
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
            <article className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b bg-muted/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.trendComposite")}</div>
                    <div className="mt-1 text-base font-semibold tracking-[-0.02em]">{t("dashboard.volume")}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.trendCompositeBody")}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#153f30]" />{t("dashboard.readyLine")}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#8b5cf6]" />{t("dashboard.reviewLine")}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#111827]" />{t("dashboard.failedLine")}</span>
                  </div>
                </div>
              </div>
              <ChartContainer config={premiumChartConfig} className="h-[260px] w-full aspect-auto p-4">
                <AreaChart data={trendAreaData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardReadyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-extracted)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--color-extracted)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="dashboardReviewFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-review)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--color-review)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="ready" stroke="var(--color-extracted)" fill="url(#dashboardReadyFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="review" stroke="var(--color-review)" fill="url(#dashboardReviewFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" stroke="var(--color-failed)" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </article>

            <article className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b bg-muted/20 p-4">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.riskMap")}</div>
                <div className="mt-1 text-base font-semibold tracking-[-0.02em]">{t("dashboard.confidenceMap")}</div>
              </div>
              <ChartContainer config={premiumChartConfig} className="h-[260px] w-full aspect-auto p-4">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 8, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="confidence" name={t("dashboard.confidence")} type="number" domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
                  <YAxis
                    dataKey="amount"
                    name={t("dashboard.amount")}
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Scatter data={riskScatter} dataKey="amount" name={t("dashboard.amount")} fill="var(--color-risk)">
                    {riskScatter.map((entry) => (
                      <Cell key={entry.document} fill={entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ChartContainer>
            </article>
          </div>
        </section>

        <section aria-label={t("dashboard.todayWork")} className="grid gap-4 lg:grid-cols-[1.15fr_.9fr_.95fr]">
          <article className="flex min-w-0 flex-col justify-between rounded-xl border bg-card p-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                <PrimaryIcon className="size-3.5 text-primary" />
                {t("dashboard.nextWork")}
              </div>
              <h3 className="mt-3 text-base font-semibold tracking-[-0.02em]">{nextActionTitle}</h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{nextActionDetail}</p>
            </div>
            <Button asChild size="sm" className="mt-4 w-fit">
              <Link to={primaryAction.url}>
                {primaryAction.label}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </article>

          <article className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                <PipelineHealthIcon className={isSyncing ? "size-3.5 animate-spin text-primary" : "size-3.5 text-primary"} />
                {t("dashboard.pipelineHealth")}
              </div>
              <Badge variant="outline" className={syncError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                {syncError ? t("dashboard.warning") : t("dashboard.stable")}
              </Badge>
            </div>
            <div className="mt-4 text-base font-semibold tracking-[-0.02em]">{pipelineHealthLabel}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.syncedAt", { count: activeDocs.length, time: lastSync.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}
            </div>
            <Progress value={completionRate} className="mt-4 h-2" />
            <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>{t("dashboard.readyLabel")}</span>
              <span>{completionRate}%</span>
            </div>
          </article>

          <article className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              <Files className="size-3.5 text-primary" />
              {t("dashboard.latestDocument")}
            </div>
            {latestDocument ? (
              <Link to={`/documents/${latestDocument.documentId}`} className="group mt-4 block min-w-0">
                <div className="truncate text-base font-semibold tracking-[-0.02em] group-hover:underline" title={latestDocument.originalFileName}>
                  {latestDocument.originalFileName}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={latestDocument.status} />
                  <span className="text-xs text-muted-foreground">{formatMoney(latestDocument.totalAmount, latestDocument.currency)}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {latestDocument.vendorName} · {formatDate(latestDocument.updatedAt)}
                </div>
              </Link>
            ) : (
              <div className="mt-4">
                <div className="text-base font-semibold tracking-[-0.02em]">{t("dashboard.noLatestTitle")}</div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{t("dashboard.noLatestBody")}</p>
              </div>
            )}
          </article>
        </section>

        {(failedCount > 0 || reviewCount > 0) && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/55 p-3 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <AlertTriangle className="size-3.5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-semibold">{t("dashboard.alertTitle")}</div>
                <p className="mt-0.5 text-xs opacity-70">
                  {failedCount > 0 && t("dashboard.failedCount", { count: failedCount })}
                  {failedCount > 0 && reviewCount > 0 && " / "}
                  {reviewCount > 0 && t("dashboard.reviewCount", { count: reviewCount })}
                  {" "}{t("dashboard.alertQueue")}
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-amber-300 bg-white/70 text-amber-900 hover:bg-white dark:border-amber-800 dark:bg-transparent dark:text-amber-100"
            >
              <Link to="/review">{t("dashboard.openQueue")} <ArrowRight className="size-3.5" /></Link>
            </Button>
          </div>
        )}

        {/* ── SECTION 3: Action area (attention queue + confidence ring) ────
            Widest card on the left = things to do NOW.
            Narrow card on the right = quick data quality snapshot.
            Together they answer: "What needs my attention?" immediately.
        ──────────────────────────────────────────────────────────────────── */}
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">

          {/* Attention queue */}
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.actions")}</div>
                <CardTitle className="mt-0.5 text-base">
                    {t("dashboard.docsToProcess")}
                    {attentionCount > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 font-mono text-[10px] font-bold text-white">
                        {attentionCount}
                      </span>
                    )}
                  </CardTitle>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 text-xs">
                  <Link to="/review">{t("common.viewAll")} <ArrowRight className="size-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {attentionQueue.length ? (
                <div>
                  {attentionQueue.map((d, i) => {
                    const conf = Math.round(d.confidenceScore * 100)
                    const isLow = conf < 80 && conf > 0
                    return (
                      <Link
                        key={d.documentId}
                        to={`/documents/${d.documentId}`}
                        className="group flex items-center gap-4 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/30"
                      >
                        {/* Index */}
                        <span className="hidden w-5 shrink-0 font-mono text-[9px] text-muted-foreground/50 sm:block">
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        {/* File info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium group-hover:underline">{d.originalFileName}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusBadge status={d.status} />
                            <span className="text-xs text-muted-foreground">{d.vendorName}</span>
                            {d.reviewReasonCodes.length > 0 && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                · {t("dashboard.reasonCount", { count: d.reviewReasonCodes.length })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Confidence mini-bar */}
                        <div className="hidden w-20 shrink-0 sm:block">
                          <div className={`mb-1 text-right font-mono text-[9px] font-semibold ${isLow ? "text-amber-600" : "text-muted-foreground"}`}>
                            {conf}%
                          </div>
                          <Progress
                            value={conf}
                            className={`h-1 ${isLow ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted-foreground/30"}`}
                          />
                        </div>

                        <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t("dashboard.emptyQueue")}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.emptyQueueBody")}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/upload"><UploadCloud className="size-3.5" />{t("dashboard.uploadNew")}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data quality snapshot */}
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.dataQuality")}</div>
              <CardTitle className="mt-0.5 text-base">{t("dashboard.confidence")}</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {/* Big confidence number */}
              <div className="mb-4 text-center">
                <div className={`font-display text-5xl font-bold tracking-[-0.06em] ${avgConf >= 80 ? "text-emerald-700 dark:text-emerald-400" : avgConf > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {avgConf}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{t("dashboard.allDocsAverage")}</div>
                <Progress
                  value={avgConf}
                  className={`mt-3 h-2 ${avgConf >= 80 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"}`}
                />
              </div>

              {/* Distribution breakdown */}
              <div className="grid gap-2">
                {[
                  { label: t("dashboard.highConfidence"), value: confDist[0].count, color: "bg-emerald-500" },
                  { label: t("dashboard.mediumConfidence"), value: confDist[1].count, color: "bg-emerald-300 dark:bg-emerald-700" },
                  { label: t("dashboard.lowConfidence"), value: confDist[2].count, color: "bg-amber-500" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 shrink-0 rounded-full ${row.color}`} />
                      <span className="text-muted-foreground">{row.label}</span>
                    </div>
                    <span className="font-mono font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t pt-3 text-center">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  {t("dashboard.readyRecords", { percent: completionRate })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 4: Analytics (volume chart + vendor spend) ────────────
            Analysis lives here, after the actionable sections.
            Users scroll down for insight, not for tasks.
        ──────────────────────────────────────────────────────────────────── */}
        <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[1.35fr_.65fr]">

          {/* Volume trend chart */}
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.analytics")}</div>
                  <CardTitle className="mt-0.5 text-base">{t("dashboard.volume")}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {trendTotal} {t("dashboard.document").toLowerCase()} · <span className="text-emerald-700 dark:text-emerald-400 font-medium">{trendSuccRate}%</span> {t("dashboard.successExtracted")}
                  </p>
                </div>
                {/* Time window toggle */}
                <div className="flex overflow-hidden rounded-lg border self-start" aria-label={t("dashboard.timeWindow")}>
                  {(["30d","90d","6m"] as TrendWindow[]).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setTrendWindow(w)}
                      className={`min-h-8 min-w-11 border-r px-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors last:border-r-0 ${trendWindow === w ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <ChartContainer config={trendConfig} className="h-[220px] w-full aspect-auto">
                <BarChart data={visibleTrend} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="extracted" stackId="v" fill="var(--color-extracted)" radius={[0,0,0,0]} />
                  <Bar dataKey="review"    stackId="v" fill="var(--color-review)" />
                  <Bar dataKey="failed"    stackId="v" fill="var(--color-failed)" radius={[3,3,0,0]} />
                </BarChart>
              </ChartContainer>
              <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                {Object.entries(trendConfig).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vendor spend */}
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.vendorSpend")}</div>
              <CardTitle className="mt-0.5 text-base">{t("dashboard.topVendors")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3.5 p-5">
              {vendorSpend.length ? vendorSpend.map((item, i) => (
                <div key={item.vendor} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-mono text-muted-foreground/40">0{i+1}</span>
                      <span className="truncate">{item.vendor}</span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold tabular-nums">{formatMoney(item.amount, reportingCurrency)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-700"
                      style={{ width: `${Math.max(5, (item.amount / maxVendor) * 100)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-xs text-muted-foreground">{t("dashboard.noSpend")}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 5: Recent activity (full width) ───────────────────────
            Full-width feed. Users scan this last for context / audit trail.
        ──────────────────────────────────────────────────────────────────── */}
        <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("dashboard.activity")}</div>
                <CardTitle className="mt-0.5 text-base">{t("dashboard.recentSignals")}</CardTitle>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-bold tracking-[-0.04em]">{documents.length}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t("dashboard.records")}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Table header */}
                <div className="grid grid-cols-[1.6fr_.75fr_.7fr_.65fr] gap-4 border-b bg-muted/20 px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>{t("dashboard.document")}</span>
                  <span>{t("dashboard.status")}</span>
                  <span className="text-right">{t("dashboard.amount")}</span>
                  <span className="text-right">{t("dashboard.updated")}</span>
                </div>
                {recentDocs.map((d) => (
                  <Link
                    key={d.documentId}
                    to={`/documents/${d.documentId}`}
                    className="grid grid-cols-[1.6fr_.75fr_.7fr_.65fr] items-center gap-4 border-b px-5 py-3.5 transition-colors last:border-b-0 hover:bg-muted/25"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.originalFileName}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{d.vendorName}</div>
                    </div>
                    <StatusBadge status={d.status} />
                    <span className="text-right text-sm font-semibold tabular-nums">{formatMoney(d.totalAmount, d.currency)}</span>
                    <span className="text-right text-xs text-muted-foreground">{formatDate(d.updatedAt)}</span>
                  </Link>
                ))}
                {!recentDocs.length && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {t("dashboard.noRecent")}{" "}
                    <Link to="/upload" className="text-primary underline underline-offset-2">{t("dashboard.uploadFirst")}</Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </BaseLayout>
  )
}
