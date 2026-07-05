"use client"

import { Link } from "react-router-dom"
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  FileText,
  Gauge,
  MailWarning,
  RadioTower,
  RefreshCw,
  Route,
  Search,
  ServerCog,
  Timer,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useDocumentsSync } from "@/hooks/use-documents-sync"
import { useAdminText } from "@/lib/admin-i18n"

type AlarmState = "OK" | "ALARM" | "INSUFFICIENT_DATA"
type LogLevel = "INFO" | "WARN" | "ERROR"

const observabilitySignals = [
  { label: "Lambda errors", value: "1", detail: "Last 24h", icon: AlertTriangle, tone: "warning" },
  { label: "Step Functions failed", value: "1", detail: "Failure path captured", icon: Route, tone: "warning" },
  { label: "DLQ depth", value: "0", detail: "Processing DLQ", icon: RadioTower, tone: "success" },
  { label: "Trace coverage", value: "86%", detail: "API + Lambda", icon: Search, tone: "success" },
]

const alarms: Array<{ name: string; state: AlarmState; threshold: string; action: string }> = [
  {
    name: "docuflow-workflow-failed-executions",
    state: "ALARM",
    threshold: ">= 1 failed execution",
    action: "SNS topic docuflow-admin-alerts",
  },
  {
    name: "docuflow-processing-dlq-visible",
    state: "OK",
    threshold: "DLQ depth > 0",
    action: "Email ops owner",
  },
  {
    name: "docuflow-ai-proxy-errors",
    state: "OK",
    threshold: "Lambda Errors >= 1",
    action: "Open AI diagnostic logs",
  },
  {
    name: "docuflow-low-confidence-results",
    state: "OK",
    threshold: "REVIEW_REQUIRED >= 1",
    action: "Notify Finance review queue",
  },
  {
    name: "docuflow-budget-threshold",
    state: "INSUFFICIENT_DATA",
    threshold: "$5 / $10 / $20",
    action: "Pause uploads and prepare cleanup",
  },
]

const logs: Array<{ time: string; level: LogLevel; component: string; documentId: string; message: string }> = [
  {
    time: "2026-06-24T08:45:36Z",
    level: "ERROR",
    component: "ExtractWithTextract",
    documentId: "doc-004",
    message: "AnalyzeExpense returned unreadable image confidence below threshold",
  },
  {
    time: "2026-06-24T08:31:10Z",
    level: "WARN",
    component: "ScoreAndUpdateStatus",
    documentId: "doc-002",
    message: "taxAmount missing and currency confidence is low; status set to REVIEW_REQUIRED",
  },
  {
    time: "2026-06-24T08:13:18Z",
    level: "INFO",
    component: "SaveProcessedJsonToS3",
    documentId: "doc-001",
    message: "Processed result JSON saved and metadata status set to EXTRACTED",
  },
  {
    time: "2026-06-24T09:05:16Z",
    level: "INFO",
    component: "StartStepFunctionsExecution",
    documentId: "doc-006",
    message: "Workflow execution started from SQS message",
  },
]

const traces = [
  { segment: "API Gateway /documents/upload-url", p50: 82, p95: 180, errors: 0 },
  { segment: "UploadUrlLambda", p50: 124, p95: 260, errors: 0 },
  { segment: "JobStarterLambda", p50: 211, p95: 580, errors: 0 },
  { segment: "AIProxyLambda", p50: 1180, p95: 3100, errors: 1 },
  { segment: "StatusWriterLambda", p50: 96, p95: 190, errors: 0 },
]

function alarmClass(state: AlarmState) {
  if (state === "OK") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  }
  if (state === "ALARM") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-500/10 dark:text-slate-200"
}

function levelClass(level: LogLevel) {
  if (level === "ERROR") return "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300"
  if (level === "WARN") return "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300"
  return "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
}

function signalClass(tone: string) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
  }
  return "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
}

export default function AdminObservabilityPage() {
  const a = useAdminText()
  const { documents, mergeDocuments } = useDocuFlowDocuments()
  const { apiMode, isSyncing, refreshDocuments, syncError, syncMessage } = useDocumentsSync(mergeDocuments, { loadAllPages: true })
  const alarmCount = alarms.filter((alarm) => alarm.state === "ALARM").length
  const okCount = alarms.filter((alarm) => alarm.state === "OK").length
  const failedDocuments = documents.filter((document) => document.status === "FAILED").length
  const reviewDocuments = documents.filter((document) => document.status === "REVIEW_REQUIRED").length
  const health = Math.round((okCount / alarms.length) * 100)

  return (
    <>
      <section className="px-4 lg:px-6">
        <div className="relative overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          {/* Decorative circles to match Dashboard hero */}
          <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-4 -top-12 size-52 rounded-full border border-[#d8ff72]/20" />

          <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="relative p-5 sm:p-7">
              <div className="absolute inset-y-0 right-0 hidden w-px bg-white/12 lg:block" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/30 bg-[#d8ff72] font-semibold text-[11px] text-[#10261d]">
                  CloudWatch + X-Ray
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  {a("Alert evidence")}
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  {apiMode ? a("Live API sync") : a("Local demo")}
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                {a("Logs, traces, alarms, and delivery status in one admin view.")}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                {a("Use this page to prove observability for happy path, low-confidence path, failed workflow path, DLQ depth, and SNS/SES alert routing.")}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] font-semibold text-[#10261d] hover:bg-[#c7ee5f] transition-colors duration-200">
                  <Link to="/settings/notifications">
                    {a("Alert settings")}
                    <BellRing className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10">
                  <Link to="/evidence">
                    {a("Evidence packet")}
                    <Route className="size-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10"
                  onClick={() => void refreshDocuments()}
                  disabled={isSyncing}
                >
                  <RefreshCw className={isSyncing ? "size-4 animate-spin" : "size-4"} />
                  {a("Refresh data")}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Alarm state", value: alarmCount, icon: AlertTriangle },
                { label: "Log health", value: `${health}%`, icon: Gauge },
                { label: "Failed docs", value: failedDocuments, icon: FileText },
                { label: "Review alerts", value: reviewDocuments, icon: MailWarning },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">OBS</span>
                    </div>
                    <div className="text-3xl font-semibold text-white">{item.value}</div>
                    <div className="mt-1 text-xs text-white/50">{a(item.label)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 px-4 sm:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {observabilitySignals.map((signal) => {
          const Icon = signal.icon
          return (
            <div key={signal.label} className={`border p-4 ${signalClass(signal.tone)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-60">{a(signal.label)}</div>
                  <div className="mt-2 text-3xl font-semibold">{signal.value}</div>
                </div>
                <div className="border bg-background/70 p-2">
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-3 text-xs opacity-70">{a(signal.detail)}</div>
            </div>
          )
        })}
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-5" />
              {a("CloudWatch alarm board")}
            </CardTitle>
            <CardDescription>
              {a("Alarm definitions mapped to reviewer evidence and first response action.")}
              {syncMessage && <span className="ml-2 text-primary">{syncMessage}</span>}
              {syncError && <span className="ml-2 text-destructive">{syncError}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>{a("Alarm")}</TableHead>
                    <TableHead>{a("State")}</TableHead>
                    <TableHead>{a("Threshold")}</TableHead>
                    <TableHead>{a("Action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alarms.map((alarm) => (
                    <TableRow key={alarm.name}>
                      <TableCell className="font-mono text-xs">{alarm.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={alarmClass(alarm.state)}>
                          {alarm.state}
                        </Badge>
                      </TableCell>
                      <TableCell>{a(alarm.threshold)}</TableCell>
                      <TableCell className="text-muted-foreground">{a(alarm.action)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-5" />
              {a("Monitoring readiness")}
            </CardTitle>
            <CardDescription>{a("OK alarms divided by expected alarms.")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{a("Alarm readiness")}</span>
                <span className="font-mono text-muted-foreground">{health}%</span>
              </div>
              <Progress value={health} />
            </div>
            <div className="grid grid-cols-3 border">
              <div className="border-r p-3">
                <div className="text-2xl font-semibold">{okCount}</div>
                <div className="mt-1 text-xs text-muted-foreground">OK</div>
              </div>
              <div className="border-r p-3">
                <div className="text-2xl font-semibold">{alarmCount}</div>
                <div className="mt-1 text-xs text-muted-foreground">{a("Alarm")}</div>
              </div>
              <div className="p-3">
                <div className="text-2xl font-semibold">1</div>
                <div className="mt-1 text-xs text-muted-foreground">{a("Pending")}</div>
              </div>
            </div>
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              {a("Keep one failed workflow alarm visible for the demo, then show the matching log event and review queue item.")}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="size-5" />
              {a("Structured log stream")}
            </CardTitle>
            <CardDescription>
              {a("Logs must include documentId, component/state name, status, and error context.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {logs.map((log) => (
              <div key={`${log.time}-${log.component}`} className="grid gap-3 border p-4 md:grid-cols-[82px_minmax(0,1fr)_auto] md:items-start">
                <Badge variant="outline" className={levelClass(log.level)}>
                  {log.level}
                </Badge>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{log.component}</span>
                    <Badge variant="secondary">{log.documentId}</Badge>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{a(log.message)}</div>
                </div>
                <div className="font-mono text-xs text-muted-foreground">{formatDate(log.time)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              {a("X-Ray trace summary")}
            </CardTitle>
            <CardDescription>
              {a("Trace latency and error hints for API, Lambda, workflow starter, and AI proxy.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {traces.map((trace) => (
              <div key={trace.segment} className="border p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{trace.segment}</div>
                    <div className="mt-1 text-xs text-muted-foreground">p50 {trace.p50} ms - p95 {trace.p95} ms</div>
                  </div>
                  <Badge variant="outline" className={trace.errors ? alarmClass("ALARM") : alarmClass("OK")}>
                    {trace.errors} {a(trace.errors === 1 ? "error" : "errors")}
                  </Badge>
                </div>
                <Progress value={Math.min(100, Math.round((trace.p95 / 3200) * 100))} />
              </div>
            ))}
            <div className="flex items-start gap-3 border bg-muted/25 p-4 text-sm leading-6">
              <Timer className="mt-0.5 size-4 shrink-0" />
              {a("AI Proxy is the expected slowest segment; timeout and rate-limit evidence belongs in Workflow and Evidence.")}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
