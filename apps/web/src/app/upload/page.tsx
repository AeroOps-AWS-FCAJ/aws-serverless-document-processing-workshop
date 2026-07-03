"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
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
import { isApiConfigured, requestUploadUrl, uploadDocumentFile } from "@/lib/docuflow-api"
import { createQueuedDocument, nextUploadStatus, useDocuFlowDocuments } from "@/lib/docuflow-store"
import { statusMeta } from "@/lib/docuflow-data"
import { useAuth } from "@/contexts/auth-context"

// ─── Constants ────────────────────────────────────────────────────────────────
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"])
const maxFileSize  = 10 * 1024 * 1024
const maxPageCount = 5

type UploadState  = "IDLE" | "VALIDATING" | "REQUESTING_URL" | "UPLOADING" | "QUEUING" | "COMPLETE" | "ERROR"
type DocumentHint = "AUTO" | "INVOICE" | "RECEIPT"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(n: number) {
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

async function estimatePages(file: File): Promise<number | null> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") return 1
  try {
    const t = new TextDecoder("latin1").decode(await file.arrayBuffer())
    return t.match(/\/Type\s*\/Page(?!s)\b/g)?.length ?? null
  } catch { return null }
}

function getErrMsg(e: unknown) {
  if (e instanceof DOMException && e.name === "AbortError") return "Đã hủy tải lên. Bạn có thể thử lại."
  if (e instanceof Error) return e.message
  return "Không thể bắt đầu tải lên. Kiểm tra tệp và thử lại."
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { session }                   = useAuth()
  const { documents, upsertDocument } = useDocuFlowDocuments()
  const abortRef                      = useRef<AbortController | null>(null)
  const apiMode                       = isApiConfigured()

  const [file,         setFile]         = useState<File | null>(null)
  const [hint,         setHint]         = useState<DocumentHint>("AUTO")
  const [pages,        setPages]        = useState<number | null>(null)
  const [pagesPending, setPagesPending] = useState(false)
  const [dragging,     setDragging]     = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [state,        setState]        = useState<UploadState>("IDLE")
  const [message,      setMessage]      = useState("")
  const [createdDocId, setCreatedDocId] = useState<string | null>(null)

  // ── Validation ────────────────────────────────────────────────────────────
  const validErr = useMemo(() => {
    if (!file) return null
    if (!allowedTypes.has(file.type))      return "Loại tệp không được hỗ trợ. Dùng PDF, JPG hoặc PNG."
    if (file.size > maxFileSize)           return "Tệp vượt giới hạn 10 MB."
    if (pages && pages > maxPageCount)     return `PDF có ${pages} trang — tối đa ${maxPageCount} trang.`
    return null
  }, [file, pages])

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
    if (!f) { setState("IDLE"); return }
    setState("VALIDATING"); setPagesPending(true)
    const pc = await estimatePages(f)
    setPages(pc); setPagesPending(false); setState("IDLE")
  }, [])

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

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file || validErr || pagesPending) {
      setState("ERROR"); setMessage(validErr ?? "Chờ kiểm tra tệp hoàn tất."); return
    }
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      setState("REQUESTING_URL"); setProgress(15)
      setMessage("Đang chuẩn bị...")
      const req = { originalFileName: file.name, mimeType: file.type, fileSizeBytes: file.size, pageCount: pages || 1 }
      const res = await requestUploadUrl(req)

      setState("UPLOADING"); setProgress(30)
      setMessage("Đang tải lên...")
      await uploadDocumentFile(res.uploadUrl, file, {
        contentType: file.type,
        signal: ctrl.signal,
        onProgress: (p) => {
          setProgress(Math.min(85, 30 + Math.round(p * 0.55)))
          setMessage(`Đang tải lên... ${p}%`)
        },
      })
      

      setState("QUEUING"); setProgress(92)
      setMessage("Đang xếp hàng xử lý...")
      const uid    = session?.userId ?? "user-123"
      const base   = createQueuedDocument(req, res, uid)
      const queued = { ...base, documentType: hint === "AUTO" ? base.documentType : hint, status: nextUploadStatus("UPLOADED") }
      upsertDocument(queued); setCreatedDocId(queued.documentId)
      setProgress(100); setState("COMPLETE")
      setMessage("Tải lên thành công! Hệ thống đang xử lý tài liệu.")
    } catch (err) {
      setState("ERROR"); setMessage(getErrMsg(err))
    } finally {
      abortRef.current = null
    }
  }

  const isBusy    = ["VALIDATING","REQUESTING_URL","UPLOADING","QUEUING"].includes(state)
  const canUpload = Boolean(file) && !validErr && !pagesPending && !isBusy && state !== "COMPLETE"

  // ── Derived drop zone state ───────────────────────────────────────────────
  const dzState = dragging ? "drag" : validErr ? "error" : (file && !validErr) ? "ready" : "idle"

  return (
    <BaseLayout
      title="Tải tài liệu lên"
      description="Chọn hóa đơn hoặc biên nhận để bắt đầu xử lý tự động."
    >
      <div className="grid min-w-0 items-start gap-6 px-4 lg:grid-cols-[1fr_360px] lg:px-6">

        {/* ── CỘT TRÁI: Upload action ─────────────────────────────────────── */}
        <div className="grid gap-5">

        {/* ── CARD 1: Upload — ưu tiên cao nhất, to và rõ ────────────────── */}
        <Card className="overflow-hidden rounded-2xl shadow-sm">

          {/* Drop zone — phần quan trọng nhất, chiếm không gian lớn */}
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold">Chọn tệp để tải lên</span>
              {file && (
                <Button type="button" variant="ghost" size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground cursor-pointer"
                  onClick={clearFile}>
                  <Trash2 className="size-3.5" />Xóa
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
                  {dzState === "drag"  && "Thả tệp vào đây"}
                  {dzState === "ready" && file?.name}
                  {dzState === "error" && (file?.name ?? "Tệp không hợp lệ")}
                  {dzState === "idle"  && "Kéo thả hoặc nhấn chọn tệp"}
                </p>
                <p className={`text-sm ${dzState === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {dzState === "ready" && file
                    ? `${fmtSize(file.size)}${pages ? ` · ${pages} trang` : ""} · Sẵn sàng tải lên`
                    : dzState === "error"
                      ? validErr
                      : "PDF, JPG hoặc PNG · Tối đa 10 MB · Tối đa 5 trang"}
                </p>
              </div>

              <span className="rounded-lg border bg-background px-5 py-2 text-sm font-medium shadow-sm transition-shadow group-hover:shadow-md">
                {dzState === "ready" ? "Chọn tệp khác" : "Chọn tệp"}
              </span>
            </label>
            <input id="doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={handleChange} />

            {/* Loại tài liệu */}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Loại tài liệu</p>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 [&>button]:min-w-0">
                {([
                  { key: "AUTO",    label: "Tự động",    sub: "AI nhận diện"  },
                  { key: "INVOICE", label: "Hóa đơn",    sub: "Invoice"       },
                  { key: "RECEIPT", label: "Biên nhận",  sub: "Receipt"       },
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
                {isBusy ? "Đang xử lý..." : state === "ERROR" ? "Thử lại" : "Tải lên và xử lý"}
              </Button>
              {state === "UPLOADING" && (
                <Button type="button" variant="outline" size="lg" className="cursor-pointer" onClick={() => abortRef.current?.abort()}>
                  <XCircle className="size-4" />Hủy
                </Button>
              )}
              {state === "ERROR" && file && (
                <Button type="button" variant="outline" size="lg" className="cursor-pointer" onClick={handleUpload} disabled={pagesPending || !!validErr}>
                  <RefreshCw className="size-4" />Thử lại
                </Button>
              )}
              {createdDocId && (
                <Button asChild variant="outline" size="lg" className="cursor-pointer">
                  <Link to={`/documents/${createdDocId}`}>
                    Xem kết quả <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Success state — tài liệu vừa tải lên */}
            {state === "COMPLETE" && createdDocId && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-900/15">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Tải lên thành công!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Tài liệu đang được xử lý tự động. Kết quả sẽ có trong vài giây.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── CARD 2: Tài liệu đang xử lý — thứ hai người dùng cần biết ─── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tài liệu đang xử lý</h2>
            <Link to="/documents" className="text-xs text-primary hover:underline">
              Xem tất cả →
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
                        {d.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"}
                        {" · "}
                        {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${meta.tone}`}>
                      <Icon className={`size-3 ${d.status === "PROCESSING" ? "animate-spin" : ""}`} />
                      {meta.label}
                    </Badge>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              <FileCheck className="mx-auto mb-2 size-8 opacity-30" />
              Chưa có tài liệu nào đang xử lý.
            </div>
          )}
        </div>

        </div>{/* end cột trái */}

        {/* ── CỘT PHẢI: thông tin hỗ trợ (sticky) ──────────────────────────── */}
        <div className="grid gap-5 lg:sticky lg:top-[calc(var(--header-height)+1.25rem)] lg:self-start">

          {/* Yêu cầu tệp */}
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold">Tệp của bạn cần đáp ứng</h2>
              <div className="grid gap-2.5">
                {[
                  { ok: true,  label: "Định dạng PDF, JPG hoặc PNG"                               },
                  { ok: true,  label: "Kích thước tối đa 10 MB"                                   },
                  { ok: true,  label: "Tối đa 5 trang mỗi tài liệu"                               },
                  { ok: true,  label: "Scan rõ nét, không bị mờ hoặc nghiêng"                     },
                  { ok: false, label: "Không dùng ảnh chụp màn hình"                              },
                  { ok: false, label: "Không tải tài liệu có thông tin ngoài hóa đơn / biên nhận" },
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
                  <strong>Tệp của bạn được bảo mật hoàn toàn.</strong>{" "}
                  Tệp gốc không bao giờ rời khỏi môi trường AWS riêng tư.
                </p>
              </div>

              {/* Processing time */}
              <div className="mt-3 flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Thời gian xử lý</p>
                  <p className="text-sm font-semibold">30 – 60 giây / trang</p>
                </div>
              </div>

              {!apiMode && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/80 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Đang chạy ở chế độ demo — tài liệu không gửi lên AWS thực.
                </div>
              )}
            </CardContent>
          </Card>

        </div>{/* end cột phải */}

      </div>
    </BaseLayout>
  )
}
