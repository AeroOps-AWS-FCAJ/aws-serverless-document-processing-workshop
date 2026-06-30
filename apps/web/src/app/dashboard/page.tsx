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
} from "lucide-react"
import { Link } from "react-router-dom"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

type TrendWindow = "30d" | "90d" | "6m"
type SyncState = "idle" | "syncing" | "synced" | "error"

const DEMO_USD_TO_VND = 25_000

const trendConfig = {
  extracted: { label: "Extracted", color: "#153f30" },
  review: { label: "Review", color: "#e5a93d" },
  failed: { label: "Failed", color: "#d96143" },
} satisfies ChartConfig

const confidenceConfig = {
  count: { label: "Documents", color: "#6a9f81" },
} satisfies ChartConfig

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

const pipeline = [
  { label: "Intake", detail: "S3 raw", icon: UploadCloud },
  { label: "Extract", detail: "Textract", icon: ScanText },
  { label: "Normalize", detail: "AI Proxy", icon: Sparkles },
  { label: "Validate", detail: "Schema", icon: FileCheck2 },
  { label: "Persist", detail: "DynamoDB", icon: Check },
]

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  alert = false,
}: {
  label: string
  value: string | number
  detail: string
  icon: typeof Files
  alert?: boolean
}) {
  return (
    <div className="group relative min-h-40 overflow-hidden border-b p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <Icon className="absolute -bottom-5 -right-4 size-24 stroke-[1] text-foreground/[0.035] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className={alert ? "size-1.5 bg-orange-500" : "size-1.5 bg-emerald-600"} />
          {label}
        </div>
        <div>
          <div className="font-display text-3xl font-semibold tracking-[-0.06em] lg:text-4xl">{value}</div>
          <p className="mt-1 max-w-48 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function csvCell(value: string | number | null) {
  const normalized = value === null ? "" : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

export default function DashboardPage() {
  const { documents: allDocuments, mergeDocuments } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const apiConnected = isApiConfigured()
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("6m")
  const [syncState, setSyncState] = useState<SyncState>("idle")
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date())

  const documents = useMemo(
    () => role === "finance"
      ? allDocuments.filter((document) => document.userId === session?.userId)
      : allDocuments,
    [allDocuments, role, session?.userId]
  )

  const refreshDocuments = useCallback(async () => {
    setSyncState("syncing")
    if (!apiConnected) {
      setLastSyncedAt(new Date())
      setSyncState("synced")
      return
    }

    try {
      const response = await listDocuments()
      mergeDocuments(response.items)
      setLastSyncedAt(new Date())
      setSyncState("synced")
    } catch {
      setSyncState("error")
    }
  }, [apiConnected, mergeDocuments])

  useEffect(() => {
    if (!apiConnected) return
    void refreshDocuments()
    const timer = window.setInterval(() => void refreshDocuments(), 15_000)
    return () => window.clearInterval(timer)
  }, [apiConnected, refreshDocuments])

  const processingCount = documents.filter((document) => ["UPLOADED", "QUEUED", "PROCESSING"].includes(document.status)).length
  const reviewCount = documents.filter((document) => document.status === "REVIEW_REQUIRED").length
  const correctedCount = documents.filter((document) => document.status === "CORRECTED").length
  const failedCount = documents.filter((document) => document.status === "FAILED").length
  const readyCount = documents.filter((document) => ["EXTRACTED", "APPROVED"].includes(document.status)).length
  const attentionCount = reviewCount + failedCount + correctedCount
  const completionRate = documents.length ? Math.round((readyCount / documents.length) * 100) : 0
  const confidenceDocuments = documents.filter((document) => document.confidenceScore > 0)
  const averageConfidence = confidenceDocuments.length
    ? Math.round((confidenceDocuments.reduce((sum, document) => sum + document.confidenceScore, 0) / confidenceDocuments.length) * 100)
    : 0
  const totalValueVnd = documents.reduce(
    (sum, document) => sum + (document.currency === "USD" ? document.totalAmount * DEMO_USD_TO_VND : document.totalAmount),
    0
  )

  const attentionQueue = [...documents]
    .filter((document) => ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
  const activeDocuments = recentDocuments.filter((document) => ["UPLOADED", "QUEUED", "PROCESSING"].includes(document.status))

  const visibleTrend = monthlyVolume.slice(trendWindow === "30d" ? -1 : trendWindow === "90d" ? -3 : -6)
  const trendTotal = visibleTrend.reduce((sum, item) => sum + item.extracted + item.review + item.failed, 0)
  const trendSuccessRate = trendTotal
    ? Math.round((visibleTrend.reduce((sum, item) => sum + item.extracted, 0) / trendTotal) * 100)
    : 0

  const vendorSpend = useMemo(() => {
    const totals = new Map<string, number>()
    for (const document of documents) {
      if (!document.totalAmount || document.vendorName === "Pending extraction" || document.vendorName === "Unknown") continue
      const amount = document.currency === "USD" ? document.totalAmount * DEMO_USD_TO_VND : document.totalAmount
      totals.set(document.vendorName, (totals.get(document.vendorName) ?? 0) + amount)
    }
    return [...totals.entries()]
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)
  }, [documents])
  const maxVendorSpend = vendorSpend[0]?.amount ?? 1

  const confidenceDistribution = [
    { band: "High", range: "90–100%", count: documents.filter((document) => document.confidenceScore >= 0.9).length },
    { band: "Medium", range: "80–89%", count: documents.filter((document) => document.confidenceScore >= 0.8 && document.confidenceScore < 0.9).length },
    { band: "Review", range: "Below 80%", count: documents.filter((document) => document.confidenceScore > 0 && document.confidenceScore < 0.8).length },
  ]

  const primaryAction = role === "admin"
    ? { label: "Open operations", url: "/operations", icon: Activity }
    : attentionQueue.length
      ? { label: "Continue review", url: "/review", icon: CheckCircle2 }
      : { label: "Upload a document", url: "/upload", icon: UploadCloud }
  const PrimaryIcon = primaryAction.icon

  const exportCsv = () => {
    const header = ["documentId", "fileName", "type", "status", "vendor", "currency", "totalAmount", "confidence", "updatedAt"]
    const rows = documents.map((document) => [
      document.documentId,
      document.fileName,
      document.documentType,
      document.status,
      document.vendorName,
      document.currency,
      document.totalAmount,
      document.confidenceScore,
      document.updatedAt,
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `docuflow-dashboard-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <BaseLayout
      title="Document control center"
      description="A traceable view of every invoice and receipt moving through the asynchronous processing workflow."
    >
      <div className="grid min-w-0 gap-5 px-4 lg:px-6">
        <div className="flex flex-col gap-3 border-y py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className={apiConnected ? "text-emerald-700" : "text-amber-700"}>
              {apiConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {apiConnected ? "AWS API connected" : "Local demo data"}
            </Badge>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Last synced {lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {syncState === "error" && <span className="text-xs text-destructive">Sync failed. Local data remains available.</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshDocuments} disabled={syncState === "syncing"}>
              <RefreshCw className={syncState === "syncing" ? "size-3.5 animate-spin" : "size-3.5"} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!documents.length}>
              <Download className="size-3.5" />Export CSV
            </Button>
          </div>
        </div>

        <section className="relative overflow-hidden border bg-[#10261d] text-white">
          <div className="absolute -right-16 -top-28 size-80 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-16 size-56 rounded-full border border-[#d8ff72]/30" />
          <div className="relative grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex min-h-72 flex-col justify-between gap-10 p-6 md:p-8 lg:border-r lg:border-white/15">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <Badge className="border-[#d8ff72]/35 bg-[#d8ff72] text-[#10261d]">{roleLabels[role]}</Badge>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Asynchronous document processing</span>
                </div>
                <h2 className="max-w-2xl font-display text-3xl font-semibold leading-[1.08] tracking-[-0.05em] md:text-5xl">
                  {attentionCount ? "Uncertain fields, surfaced before they become bad data." : "From raw document to trusted finance data."}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/62">
                  {role === "admin"
                    ? "Monitor the workflow, evidence trail, alert paths, and cost guardrails from one operational surface."
                    : `${attentionCount} document${attentionCount === 1 ? " needs" : "s need"} attention. Processing continues in the background while you work.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="bg-[#d8ff72] text-[#10261d] hover:bg-[#e4ff9b]">
                  <Link to={primaryAction.url}><PrimaryIcon className="size-4" />{primaryAction.label}<ArrowRight className="size-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/documents">Browse documents</Link>
                </Button>
              </div>
            </div>

            <div className="grid content-center gap-0 p-6 md:p-8">
              <div className="mb-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
                <span>Processing architecture</span><span className="text-[#d8ff72]">{activeDocuments.length} active</span>
              </div>
              {pipeline.map((step, index) => {
                const Icon = step.icon
                return (
                  <div key={step.label} className="group grid grid-cols-[32px_1fr_auto] items-center gap-3 border-t border-white/12 py-3 first:border-t-0">
                    <div className="font-mono text-[10px] text-white/35">0{index + 1}</div>
                    <div className="flex items-center gap-3"><Icon className="size-4 text-[#d8ff72]" /><span className="text-sm font-medium">{step.label}</span></div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">{step.detail}</span>
                  </div>
                )
              })}
              {activeDocuments[0] && (
                <Link to={`/documents/${activeDocuments[0].documentId}`} className="mt-4 flex items-center justify-between border border-[#d8ff72]/25 bg-[#d8ff72]/5 px-3 py-2 text-xs transition-colors hover:bg-[#d8ff72]/10">
                  <span className="truncate pr-4 text-white/70">{activeDocuments[0].fileName}</span>
                  <StatusBadge status={activeDocuments[0].status} />
                </Link>
              )}
            </div>
          </div>
        </section>

        <section aria-label="Business KPI summary" className="grid overflow-hidden border bg-card sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total documents" value={documents.length} detail={`${processingCount} currently in progress`} icon={Files} />
          <Metric label="Processed value" value={formatMoney(totalValueVnd, "VND")} detail={`USD converted at ${DEMO_USD_TO_VND.toLocaleString()}:1 for demo`} icon={Banknote} />
          <Metric label="Needs attention" value={attentionCount} detail={`${reviewCount} review · ${failedCount} failed · ${correctedCount} corrected`} icon={AlertTriangle} alert={attentionCount > 0} />
          <Metric label="Data confidence" value={`${averageConfidence}%`} detail={`${completionRate}% of records ready to use`} icon={Gauge} alert={averageConfidence < 80} />
        </section>

        <div className="grid min-w-0 items-stretch gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/25">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Processing analytics</div><CardTitle className="mt-1">Document volume trend</CardTitle><p className="mt-1 text-xs text-muted-foreground">{trendTotal} documents · {trendSuccessRate}% extracted without exception</p></div>
                <div className="flex border" aria-label="Trend window">
                  {(["30d", "90d", "6m"] as TrendWindow[]).map((window) => (
                    <button key={window} type="button" onClick={() => setTrendWindow(window)} className={`min-h-9 min-w-12 border-r px-3 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors last:border-r-0 ${trendWindow === window ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>{window}</button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <ChartContainer config={trendConfig} className="h-[270px] w-full aspect-auto">
                <BarChart data={visibleTrend} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="extracted" stackId="volume" fill="var(--color-extracted)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="review" stackId="volume" fill="var(--color-review)" />
                  <Bar dataKey="failed" stackId="volume" fill="var(--color-failed)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
              <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                {Object.entries(trendConfig).map(([key, config]) => <span key={key} className="flex items-center gap-2"><span className="size-2" style={{ backgroundColor: config.color }} />{config.label}</span>)}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/25">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Data quality</div>
              <CardTitle>Confidence distribution</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <ChartContainer config={confidenceConfig} className="h-[158px] w-full aspect-auto">
                <AreaChart data={confidenceDistribution} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs><linearGradient id="confidence-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.45} /><stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.04} /></linearGradient></defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="band" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="band" />} />
                  <Area dataKey="count" type="monotone" stroke="var(--color-count)" fill="url(#confidence-fill)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
              <div className="grid divide-y border-t">
                {confidenceDistribution.map((item) => <div key={item.band} className="flex items-center justify-between py-2 text-xs"><span className="text-muted-foreground">{item.range}</span><span className="font-mono font-medium">{item.count} docs</span></div>)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-5">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/25">
                <div className="flex items-start justify-between gap-4">
                  <div><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Action register</div><CardTitle className="mt-1">Needs attention</CardTitle></div>
                  <Button asChild variant="ghost" size="sm"><Link to="/review">Full queue <ArrowRight className="size-3.5" /></Link></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {attentionQueue.length ? attentionQueue.map((document, index) => (
                  <Link key={document.documentId} to={`/documents/${document.documentId}`} className="group grid gap-3 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40 sm:grid-cols-[32px_1fr_auto] sm:items-center">
                    <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0"><div className="truncate text-sm font-medium group-hover:underline">{document.fileName}</div><div className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge status={document.status} /><span className="text-xs text-muted-foreground">{document.vendorName}</span></div></div>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                )) : (
                  <div className="p-8 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-700" /><div className="mt-3 text-sm font-medium">Queue is clear</div><p className="mt-1 text-xs text-muted-foreground">New exceptions will appear here.</p></div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b bg-muted/25"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Spend concentration</div><CardTitle>Top vendors</CardTitle></CardHeader>
              <CardContent className="grid gap-4 p-5">
                {vendorSpend.map((item, index) => (
                  <div key={item.vendor} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate"><span className="mr-2 font-mono text-muted-foreground">0{index + 1}</span>{item.vendor}</span><span className="shrink-0 font-mono font-medium">{formatMoney(item.amount, "VND")}</span></div>
                    <div className="h-1.5 overflow-hidden bg-muted"><div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(8, (item.amount / maxVendorSpend) * 100)}%` }} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b bg-muted/25">
              <div className="flex items-end justify-between gap-4">
                <div><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Live activity</div><CardTitle className="mt-1">Latest document signals</CardTitle></div>
                <div className="text-right"><div className="font-display text-xl font-semibold tracking-[-0.04em]">{documents.length}</div><div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">visible records</div></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[610px]">
                  <div className="grid grid-cols-[1.5fr_.7fr_.65fr_.75fr] gap-4 border-b px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><span>Document</span><span>Status</span><span className="text-right">Amount</span><span className="text-right">Updated</span></div>
                  {recentDocuments.map((document) => (
                    <Link key={document.documentId} to={`/documents/${document.documentId}`} className="grid grid-cols-[1.5fr_.7fr_.65fr_.75fr] items-center gap-4 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/35">
                      <div className="min-w-0"><div className="truncate text-sm font-medium">{document.fileName}</div><div className="mt-0.5 truncate text-xs text-muted-foreground">{document.vendorName}</div></div>
                      <StatusBadge status={document.status} />
                      <span className="text-right text-sm font-medium">{formatMoney(document.totalAmount, document.currency)}</span>
                      <span className="text-right text-xs text-muted-foreground">{formatDate(document.updatedAt)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {(failedCount > 0 || reviewCount > 0) && (
          <div className="flex flex-col gap-3 border border-orange-200 bg-orange-50 p-4 text-orange-950 dark:border-orange-950 dark:bg-orange-950/30 dark:text-orange-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><div><div className="text-sm font-semibold">Human verification protects the final record.</div><p className="mt-0.5 text-xs opacity-70">Low confidence and failed workflows remain visible until resolved.</p></div></div>
            <Button asChild size="sm" variant="outline" className="border-orange-300 bg-transparent"><Link to="/review">Resolve exceptions</Link></Button>
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
