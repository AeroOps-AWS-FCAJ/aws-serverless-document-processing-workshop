"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CheckSquare,
  Clipboard,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  Film,
  KeyRound,
  LockKeyhole,
  MailWarning,
  Route,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
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
import {
  architectureServices,
  demoScript,
  testCases,
} from "@/lib/docuflow-data"

type EvidenceStatus = "Captured" | "Ready" | "Missing"
type ArtifactType = "Screenshot" | "AWS Console" | "JSON" | "Command" | "Email" | "Trace"

const definitionOfDone = [
  "Users enter through CloudFront and the frontend deploys successfully with Amplify Hosting",
  "Cognito login works for the demo user",
  "API Gateway REST API calls Lambda for upload/status/result",
  "Presigned URL upload writes to S3 raw bucket",
  "S3 ObjectCreated event routes through EventBridge and SQS/DLQ",
  "Step Functions executes Textract and AI Proxy External AI normalization",
  "Secrets Manager holds the External AI API key",
  "DynamoDB stores metadata and processing status",
  "S3 processed bucket contains result JSON",
  "CloudWatch Logs, X-Ray trace, SNS, and SES email alert evidence are captured",
  "AWS Budgets alerts exist at $5, $10, and $20",
  "Cleanup script removes stack resources",
]

const evidenceArtifacts: Record<string, { status: EvidenceStatus; type: ArtifactType; artifact: string; route: string }> = {
  "TC-01": {
    status: "Captured",
    type: "JSON",
    artifact: "Document detail screenshot + processed/result.json",
    route: "/documents/doc-001",
  },
  "TC-02": {
    status: "Captured",
    type: "AWS Console",
    artifact: "Documents ledger + DynamoDB metadata row",
    route: "/documents",
  },
  "TC-03": {
    status: "Ready",
    type: "Email",
    artifact: "Review queue item + SNS/SES alert screenshot",
    route: "/review",
  },
  "TC-04": {
    status: "Ready",
    type: "Screenshot",
    artifact: "Upload validation screenshot + rejected file note",
    route: "/upload",
  },
  "TC-05": {
    status: "Missing",
    type: "Trace",
    artifact: "Step Functions failed execution + CloudWatch log event",
    route: "/operations",
  },
  "TC-06": {
    status: "Missing",
    type: "Command",
    artifact: "SAM delete output + Amplify cleanup confirmation",
    route: "/operations",
  },
}

const demoTimeline = demoScript.map((step, index) => {
  const minutes = ["00:00", "00:45", "01:30", "02:30", "03:30", "04:30", "05:30", "06:30"]
  const screens = ["/dashboard", "/operations", "/auth/sign-in", "/documents", "/documents/doc-001", "/review", "/evidence", "/operations"]
  const proof = [
    "Problem statement and role split",
    "Architecture and guardrails",
    "Cognito-style role handoff",
    "Status lifecycle in document ledger",
    "Extracted fields and processed JSON",
    "Low-confidence alert path",
    "AWS proof packet",
    "Budget and cleanup readiness",
  ]

  return {
    time: minutes[index] ?? `0${index}:00`,
    step,
    screen: screens[index] ?? "/dashboard",
    proof: proof[index] ?? "Reviewer walkthrough checkpoint",
  }
})

const serviceProof = architectureServices.map((service) => {
  const proofByLayer: Record<string, { artifact: string; status: EvidenceStatus; icon: typeof Cloud }> = {
    "Edge / Frontend": { artifact: "Amplify/CloudFront URL + deployed SPA screenshot", status: "Captured", icon: Cloud },
    Auth: { artifact: "Cognito demo login and role workspace screenshot", status: "Ready", icon: LockKeyhole },
    API: { artifact: "API Gateway endpoint plus Lambda invocation log", status: "Ready", icon: Code2 },
    Storage: { artifact: "S3 raw and processed object paths", status: "Captured", icon: FileCheck2 },
    Ingestion: { artifact: "EventBridge rule, SQS message, DLQ depth", status: "Missing", icon: Route },
    Workflow: { artifact: "Step Functions execution graph", status: "Ready", icon: Route },
    Extraction: { artifact: "Textract AnalyzeExpense response excerpt", status: "Ready", icon: Sparkles },
    Normalize: { artifact: "AI Proxy log with redacted payload", status: "Missing", icon: KeyRound },
    Data: { artifact: "DynamoDB document metadata row", status: "Captured", icon: Database },
    Ops: { artifact: "CloudWatch logs, X-Ray trace, SNS/SES alert", status: "Ready", icon: MailWarning },
    Governance: { artifact: "Budgets thresholds, IAM roles, cleanup command", status: "Missing", icon: ShieldCheck },
  }

  return {
    ...service,
    ...(proofByLayer[service.layer] ?? { artifact: "Screenshot or command output", status: "Missing", icon: Clipboard }),
  }
})

const reviewerPacket = [
  "Architecture explained",
  "Happy path shown",
  "Failure path shown",
  "Human review shown",
  "Cost guardrails shown",
  "Cleanup plan shown",
]

const quickLinks = [
  { label: "Upload", to: "/upload" },
  { label: "Documents", to: "/documents" },
  { label: "Review queue", to: "/review" },
  { label: "Operations", to: "/operations" },
  { label: "Alert settings", to: "/settings/notifications" },
]

function statusClass(status: EvidenceStatus) {
  if (status === "Captured") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
  if (status === "Ready") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
  return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-200"
}

function escapeCsv(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function exportEvidenceCsv(rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { item: "" })
  const csv = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = "docuflow-evidence-checklist.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export default function EvidencePage() {
  const [copied, setCopied] = useState(false)
  const capturedCount = useMemo(
    () => Object.values(evidenceArtifacts).filter((artifact) => artifact.status === "Captured").length,
    []
  )
  const readyCount = useMemo(
    () => Object.values(evidenceArtifacts).filter((artifact) => artifact.status === "Ready").length,
    []
  )
  const missingCount = useMemo(
    () => Object.values(evidenceArtifacts).filter((artifact) => artifact.status === "Missing").length,
    []
  )
  const readiness = Math.round(((capturedCount + readyCount * 0.55) / testCases.length) * 100)

  const evidenceRows = testCases.map((testCase) => ({
    id: testCase.id,
    testCase: testCase.name,
    owner: testCase.owner,
    state: testCase.state,
    evidenceStatus: evidenceArtifacts[testCase.id]?.status ?? "Missing",
    artifact: evidenceArtifacts[testCase.id]?.artifact ?? testCase.evidence,
    route: evidenceArtifacts[testCase.id]?.route ?? "/evidence",
  }))

  const copyReviewerPacket = async () => {
    const packet = [
      "DocuFlow AI reviewer packet",
      `Readiness: ${readiness}%`,
      `Captured artifacts: ${capturedCount}`,
      `Ready to capture: ${readyCount}`,
      `Missing artifacts: ${missingCount}`,
      "",
      "Demo checkpoints:",
      ...demoTimeline.map((item) => `- ${item.time} ${item.step} (${item.screen})`),
      "",
      "Open items:",
      ...evidenceRows.filter((row) => row.evidenceStatus !== "Captured").map((row) => `- ${row.id}: ${row.artifact}`),
    ].join("\n")

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
    try {
      await navigator.clipboard.writeText(packet)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = packet
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
  }

  return (
    <BaseLayout
      title="Evidence"
      description="Test plan, demo script, and Definition of Done for the admin-approved invoice and receipt MVP."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Submission packet
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  Reviewer ready
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                Evidence room for proving the full document workflow.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                Capture the exact artifacts a reviewer needs: happy path, failure path, AWS service proof,
                alert delivery, secret hygiene, budget guardrails, and cleanup readiness.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]"
                  onClick={() => exportEvidenceCsv(evidenceRows)}
                >
                  <Download className="size-4" />
                  Export checklist
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={copyReviewerPacket}
                >
                  {copied ? <ClipboardCheck className="size-4" /> : <Clipboard className="size-4" />}
                  {copied ? "Copied packet" : "Copy reviewer packet"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 xl:border-l xl:border-t-0">
              {[
                { label: "Readiness", value: `${readiness}%`, icon: BadgeCheck },
                { label: "Captured", value: capturedCount, icon: CheckCircle2 },
                { label: "Ready", value: readyCount, icon: ClipboardList },
                { label: "Missing", value: missingCount, icon: AlertTriangle },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">EVD</span>
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

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)] lg:px-6">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5" />
              Evidence artifact table
            </CardTitle>
            <CardDescription>
              Each test has a concrete artifact slot, owner, and route back into the product.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Test case</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Artifact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase) => {
                    const artifact = evidenceArtifacts[testCase.id]
                    return (
                      <TableRow key={testCase.id}>
                        <TableCell className="font-mono">{testCase.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{testCase.name}</div>
                          <div className="mt-1 text-xs leading-5 text-muted-foreground">{testCase.expected}</div>
                        </TableCell>
                        <TableCell>{testCase.owner}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{artifact.type}</Badge>
                            <span className="text-sm text-muted-foreground">{artifact.artifact}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClass(artifact.status)}>
                            {artifact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm" className="h-8">
                            <Link to={artifact.route}>
                              View
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
                Readiness gauge
              </CardTitle>
              <CardDescription>
                Weighted by captured and ready-to-capture artifacts.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 pt-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Reviewer packet readiness</span>
                  <span className="font-mono text-muted-foreground">{readiness}%</span>
                </div>
                <Progress value={readiness} />
              </div>
              <div className="grid grid-cols-3 border">
                {[
                  ["Captured", capturedCount],
                  ["Ready", readyCount],
                  ["Missing", missingCount],
                ].map(([label, value]) => (
                  <div key={label} className="border-r p-3 last:border-r-0">
                    <div className="text-2xl font-semibold">{value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                {quickLinks.map((link) => (
                  <Button key={link.to} asChild variant="outline" className="justify-between">
                    <Link to={link.to}>
                      {link.label}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Secret hygiene
              </CardTitle>
              <CardDescription>
                Required proof before publishing source or screenshots.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 text-sm">
              {[
                "No API key in frontend source.",
                "No .env containing API key in GitHub.",
                "No API key printed in CloudWatch logs.",
                "No raw invoice image sent externally unless approved.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 border p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Film className="size-5" />
              Demo run timeline
            </CardTitle>
            <CardDescription>
              Seven-minute flow with the screen and proof point for each beat.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {demoTimeline.map((step, index) => (
              <div key={`${step.time}-${step.step}`} className="grid gap-3 border p-4 sm:grid-cols-[70px_1fr]">
                <div className="font-mono text-xs text-muted-foreground">{step.time}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">0{index + 1}</Badge>
                    <Link to={step.screen} className="text-sm font-medium underline-offset-4 hover:underline">
                      {step.screen}
                    </Link>
                  </div>
                  <div className="mt-2 text-sm leading-6">{step.step}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{step.proof}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="size-5" />
              AWS service proof matrix
            </CardTitle>
            <CardDescription>
              Every retained service has a screenshot, trace, command, or JSON proof target.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
            {serviceProof.map((item) => {
              const Icon = item.icon
              return (
                <div key={`${item.layer}-${item.service}`} className="border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center border bg-muted/30">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{item.service}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.layer}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusClass(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-4 text-sm leading-6 text-muted-foreground">{item.artifact}</div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="size-5" />
              Definition of Done
            </CardTitle>
            <CardDescription>
              MVP is complete when these integration and cost-control items are evidenced.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-3">
            {definitionOfDone.map((item) => (
              <div key={item} className="flex items-start gap-3 border p-3">
                <CheckSquare className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span className="text-sm leading-6">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="size-5" />
              Reviewer packet
            </CardTitle>
            <CardDescription>
              The minimum story to close the workshop demo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            {reviewerPacket.map((item, index) => (
              <div key={item} className="flex items-center gap-3 border p-3">
                <Badge variant="secondary">0{index + 1}</Badge>
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              Capture missing failure and cleanup artifacts before the final mentor review.
            </div>
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
