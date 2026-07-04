"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  FileJson2,
  GitBranch,
  ListChecks,
  Play,
  RefreshCw,
  Route,
  Sparkles,
  XCircle,
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
import { formatDate, workflowSteps, type DocumentRecord } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAdminText } from "@/lib/admin-i18n"

type ExecutionState = "Succeeded" | "Running" | "Failed" | "NeedsReview"
type StepState = "Succeeded" | "Running" | "Skipped" | "Failed" | "Waiting"

const stepOwners: Record<string, string> = {
  QueueJobWithEventBridgeAndSQS: "Ingestion",
  StartStepFunctionsExecution: "Workflow",
  ValidateInput: "Workflow",
  ExtractWithTextract: "AI",
  NormalizeWithAIProxy: "AI",
  ScoreAndUpdateStatus: "AI",
  SaveMetadataToDynamoDB: "Data",
  SaveProcessedJsonToS3: "Data",
  TriggerSnsSesNotification: "Ops",
}

const stateDurations: Record<string, string> = {
  QueueJobWithEventBridgeAndSQS: "320 ms",
  StartStepFunctionsExecution: "480 ms",
  ValidateInput: "220 ms",
  ExtractWithTextract: "4.9 s",
  NormalizeWithAIProxy: "1.6 s",
  ScoreAndUpdateStatus: "260 ms",
  SaveMetadataToDynamoDB: "180 ms",
  SaveProcessedJsonToS3: "210 ms",
  TriggerSnsSesNotification: "780 ms",
}

function executionState(document?: DocumentRecord): ExecutionState {
  if (!document) return "Succeeded"
  if (document.status === "FAILED") return "Failed"
  if (document.status === "PROCESSING" || document.status === "QUEUED" || document.status === "UPLOADED") return "Running"
  if (document.status === "REVIEW_REQUIRED" || document.status === "CORRECTED") return "NeedsReview"
  return "Succeeded"
}

function stateClass(state: ExecutionState | StepState) {
  if (state === "Succeeded") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  }
  if (state === "Running" || state === "Waiting") {
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-200"
  }
  if (state === "NeedsReview" || state === "Skipped") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  }
  return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
}

function stepState(document: DocumentRecord | undefined, step: string): StepState {
  if (!document) return "Succeeded"
  const state = executionState(document)
  if (state === "Failed") {
    if (step === "ExtractWithTextract") return "Failed"
    if (["NormalizeWithAIProxy", "ScoreAndUpdateStatus", "SaveMetadataToDynamoDB", "SaveProcessedJsonToS3", "TriggerSnsSesNotification"].includes(step)) {
      return "Skipped"
    }
    return "Succeeded"
  }
  if (state === "Running") {
    if (document.status === "QUEUED" && workflowSteps.indexOf(step) <= 1) return "Succeeded"
    if (document.status === "QUEUED" && step === "ValidateInput") return "Waiting"
    if (document.status === "PROCESSING" && workflowSteps.indexOf(step) <= 3) return "Succeeded"
    if (document.status === "PROCESSING" && step === "NormalizeWithAIProxy") return "Running"
    return workflowSteps.indexOf(step) < 2 ? "Succeeded" : "Waiting"
  }
  if (state === "NeedsReview" && step === "TriggerSnsSesNotification") return "Succeeded"
  return "Succeeded"
}

function stepIcon(state: StepState) {
  if (state === "Succeeded") return CheckCircle2
  if (state === "Running" || state === "Waiting") return Clock3
  if (state === "Skipped") return RefreshCw
  return XCircle
}

function executionName(document?: DocumentRecord) {
  if (!document) return ""
  const dateStr = document.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  return `docuflow-${document.documentId}-${dateStr}`
}

function confidenceBreakdown(document?: DocumentRecord) {
  if (!document) return []
  const textract = Math.max(0, Math.round((document.confidenceScore || 0) * 100))
  const completeness = document.reviewReasonCodes?.length ? Math.max(36, 92 - document.reviewReasonCodes.length * 18) : 96
  const schema = document.status === "FAILED" ? 0 : document.taxAmount == null ? 78 : 94
  return [
    { label: "Textract confidence", value: textract },
    { label: "Required field completeness", value: completeness },
    { label: "Normalized schema validity", value: schema },
  ]
}

export default function AdminWorkflowPage() {
  const a = useAdminText()
  const { documents } = useDocuFlowDocuments()
  const [selectedId, setSelectedId] = useState("")
  const activeId = selectedId || documents[0]?.documentId || ""
  const selected = documents.find((document) => document.documentId === activeId) ?? documents[0]
  const executions = useMemo(
    () =>
      documents.map((document) => ({
        document,
        state: executionState(document),
        name: executionName(document),
      })),
    [documents]
  )
  const succeeded = executions.filter((execution) => execution.state === "Succeeded").length
  const running = executions.filter((execution) => execution.state === "Running").length
  const failed = executions.filter((execution) => execution.state === "Failed").length
  const review = executions.filter((execution) => execution.state === "NeedsReview").length
  const selectedState = selected ? executionState(selected) : "Succeeded"
  const selectedSteps = workflowSteps.map((step) => ({
    step,
    state: stepState(selected, step),
  }))
  const finishedSteps = selectedSteps.filter((step) => step.state === "Succeeded").length
  const progress = Math.round((finishedSteps / selectedSteps.length) * 100)

  if (documents.length === 0) {
    return (
      <div className="grid gap-5 px-4 py-6 lg:px-6">
        <section>
          <div className="relative overflow-hidden rounded-2xl border bg-[#10261d] text-white shadow-lg p-8">
            <h2 className="font-display text-2xl font-semibold leading-tight">{a("No workflow executions yet")}</h2>
            <p className="mt-2 text-sm text-white/70">
              {a("Upload a document from the document workspace to start an AWS Step Functions execution.")}
            </p>
            <div className="mt-4">
              <Button asChild className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f] font-semibold">
                <Link to="/upload">{a("Upload document")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    )
  }

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
                  {a("State machine")}
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  AWS Step Functions
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                {a("Execution history with AI and persistence diagnostics.")}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                {a("Track every document through validation, Textract extraction, AI normalization, confidence scoring, DynamoDB metadata, S3 result JSON, and notification catch paths.")}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] font-semibold text-[#10261d] hover:bg-[#c7ee5f] transition-colors duration-200">
                  <Link to="/admin/observability">
                    {a("Metrics & logs")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10">
                  <Link to="/admin/observability">
                    {a("Open logs and traces")}
                    <Route className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Succeeded", value: succeeded, icon: CheckCircle2 },
                { label: "Running", value: running, icon: Play },
                { label: "Needs review", value: review, icon: AlertTriangle },
                { label: "Failed", value: failed, icon: XCircle },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">SFN</span>
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

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-5" />
              {a("Execution list")}
            </CardTitle>
            <CardDescription>
              {a("Select an execution to inspect state progress and data artifacts.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[780px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>{a("Execution")}</TableHead>
                    <TableHead>{a("Document")}</TableHead>
                    <TableHead>{a("State")}</TableHead>
                    <TableHead>{a("Updated")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution, index) => (
                    <TableRow key={`${execution.document.documentId}-${index}`} className={selected?.documentId === execution.document.documentId ? "bg-muted/35" : undefined}>
                      <TableCell>
                        <div className="font-mono text-xs">{execution.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{a("Standard workflow")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{execution.document.originalFileName}</div>
                        <div className="text-xs text-muted-foreground">{execution.document.documentId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stateClass(execution.state)}>
                          {a(execution.state)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(execution.document.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedId(execution.document.documentId)}>
                          {a("Inspect")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" />
                  {a("State history")}
                </CardTitle>
                <CardDescription>{selected.documentId} - {executionName(selected)}</CardDescription>
              </div>
              <Badge variant="outline" className={stateClass(selectedState)}>
                {a(selectedState)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{a("Completed states")}</span>
                <span className="font-mono text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="grid gap-3">
              {selectedSteps.map((item, index) => {
                const Icon = stepIcon(item.state)
                return (
                  <div key={item.step} className="grid gap-3 border p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-start">
                    <div className="flex size-8 items-center justify-center border bg-background">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                        <span className="font-medium [overflow-wrap:anywhere]">{item.step}</span>
                        <Badge variant="secondary">{a(stepOwners[item.step])}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {a("Duration target:")} {stateDurations[item.step]}
                      </div>
                    </div>
                    <Badge variant="outline" className={stateClass(item.state)}>
                      {a(item.state)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              {a("AI extraction diagnostics")}
            </CardTitle>
            <CardDescription>
              {a("Textract and AI Proxy evidence for the selected document.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
            {confidenceBreakdown(selected).map((item) => (
              <div key={item.label} className="border p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{a(item.label)}</span>
                  <span className="font-mono text-muted-foreground">{item.value}%</span>
                </div>
                <Progress value={item.value} />
              </div>
            ))}
            <div className="border p-4 md:col-span-3">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <Braces className="size-4" />
                {a("Normalized response contract")}
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">{a("AI provider")}</div>
                  <div className="mt-1 font-medium">{selected.aiProvider}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{a("Normalization")}</div>
                  <div className="mt-1 break-all font-medium">{selected.normalizationMethod}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{a("Review reasons")}</div>
                  <div className="mt-1 font-medium">{selected.reviewReasonCodes.length || a("None")}</div>
                </div>
              </div>
              {selected.reviewReasonCodes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.reviewReasonCodes.map((reason) => (
                    <Badge key={reason} variant="outline" className="border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300">
                      {reason}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              {a("Persistence outputs")}
            </CardTitle>
            <CardDescription>
              {a("DynamoDB metadata and processed result object targets.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 text-sm">
            <div>
              <div className="mb-1 text-muted-foreground">{a("DynamoDB key")}</div>
              <div className="break-all border bg-muted/25 p-3 font-mono">
                PK=USER#{selected.userId} / SK=DOC#{selected.documentId}
              </div>
            </div>
            <div>
              <div className="mb-1 text-muted-foreground">{a("S3 processed result")}</div>
              <div className="break-all border bg-muted/25 p-3 font-mono">{selected.processedS3Key}</div>
            </div>
            <div>
              <div className="mb-1 text-muted-foreground">{a("Result status")}</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={stateClass(selectedState)}>
                  {a(selectedState)}
                </Badge>
                <Badge variant="secondary">{selected.documentType}</Badge>
                <Badge variant="secondary">{selected.currency}</Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to={`/documents/${selected.documentId}`}>
                {a("Open document detail")}
                <FileJson2 className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
