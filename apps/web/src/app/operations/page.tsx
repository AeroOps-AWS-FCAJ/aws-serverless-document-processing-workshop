"use client"

import { Link } from "react-router-dom"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Braces,
  CheckCircle2,
  CircleDollarSign,
  Cloud,
  Database,
  FileJson2,
  GitBranch,
  KeyRound,
  Layers3,
  LockKeyhole,
  MailWarning,
  RadioTower,
  Route,
  Shield,
  TimerReset,
  WalletCards,
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
import {
  apiContracts,
  architectureServices,
  costGuardrails,
  operationalChecks,
  teamModules,
  workflowSteps,
} from "@/lib/docuflow-data"

const iamRoles = [
  "docuflow-dev-upload-lambda-role",
  "docuflow-dev-start-job-lambda-role",
  "docuflow-dev-processing-role",
  "docuflow-dev-status-lambda-role",
  "docuflow-dev-alert-role",
]

const workflowGroups = [
  {
    label: "Ingest",
    icon: Cloud,
    steps: ["QueueJobWithEventBridgeAndSQS", "StartStepFunctionsExecution", "ValidateInput"],
    tone: "border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-100",
  },
  {
    label: "Extract",
    icon: FileJson2,
    steps: ["ExtractWithTextract", "NormalizeWithAIProxy", "ScoreAndUpdateStatus"],
    tone: "border-lime-200 bg-lime-50 text-lime-950 dark:border-lime-900 dark:bg-lime-500/10 dark:text-lime-100",
  },
  {
    label: "Persist",
    icon: Database,
    steps: ["SaveMetadataToDynamoDB", "SaveProcessedJsonToS3"],
    tone: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100",
  },
  {
    label: "Notify",
    icon: RadioTower,
    steps: ["TriggerSnsSesNotification"],
    tone: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100",
  },
]

const runbookActions = [
  {
    trigger: "Step Functions failed execution",
    firstCheck: "Open execution graph and inspect the failing Lambda input/output.",
    owner: "Ops + AI",
  },
  {
    trigger: "Low-confidence result",
    firstCheck: "Confirm the document appears in Review queue with reasons and confidence.",
    owner: "Finance",
  },
  {
    trigger: "DLQ depth above zero",
    firstCheck: "Replay one message after checking the raw S3 object and idempotency key.",
    owner: "Ops",
  },
  {
    trigger: "Budget threshold email",
    firstCheck: "Pause demo uploads, export evidence, then run cleanup if review is complete.",
    owner: "Admin",
  },
]

function checkTone(state: string) {
  if (state === "Healthy" || state === "Enabled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  }
  if (state === "Watch") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-500/10 dark:text-slate-200"
}

function methodTone(method: string) {
  if (method === "POST") return "bg-[#10261d] text-white dark:bg-[#d8ff72] dark:text-[#10261d]"
  return "border-[#10261d]/25 bg-background text-[#10261d] dark:border-white/25 dark:text-white"
}

export default function OperationsPage() {
  const watchChecks = operationalChecks.filter((check) => check.state === "Watch")
  const configuredChecks = operationalChecks.filter((check) => check.state === "Configured" || check.state === "Enabled")
  const guardrailOwners = new Set(costGuardrails.map((item) => item.owner)).size

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
                  Admin runbook
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  Serverless MVP
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                Processing control plane for upload, extraction, review, and cleanup.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                This page turns the workshop architecture into an operator view: what is running,
                what is watched, who owns each layer, and which path to follow when a document fails.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] font-semibold text-[#10261d] hover:bg-[#c7ee5f] transition-colors duration-200">
                  <Link to="/review">
                    Open review queue
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10">
                  <Link to="/settings/notifications">
                    Alert settings
                    <Bell className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-t-0">
              {[
                { label: "Workflow steps", value: workflowSteps.length, icon: GitBranch },
                { label: "Configured checks", value: configuredChecks.length, icon: CheckCircle2 },
                { label: "Watch items", value: watchChecks.length, icon: AlertCircle },
                { label: "Guardrail owners", value: guardrailOwners, icon: Shield },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 odd:border-r sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">OPS</span>
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

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:px-6">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Route className="size-5" />
              Workflow rail
            </CardTitle>
            <CardDescription>
              The actual Step Functions sequence grouped by operator responsibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 sm:p-6">
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {workflowGroups.map((group, groupIndex) => {
                const Icon = group.icon
                return (
                  <div key={group.label} className={`border p-4 ${group.tone}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <Icon className="size-4" />
                        {group.label}
                      </div>
                      <span className="font-mono text-[10px] opacity-60">0{groupIndex + 1}</span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {group.steps.map((step, stepIndex) => (
                        <div key={step} className="border border-current/15 bg-background/70 p-3 text-xs leading-5 text-foreground">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {groupIndex + 1}.{stepIndex + 1}
                          </span>
                          <div className="mt-1 font-medium [overflow-wrap:anywhere]">{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid gap-3 border bg-background p-4 md:grid-cols-3">
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Failure contract</div>
                <div className="mt-1 text-sm font-medium">Catch path updates metadata, processed JSON, and notification state.</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Review contract</div>
                <div className="mt-1 text-sm font-medium">Low confidence remains unresolved until Finance correction or approval.</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Cleanup contract</div>
                <div className="mt-1 text-sm font-medium">Demo resources are deleted after evidence is captured.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Health board
            </CardTitle>
            <CardDescription>
              Signals to check before and during a workshop demo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:p-6">
            {operationalChecks.map((check) => (
              <div key={check.name} className="grid gap-3 border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="font-medium">{check.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{check.value}</div>
                </div>
                <Badge variant="outline" className={checkTone(check.state)}>
                  {check.state}
                </Badge>
              </div>
            ))}
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <TimerReset className="size-4" />
                Current operator note
              </div>
              Step Functions has one watch item. Keep it visible in the demo as the failed-document path,
              then show how Review queue and SNS/SES close the loop.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <MailWarning className="size-5" />
              Incident runbook
            </CardTitle>
            <CardDescription>
              First checks for the failure paths the MVP must demonstrate.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {runbookActions.map((action, index) => (
              <div key={action.trigger} className="border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{action.trigger}</div>
                  <Badge variant="secondary">{action.owner}</Badge>
                </div>
                <div className="mt-3 flex gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="font-mono text-[10px] text-foreground">0{index + 1}</span>
                  <span>{action.firstCheck}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Braces className="size-5" />
              API contract
            </CardTitle>
            <CardDescription>
              Frontend calls API Gateway REST endpoints from the React/Vite SPA.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
            {apiContracts.map((contract) => (
              <div key={contract.path} className="border p-4">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge className={methodTone(contract.method)} variant={contract.method === "GET" ? "outline" : "default"}>
                    {contract.method}
                  </Badge>
                  <span className="break-all font-mono text-sm">{contract.path}</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{contract.purpose}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="size-5" />
              Architecture map
            </CardTitle>
            <CardDescription>
              Services retained in the simplified MVP and the rule attached to each layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {architectureServices.map((item, index) => (
              <div key={`${item.layer}-${item.service}`} className="grid gap-3 border p-4 md:grid-cols-[150px_minmax(0,0.7fr)_minmax(0,1fr)] md:items-start">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <Badge variant="outline">{item.layer}</Badge>
                </div>
                <div className="font-medium">{item.service}</div>
                <div className="text-sm leading-6 text-muted-foreground">{item.rule}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Security ownership
              </CardTitle>
              <CardDescription>
                Runtime roles stay separate; External AI key is read from AWS Secrets Manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {iamRoles.map((role) => (
                <div key={role} className="flex items-center justify-between gap-3 border p-3">
                  <span className="break-all font-mono text-sm">{role}</span>
                  <Badge variant="outline" className="shrink-0">
                    Least privilege
                  </Badge>
                </div>
              ))}
              <div className="grid gap-3 border bg-muted/25 p-4 text-sm leading-6">
                <div className="flex items-center gap-2 font-medium">
                  <KeyRound className="size-4 text-emerald-700" />
                  Secrets boundary
                </div>
                The frontend never receives the External AI API key. Lambda reads it from Secrets Manager and only sends extracted fields.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="size-5" />
                Cost guardrails
              </CardTitle>
              <CardDescription>
                Bounded usage, small demo inputs, and reliable cleanup.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Budget ladder</span>
                  <span className="text-muted-foreground">$5 / $10 / $20</span>
                </div>
                <Progress value={34} />
              </div>
              {costGuardrails.map((item) => (
                <div key={item.item} className="grid gap-3 border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="font-medium">{item.item}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.value}</div>
                  </div>
                  <Badge variant="outline">{item.owner}</Badge>
                </div>
              ))}
              <div className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
                <CircleDollarSign className="mt-0.5 size-4 shrink-0" />
                Keep demo traffic below the document and page limits before running cleanup.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5" />
              Team ownership
            </CardTitle>
            <CardDescription>
              Five-person split from the updated architecture document.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="overflow-x-auto border">
              <Table className="min-w-[780px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Focus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamModules.map((item) => (
                    <TableRow key={item.member}>
                      <TableCell className="font-medium">{item.member}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.module}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.focus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { label: "Evidence first", value: "Screenshots, logs, traces, and processed JSON before cleanup." },
                { label: "No secret leakage", value: "No API key in frontend, GitHub, CloudWatch, or demo screenshots." },
                { label: "Review loop", value: "Failed and low-confidence outcomes must land in human review or alert evidence." },
              ].map((item) => (
                <div key={item.label} className="border p-4">
                  <div className="font-medium">{item.label}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
