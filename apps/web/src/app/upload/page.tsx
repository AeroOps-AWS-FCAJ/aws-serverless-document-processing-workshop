"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { GlobalWorkerOptions, getDocument as getPdfDocument } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url"
import {
  AlertTriangle, ArrowRight, CheckCircle2,
  FileText, RefreshCw, ShieldCheck, Trash2,
  UploadCloud, XCircle, Clock, FileCheck,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { getDocument, isApiConfigured, processDocument, requestUploadUrl, uploadDocumentFile } from "@/lib/docuflow-api"
import { createQueuedDocument, nextUploadStatus, useDocuFlowDocuments } from "@/lib/docuflow-store"
import { statusMeta, type DocumentStatus } from "@/lib/docuflow-data"
import { useAuth } from "@/contexts/auth-context"
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_PAGE_COUNT } from "@docuflow/shared-config"
import { useLanguage, type TranslationKey } from "@/lib/i18n"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── Constants ────────────────────────────────────────────────────────────────
const acceptedFileTypes = [
  { extensions: [".pdf"], mimeType: "application/pdf" },
  { extensions: [".jpg", ".jpeg"], mimeType: "image/jpeg" },
  { extensions: [".png"], mimeType: "image/png" },
] as const

type UploadState  = "IDLE" | "VALIDATING" | "REQUESTING_URL" | "UPLOADING" | "QUEUING" | "COMPLETE" | "ERROR"
type DocumentHint = "AUTO" | "INVOICE" | "RECEIPT"

const terminalProcessingStatuses = new Set<DocumentStatus>([
  "EXTRACTED",
  "REVIEW_REQUIRED",
  "APPROVED",
  "CORRECTED",
  "FAILED",
])

const knownDocumentStatuses = new Set<DocumentStatus>([
  "UPLOADED",
  "QUEUED",
  "PROCESSING",
  "EXTRACTED",
  "REVIEW_REQUIRED",
  "FAILED",
  "CORRECTED",
  "APPROVED",
])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(n: number) {
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function getAcceptedMimeType(file: File) {
  const name = file.name.toLowerCase()
  return acceptedFileTypes.find((type) =>
    file.type === type.mimeType || type.extensions.some((extension) => name.endsWith(extension))
  )?.mimeType ?? null
}

async function estimatePages(file: File): Promise<number | null> {
  if (getAcceptedMimeType(file) !== "application/pdf") return 1
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    const pdf = await getPdfDocument({ data }).promise
    return pdf.numPages
  } catch { return null }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Upload canceled", "AbortError")
}

function isTerminalProcessingStatus(status: DocumentStatus) {
  return terminalProcessingStatuses.has(status)
}

function isKnownDocumentStatus(status: string): status is DocumentStatus {
  return knownDocumentStatuses.has(status as DocumentStatus)
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { language, t }                 = useLanguage()
  const { session }                   = useAuth()
  const { documents, upsertDocument } = useDocuFlowDocuments()
  const abortRef                      = useRef<AbortController | null>(null)
  const apiMode                       = isApiConfigured()
  const locale                        = language === "vi" ? "vi-VN" : "en-US"

  const [file,         setFile]         = useState<File | null>(null)
  const [hint,         setHint]         = useState<DocumentHint>("AUTO")
  const [pages,        setPages]        = useState<number | null>(null)
  const [pagesPending, setPagesPending] = useState(false)
  const [dragging,     setDragging]     = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [state,        setState]        = useState<UploadState>("IDLE")
  const [message,      setMessage]      = useState("")
  const [createdDocId, setCreatedDocId] = useState<string | null>(null)
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  // ── Validation ────────────────────────────────────────────────────────────
  const validErr = useMemo(() => {
    if (!file) return null
    const mimeType = getAcceptedMimeType(file)
    if (!mimeType) return t("upload.unsupportedFile")
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) return t("upload.fileTooLarge", { size: fmtSize(MAX_UPLOAD_FILE_SIZE_BYTES) })
    if (!pagesPending && mimeType === "application/pdf" && pages === null) {
      return t("upload.pdfUnreadable")
    }
    if (pages && pages > MAX_UPLOAD_PAGE_COUNT) {
      return t("upload.pdfTooManyPages", { pages, max: MAX_UPLOAD_PAGE_COUNT })
    }
    return null
  }, [file, pages, pagesPending, t])

  const recentUploads = useMemo(() =>
    documents
      .filter((d) => ["UPLOADED","QUEUED","PROCESSING"].includes(d.status))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 4),
  [documents])

  // ── File selection ────────────────────────────────────────────────────────
  const selectFile = useCallback(async (f: File | null) => {
    abortRef.current?.abort()
    abortRef.current = null
    setFile(f); setProgress(0); setPages(null); setCreatedDocId(null); setMessage("")
    if (!f) {
      toast.dismiss("upload-file-validation")
      setPagesPending(false)
      setState("IDLE")
      return
    }

    const mimeType = getAcceptedMimeType(f)
    const showValidationError = (validationMessage: string) => {
      setPagesPending(false)
      setState("ERROR")
      setMessage(validationMessage)
      toast.error(validationMessage, {
        id: "upload-file-validation",
        description: f.name,
      })
    }

    if (!mimeType) {
      showValidationError(t("upload.unsupportedFile"))
      return
    }
    if (f.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      showValidationError(t("upload.fileTooLarge", { size: fmtSize(MAX_UPLOAD_FILE_SIZE_BYTES) }))
      return
    }

    setState("VALIDATING"); setPagesPending(true)
    const pc = await estimatePages(f)
    setPages(pc)
    if (mimeType === "application/pdf" && pc === null) {
      showValidationError(t("upload.pdfUnreadable"))
      return
    }
    if (pc && pc > MAX_UPLOAD_PAGE_COUNT) {
      showValidationError(t("upload.pdfTooManyPages", { pages: pc, max: MAX_UPLOAD_PAGE_COUNT }))
      return
    }

    toast.dismiss("upload-file-validation")
    setPagesPending(false)
    setState("IDLE")
  }, [t])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void selectFile(e.target.files?.[0] ?? null); e.target.value = ""
  }
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); setDragging(false); void selectFile(e.dataTransfer.files?.[0] ?? null)
  }
  const clearFile = () => {
    abortRef.current?.abort(); abortRef.current = null
    void selectFile(null); setHint("AUTO"); setState("IDLE")
  }

  const pollDocumentResult = useCallback(async (documentId: string, signal: AbortSignal) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      throwIfAborted(signal)
      await wait(attempt === 0 ? 5000 : 3000)
      throwIfAborted(signal)

      const refreshed = await getDocument(documentId)
      if (!refreshed) continue

      upsertDocument(refreshed)
      if (isTerminalProcessingStatus(refreshed.status)) return refreshed
    }

    return null
  }, [upsertDocument])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file || validErr || pagesPending) {
      const validationMessage = validErr ?? t("upload.waitValidation")
      setState("ERROR"); setMessage(validationMessage)
      toast.error(validationMessage)
      return
    }
    const ctrl = new AbortController(); abortRef.current = ctrl
    const toastId = toast.loading(t("upload.preparing"), {
      description: file.name,
    })
    try {
      setState("REQUESTING_URL"); setProgress(15)
      setMessage(t("upload.preparing"))
      const contentType = getAcceptedMimeType(file) ?? file.type
      const requestedDocumentType = hint === "AUTO" ? undefined : hint
      const req = {
        originalFileName: file.name,
        mimeType: contentType,
        fileSizeBytes: file.size,
        pageCount: pages || 1,
        ...(requestedDocumentType ? { documentType: requestedDocumentType } : {}),
      }
      const res = await requestUploadUrl(req)
      throwIfAborted(ctrl.signal)

      setState("UPLOADING"); setProgress(30)
      setMessage(t("upload.uploading"))
      toast.loading(t("upload.uploading"), {
        id: toastId,
        description: file.name,
      })
      await uploadDocumentFile(res.uploadUrl, file, {
        contentType,
        headers: res.uploadHeaders,
        signal: ctrl.signal,
        onProgress: (p) => {
          setProgress(Math.min(85, 30 + Math.round(p * 0.55)))
          setMessage(t("upload.uploadingProgress", { progress: p }))
        },
      })
      throwIfAborted(ctrl.signal)
      

      setState("QUEUING"); setProgress(92)
      setMessage(apiMode ? t("upload.queuedAws") : t("upload.queuedDemo"))
      toast.loading(apiMode ? t("upload.queuedAws") : t("upload.queuedDemo"), {
        id: toastId,
        description: file.name,
      })
      const uid    = session?.userId ?? "user-123"
      const base   = createQueuedDocument(req, res, uid)
      const documentType = requestedDocumentType ?? base.documentType
      const queued = { ...base, documentType, status: nextUploadStatus("UPLOADED") }
      upsertDocument(queued); setCreatedDocId(queued.documentId)

      let syncedStatus = ""
      if (apiMode) {
        setProgress(94)
        setMessage(t("upload.waitingWorkflow"))
        const started = await processDocument(res.documentId, res.rawS3Key, {
          originalFileName: req.originalFileName,
          mimeType: req.mimeType,
          documentType,
          pageCount: req.pageCount,
        })
        throwIfAborted(ctrl.signal)
        if (started.status && isKnownDocumentStatus(started.status)) {
          syncedStatus = started.status
          upsertDocument({
            ...queued,
            status: started.status,
            updatedAt: new Date().toISOString(),
          })
        } else {
          syncedStatus = "QUEUED"
        }

        setProgress(96)
        const refreshed = await pollDocumentResult(res.documentId, ctrl.signal)
        syncedStatus = refreshed?.status ?? syncedStatus
      }

      setProgress(100); setState("COMPLETE")
      const finalMessage = apiMode
          ? syncedStatus
            ? t("upload.backendUpdated", { status: t(`status.${syncedStatus}` as TranslationKey) ?? syncedStatus })
            : t("upload.backgroundProcessing")
          : t("upload.successProcessing")
      setMessage(finalMessage)
      toast.success(finalMessage, {
        id: toastId,
        description: file.name,
      })
    } catch (err) {
      const errorMessage = err instanceof DOMException && err.name === "AbortError" ? t("upload.canceled") : err instanceof Error ? err.message : t("upload.startFailed")
      setState("ERROR"); setMessage(errorMessage)
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info(errorMessage, {
          id: toastId,
          description: file.name,
        })
      } else {
        toast.error(errorMessage, {
          id: toastId,
          description: file.name,
        })
      }
    } finally {
      abortRef.current = null
    }
  }

  const isBusy    = ["VALIDATING","REQUESTING_URL","UPLOADING","QUEUING"].includes(state)
  const canUpload = Boolean(file) && !validErr && !pagesPending && !isBusy && state !== "COMPLETE"
  const selectedMimeType = file ? getAcceptedMimeType(file) : null

  // ── Derived drop zone state ───────────────────────────────────────────────
  const dzState = dragging ? "drag" : validErr ? "error" : (file && !validErr) ? "ready" : "idle"

  return (
    <BaseLayout
      title={t("upload.title")}
      description={t("upload.description")}
    >
      <div className="grid min-w-0 items-start gap-6 px-4 lg:grid-cols-[1fr_360px] lg:px-6">

        {/* ── CỘT TRÁI: Upload action ─────────────────────────────────────── */}
        <div className="grid gap-5">

        {/* ── CARD 1: Upload — ưu tiên cao nhất, to và rõ ────────────────── */}
        <Card className="overflow-hidden rounded-2xl shadow-sm">

          {/* Drop zone — phần quan trọng nhất, chiếm không gian lớn */}
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold">{t("upload.selectFile")}</span>
              {file && (
                <Button type="button" variant="ghost" size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground cursor-pointer"
                  onClick={clearFile}>
                  <Trash2 className="size-3.5" />{t("upload.delete")}
                </Button>
              )}
            </div>

            {/* Drop zone */}
            <label
              htmlFor="doc-file"
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={[
                "group relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200",
                dzState === "drag"  && "border-[#d8ff72] bg-[#d8ff72]/8 scale-[1.01]",
                dzState === "ready" && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10",
                dzState === "error" && "border-destructive/50 bg-destructive/5",
                dzState === "idle"  && "border-muted-foreground/20 bg-muted/10 hover:border-muted-foreground/40 hover:bg-muted/20",
              ].filter(Boolean).join(" ")}
            >
              {/* Icon */}
              <div className={[
                "flex size-14 items-center justify-center rounded-2xl border-2 shadow-sm transition-all duration-200 group-hover:-translate-y-1",
                dzState === "ready" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                  : dzState === "error" ? "border-destructive/20 bg-destructive/5"
                  : "border-border bg-background",
              ].join(" ")}>
                {dzState === "ready"
                  ? <FileText className="size-6 text-emerald-600 dark:text-emerald-400" />
                  : dzState === "error"
                    ? <XCircle className="size-6 text-destructive" />
                    : <UploadCloud className="size-6 text-muted-foreground" />}
              </div>

              {/* Text */}
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  {dzState === "drag"  && t("upload.dropHere")}
                  {dzState === "ready" && file?.name}
                  {dzState === "error" && (file?.name ?? t("upload.invalidFile"))}
                  {dzState === "idle"  && t("upload.dragOrChoose")}
                </p>
                <p className={`text-sm ${dzState === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {dzState === "ready" && file
                    ? `${fmtSize(file.size)}${pages ? ` · ${pages} ${t("upload.pages")}` : ""} · ${t("upload.ready")}`
                    : dzState === "error"
                      ? validErr
                      : `PDF, JPG hoặc PNG · ${fmtSize(MAX_UPLOAD_FILE_SIZE_BYTES)} · ${MAX_UPLOAD_PAGE_COUNT} ${t("upload.pages")}`}
                </p>
              </div>

              <span className="rounded-lg border bg-background px-5 py-2 text-sm font-medium shadow-sm transition-shadow group-hover:shadow-md">
                {dzState === "ready" ? t("upload.chooseOther") : t("upload.chooseFile")}
              </span>
            </label>
            <input id="doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={handleChange} />

            {file && previewUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border bg-muted/10">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t("upload.preview")}</p>
                    <p className="truncate text-xs text-muted-foreground">{file.name}</p>
                  </div>
                  {pagesPending ? (
                    <Badge variant="outline" className="gap-1.5">
                      <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      {t("upload.reading")}
                    </Badge>
                  ) : pages ? (
                    <Badge variant="outline">{pages} trang</Badge>
                  ) : null}
                </div>
                <div className="h-[320px] bg-background sm:h-[420px]">
                  {selectedMimeType === "application/pdf" ? (
                    <object
                      data={`${previewUrl}#page=1&toolbar=0&navpanes=0`}
                      type="application/pdf"
                      className="h-full w-full"
                    >
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                        <FileText className="size-8" />
                        {t("upload.pdfPreviewUnsupported")}
                      </div>
                    </object>
                  ) : (
                    <img
                      src={previewUrl}
                      alt={t("upload.previewAlt", { name: file.name })}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Loại tài liệu */}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">{t("upload.documentType")}</p>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 [&>button]:min-w-0">
                {([
                  { key: "AUTO",    label: t("upload.auto"),    sub: "Auto"  },
                  { key: "INVOICE", label: t("upload.invoice"),    sub: "Invoice"       },
                  { key: "RECEIPT", label: t("upload.receipt"),  sub: "Receipt"       },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setHint(opt.key)}
                    className={[
                      "flex flex-col items-start gap-0.5 rounded-xl border px-2 py-2.5 sm:px-4 sm:py-3 text-left transition-all duration-150 min-w-0 overflow-hidden",
                      hint === opt.key
                        ? "border-[#0f2a22] bg-[#0f2a22] text-white shadow-sm"
                        : "bg-background hover:border-foreground/25 hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <span className="text-xs sm:text-sm font-semibold truncate w-full">{opt.label}</span>
                    <span className={`font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] truncate w-full ${hint === opt.key ? "text-white/50" : "text-muted-foreground/60"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress — chỉ hiện khi đang tải */}
            {(isBusy || state === "COMPLETE" || state === "ERROR") && (
              <div className={[
                "mt-4 rounded-xl border p-4",
                state === "COMPLETE" ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-900/10"
                  : state === "ERROR" ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-muted/20",
              ].join(" ")}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {state === "COMPLETE"
                      ? <CheckCircle2 className="size-4 text-emerald-600" />
                      : state === "ERROR"
                        ? <XCircle className="size-4 text-destructive" />
                        : <span className="size-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />}
                    <span className={`text-sm font-medium ${state === "COMPLETE" ? "text-emerald-700 dark:text-emerald-300" : state === "ERROR" ? "text-destructive" : ""}`}>
                      {message}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
                </div>
                <Progress
                  value={progress}
                  className={`h-1.5 ${state === "COMPLETE" ? "[&>div]:bg-emerald-500" : state === "ERROR" ? "[&>div]:bg-destructive" : ""}`}
                />
              </div>
            )}

            {/* CTA buttons */}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                className="cursor-pointer px-6"
                size="lg"
                onClick={handleUpload}
                disabled={!canUpload}
              >
                <UploadCloud className="size-5" />
                {isBusy ? t("upload.processing") : state === "ERROR" ? t("upload.retry") : t("upload.uploadAndProcess")}
              </Button>
              {isBusy && (
                <Button type="button" variant="outline" size="lg" className="cursor-pointer" onClick={() => abortRef.current?.abort()}>
                  <XCircle className="size-4" />{t("upload.cancel")}
                </Button>
              )}
              {state === "ERROR" && (
                <Button type="button" variant="outline" size="lg" className="cursor-pointer" onClick={clearFile}>
                  <RefreshCw className="size-4" />{t("upload.chooseOther")}
                </Button>
              )}
              {state === "COMPLETE" && createdDocId && (
                <Button asChild variant="outline" size="lg" className="cursor-pointer">
                  <Link to={`/documents/${createdDocId}`}>
                    {t("upload.viewResult")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Success state — tài liệu vừa tải lên */}
            {state === "COMPLETE" && createdDocId && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-900/15">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{t("upload.successTitle")}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {apiMode
                      ? t("upload.successAws")
                      : t("upload.successDemo")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CARD 2: Tài liệu đang xử lý — thứ hai người dùng cần biết ─── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("upload.processingDocuments")}</h2>
            <Link to="/documents" className="text-xs text-primary hover:underline">
              {t("common.viewAll")} →
            </Link>
          </div>

          {recentUploads.length ? (
            <div className="grid gap-2">
              {recentUploads.map((d) => {
                const meta = statusMeta[d.status]
                const Icon = meta.icon
                return (
                  <Link
                    key={d.documentId}
                    to={`/documents/${d.documentId}`}
                    className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/30 shadow-sm"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.originalFileName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {d.documentType === "INVOICE" ? t("upload.invoice") : d.documentType === "RECEIPT" ? t("upload.receipt") : t("detail.unknown")}
                        {" · "}
                        {new Date(d.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${meta.tone}`}>
                      <Icon className={`size-3 ${d.status === "PROCESSING" ? "animate-spin" : ""}`} />
                      {t(`status.${d.status}` as TranslationKey)}
                    </Badge>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              <FileCheck className="mx-auto mb-2 size-8 opacity-30" />
              {t("upload.noProcessing")}
            </div>
          )}
        </div>

        </div>{/* end cột trái */}

        {/* ── CỘT PHẢI: thông tin hỗ trợ (sticky) ──────────────────────────── */}
        <div className="grid gap-5 lg:sticky lg:top-[calc(var(--header-height)+1.25rem)] lg:self-start">

          {/* Yêu cầu tệp */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold">{t("upload.requirementsTitle")}</h2>
              <div className="grid gap-2.5">
                {[
                  { ok: true,  label: t("upload.requirementFormat")                               },
                  { ok: true,  label: t("upload.requirementSize", { size: fmtSize(MAX_UPLOAD_FILE_SIZE_BYTES) }) },
                  { ok: true,  label: t("upload.requirementPages", { count: MAX_UPLOAD_PAGE_COUNT })       },
                  { ok: true,  label: t("upload.requirementScan")                     },
                  { ok: false, label: t("upload.requirementNoScreenshot")                              },
                  { ok: false, label: t("upload.requirementNoExtra") },
                ].map((r) => (
                  <div key={r.label} className="flex items-start gap-2.5 text-sm">
                    {r.ok
                      ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      : <XCircle     className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />}
                    <span className={r.ok ? "" : "text-muted-foreground"}>{r.label}</span>
                  </div>
                ))}
              </div>

              {/* Security */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-900/10">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p className="text-xs leading-5 text-emerald-800 dark:text-emerald-300">
                  <strong>{t("upload.securityStrong")}</strong>{" "}
                  {t("upload.securityBody")}
                </p>
              </div>

              {/* Processing time */}
              <div className="mt-3 flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">{t("upload.processingTime")}</p>
                  <p className="text-sm font-semibold">{t("upload.timePerPage")}</p>
                </div>
              </div>

              {!apiMode && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {t("upload.demoMode")}
                </div>
              )}
            </CardContent>
          </Card>

        </div>{/* end cột phải */}

      </div>
    </BaseLayout>
  )
}
