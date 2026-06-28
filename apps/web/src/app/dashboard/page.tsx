"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  UploadCloud,
} from "lucide-react"
import { Link } from "react-router-dom"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDocuFlowSession, roleLabels } from "@/lib/auth"
import {
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

function StatusBadge({ status }: { status: DocumentRecord["status"] }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  )
}

function SummaryItem({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  detail: string
  icon: typeof FileText
  tone: string
}) {
  return (
    <div className="grid min-h-32 gap-4 border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className={`flex size-8 items-center justify-center rounded-md ${tone}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-muted-foreground mt-1 text-xs leading-5">{detail}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { documents: allDocuments } = useDocuFlowDocuments()
  const session = getDocuFlowSession()
  const role = session?.role ?? "finance"
  const documents =
    role === "finance"
      ? allDocuments.filter((document) => document.userId === session?.userId)
      : allDocuments

  const processingCount = documents.filter((document) =>
    ["UPLOADED", "QUEUED", "PROCESSING"].includes(document.status)
  ).length
  const reviewCount = documents.filter(
    (document) => document.status === "REVIEW_REQUIRED"
  ).length
  const failedCount = documents.filter((document) => document.status === "FAILED").length
  const readyCount = documents.filter((document) =>
    ["EXTRACTED", "APPROVED"].includes(document.status)
  ).length

  const attentionStatuses = ["REVIEW_REQUIRED", "FAILED", "CORRECTED"]
  const attentionQueue = [...documents]
    .filter((document) => attentionStatuses.includes(document.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  const primaryAction =
    role === "admin"
      ? { label: "Open operations", url: "/operations", icon: Activity }
      : attentionQueue.length
        ? { label: "Continue review", url: "/review", icon: CheckCircle2 }
        : { label: "Upload a document", url: "/upload", icon: UploadCloud }
  const PrimaryIcon = primaryAction.icon

  function getAttentionAction(document: DocumentRecord) {
    if (document.status === "CORRECTED") return "Verify and approve"
    if (document.status === "FAILED") return role === "admin" ? "Inspect failure" : "Resolve upload issue"
    return "Review fields"
  }

  return (
    <BaseLayout
      title="Document overview"
      description="Monitor finance documents and continue with the next required action."
    >
      <div className="grid min-w-0 gap-6 px-4 lg:px-6">
        <section className="grid overflow-hidden rounded-md border border-l-4 border-l-emerald-600 bg-card md:grid-cols-[1fr_auto]">
          <div className="grid gap-2 p-5 lg:p-6">
            <div className="text-muted-foreground text-xs font-medium uppercase">
              {roleLabels[role]} workspace
            </div>
            <h2 className="text-xl font-semibold">
              {role === "admin"
                ? "Keep the processing service healthy and auditable."
                : reviewCount
                  ? `${reviewCount} document${reviewCount === 1 ? " needs" : "s need"} your verification.`
                  : "Upload, verify, and retrieve your finance documents in one place."}
            </h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
              {role === "admin"
                ? "Operational health and project evidence are separated from the finance workflow."
                : "Processing happens in the background. Uncertain fields are added to your review queue so you can correct and approve them."}
            </p>
          </div>
          <div className="flex items-center border-t p-5 md:border-l md:border-t-0 lg:p-6">
            <Button asChild className="w-full cursor-pointer md:w-auto">
              <Link to={primaryAction.url}>
                <PrimaryIcon className="size-4" />
                {primaryAction.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section aria-label="Document status summary" className="grid overflow-hidden rounded-md border bg-card sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            label="In progress"
            value={processingCount}
            detail="Uploaded, queued, or currently processing"
            icon={Clock3}
            tone="bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
          />
          <SummaryItem
            label="Needs review"
            value={reviewCount}
            detail="Uncertain fields need your verification"
            icon={FileText}
            tone="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          />
          <SummaryItem
            label="Failed"
            value={failedCount}
            detail="File or extraction issue requires attention"
            icon={AlertTriangle}
            tone="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          />
          <SummaryItem
            label="Ready"
            value={readyCount}
            detail="Structured data is available to use"
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          />
        </section>

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <Card className="min-w-0">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{role === "finance" ? "Your next actions" : "Priority queue"}</CardTitle>
                  <CardDescription className="mt-1">
                    {role === "finance"
                      ? "Resolve failed uploads, verify uncertain fields, and approve corrected results."
                      : "Work from the oldest unresolved exception first."}
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/review">View queue</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {attentionQueue.length ? (
                <div className="divide-y">
                  {attentionQueue.map((document) => (
                    <div key={document.documentId} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{document.fileName}</div>
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <StatusBadge status={document.status} />
                          <span>{document.vendorName}</span>
                          <span>Updated {formatDate(document.updatedAt)}</span>
                        </div>
                        {document.errorMessage && (
                          <div className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-5">
                            {document.errorMessage}
                          </div>
                        )}
                      </div>
                      <Button asChild variant="ghost" size="sm" className="justify-start sm:justify-center">
                        <Link to={`/documents/${document.documentId}`}>
                          {getAttentionAction(document)}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle2 className="mx-auto size-6 text-emerald-600" />
                  <div className="mt-3 text-sm font-medium">No documents need attention</div>
                  <div className="text-muted-foreground mt-1 text-xs">New exceptions will appear here.</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Recent documents</CardTitle>
                  <CardDescription className="mt-1">
                    Latest uploads and their current processing state.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/documents">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-full overflow-x-auto">
                <Table className="min-w-[620px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDocuments.map((document) => (
                      <TableRow key={document.documentId}>
                        <TableCell>
                          <Link to={`/documents/${document.documentId}`} className="font-medium hover:underline">
                            {document.fileName}
                          </Link>
                          <div className="text-muted-foreground mt-1 text-xs">{document.vendorName}</div>
                        </TableCell>
                        <TableCell><StatusBadge status={document.status} /></TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(document.totalAmount, document.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(document.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
