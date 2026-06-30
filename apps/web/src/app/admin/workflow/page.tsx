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
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { documents, formatDate, workflowSteps, type DocumentRecord } from "@/lib/docuflow-data"

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

function executionState(document: DocumentRecord): ExecutionState {
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

function stepState(document: DocumentRecord, step: string): StepState {
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

function executionName(document: DocumentRecord) {
  return `docuflow-${document.documentId}-${document.createdAt.slice(0, 10)}`
}

function confidenceBreakdown(document: DocumentRecord) {
  const textract = Math.max(0, Math.round(document.confidenceScore * 100))
  const completeness = document.reviewReasons.length ? Math.max(36, 92 - document.reviewReasons.length * 18) : 96
  const schema = document.status === "FAILED" ? 0 : document.taxAmount === null ? 78 : 94
  return [
    { label: "Textract confidence", value: textract },
    { label: "Required field completeness", value: completeness },
    { label: "Normalized schema validity", value: schema },
  ]
}

export default function AdminWorkflowPage() {
  const [selectedId, setSelectedId] = useState(documents[0]?.documentId ?? "")
  const selected = documents.find((document) => document.documentId === selectedId) ?? documents[0]
  const executions = useMemo(
    () =>
      documents.map((document) => ({
        document,
        state: executionState(document),
        name: executionName(document),
      })),
    []
  )
  const succeeded = executions.filter((execution) => execution.state === "Succeeded").length
  const running = executions.filter((execution) => execution.state === "Running").length
  const failed = executions.filter((execution) => execution.state === "Failed").length
  const review = executions.filter((execution) => execution.state === "NeedsReview").length
  const selectedState = executionState(selected)
  const selectedSteps = workflowSteps.map((step) => ({
    step,
    state: stepState(selected, step),
  }))
  const finishedSteps = selectedSteps.filter((step) => step.state === "Succeeded").length
  const progress = Math.round((finishedSteps / selectedSteps.length) * 100)

  return (
    <BaseLayout
      title="Workflow"
      description="Admin execution monitor for Step Functions state history, catch paths, Textract, AI Proxy, and persistence outputs."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Step Functions
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  Per-document execution
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                Execution history with AI and persistence diagnostics.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                Track every document through validation, Textract extraction, AI normalization,
                confidence scoring, DynamoDB metadata, S3 result JSON, and notification catch paths.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]">
                  <Link to={`/documents/${selected.documentId}`}>
                    Open selected document
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/admin/observability">
                    Open logs and traces
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
                    <div className="mt-1 text-xs text-white/50">{item.label}</div>
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
              Execution list
            </CardTitle>
            <CardDescription>
              Select an execution to inspect state progress and data artifacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[780px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Execution</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => (
                    <TableRow key={execution.document.documentId} className={selected.documentId === execution.document.documentId ? "bg-muted/35" : undefined}>
                      <TableCell>
                        <div className="font-mono text-xs">{execution.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Standard workflow</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{execution.document.fileName}</div>
                        <div className="text-xs text-muted-foreground">{execution.document.documentId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stateClass(execution.state)}>
                          {execution.state}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(execution.document.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedId(execution.document.documentId)}>
                          Inspect
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
                  State history
                </CardTitle>
                <CardDescription>{selected.documentId} - {executionName(selected)}</CardDescription>
              </div>
              <Badge variant="outline" className={stateClass(selectedState)}>
                {selectedState}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Completed states</span>
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
                        <Badge variant="secondary">{stepOwners[item.step]}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Duration target: {stateDurations[item.step]}
                      </div>
                    </div>
                    <Badge variant="outline" className={stateClass(item.state)}>
                      {item.state}
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
              AI extraction diagnostics
            </CardTitle>
            <CardDescription>
              Textract and AI Proxy evidence for the selected document.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
            {confidenceBreakdown(selected).map((item) => (
              <div key={item.label} className="border p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono text-muted-foreground">{item.value}%</span>
                </div>
                <Progress value={item.value} />
              </div>
            ))}
            <div className="border p-4 md:col-span-3">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <Braces className="size-4" />
                Normalized response contract
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">AI provider</div>
                  <div className="mt-1 font-medium">{selected.aiProvider}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Normalization</div>
                  <div className="mt-1 break-all font-medium">{selected.normalizationMethod}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Review reasons</div>
                  <div className="mt-1 font-medium">{selected.reviewReasons.length || "None"}</div>
                </div>
              </div>
              {selected.reviewReasons.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.reviewReasons.map((reason) => (
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
              Persistence outputs
            </CardTitle>
            <CardDescription>
              DynamoDB metadata and processed result object targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 text-sm">
            <div>
              <div className="mb-1 text-muted-foreground">DynamoDB key</div>
              <div className="break-all border bg-muted/25 p-3 font-mono">
                PK=USER#{selected.userId} / SK=DOC#{selected.documentId}
              </div>
            </div>
            <div>
              <div className="mb-1 text-muted-foreground">S3 processed result</div>
              <div className="break-all border bg-muted/25 p-3 font-mono">{selected.s3ProcessedPath}</div>
            </div>
            <div>
              <div className="mb-1 text-muted-foreground">Result status</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={stateClass(selectedState)}>
                  {selectedState}
                </Badge>
                <Badge variant="secondary">{selected.documentType}</Badge>
                <Badge variant="secondary">{selected.currency}</Badge>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to={`/documents/${selected.documentId}`}>
                Open document detail
                <FileJson2 className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
