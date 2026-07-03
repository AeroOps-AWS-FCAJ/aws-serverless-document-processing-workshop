"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
import { roleLabels } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"
import { isApiConfigured, listDocuments } from "@/lib/docuflow-api"
import {
  formatDate,
  formatMoney,
  monthlyVolume,
  statusMeta,
  type DocumentRecord,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { SpotlightCard } from "@/components/spotlight-card"

type TrendWindow = "30d" | "90d" | "6m"
type SyncState = "idle" | "syncing" | "synced" | "error"

const DEMO_USD_TO_VND = 25_000

const trendConfig = {
  extracted: { label: "Đã trích xuất", color: "#153f30" },
  review:    { label: "Cần duyệt",     color: "#d97706" },
  failed:    { label: "Thất bại",       color: "#dc2626" },
} satisfies ChartConfig

// ─── Pipeline steps ───────────────────────────────────────────────────────────
const pipeline = [
  { label: "Tiếp nhận",  detail: "S3 Raw",    icon: UploadCloud },
  { label: "Trích xuất", detail: "Textract",  icon: ScanText    },
  { label: "Chuẩn hóa",  detail: "AI Proxy",  icon: Sparkles    },
  { label: "Xác thực",   detail: "Schema",    icon: FileCheck2  },
  { label: "Lưu trữ",    detail: "DynamoDB",  icon: Check       },
]

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DocumentRecord["status"] }) {
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className={status === "PROCESSING" ? "size-3 animate-spin" : "size-3"} />
      {meta.label}
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
  const role        = session?.role ?? "finance"
  const apiConn     = isApiConfigured()

  const [trendWindow, setTrendWindow] = useState<TrendWindow>("6m")
  const [syncState,   setSyncState]   = useState<SyncState>("idle")
  const [lastSync,    setLastSync]    = useState(() => new Date())

  const documents = useMemo(
    () => role === "finance"
      ? allDocuments.filter((d) => d.userId === session?.userId)
      : allDocuments,
    [allDocuments, role, session?.userId],
  )

  // ── Data refresh ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setSyncState("syncing")
    if (!apiConn) { setLastSync(new Date()); setSyncState("synced"); return }
    try {
      const res = await listDocuments()
      mergeDocuments(res.items)
      setLastSync(new Date())
      setSyncState("synced")
    } catch { setSyncState("error") }
  }, [apiConn, mergeDocuments])

  useEffect(() => {
    if (!apiConn) return
    void refresh()
    const t = window.setInterval(() => void refresh(), 15_000)
    return () => window.clearInterval(t)
  }, [apiConn, refresh])

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
  const totalVnd        = documents.reduce(
    (s, d) => s + (d.currency === "USD" ? d.totalAmount * DEMO_USD_TO_VND : d.totalAmount), 0)

  const attentionQueue = [...documents]
    .filter((d) => ["REVIEW_REQUIRED","FAILED","CORRECTED"].includes(d.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const activeDocs = recentDocs.filter((d) => ["UPLOADED","QUEUED","PROCESSING"].includes(d.status))

  const visibleTrend   = monthlyVolume.slice(trendWindow === "30d" ? -1 : trendWindow === "90d" ? -3 : -6)
  const trendTotal     = visibleTrend.reduce((s, i) => s + i.extracted + i.review + i.failed, 0)
  const trendSuccRate  = trendTotal
    ? Math.round((visibleTrend.reduce((s, i) => s + i.extracted, 0) / trendTotal) * 100) : 0

  const vendorSpend = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of documents) {
      if (!d.totalAmount || d.vendorName === "Pending extraction" || d.vendorName === "Unknown") continue
      const amt = d.currency === "USD" ? d.totalAmount * DEMO_USD_TO_VND : d.totalAmount
      m.set(d.vendorName, (m.get(d.vendorName) ?? 0) + amt)
    }
    return [...m.entries()].map(([vendor, amount]) => ({ vendor, amount })).sort((a, b) => b.amount - a.amount).slice(0, 4)
  }, [documents])
  const maxVendor = vendorSpend[0]?.amount ?? 1

  const confDist = [
    { band: "Cao",       range: "90–100%",   count: documents.filter((d) => d.confidenceScore >= 0.9).length },
    { band: "TB",        range: "80–89%",    count: documents.filter((d) => d.confidenceScore >= 0.8 && d.confidenceScore < 0.9).length },
    { band: "Cần duyệt", range: "< 80%",     count: documents.filter((d) => d.confidenceScore > 0 && d.confidenceScore < 0.8).length },
  ]

  const primaryAction = role === "admin"
    ? { label: "Vận hành hệ thống",   url: "/operations", icon: Activity }
    : attentionQueue.length
      ? { label: "Tiếp tục kiểm duyệt", url: "/review",    icon: CheckCircle2 }
      : { label: "Tải tài liệu lên",    url: "/upload",    icon: UploadCloud }
  const PrimaryIcon = primaryAction.icon

  const exportCsv = () => {
    const hdr  = ["documentId","originalFileName","type","status","vendor","currency","totalAmount","confidence","updatedAt"]
    const rows = documents.map((d) => [d.documentId,d.originalFileName,d.documentType,d.status,d.vendorName,d.currency,d.totalAmount,d.confidenceScore,d.updatedAt])
    const csv  = [hdr,...rows].map((r) => r.map(csvCell).join(",")).join("\n")
    const url  = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}))
    const a    = document.createElement("a"); a.href=url; a.download=`docuflow-dashboard-${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <BaseLayout
      title="Trung tâm kiểm soát"
      description="Theo dõi toàn bộ tài liệu đang di chuyển qua luồng xử lý bất đồng bộ."
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
                    {roleLabels[role]}
                  </Badge>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                    Xử lý bất đồng bộ
                  </span>
                </div>
                {/* Sync pill — small, unobtrusive */}
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1">
                  {apiConn
                    ? <Wifi className="size-3 text-emerald-400" />
                    : <WifiOff className="size-3 text-amber-400" />}
                  <span className="font-mono text-[9px] text-white/50">
                    {lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={syncState === "syncing"}
                    className="ml-0.5 rounded text-white/40 transition hover:text-white/80 disabled:opacity-30"
                    aria-label="Làm mới"
                  >
                    <RefreshCw className={syncState === "syncing" ? "size-3 animate-spin" : "size-3"} />
                  </button>
                </div>
              </div>

              {/* Headline */}
              <div>
                <h2 className="font-display text-lg font-semibold leading-snug tracking-[-0.04em] md:text-xl">
                  {attentionCount
                    ? "Các trường chưa chắc chắn cần được xử lý."
                    : "Từ tài liệu thô đến dữ liệu tài chính đáng tin cậy."}
                </h2>
                <p className="mt-1.5 max-w-md text-xs leading-6 text-white/55">
                  {role === "admin"
                    ? "Giám sát quy trình, bằng chứng, cảnh báo và kiểm soát chi phí."
                    : attentionCount
                      ? `${attentionCount} tài liệu cần chú ý — pipeline vẫn tiếp tục chạy nền.`
                      : "Pipeline đang hoạt động bình thường. Tải tài liệu mới bất kỳ lúc nào."}
                </p>
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
                  <Link to="/documents">Xem tài liệu</Link>
                </Button>
                <Button variant="ghost" size="icon" className="ml-auto text-white/40 hover:text-white/80" onClick={exportCsv} title="Xuất CSV" disabled={!documents.length}>
                  <Download className="size-4" />
                </Button>
              </div>
            </div>

            {/* Right: live pipeline steps */}
            <div className="flex min-w-[220px] flex-col justify-center gap-0 border-t border-white/10 p-4 md:p-5 lg:border-t-0">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                  <Zap className="size-3 text-[#d8ff72]" />
                  Pipeline sống
                </span>
                {activeDocs.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-[#d8ff72]/25 bg-[#d8ff72]/10 px-2 py-0.5 font-mono text-[9px] text-[#d8ff72]">
                    <span className="pulse-indicator bg-[#d8ff72]" />
                    {activeDocs.length} đang chạy
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
          aria-label="Chỉ số tổng quan"
          className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <KpiTile
            label="Tổng tài liệu"
            value={documents.length}
            detail={`${processingCount} đang trong tiến trình`}
            icon={Files}
          />
          <KpiTile
            label="Giá trị xử lý"
            value={formatMoney(totalVnd, "VND")}
            detail={`USD quy đổi ${DEMO_USD_TO_VND.toLocaleString("vi")}:1`}
            icon={Banknote}
          />
          <KpiTile
            label="Cần xử lý"
            value={attentionCount}
            detail={`${reviewCount} duyệt · ${failedCount} lỗi · ${correctedCount} đã sửa`}
            icon={AlertTriangle}
            alert={attentionCount > 0}
          />
          <KpiTile
            label="Độ tin cậy TB"
            value={`${avgConf}%`}
            detail={`${completionRate}% bản ghi sẵn sàng sử dụng`}
            icon={Gauge}
            alert={avgConf > 0 && avgConf < 80}
          />
        </section>

        {/* ── SECTION 3: Action area (attention queue + confidence ring) ────
            Widest card on the left = things to do NOW.
            Narrow card on the right = quick data quality snapshot.
            Together they answer: "What needs my attention?" immediately.
        ──────────────────────────────────────────────────────────────────── */}
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[1fr_300px]">

          {/* Attention queue */}
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Hành động cần làm</div>
                  <CardTitle className="mt-0.5 text-base">
                    Tài liệu cần xử lý
                    {attentionCount > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 font-mono text-[10px] font-bold text-white">
                        {attentionCount}
                      </span>
                    )}
                  </CardTitle>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 text-xs">
                  <Link to="/review">Xem tất cả <ArrowRight className="size-3" /></Link>
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
                                · {d.reviewReasonCodes.length} lý do
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
                    <div className="text-sm font-semibold">Hàng đợi trống</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Mọi tài liệu đã được xử lý xong.</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/upload"><UploadCloud className="size-3.5" />Tải tài liệu mới</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data quality snapshot */}
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Chất lượng dữ liệu</div>
              <CardTitle className="mt-0.5 text-base">Độ tin cậy</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {/* Big confidence number */}
              <div className="mb-4 text-center">
                <div className={`font-display text-5xl font-bold tracking-[-0.06em] ${avgConf >= 80 ? "text-emerald-700 dark:text-emerald-400" : avgConf > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {avgConf}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Trung bình toàn bộ tài liệu</div>
                <Progress
                  value={avgConf}
                  className={`mt-3 h-2 ${avgConf >= 80 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"}`}
                />
              </div>

              {/* Distribution breakdown */}
              <div className="grid gap-2">
                {[
                  { label: "Cao (≥90%)",      value: confDist[0].count, color: "bg-emerald-500" },
                  { label: "Trung bình (80–89%)", value: confDist[1].count, color: "bg-emerald-300 dark:bg-emerald-700" },
                  { label: "Cần duyệt (<80%)", value: confDist[2].count, color: "bg-amber-500" },
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
                  {completionRate}% bản ghi sẵn sàng
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
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Phân tích xử lý</div>
                  <CardTitle className="mt-0.5 text-base">Khối lượng tài liệu theo thời gian</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {trendTotal} tài liệu · <span className="text-emerald-700 dark:text-emerald-400 font-medium">{trendSuccRate}%</span> trích xuất thành công
                  </p>
                </div>
                {/* Time window toggle */}
                <div className="flex overflow-hidden rounded-lg border self-start" aria-label="Khoảng thời gian">
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
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Chi tiêu theo nhà cung cấp</div>
              <CardTitle className="mt-0.5 text-base">Top nhà cung cấp</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3.5 p-5">
              {vendorSpend.length ? vendorSpend.map((item, i) => (
                <div key={item.vendor} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-mono text-muted-foreground/40">0{i+1}</span>
                      <span className="truncate">{item.vendor}</span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold tabular-nums">{formatMoney(item.amount, "VND")}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-700"
                      style={{ width: `${Math.max(5, (item.amount / maxVendor) * 100)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu chi tiêu.</div>
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
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Nhật ký hoạt động</div>
                <CardTitle className="mt-0.5 text-base">Tín hiệu tài liệu gần đây nhất</CardTitle>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-bold tracking-[-0.04em]">{documents.length}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">bản ghi</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Table header */}
                <div className="grid grid-cols-[1.6fr_.75fr_.7fr_.65fr] gap-4 border-b bg-muted/20 px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Tài liệu</span>
                  <span>Trạng thái</span>
                  <span className="text-right">Số tiền</span>
                  <span className="text-right">Cập nhật</span>
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
                    Chưa có tài liệu nào.{" "}
                    <Link to="/upload" className="text-primary underline underline-offset-2">Tải lên ngay</Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 6: Alert banner (conditional) ────────────────────────
            Only rendered when there's something urgent.
            Placed last so it doesn't visually interrupt the normal flow.
        ──────────────────────────────────────────────────────────────────── */}
        {(failedCount > 0 || reviewCount > 0) && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <AlertTriangle className="size-4 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <div className="text-sm font-semibold">Xác minh thủ công bảo vệ tính chính xác của dữ liệu tài chính.</div>
                <p className="mt-0.5 text-xs opacity-70">
                  {failedCount > 0 && `${failedCount} tài liệu thất bại`}
                  {failedCount > 0 && reviewCount > 0 && " và "}
                  {reviewCount > 0 && `${reviewCount} tài liệu cần duyệt`}
                  {" "}vẫn hiển thị cho đến khi được giải quyết.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 bg-white/80 text-amber-900 hover:bg-white dark:border-amber-800 dark:bg-transparent dark:text-amber-100"
            >
              <Link to="/review">Giải quyết ngoại lệ <ArrowRight className="size-3.5" /></Link>
            </Button>
          </div>
        )}

      </div>
    </BaseLayout>
  )
}
