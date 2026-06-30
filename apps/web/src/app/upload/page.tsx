"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
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
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { isApiConfigured, requestUploadUrl, uploadDocumentFile } from "@/lib/docuflow-api"
import {
  createQueuedDocument,
  nextUploadStatus,
  useDocuFlowDocuments,
} from "@/lib/docuflow-store"

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"])
const maxFileSize = 10 * 1024 * 1024
const maxPageCount = 5

type UploadState =
  | "IDLE"
  | "VALIDATING"
  | "REQUESTING_URL"
  | "UPLOADING"
  | "QUEUING"
  | "COMPLETE"
  | "ERROR"

type DocumentHint = "AUTO" | "INVOICE" | "RECEIPT"

const stateLabels: Record<UploadState, string> = {
  IDLE: "READY",
  VALIDATING: "VALIDATING",
  REQUESTING_URL: "SIGNED URL",
  UPLOADING: "S3 UPLOAD",
  QUEUING: "QUEUEING",
  COMPLETE: "COMPLETE",
  ERROR: "ACTION NEEDED",
}

const uploadRules = [
  "PDF, JPG, and PNG files",
  "Maximum file size of 10 MB",
  "Up to 5 pages per document",
  "Private access for signed-in users",
]

const nextSteps = [
  {
    title: "Raw file lands in S3",
    detail: "The original file is stored privately in the raw document bucket.",
  },
  {
    title: "Textract extracts fields",
    detail: "Vendor, invoice date, tax, total, and line items are parsed in the background.",
  },
  {
    title: "AI normalizes structured data",
    detail: "Only extracted fields are sent for normalization; the raw file is not sent to the external AI provider.",
  },
  {
    title: "Finance reviews exceptions",
    detail: "Low-confidence or failed documents stay visible until corrected or approved.",
  },
]

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

async function estimatePdfPageCount(file: File): Promise<number | null> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return 1

  try {
    const buffer = await file.arrayBuffer()
    const text = new TextDecoder("latin1").decode(buffer)
    const matches = text.match(/\/Type\s*\/Page(?!s)\b/g)
    return matches?.length ?? null
  } catch {
    return null
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Upload canceled. You can retry with the same file or choose another document."
  }
  if (error instanceof Error) return error.message
  return "The upload could not be started. Check the file and try again."
}

export default function UploadPage() {
  const { documents, upsertDocument } = useDocuFlowDocuments()
  const abortRef = useRef<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [documentHint, setDocumentHint] = useState<DocumentHint>("AUTO")
  const [detectedPageCount, setDetectedPageCount] = useState<number | null>(null)
  const [pageCountPending, setPageCountPending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [state, setState] = useState<UploadState>("IDLE")
  const [message, setMessage] = useState("Drag an invoice or receipt here, or browse from your device.")
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null)

  const apiMode = isApiConfigured()

  const validationError = useMemo(() => {
    if (!file) return "Choose a file before uploading."
    if (!allowedTypes.has(file.type)) return "This file type is not supported. Use PDF, JPG, or PNG."
    if (file.size > maxFileSize) return "This file is larger than 10 MB."
    if (detectedPageCount && detectedPageCount > maxPageCount) {
      return `This PDF appears to have ${detectedPageCount} pages. Upload documents with ${maxPageCount} pages or fewer.`
    }
    return null
  }, [detectedPageCount, file])

  const recentUploads = useMemo(
    () =>
      documents
        .filter((document) => document.status === "UPLOADED" || document.status === "QUEUED" || document.status === "PROCESSING")
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 4),
    [documents]
  )

  const selectFile = useCallback(async (selectedFile: File | null) => {
    abortRef.current?.abort()
    abortRef.current = null
    setFile(selectedFile)
    setProgress(0)
    setDetectedPageCount(null)
    setCreatedDocumentId(null)
    setState(selectedFile ? "VALIDATING" : "IDLE")
    setMessage(selectedFile ? "Checking file type, size, and page count..." : "Drag an invoice or receipt here, or browse from your device.")

    if (!selectedFile) return

    if (!allowedTypes.has(selectedFile.type) || selectedFile.size > maxFileSize) {
      setState("IDLE")
      setMessage(`${selectedFile.name} is selected, but it needs attention before upload.`)
      return
    }

    setPageCountPending(true)
    const pageCount = await estimatePdfPageCount(selectedFile)
    setDetectedPageCount(pageCount)
    setPageCountPending(false)
    setState("IDLE")
    setMessage(
      pageCount && pageCount > maxPageCount
        ? "The selected PDF has too many pages for this workshop flow."
        : `${selectedFile.name} is ready to upload.`
    )
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void selectFile(event.target.files?.[0] ?? null)
    event.target.value = ""
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void selectFile(event.dataTransfer.files?.[0] ?? null)
  }

  const clearSelection = () => {
    abortRef.current?.abort()
    abortRef.current = null
    void selectFile(null)
    setDocumentHint("AUTO")
  }

  const cancelUpload = () => {
    abortRef.current?.abort()
  }

  const handleUpload = async () => {
    if (!file || validationError || pageCountPending) {
      setState("ERROR")
      setMessage(validationError ?? "Wait until the file validation is complete.")
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      setState("REQUESTING_URL")
      setProgress(12)
      setMessage(apiMode ? "Requesting a signed S3 upload URL..." : "Preparing local demo upload...")

      const request = {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        pageCount: detectedPageCount ?? 1,
      }
      const response = await requestUploadUrl(request)

      setState("UPLOADING")
      setProgress(24)
      setMessage(`Signed URL ready. Upload expires in ${response.expiresIn} seconds.`)

      await uploadDocumentFile(response.uploadUrl, file, {
        contentType: file.type,
        signal: controller.signal,
        onProgress: (uploadProgress) => {
          setProgress(Math.min(86, 24 + Math.round(uploadProgress * 0.62)))
          setMessage(`Uploading to S3 raw bucket... ${uploadProgress}%`)
        },
      })

      setState("QUEUING")
      setProgress(92)
      setMessage("Upload complete. Creating the processing queue record...")

      const baseQueuedDocument = createQueuedDocument(request, response)
      const queuedDocument = {
        ...baseQueuedDocument,
        documentType:
          documentHint === "AUTO"
            ? baseQueuedDocument.documentType
            : documentHint,
        status: nextUploadStatus("UPLOADED"),
      }
      upsertDocument(queuedDocument)
      setCreatedDocumentId(queuedDocument.documentId)
      setProgress(100)
      setState("COMPLETE")
      setMessage("Document uploaded and queued. Track it from the document detail page.")
    } catch (error) {
      setState("ERROR")
      setMessage(getErrorMessage(error))
    } finally {
      abortRef.current = null
    }
  }

  const isBusy = state === "VALIDATING" || state === "REQUESTING_URL" || state === "UPLOADING" || state === "QUEUING"
  const canUpload = Boolean(file) && !validationError && !pageCountPending && !isBusy && state !== "COMPLETE"

  return (
    <BaseLayout
      title="Upload document"
      description="Add an invoice or receipt and keep the processing trail visible from raw file to review queue."
    >
      <div className="grid items-start gap-6 px-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] lg:px-6">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-[#0f2a22] text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl text-white">Document intake</CardTitle>
                <CardDescription className="text-white/65">
                  Signed URL upload, private S3 storage, then async extraction.
                </CardDescription>
              </div>
              <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8ff72]">
                {apiMode ? "AWS API mode" : "Local demo data"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-4 sm:p-6">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="document-file">Invoice or receipt</Label>
                {file && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 cursor-pointer" onClick={clearSelection}>
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <label
                htmlFor="document-file"
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={[
                  "group relative flex min-h-72 cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-xl border border-dashed p-6 text-center transition-all",
                  isDragging
                    ? "border-[#d8ff72] bg-[#d8ff72]/15 ring-2 ring-[#d8ff72]/40"
                    : "border-foreground/20 bg-[linear-gradient(135deg,rgba(15,42,34,0.04),rgba(216,255,114,0.10))] hover:border-foreground/40",
                ].join(" ")}
              >
                <div className="absolute inset-x-8 top-8 h-px bg-foreground/10" />
                <div className="absolute inset-x-8 bottom-8 h-px bg-foreground/10" />
                <div className="flex size-16 items-center justify-center rounded-2xl border bg-background shadow-sm transition-transform group-hover:-translate-y-1">
                  {file ? <FileText className="size-7 text-emerald-700" /> : <UploadCloud className="size-7" />}
                </div>
                <div className="max-w-md">
                  <div className="text-xl font-semibold">
                    {file ? file.name : isDragging ? "Drop the document to stage it" : "Drag and drop a document"}
                  </div>
                  <div className="text-muted-foreground mt-2 text-sm leading-6">
                    {file
                      ? `${formatFileSize(file.size)} · ${file.type || "Unknown file type"}${
                          detectedPageCount ? ` · ${detectedPageCount} page${detectedPageCount > 1 ? "s" : ""}` : ""
                        }`
                      : "PDF, JPG, or PNG · Maximum 10 MB · Maximum 5 pages"}
                  </div>
                </div>
                <span className="rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm">
                  {file ? "Choose another file" : "Browse files"}
                </span>
              </label>
              <input
                id="document-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(["AUTO", "INVOICE", "RECEIPT"] as const).map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setDocumentHint(hint)}
                  className={[
                    "min-h-12 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                    documentHint === hint
                      ? "border-[#0f2a22] bg-[#0f2a22] text-white"
                      : "bg-background hover:border-foreground/30",
                  ].join(" ")}
                >
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">Type hint</span>
                  <span className="font-semibold">{hint === "AUTO" ? "Auto detect" : hint}</span>
                </button>
              ))}
            </div>

            {(file || state !== "IDLE") && (
              <div className="rounded-xl border bg-background/80 p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {state === "ERROR" ? <XCircle className="size-4 text-destructive" /> : <Clock3 className="size-4" />}
                      Upload status
                    </div>
                    <div className={state === "ERROR" ? "mt-1 text-sm text-destructive" : "text-muted-foreground mt-1 text-sm"}>
                      {validationError && file ? validationError : message}
                    </div>
                  </div>
                  <Badge variant={state === "ERROR" ? "destructive" : "outline"}>{stateLabels[state]}</Badge>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="cursor-pointer sm:min-w-48" onClick={handleUpload} disabled={!canUpload}>
                <UploadCloud className="size-4" />
                {state === "ERROR" ? "Retry upload" : isBusy ? "Working..." : "Upload and process"}
              </Button>
              {state === "UPLOADING" && (
                <Button type="button" variant="outline" className="cursor-pointer" onClick={cancelUpload}>
                  <XCircle className="size-4" />
                  Cancel
                </Button>
              )}
              {state === "ERROR" && file && (
                <Button type="button" variant="outline" className="cursor-pointer" onClick={handleUpload} disabled={pageCountPending || !!validationError}>
                  <RefreshCw className="size-4" />
                  Try again
                </Button>
              )}
              {createdDocumentId && (
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link to={`/documents/${createdDocumentId}`}>
                    Track document
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>What happens next</CardTitle>
              <CardDescription>The upload trail follows the workshop architecture.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {nextSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4 p-4">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-muted-foreground mt-1 text-sm leading-5">{step.detail}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="size-4" />
                File requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {uploadRules.map((rule) => (
                <div key={rule} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  {rule}
                </div>
              ))}
              <div className="mt-2 rounded-lg border bg-muted/25 p-3 text-sm leading-5">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4 text-emerald-700" />
                  Privacy boundary
                </div>
                Raw files stay in the private S3 raw bucket. The external AI normalization step receives extracted fields, not the original PDF or image.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="size-4" />
                Recent upload queue
              </CardTitle>
              <CardDescription>Documents currently waiting for extraction or processing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {recentUploads.length ? (
                recentUploads.map((document) => (
                  <Link
                    key={document.documentId}
                    to={`/documents/${document.documentId}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{document.fileName}</div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {document.documentType} · {new Date(document.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {document.status}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No queued uploads yet. New documents will appear here after upload.
                </div>
              )}
              {!apiMode && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Local demo mode stores the queued record in browser storage; connect VITE_API_BASE_URL for live AWS processing.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
