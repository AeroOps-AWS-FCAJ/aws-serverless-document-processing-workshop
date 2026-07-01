"use client"

import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Cloud,
  FileInput,
  Inbox,
  ListRestart,
  RadioTower,
  Route,
  ShieldAlert,
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
import { formatDate, statusMeta, type DocumentRecord } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

type QueueState = "Healthy" | "Watch" | "Missing"

const ingestionStages = [
  {
    name: "S3 Raw Bucket",
    service: "docuflow-dev-raw",
    signal: "ObjectCreated",
    status: "Healthy" as QueueState,
    icon: Cloud,
    detail: "Raw files land under raw/{userId}/{documentId}/original.* with public access blocked.",
  },
  {
    name: "EventBridge Rule",
    service: "docuflow-raw-object-created",
    signal: "S3 event routed",
    status: "Healthy" as QueueState,
    icon: RadioTower,
    detail: "Filters raw bucket events and forwards document jobs to the processing queue.",
  },
  {
    name: "SQS Processing Queue",
    service: "docuflow-dev-processing-queue",
    signal: "Visible: 1",
    status: "Watch" as QueueState,
    icon: Inbox,
    detail: "Buffers async jobs before Job Starter Lambda starts a Step Functions execution.",
  },
  {
    name: "Dead Letter Queue",
    service: "docuflow-dev-processing-dlq",
    signal: "Depth: 0",
    status: "Healthy" as QueueState,
    icon: ShieldAlert,
    detail: "Receives jobs that exhaust retries. A non-zero depth must become demo evidence.",
  },
  {
    name: "Job Starter Lambda",
    service: "docuflow-dev-start-job",
    signal: "Poller enabled",
    status: "Healthy" as QueueState,
    icon: ListRestart,
    detail: "Reads queue messages, enforces idempotency, and starts one workflow execution per document.",
  },
]

const replayChecklist = [
  "Confirm the raw S3 object exists and the key matches the DynamoDB documentId.",
  "Check the SQS message body for userId, documentId, s3RawPath, and contentType.",
  "Inspect Job Starter Lambda logs before replaying a DLQ message.",
  "Replay only one message during demo to avoid duplicate Step Functions executions.",
]

function stateClass(state: QueueState) {
  if (state === "Healthy") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  }
  if (state === "Watch") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  }
  return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
}

function messageState(document: DocumentRecord) {
  if (document.status === "FAILED") return "DLQ candidate"
  if (document.status === "QUEUED") return "Queued"
  if (document.status === "PROCESSING") return "In flight"
  return "Delivered"
}

function messageStateClass(state: string) {
  if (state === "Delivered") return "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
  if (state === "In flight") return "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300"
  if (state === "Queued") return "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300"
  return "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300"
}

export default function AdminIngestionPage() {
  const { documents } = useDocuFlowDocuments()
  const queued = documents.filter((document) => document.status === "QUEUED").length
  const processing = documents.filter((document) => document.status === "PROCESSING").length
  const failed = documents.filter((document) => document.status === "FAILED").length
  const healthyStages = ingestionStages.filter((stage) => stage.status === "Healthy").length
  const readiness = Math.round((healthyStages / ingestionStages.length) * 100)
  const messages = [...documents]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 6)

  return (
    <>
      <section className="px-4 lg:px-6">
        <div className="relative overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg">
          {/* Decorative circles to match Dashboard hero */}
          <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-4 -top-12 size-52 rounded-full border border-[#d8ff72]/20" />

          <div className="relative grid lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="relative p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/30 bg-[#d8ff72] font-semibold text-[11px] text-[#10261d]">
                  Event ingress
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  S3 - EventBridge - SQS
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                Queue buffer visibility before every workflow execution.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                This page covers the missing ingestion evidence path: raw object event,
                queue message, DLQ depth, and safe replay instructions.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] font-semibold text-[#10261d] hover:bg-[#c7ee5f] transition-colors duration-200">
                  <Link to="/admin/workflow">
                    Open workflow monitor
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10">
                  <Link to="/evidence">
                    Evidence packet
                    <Route className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Ingress ready", value: `${readiness}%`, icon: CheckCircle2 },
                { label: "Queued jobs", value: queued, icon: Inbox },
                { label: "In flight", value: processing, icon: Clock3 },
                { label: "Failure path", value: failed, icon: AlertTriangle },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">ING</span>
                    </div>
                    <div className="text-3xl font-semibold text-white">{item.value}</div>
                    <div className="mt-1 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1.2fr)_360px] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Route className="size-5" />
              Ingestion rail
            </CardTitle>
            <CardDescription>
              The exact admin-approved event path before processing starts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {ingestionStages.map((stage, index) => {
              const Icon = stage.icon
              return (
                <div key={stage.name} className="grid gap-3 border p-4 md:grid-cols-[42px_minmax(0,1fr)_auto] md:items-start">
                  <div className="flex size-10 items-center justify-center border bg-muted/30">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                      <span className="font-medium">{stage.name}</span>
                      <Badge variant="secondary">{stage.signal}</Badge>
                    </div>
                    <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{stage.service}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">{stage.detail}</div>
                  </div>
                  <Badge variant="outline" className={stateClass(stage.status)}>
                    {stage.status}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle>Queue readiness</CardTitle>
              <CardDescription>Healthy stages divided by expected stages.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Ingress control</span>
                  <span className="font-mono text-muted-foreground">{readiness}%</span>
                </div>
                <Progress value={readiness} />
              </div>
              <div className="grid grid-cols-3 border">
                <div className="border-r p-3">
                  <div className="text-2xl font-semibold">{healthyStages}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Healthy</div>
                </div>
                <div className="border-r p-3">
                  <div className="text-2xl font-semibold">1</div>
                  <div className="mt-1 text-xs text-muted-foreground">Watch</div>
                </div>
                <div className="p-3">
                  <div className="text-2xl font-semibold">0</div>
                  <div className="mt-1 text-xs text-muted-foreground">Missing</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <ListRestart className="size-5" />
                Safe replay checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {replayChecklist.map((item) => (
                <div key={item} className="flex items-start gap-3 border p-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <FileInput className="size-5" />
              Recent ingestion messages
            </CardTitle>
            <CardDescription>
              Demo projection of queue messages derived from current document records.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Raw object</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((document, index) => {
                    const state = messageState(document)
                    const meta = statusMeta[document.status]
                    const Icon = meta.icon
                    return (
                      <TableRow key={`${document.documentId}-${index}`}>
                        <TableCell className="font-mono">msg-{String(index + 1).padStart(3, "0")}</TableCell>
                        <TableCell>
                          <div className="font-medium">{document.fileName}</div>
                          <div className="text-xs text-muted-foreground">{document.documentId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.tone}>
                            <Icon className="size-3.5" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={messageStateClass(state)}>
                            {state}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <div className="truncate font-mono text-xs text-muted-foreground">{document.s3RawPath}</div>
                        </TableCell>
                        <TableCell>{formatDate(document.updatedAt)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
