"use client"

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Database,
  FileJson,
  FileText,
  ListChecks,
  RefreshCw,
  Save,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"
import { getDocument, isApiConfigured, reviewDocument } from "@/lib/docuflow-api"
import { CONFIDENCE_THRESHOLD } from "@docuflow/shared-config"

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
  const baseStatuses: DocumentStatus[] = ["UPLOADED", "QUEUED", "PROCESSING"]
  const timelineByStatus: Record<DocumentStatus, DocumentStatus[]> = {
    UPLOADED: ["UPLOADED", "QUEUED", "PROCESSING"],
    QUEUED: ["UPLOADED", "QUEUED", "PROCESSING"],
    PROCESSING: baseStatuses,
    EXTRACTED: [...baseStatuses, "EXTRACTED"],
    REVIEW_REQUIRED: [...baseStatuses, "REVIEW_REQUIRED"],
    FAILED: [...baseStatuses, "FAILED"],
    CORRECTED: [...baseStatuses, "REVIEW_REQUIRED", "CORRECTED"],
    APPROVED: [...baseStatuses, "REVIEW_REQUIRED", "CORRECTED", "APPROVED"],
  }
  const statuses = timelineByStatus[document.status]
  const currentIndex = statuses.indexOf(document.status)

  return statuses.map((status, index) => ({
    status,
    done: index <= currentIndex,
  }))
}

function DocumentPreview({ document }: { document: DocumentRecord }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Source preview
            </CardTitle>
            <CardDescription>Source document preview alongside the extracted result.</CardDescription>
          </div>
          <Badge variant="outline">{document.documentType}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="m-4 rounded-lg border bg-background p-5 shadow-sm">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="text-muted-foreground text-xs uppercase">Vendor</div>
              <div className="mt-1 text-lg font-semibold">{document.vendorName}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs uppercase">{document.documentType}</div>
              <div className="mt-1 font-mono text-sm">{document.documentId}</div>
            </div>
          </div>
          <div className="grid gap-3 border-y py-4 text-sm sm:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-medium">{document.invoiceDate}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Currency</div>
              <div className="font-medium">{document.currency}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Confidence</div>
              <div className="font-medium">{Math.round(document.confidenceScore * 100)}%</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {document.lineItems.length ? (
              document.lineItems.map((item) => (
                <div key={item.description} className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3 text-sm">
                  <div>
                    <div className="font-medium">{item.description}</div>
                    <div className="text-muted-foreground">Qty {item.quantity}</div>
                  </div>
                  <div className="text-right font-medium">
                    {formatMoney(item.amount, document.currency)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Line items will appear when document processing is complete.
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="text-muted-foreground text-sm">Total</div>
            <div className="text-xl font-semibold">
              {formatMoney(document.totalAmount, document.currency)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DocumentDetailPage() {
  const { documentId } = useParams()
  const { documents, updateDocument } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const matchedDocument = documents.find((item) => item.documentId === documentId)
  const document =
    matchedDocument &&
    (role !== "finance" || matchedDocument.userId === session?.userId)
      ? matchedDocument
      : undefined
  const canReview = role === "finance" || role === "admin"
  const documentStatus = document?.status
  const [reviewNote, setReviewNote] = useState("")
  const [reviewMessage, setReviewMessage] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [form, setForm] = useState({
    vendorName: "",
    invoiceDate: "",
    currency: "VND" as DocumentRecord["currency"],
    totalAmount: "",
    taxAmount: "",
  })

  useEffect(() => {
    if (!document) return
    setForm({
      vendorName: document.vendorName,
      invoiceDate: document.invoiceDate,
      currency: document.currency,
      totalAmount: String(document.totalAmount),
      taxAmount: document.taxAmount === null ? "" : String(document.taxAmount),
    })
    setReviewNote(document.reviewerNote ?? "")
  }, [document])

  useEffect(() => {
    if (
      !documentId ||
      !isApiConfigured() ||
      !documentStatus ||
      !["UPLOADED", "QUEUED", "PROCESSING"].includes(documentStatus)
    ) {
      setIsPolling(false)
      return
    }

    let cancelled = false
    setIsPolling(true)

    const pollStatus = async () => {
      try {
        const remoteDocument = await getDocument(documentId)
        if (!cancelled && remoteDocument) updateDocument(documentId, remoteDocument)
      } catch {
        if (!cancelled) setIsPolling(false)
      }
    }

    void pollStatus()
    const intervalId = window.setInterval(pollStatus, 5000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [documentId, documentStatus, updateDocument])

  if (!document) {
    return (
      <BaseLayout
        title="Document not found"
        description="The requested document does not exist or is no longer available."
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
  const canCorrect = canReview && ["REVIEW_REQUIRED", "CORRECTED"].includes(document.status)
  const canApprove = canReview && ["EXTRACTED", "CORRECTED", "REVIEW_REQUIRED"].includes(document.status)

  const handleSaveCorrection = async () => {
    const correctedFields = {
      vendorName: form.vendorName.trim() || "Unknown",
      invoiceDate: form.invoiceDate,
      currency: form.currency,
      totalAmount: Number(form.totalAmount) || 0,
      taxAmount: form.taxAmount.trim() ? Number(form.taxAmount) : null,
    }

    setIsReviewing(true)
    setReviewMessage("")
    try {
      const response = await reviewDocument(document.documentId, {
        action: "CORRECT",
        correctedFields,
        ...(reviewNote.trim() ? { reviewerNote: reviewNote.trim() } : {}),
      })
      updateDocument(document.documentId, {
        ...correctedFields,
        status: response.status,
        reviewReasons: [],
        correctedFields: response.correctedFields,
        reviewedAt: response.reviewedAt,
        reviewedBy: response.reviewedBy,
        reviewerNote: reviewNote.trim() || null,
        errorMessage: null,
      })
      setReviewMessage("Correction saved. The document is ready for approval.")
    } catch {
      setReviewMessage("Correction could not be saved. Try again.")
    } finally {
      setIsReviewing(false)
    }
  }

  const handleApprove = async () => {
    setIsReviewing(true)
    setReviewMessage("")
    try {
      const response = await reviewDocument(document.documentId, {
        action: "APPROVE",
        ...(reviewNote.trim() ? { reviewerNote: reviewNote.trim() } : {}),
      })
      updateDocument(document.documentId, {
        status: response.status,
        reviewReasons: [],
        reviewedAt: response.reviewedAt,
        reviewedBy: response.reviewedBy,
        reviewerNote: reviewNote.trim() || null,
        errorMessage: null,
      })
      setReviewMessage("Document approved.")
    } catch {
      setReviewMessage("Document could not be approved. Try again.")
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <BaseLayout
      title={document.fileName}
      description={`${document.documentId} · ${document.documentType} · ${statusMeta[document.status].label}`}
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
        <div className="grid gap-4">
          <DocumentPreview document={document} />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Extraction summary</CardTitle>
                  <CardDescription>
                    Structured fields captured from the uploaded document.
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

              {role === "admin" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground text-sm">AI provider</div>
                    <div className="mt-1 font-medium">{document.aiProvider}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground text-sm">Normalization</div>
                    <div className="mt-1 break-all text-sm font-medium">{document.normalizationMethod}</div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Confidence score</div>
                    <div className="text-muted-foreground text-sm">
                      Scores below {Math.round(CONFIDENCE_THRESHOLD * 100)}% or missing required fields are sent to review.
                    </div>
                  </div>
                  <Badge variant="outline">{Math.round(document.confidenceScore * 100)}%</Badge>
                </div>
                <Progress value={document.confidenceScore * 100} />
              </div>

              {document.reviewReasons.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListChecks className="size-4 text-amber-700 dark:text-amber-300" />
                    Review reasons
                  </div>
                  <ul className="text-muted-foreground mt-3 grid gap-2 text-sm">
                    {document.reviewReasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span aria-hidden="true">-</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {document.reviewedAt && (
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground text-sm">Reviewed</div>
                    <div className="mt-1 text-sm font-medium">{formatDate(document.reviewedAt)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">Reviewed by</div>
                    <div className="mt-1 text-sm font-medium">{document.reviewedBy ?? "Unknown user"}</div>
                  </div>
                  {document.reviewerNote && (
                    <div className="sm:col-span-2">
                      <div className="text-muted-foreground text-sm">Review note</div>
                      <div className="mt-1 text-sm leading-6">{document.reviewerNote}</div>
                    </div>
                  )}
                </div>
              )}

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
        </div>

        <div className="grid gap-4">
          {reviewMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" role="status">
              {reviewMessage}
            </div>
          )}
          {(canCorrect || canApprove) && (
          <Card>
            <CardHeader>
              <CardTitle>Review and approve</CardTitle>
              <CardDescription>
                Correct uncertain fields, add a note, and approve the verified result.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="vendorName">Vendor</Label>
                  <Input
                    id="vendorName"
                    value={form.vendorName}
                    onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="invoiceDate">Date</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={form.invoiceDate}
                      onChange={(event) => setForm((current) => ({ ...current, invoiceDate: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(value) => setForm((current) => ({ ...current, currency: value as DocumentRecord["currency"] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="totalAmount">Total amount</Label>
                    <Input
                      id="totalAmount"
                      inputMode="decimal"
                      value={form.totalAmount}
                      onChange={(event) => setForm((current) => ({ ...current, totalAmount: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxAmount">Tax amount</Label>
                    <Input
                      id="taxAmount"
                      inputMode="decimal"
                      placeholder="Not detected"
                      value={form.taxAmount}
                      onChange={(event) => setForm((current) => ({ ...current, taxAmount: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reviewNote">Review note</Label>
                  <Textarea
                    id="reviewNote"
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Explain correction or approval rationale"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="cursor-pointer" onClick={handleSaveCorrection} disabled={!canCorrect || isReviewing}>
                  <Save className="size-4" />
                  Save correction
                </Button>
                <Button variant="secondary" className="cursor-pointer" onClick={handleApprove} disabled={!canApprove || isReviewing}>
                  <BadgeCheck className="size-4" />
                  Mark approved
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {document.errorMessage && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-amber-600" />
                  Processing note
                </CardTitle>
                <CardDescription>
                  Use this note to decide whether the document needs correction or a new upload.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-6">{document.errorMessage}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status timeline</CardTitle>
              <CardDescription>
                Current progress from upload to a usable result.
                {isPolling && (
                  <span className="ml-2 inline-flex items-center gap-1" role="status">
                    <RefreshCw className="size-3 animate-spin" />
                    Refreshing every 5 seconds
                  </span>
                )}
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

          {role === "admin" && (
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
              <Separator />
              <Button asChild variant="outline" className="cursor-pointer">
                <Link to="/documents">
                  <ArrowLeft className="size-4" />
                  Back to documents
                </Link>
              </Button>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </BaseLayout>
  )
}
