"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CloudOff,
  FileKey2,
  KeyRound,
  LockKeyhole,
  ScrollText,
  Settings2,
  ShieldCheck,
  Trash2,
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
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { costGuardrails, teamModules } from "@/lib/docuflow-data"
import { useAdminText } from "@/lib/admin-i18n"

type ControlState = "Ready" | "Watch" | "Missing"

const controls: Array<{
  area: string
  service: string
  control: string
  state: ControlState
  owner: string
}> = [
  {
    area: "Identity",
    service: "IAM",
    control: "Separate Lambda, Step Functions, and alert roles with least privilege policies.",
    state: "Ready",
    owner: "Duong",
  },
  {
    area: "Encryption",
    service: "KMS",
    control: "Raw and processed data use encrypted storage for sensitive finance artifacts.",
    state: "Ready",
    owner: "Duong",
  },
  {
    area: "Secrets",
    service: "Secrets Manager",
    control: "External AI API key is backend-only and never exposed to frontend or logs.",
    state: "Ready",
    owner: "Tai + Duong",
  },
  {
    area: "Storage",
    service: "S3 Block Public Access",
    control: "Raw and processed buckets stay private; uploads use presigned URL only.",
    state: "Ready",
    owner: "Tra + Duong",
  },
  {
    area: "Audit",
    service: "CloudTrail",
    control: "AWS API activity is captured for reviewer and cleanup evidence.",
    state: "Watch",
    owner: "Duong",
  },
  {
    area: "Cost",
    service: "AWS Budgets",
    control: "Workshop guardrails at $5, $10, and $20 are configured before demo traffic.",
    state: "Watch",
    owner: "Duong",
  },
  {
    area: "Cleanup",
    service: "AWS SAM",
    control: "Stack delete command and resource-leftover check are captured after demo.",
    state: "Missing",
    owner: "Duong + Tra",
  },
]

const cleanupSteps = [
  {
    label: "Export evidence before deleting resources",
    command: "pnpm --filter docuflow-ai-web run build",
    checked: true,
  },
  {
    label: "Delete SAM stack",
    command: "sam delete --stack-name docuflow-ai-dev --region ap-southeast-1",
    checked: false,
  },
  {
    label: "Verify S3 raw and processed buckets are empty or deleted",
    command: "aws s3 ls | findstr docuflow",
    checked: false,
  },
  {
    label: "Confirm Step Functions, SQS, EventBridge, and Lambda resources are removed",
    command: "aws cloudformation describe-stacks --stack-name docuflow-ai-dev",
    checked: false,
  },
  {
    label: "Capture final Billing/Budgets screen",
    command: "Open AWS Billing console and screenshot remaining spend",
    checked: false,
  },
]

const secretRules = [
  "No external AI key in frontend source code.",
  "No secret values in Git history, README, screenshots, or CloudWatch logs.",
  "AI Proxy receives extracted fields, not raw PDF/image, unless the team approves a payload change.",
  "Secrets Manager read permission is scoped to AI Proxy Lambda only.",
]

function stateClass(state: ControlState) {
  if (state === "Ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  }
  if (state === "Watch") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  }
  return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
}

export default function AdminGovernancePage() {
  const a = useAdminText()
  const [cleanupChecks, setCleanupChecks] = useState(() => cleanupSteps.map((step) => step.checked))
  const ready = controls.filter((control) => control.state === "Ready").length
  const watch = controls.filter((control) => control.state === "Watch").length
  const missing = controls.filter((control) => control.state === "Missing").length
  const readiness = Math.round((ready / controls.length) * 100)
  const cleanupDone = cleanupChecks.filter(Boolean).length
  const cleanupReadiness = Math.round((cleanupDone / cleanupSteps.length) * 100)
  const setCleanupChecked = (index: number, checked: boolean) => {
    setCleanupChecks((current) => current.map((value, itemIndex) => itemIndex === index ? checked : value))
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
                  {a("Security and cost")}
                </Badge>
                <Badge variant="outline" className="border-white/15 bg-white/8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                  IAM / KMS / Secrets / Budgets
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                {a("Governance controls before the demo and cleanup after it.")}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                {a("This page turns security, audit, spend, and SAM delete requirements into a concrete admin checklist with owner and evidence state.")}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#d8ff72] font-semibold text-[#10261d] hover:bg-[#c7ee5f] transition-colors duration-200">
                  <Link to="/evidence">
                    {a("Open evidence packet")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10">
                  <Link to="/settings/notifications">
                    {a("Configure notifications")}
                    <Settings2 className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 lg:border-l lg:border-t-0">
              {[
                { label: "Control ready", value: `${readiness}%`, icon: ShieldCheck },
                { label: "Ready", value: ready, icon: CheckCircle2 },
                { label: "Watch", value: watch, icon: AlertTriangle },
                { label: "Missing", value: missing, icon: CloudOff },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">GOV</span>
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

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              {a("Control matrix")}
            </CardTitle>
            <CardDescription>
              {a("Required security, audit, cost, and cleanup controls from the approved architecture.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[940px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>{a("Area")}</TableHead>
                    <TableHead>{a("Service")}</TableHead>
                    <TableHead>{a("Control")}</TableHead>
                    <TableHead>{a("Owner")}</TableHead>
                    <TableHead>{a("State")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((control) => (
                    <TableRow key={`${control.area}-${control.service}`}>
                      <TableCell>
                        <Badge variant="secondary">{a(control.area)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{control.service}</TableCell>
                      <TableCell className="text-muted-foreground">{a(control.control)}</TableCell>
                      <TableCell>{control.owner}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stateClass(control.state)}>
                          {a(control.state)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="size-5" />
                {a("Governance readiness")}
              </CardTitle>
              <CardDescription>{a("Ready controls divided by expected controls.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 pt-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{a("Control readiness")}</span>
                  <span className="font-mono text-muted-foreground">{readiness}%</span>
                </div>
                <Progress value={readiness} />
              </div>
              <div className="grid grid-cols-3 border">
                <div className="border-r p-3">
                  <div className="text-2xl font-semibold">{ready}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{a("Ready")}</div>
                </div>
                <div className="border-r p-3">
                  <div className="text-2xl font-semibold">{watch}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{a("Watch")}</div>
                </div>
                <div className="p-3">
                  <div className="text-2xl font-semibold">{missing}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{a("Missing")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-5" />
                {a("Secret hygiene rules")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {secretRules.map((rule) => (
                <div key={rule} className="flex items-start gap-3 border p-3 text-sm leading-6">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{a(rule)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="size-5" />
              {a("Cleanup checklist")}
            </CardTitle>
            <CardDescription>
              {a("Demo resources should be deleted only after evidence is captured.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{a("Cleanup readiness")}</span>
                <span className="font-mono text-muted-foreground">{cleanupReadiness}%</span>
              </div>
              <Progress value={cleanupReadiness} />
            </div>
            <div className="grid gap-3">
              {cleanupSteps.map((step, index) => (
                <div key={step.label} className="grid gap-3 border p-4 sm:grid-cols-[32px_minmax(0,1fr)]">
                  <Checkbox
                    checked={cleanupChecks[index]}
                    onCheckedChange={(value) => setCleanupChecked(index, value === true)}
                    aria-label={a(step.label)}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">0{index + 1}</Badge>
                      <span className="font-medium">{a(step.label)}</span>
                    </div>
                    <div className="mt-2 break-all border bg-muted/25 p-2 font-mono text-xs text-muted-foreground">
                      {step.command}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="size-5" />
                {a("Cost guardrails")}
              </CardTitle>
              <CardDescription>
                {a("Limits that keep the workshop inside expected AWS credits.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
              {costGuardrails.map((item) => (
                <div key={item.item} className="border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{a(item.item)}</div>
                    <Badge variant="outline">{a(item.owner)}</Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">{a(item.value)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <FileKey2 className="size-5" />
                {a("Ownership proof")}
              </CardTitle>
              <CardDescription>
                {a("Admin-facing mapping for reviewer questions about service responsibility.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {teamModules.map((module) => (
                <div key={module.member} className="grid gap-2 border p-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
                  <div>
                    <div className="font-medium">{module.member}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{a(module.module)}</div>
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground">{a(module.focus)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="size-5" />
                {a("Audit evidence target")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 text-sm">
              <div className="flex items-start gap-3 border p-3">
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>{a("Capture CloudTrail lookup for stack deploy/delete and Secrets Manager read permission review.")}</span>
              </div>
              <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{a("Cleanup evidence remains missing until `sam delete` output and leftover resource checks are captured.")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
