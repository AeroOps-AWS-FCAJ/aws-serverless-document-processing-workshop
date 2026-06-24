"use client"

import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileJson,
  ShieldAlert,
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
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  documents,
  formatMoney,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"

function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  )
}

function buildTimeline(document: DocumentRecord) {
  const baseStatuses: DocumentStatus[] = ["UPLOADED", "PROCESSING"]
  const timelineByStatus: Record<DocumentStatus, DocumentStatus[]> = {
    UPLOADED: ["UPLOADED", "PROCESSING"],
    PROCESSING: baseStatuses,
    EXTRACTED: [...baseStatuses, "EXTRACTED"],
    REVIEW_REQUIRED: [...baseStatuses, "REVIEW_REQUIRED"],
    FAILED: [...baseStatuses, "FAILED"],
    REVIEWED: [...baseStatuses, "REVIEW_REQUIRED", "REVIEWED"],
  }
  const statuses = timelineByStatus[document.status]
  const currentIndex = statuses.indexOf(document.status)

  return statuses.map((status, index) => ({
    status,
    done: index <= currentIndex,
  }))
}

export default function DocumentDetailPage() {
  const { documentId } = useParams()
  const document = documents.find((item) => item.documentId === documentId)

  if (!document) {
    return (
      <BaseLayout
        title="Document not found"
        description="The requested documentId does not exist in the current mock dataset."
      >
        <div className="px-4 lg:px-6">
          <Button asChild variant="outline">
            <Link to="/documents">
              <ArrowLeft className="size-4" />
              Back to documents
            </Link>
          </Button>
        </div>
      </BaseLayout>
    )
  }

  const timeline = buildTimeline(document)

  return (
    <BaseLayout
      title={document.fileName}
      description={`${document.documentId} · ${document.documentType} · ${document.owner}`}
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Extraction summary</CardTitle>
                <CardDescription>
                  Field-level result returned by Textract and normalized by Bedrock.
                </CardDescription>
              </div>
              <StatusBadge status={document.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-sm">Vendor</div>
                <div className="mt-1 font-medium">{document.vendorName}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-sm">Invoice date</div>
                <div className="mt-1 font-medium">{document.invoiceDate}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-sm">Total amount</div>
                <div className="mt-1 font-medium">
                  {formatMoney(document.totalAmount, document.currency)}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-sm">Tax amount</div>
                <div className="mt-1 font-medium">
                  {document.taxAmount === null
                    ? "Not detected"
                    : formatMoney(document.taxAmount, document.currency)}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">Confidence score</div>
                  <div className="text-muted-foreground text-sm">
                    Threshold policy routes scores below 80% to review.
                  </div>
                </div>
                <Badge variant="outline">{Math.round(document.confidenceScore * 100)}%</Badge>
              </div>
              <Progress value={document.confidenceScore * 100} />
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[520px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {document.lineItems.length ? (
                    document.lineItems.map((item) => (
                      <TableRow key={item.description}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(item.unitPrice, document.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(item.amount, document.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        No line items were extracted for this document.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status timeline</CardTitle>
              <CardDescription>
                End-to-end state visible to users and reviewers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {timeline.map((item, index) => {
                const meta = statusMeta[item.status]
                const Icon = item.done ? CheckCircle2 : Clock3

                return (
                  <div key={item.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 items-center justify-center rounded-full border bg-background">
                        <Icon className={item.done ? "size-4 text-emerald-600" : "size-4 text-muted-foreground"} />
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="h-8 w-px bg-border" />
                      )}
                    </div>
                    <div className="pt-1">
                      <div className="font-medium">{meta.label}</div>
                      <div className="text-muted-foreground text-sm">
                        {item.done ? "Completed or current state" : "Waiting for workflow transition"}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage artifacts</CardTitle>
              <CardDescription>
                Keys expected in raw and processed buckets.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div>
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <Database className="size-4" />
                  Raw S3 object
                </div>
                <div className="break-all rounded-lg bg-muted p-3 font-mono text-xs">
                  {document.s3RawPath}
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <FileJson className="size-4" />
                  Processed artifact
                </div>
                <div className="break-all rounded-lg bg-muted p-3 font-mono text-xs">
                  {document.s3ProcessedPath}
                </div>
              </div>
              {document.errorMessage && (
                <>
                  <Separator />
                  <div className="flex gap-3 rounded-lg border border-amber-200 p-3 text-amber-700 dark:border-amber-900 dark:text-amber-300">
                    <ShieldAlert className="mt-0.5 size-4" />
                    <div>{document.errorMessage}</div>
                  </div>
                </>
              )}
              <Button asChild variant="outline" className="cursor-pointer">
                <Link to="/documents">
                  <ArrowLeft className="size-4" />
                  Back to documents
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
