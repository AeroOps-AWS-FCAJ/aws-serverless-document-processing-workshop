"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft, BadgeCheck, CheckCircle2, Clock3, Copy, Database, Download, FileJson,
  FileText, Plus, RefreshCw, Save, ShieldAlert, Trash2, TrendingUp, FileWarning, UploadCloud
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney, statusMeta, supportedCurrencies, type DocumentRecord, type DocumentStatus } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"
import { deleteDocument, getDocument, isApiConfigured, retryDocument, reviewDocument } from "@/lib/docuflow-api"
import { CONFIDENCE_THRESHOLD } from "@docuflow/shared-config"
import { toast } from "sonner"
import type { LineItem } from "@docuflow/shared-types"

type LineItemForm = {
  lineItemId: string
  description: string
  quantity: string
  unitPriceAmount: string
  taxAmount: string
  totalAmount: string
  confidenceScore: number
}

type ReviewForm = {
  invoiceNumber: string
  vendorName: string
  invoiceDate: string
  dueDate: string
  currency: string
  subtotalAmount: string
  discountAmount: string
  shippingAmount: string
  totalAmount: string
  taxAmount: string
}

type ReviewFields = {
  invoiceNumber: string
  vendorName: string
  invoiceDate: string
  dueDate: string
  currency: string
  subtotalAmount?: number
  discountAmount?: number
  shippingAmount?: number
  totalAmount: number
  taxAmount: number | null
  lineItems: LineItem[]
}

type ReviewCorrection = {
  fieldName: string
  oldValue: unknown
  newValue: unknown
}

type ReviewPayload = {
  corrections: ReviewCorrection[]
  fields: ReviewFields
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = statusMeta[status]; const Icon = meta.icon
  return <Badge variant="outline" className={meta.tone}><Icon className="size-3.5" />{meta.label}</Badge>
}

function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  isDeleting,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description: string
  isDeleting: boolean
  onConfirm: () => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    const confirmed = await onConfirm()
    if (confirmed) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isDeleting) setOpen(nextOpen) }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setOpen(false)} disabled={isDeleting}>
            Hủy
          </Button>
          <Button type="button" variant="destructive" className="cursor-pointer" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? <RefreshCw className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Xóa tài liệu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const isLow = score > 0 && score < CONFIDENCE_THRESHOLD
  const isZero = score === 0
  return (
    <div className={`rounded-xl border p-4 ${isLow ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-900/10" : isZero ? "border-border bg-muted/20" : "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-900/10"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className={`font-medium text-sm ${isLow ? "text-amber-800 dark:text-amber-200" : isZero ? "text-muted-foreground" : "text-emerald-800 dark:text-emerald-200"}`}>
            {isZero ? "Chờ trích xuất" : isLow ? "Độ tin cậy thấp — cần kiểm duyệt" : "Độ tin cậy tốt"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">Ngưỡng duyệt: {Math.round(CONFIDENCE_THRESHOLD * 100)}%</div>
        </div>
        <div className={`rounded-lg border px-3 py-1.5 font-mono text-lg font-bold ${isLow ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200" : isZero ? "border-border bg-muted text-muted-foreground" : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"}`}>
          {pct}%
        </div>
      </div>
      <Progress value={pct} className={`h-2 ${isLow ? "[&>div]:bg-amber-500" : isZero ? "" : "[&>div]:bg-emerald-500"}`} />
    </div>
  )
}

function ProcessingFieldSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-muted/20 p-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

function buildTimeline(doc: DocumentRecord) {
  const base: DocumentStatus[] = ["UPLOADED", "QUEUED", "PROCESSING"]
  const map: Record<DocumentStatus, DocumentStatus[]> = {
    UPLOADED: base, QUEUED: base, PROCESSING: base,
    EXTRACTED: [...base, "EXTRACTED"],
    REVIEW_REQUIRED: [...base, "REVIEW_REQUIRED"],
    FAILED: [...base, "FAILED"],
    CORRECTED: [...base, "REVIEW_REQUIRED", "CORRECTED"],
    APPROVED: [...base, "REVIEW_REQUIRED", "CORRECTED", "APPROVED"],
  }
  const statuses = map[doc.status]
  const ci = statuses.indexOf(doc.status)
  return statuses.map((s, i) => ({ status: s, done: i <= ci }))
}

function isLikelyPdf(doc: DocumentRecord) {
  return doc.originalFileName.toLowerCase().endsWith(".pdf") || doc.sourceUrl?.toLowerCase().includes(".pdf")
}

function DocumentPreview({ doc }: { doc: DocumentRecord }) {
  const hasSourceUrl = Boolean(doc.sourceUrl)
  return (
    <Card className="overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" />Xem trước tài liệu nguồn</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">{doc.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"}</Badge>
        </div>
        {!hasSourceUrl && (
          <CardDescription className="text-xs">
            Backend chưa trả URL xem tài liệu gốc; bên dưới là bản dựng từ dữ liệu đã trích xuất để đối chiếu nhanh.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {doc.sourceUrl ? (
          isLikelyPdf(doc) ? (
            <iframe
              title={`Tài liệu nguồn ${doc.originalFileName}`}
              src={doc.sourceUrl}
              className="h-[620px] w-full border-0 bg-muted"
            />
          ) : (
            <div className="flex max-h-[680px] justify-center overflow-auto bg-muted/30 p-4">
              <img src={doc.sourceUrl} alt={`Tài liệu nguồn ${doc.originalFileName}`} className="h-auto max-w-full rounded-lg border bg-white shadow-sm" />
            </div>
          )
        ) : (
        <div className="m-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Nhà cung cấp</div>
              <div className="mt-1 text-lg font-bold leading-tight">{doc.vendorName}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Mã chứng từ</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{doc.documentId}</div>
            </div>
          </div>
          <div className="grid gap-3 border-y py-4 text-sm sm:grid-cols-3">
            {[["Số hóa đơn", doc.invoiceNumber || "Không phát hiện"], ["Ngày", doc.invoiceDate], ["Hạn thanh toán", doc.dueDate || "Không phát hiện"], ["Tiền tệ",doc.currency],["Độ tin cậy",`${Math.round(doc.confidenceScore*100)}%`]].map(([l,v])=>(
              <div key={l}><div className="text-xs text-muted-foreground mb-0.5">{l}</div><div className="font-semibold">{v}</div></div>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            {doc.lineItems.length ? doc.lineItems.map((item) => (
              <div key={item.description} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3 text-sm">
                <div><div className="font-medium">{item.description}</div><div className="text-muted-foreground text-xs mt-0.5">SL {item.quantity}</div></div>
                <div className="text-right font-semibold tabular-nums">{formatMoney(item.totalAmount, doc.currency)}</div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                Các mục hàng sẽ xuất hiện khi xử lý tài liệu hoàn tất.
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">Tổng tiền</div>
            <div className="text-2xl font-bold tabular-nums">{formatMoney(doc.totalAmount, doc.currency)}</div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  )
}

function toLineItemForm(item: LineItem, index: number): LineItemForm {
  return {
    lineItemId: item.lineItemId || `item-${index + 1}`,
    description: item.description,
    quantity: String(item.quantity ?? ""),
    unitPriceAmount: String(item.unitPriceAmount ?? ""),
    taxAmount: item.taxAmount == null ? "" : String(item.taxAmount),
    totalAmount: String(item.totalAmount ?? ""),
    confidenceScore: item.confidenceScore ?? 0,
  }
}

function isEqualValue(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

function parseLocalizedNumber(value: string) {
  const cleaned = value
    .trim()
    .replace(/[^\d.,-]/g, "")

  if (!cleaned) return Number.NaN

  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : "."
    const thousandsSeparator = decimalSeparator === "," ? "." : ","
    return Number(
      cleaned
        .replaceAll(thousandsSeparator, "")
        .replace(decimalSeparator, ".")
    )
  }

  if (lastComma >= 0) {
    return Number(cleaned.replaceAll(".", "").replace(",", "."))
  }

  return Number(cleaned.replaceAll(",", ""))
}

function parseAmount(label: string, value: string, options: { required?: boolean; nullable?: boolean } = {}) {
  const trimmed = value.trim()
  if (!trimmed) {
    if (options.required) return { ok: false as const, error: `${label} không được để trống.` }
    return { ok: true as const, value: options.nullable ? null : undefined }
  }

  const parsed = parseLocalizedNumber(trimmed)
  if (!Number.isFinite(parsed)) {
    return { ok: false as const, error: `${label} phải là số hợp lệ.` }
  }
  if (parsed < 0) {
    return { ok: false as const, error: `${label} không được là số âm.` }
  }

  return { ok: true as const, value: parsed }
}

export default function DocumentDetailPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { documents, removeDocument, updateDocument } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const canReview = role === "finance" || role === "admin"
  const localDocument = useMemo(
    () => documents.find((item) => item.documentId === documentId),
    [documents, documentId]
  )
  const localDocumentRef = useRef<DocumentRecord | undefined>(localDocument)
  
  const [doc, setDoc] = useState<DocumentRecord | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reviewNote, setReviewNote] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<ReviewPayload | null>(null)
  const [form, setForm] = useState<ReviewForm>({
    invoiceNumber: "",
    vendorName: "",
    invoiceDate: "",
    dueDate: "",
    currency: "VND",
    subtotalAmount: "",
    discountAmount: "",
    shippingAmount: "",
    totalAmount: "",
    taxAmount: "",
  })
  const [lineItemForms, setLineItemForms] = useState<LineItemForm[]>([])

  const docStatus = doc?.status
  const isProcessing = Boolean(docStatus && ["UPLOADED","QUEUED","PROCESSING"].includes(docStatus))

  useEffect(() => {
    localDocumentRef.current = localDocument
  }, [localDocument])

  const applyDocument = useCallback((nextDocument: DocumentRecord) => {
    setDoc(nextDocument)
    updateDocument(nextDocument.documentId, nextDocument)
  }, [updateDocument])

  const updateFormField = <K extends keyof ReviewForm>(field: K, value: ReviewForm[K]) => {
    setIsDirty(true)
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    if (!documentId) return
    let isMounted = true
    setIsLoading(true)

    getDocument(documentId)
      .then((r) => {
        if (!isMounted) return
        if (r) {
          applyDocument(r as DocumentRecord)
        } else if (localDocumentRef.current) {
          setDoc(localDocumentRef.current)
        } else {
          setDoc(undefined)
        }
      })
      .catch((error) => {
        console.error("Failed to fetch document:", error)
        if (isMounted) setDoc(localDocumentRef.current)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [applyDocument, documentId])

  useEffect(() => {
    setIsDirty(false)
  }, [documentId])

  useEffect(() => {
    if (!doc) return
    if (isDirty) return
    setForm({
      invoiceNumber: doc.invoiceNumber ?? "",
      vendorName: doc.vendorName,
      invoiceDate: doc.invoiceDate,
      dueDate: doc.dueDate ?? "",
      currency: doc.currency,
      subtotalAmount: doc.subtotalAmount == null ? "" : String(doc.subtotalAmount),
      discountAmount: doc.discountAmount == null ? "" : String(doc.discountAmount),
      shippingAmount: doc.shippingAmount == null ? "" : String(doc.shippingAmount),
      totalAmount: String(doc.totalAmount ?? 0),
      taxAmount: doc.taxAmount == null ? "" : String(doc.taxAmount),
    })
    setLineItemForms(doc.lineItems.map(toLineItemForm))
    setReviewNote(doc.reviewerNote ?? "")
  }, [doc, isDirty])

  useEffect(() => {
    if (!documentId || !isApiConfigured() || !docStatus || !["UPLOADED","QUEUED","PROCESSING"].includes(docStatus)) { setIsPolling(false); return }
    let cancelled = false; setIsPolling(true)
    const poll = async () => { 
      try { 
        const r = await getDocument(documentId); 
        if (!cancelled && r) {
          applyDocument(r as DocumentRecord)
        }
      } catch { 
        if (!cancelled) setIsPolling(false) 
      } 
    }
    const id = window.setInterval(poll, 5000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [applyDocument, documentId, docStatus])

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  if (isLoading) {
    return (
      <BaseLayout title="Đang tải..." description="Vui lòng đợi trong giây lát.">
        <div className="grid gap-5 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3 w-72" />
            </CardHeader>
            <CardContent className="grid gap-4">
              <Skeleton className="h-[360px] w-full" />
              <ProcessingFieldSkeleton />
            </CardContent>
          </Card>
          <div className="grid gap-5 content-start">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-64" />
              </CardHeader>
              <CardContent className="grid gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-36 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </BaseLayout>
    )
  }

  if (!doc) {
    return (
      <BaseLayout title="Không tìm thấy tài liệu" description="Tài liệu yêu cầu không tồn tại hoặc không còn khả dụng.">
        <div className="px-4 lg:px-6">
          <Button asChild variant="outline"><Link to="/documents"><ArrowLeft className="size-4" />Về danh sách tài liệu</Link></Button>
        </div>
      </BaseLayout>
    )
  }

  const timeline = buildTimeline(doc)
  const canCorrect = canReview && ["EXTRACTED","REVIEW_REQUIRED","CORRECTED"].includes(doc.status)
  const canApprove = canReview && ["EXTRACTED","CORRECTED","REVIEW_REQUIRED"].includes(doc.status)

  const addLineItem = () => {
    const index = lineItemForms.length
    setIsDirty(true)
    setLineItemForms((current) => [
      ...current,
      {
        lineItemId: `item-${index + 1}`,
        description: "",
        quantity: "1",
        unitPriceAmount: "",
        taxAmount: "",
        totalAmount: "",
        confidenceScore: 1,
      },
    ])
  }

  const updateLineItemForm = (index: number, patch: Partial<LineItemForm>) => {
    setIsDirty(true)
    setLineItemForms((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const removeLineItem = (index: number) => {
    setIsDirty(true)
    setLineItemForms((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const buildReviewPayload = (): ReviewPayload | null => {
    const subtotalAmount = parseAmount("Tạm tính", form.subtotalAmount)
    const discountAmount = parseAmount("Giảm giá", form.discountAmount)
    const shippingAmount = parseAmount("Phí vận chuyển", form.shippingAmount)
    const totalAmount = parseAmount("Tổng tiền", form.totalAmount, { required: true })
    const taxAmount = parseAmount("Thuế", form.taxAmount, { nullable: true })

    for (const result of [subtotalAmount, discountAmount, shippingAmount, totalAmount, taxAmount]) {
      if (!result.ok) {
        toast.error(result.error)
        return null
      }
    }

    const lineItems: LineItem[] = []
    for (const [index, item] of lineItemForms.entries()) {
      const quantity = parseAmount(`Số lượng mục #${index + 1}`, item.quantity, { required: true })
      const unitPriceAmount = parseAmount(`Đơn giá mục #${index + 1}`, item.unitPriceAmount, { required: true })
      const itemTaxAmount = parseAmount(`Thuế mục #${index + 1}`, item.taxAmount)
      const itemTotalAmount = parseAmount(`Thành tiền mục #${index + 1}`, item.totalAmount)

      for (const result of [quantity, unitPriceAmount, itemTaxAmount, itemTotalAmount]) {
        if (!result.ok) {
          toast.error(result.error)
          return null
        }
      }

      lineItems.push({
        lineItemId: item.lineItemId || `item-${index + 1}`,
        description: item.description.trim() || `Mục ${index + 1}`,
        quantity: quantity.value ?? 0,
        unitPriceAmount: unitPriceAmount.value ?? 0,
        taxAmount: itemTaxAmount.value ?? 0,
        totalAmount: itemTotalAmount.value ?? (quantity.value ?? 0) * (unitPriceAmount.value ?? 0),
        confidenceScore: item.confidenceScore,
      })
    }

    const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.totalAmount, 0)
    const normalizedTotalAmount = Number(totalAmount.value ?? 0)

    if (lineItems.length > 0 && Math.abs(lineItemsTotal - normalizedTotalAmount) > 0.01) {
      toast.warning(
        `Tổng dòng hàng (${formatMoney(lineItemsTotal, form.currency)}) lệch với tổng tiền (${formatMoney(normalizedTotalAmount, form.currency)}).`
      )
    }

    const fields: ReviewFields = {
      invoiceNumber: form.invoiceNumber.trim(),
      vendorName: form.vendorName.trim() || "Unknown",
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      currency: form.currency,
      subtotalAmount: subtotalAmount.value ?? undefined,
      discountAmount: discountAmount.value ?? undefined,
      shippingAmount: shippingAmount.value ?? undefined,
      totalAmount: normalizedTotalAmount,
      taxAmount: taxAmount.value == null ? null : Number(taxAmount.value),
      lineItems,
    }

    const corrections = Object.entries(fields)
      .map(([fieldName, newValue]) => ({ fieldName, oldValue: doc[fieldName as keyof typeof doc], newValue }))
      .filter(({ oldValue, newValue }) => {
        if (isEqualValue(oldValue, newValue)) return false
        if (newValue === undefined || newValue === "") return false
        return true
      })

    return { corrections, fields }
  }

  const refreshAfterReview = async (fallbackPatch: Partial<DocumentRecord>) => {
    try {
      const refreshed = await getDocument(doc.documentId)
      if (refreshed) {
        applyDocument(refreshed as DocumentRecord)
        return
      }
    } catch {
      // Fallback below keeps the UI usable if the detail endpoint is briefly stale.
    }

    updateDocument(doc.documentId, fallbackPatch)
    setDoc((current) => current ? { ...current, ...fallbackPatch } : current)
  }

  const handleRefreshDocument = async () => {
    if (!documentId) return

    setIsRefreshing(true)
    try {
      const refreshed = await getDocument(documentId)
      if (refreshed) {
        applyDocument(refreshed as DocumentRecord)
        toast.success("Đã làm mới dữ liệu tài liệu.")
        return
      }

      if (localDocument) {
        setDoc(localDocument)
        toast.info("Backend chưa có metadata mới. Đang dùng bản lưu tạm trên trình duyệt.")
        return
      }

      setDoc(undefined)
      toast.error("Không tìm thấy tài liệu trên backend.")
    } catch (error) {
      console.error("Failed to refresh document:", error)
      toast.error("Không thể làm mới tài liệu. Vui lòng thử lại.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleCopyDocumentId = async () => {
    if (!doc) return
    await navigator.clipboard.writeText(doc.documentId)
    setCopied(true)
    toast.success("Đã sao chép documentId.")
    window.setTimeout(() => setCopied(false), 1400)
  }

  const handleDownloadJson = () => {
    if (!doc) return

    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${doc.documentId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteDocument = async () => {
    if (!doc) return false

    setIsDeleting(true)
    try {
      await deleteDocument(doc.documentId)
      removeDocument(doc.documentId)
      toast.success("Đã xóa tài liệu.")
      navigate("/documents")
      return true
    } catch (error) {
      console.error("Failed to delete document:", error)
      toast.error("Không thể xóa tài liệu. Vui lòng thử lại.")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRetryDocument = async () => {
    if (!doc) return

    setIsRetrying(true)
    try {
      await retryDocument(doc.documentId)
      const patch: Partial<DocumentRecord> = {
        status: "QUEUED",
        errorMessage: "Đã yêu cầu chạy lại quy trình xử lý.",
        updatedAt: new Date().toISOString(),
      }
      updateDocument(doc.documentId, patch)
      setDoc((current) => current ? { ...current, ...patch } : current)
      toast.success("Đã gửi yêu cầu chạy lại xử lý.")
    } catch (error) {
      console.error("Failed to retry document:", error)
      toast.error("Không thể chạy lại xử lý. Kiểm tra endpoint retry trên backend.")
    } finally {
      setIsRetrying(false)
    }
  }

  const handleSaveCorrection = async () => {
    const payload = buildReviewPayload()
    if (!payload) return

    if (payload.corrections.length === 0) {
      toast.info("Không có thay đổi nào để lưu.");
      return;
    }

    setIsReviewing(true)
    try {
      const res = await reviewDocument(doc.documentId, { reviewStatus:"CORRECTED", corrections: payload.corrections, ...(reviewNote.trim()?{reviewerNote:reviewNote.trim()}:{}) })
      const patch = { ...payload.fields, status:res.status, reviewStatus:res.reviewStatus, reviewReasonCodes:[], updatedAt:res.updatedAt, reviewerNote:reviewNote.trim()||null, errorMessage:null }
      await refreshAfterReview(patch)
      setIsDirty(false)
      toast.success("Đã lưu chỉnh sửa. Tài liệu sẵn sàng để phê duyệt.")
    } catch { toast.error("Không thể lưu chỉnh sửa. Vui lòng thử lại.") }
    finally { setIsReviewing(false) }
  }

  const handleApprove = async () => {
    const payload = buildReviewPayload()
    if (!payload) return

    if (!payload.fields.vendorName || !payload.fields.invoiceDate || payload.fields.totalAmount <= 0 || !payload.fields.currency) {
      toast.error("Cần có nhà cung cấp, ngày hóa đơn, tiền tệ và tổng tiền lớn hơn 0 trước khi phê duyệt.")
      return
    }

    setPendingApproval(payload)
  }

  const handleConfirmApprove = async () => {
    if (!pendingApproval) return
    setIsReviewing(true)
    try {
      const res = await reviewDocument(doc.documentId, {
        reviewStatus:"APPROVED",
        ...(pendingApproval.corrections.length ? { corrections: pendingApproval.corrections } : {}),
        ...(reviewNote.trim()?{reviewerNote:reviewNote.trim()}:{}),
      })
      const patch = {
        ...(pendingApproval.corrections.length ? pendingApproval.fields : {}),
        status:res.status,
        reviewStatus:res.reviewStatus,
        reviewReasonCodes:[],
        updatedAt:res.updatedAt,
        reviewerNote:reviewNote.trim()||null,
        errorMessage:null
      }
      await refreshAfterReview(patch)
      setIsDirty(false)
      setPendingApproval(null)
      toast.success("Tài liệu đã được phê duyệt.")
    } catch { toast.error("Không thể phê duyệt. Vui lòng thử lại.") }
    finally { setIsReviewing(false) }
  }

  return (
    <BaseLayout title={doc.originalFileName} description={`${doc.documentId} · ${doc.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"} · ${statusMeta[doc.status].label}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link to="/documents"><ArrowLeft className="size-4" />Danh sách</Link>
          </Button>
          <StatusBadge status={doc.status} />
          {isPolling && (
            <Badge variant="outline" className="gap-1.5 text-primary">
              <span className="size-2 rounded-full bg-current animate-pulse" />
              Đang đồng bộ
            </Badge>
          )}
          {isDirty && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
              Có thay đổi chưa lưu
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={handleRefreshDocument} disabled={isRefreshing}>
            <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
            Làm mới
          </Button>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={handleCopyDocumentId}>
            <Copy className="size-4" />
            {copied ? "Đã sao chép" : "Sao chép ID"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={handleDownloadJson}>
            <Download className="size-4" />
            JSON
          </Button>
          {doc.sourceUrl && (
            <Button asChild variant="outline" size="sm" className="cursor-pointer">
              <a href={doc.sourceUrl} target="_blank" rel="noreferrer">
                <FileText className="size-4" />
                File gốc
              </a>
            </Button>
          )}
          {["FAILED", "REVIEW_REQUIRED"].includes(doc.status) && (
            <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={handleRetryDocument} disabled={isRetrying}>
              <RefreshCw className={isRetrying ? "size-4 animate-spin" : "size-4"} />
              Chạy lại
            </Button>
          )}
          <ConfirmDeleteDialog
            title="Xóa tài liệu này?"
            description={`Tài liệu ${doc.originalFileName} sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác từ giao diện.`}
            isDeleting={isDeleting}
            onConfirm={handleDeleteDocument}
            trigger={
              <Button type="button" variant="destructive" size="sm" className="cursor-pointer">
                <Trash2 className="size-4" />
                Xóa
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-5 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">

        {/* Left column */}
        <div className="grid gap-5 content-start">
          {isProcessing && (
            <Card className="rounded-xl border-cyan-200 bg-cyan-50/60 shadow-sm dark:border-cyan-900 dark:bg-cyan-950/20">
              <CardContent className="flex items-start gap-3 p-4">
                <RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin text-cyan-700 dark:text-cyan-300" />
                <div>
                  <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">Tài liệu đang được xử lý</div>
                  <p className="mt-1 text-xs leading-5 text-cyan-800/80 dark:text-cyan-200/80">
                    Backend đang ghi metadata hoặc trích xuất dữ liệu. Bạn có thể giữ trang này mở; hệ thống sẽ tự làm mới mỗi 5 giây.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <DocumentPreview doc={doc} />

          <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{doc.originalFileName}</CardTitle>
                  <CardDescription className="text-xs">Các trường có cấu trúc được trích xuất từ tài liệu đã tải lên.</CardDescription>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4">
              {isProcessing ? (
                <ProcessingFieldSkeleton />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Số hóa đơn", doc.invoiceNumber || "Không phát hiện"],
                    ["Nhà cung cấp", doc.vendorName],
                    ["Ngày hóa đơn", doc.invoiceDate],
                    ["Hạn thanh toán", doc.dueDate || "Không phát hiện"],
                    ["Tạm tính", doc.subtotalAmount == null ? "Không phát hiện" : formatMoney(doc.subtotalAmount, doc.currency)],
                    ["Giảm giá", doc.discountAmount == null ? "Không phát hiện" : formatMoney(doc.discountAmount, doc.currency)],
                    ["Phí vận chuyển", doc.shippingAmount == null ? "Không phát hiện" : formatMoney(doc.shippingAmount, doc.currency)],
                    ["Tổng tiền", formatMoney(doc.totalAmount, doc.currency)],
                    ["Thuế", doc.taxAmount == null ? "Không phát hiện" : formatMoney(doc.taxAmount, doc.currency)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 font-semibold text-sm">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {role === "admin" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Nhà cung cấp AI</div>
                    <div className="mt-1 font-mono text-xs font-medium">{doc.aiProvider}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Phương pháp</div>
                    <div className="mt-1 break-all font-mono text-xs">{doc.normalizationMethod}</div>
                  </div>
                </div>
              )}

              <ConfidenceBar score={doc.confidenceScore} />

              {doc.reviewReasonCodes.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    <FileWarning className="size-4" />Lý do cần duyệt
                  </div>
                  <ul className="mt-2.5 grid gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    {doc.reviewReasonCodes.map((r) => <li key={r} className="flex gap-2"><span aria-hidden>·</span><span>{r}</span></li>)}
                  </ul>
                </div>
              )}

              {doc.reviewedAt && (
                <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><div className="mb-1 text-xs text-muted-foreground">Raw object</div><div className="break-all font-mono text-[10px] bg-muted/40 rounded p-2">{doc.rawS3Key}</div></div>
                    <div><div className="mb-1 text-xs text-muted-foreground">Processed object</div><div className="break-all font-mono text-[10px] bg-muted/40 rounded p-2">{doc.processedS3Key}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div><div className="text-xs text-muted-foreground">Ngày duyệt</div><div className="mt-1 text-sm font-medium">{formatDate(doc.reviewedAt)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Người duyệt</div><div className="mt-1 text-sm font-medium">{doc.reviewedBy ?? "Không xác định"}</div></div>
                  </div>
                  {doc.reviewerNote && <div className="pt-2 border-t"><div className="text-xs text-muted-foreground">Ghi chú</div><div className="mt-1 text-sm leading-6">{doc.reviewerNote}</div></div>}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border">
                <Table className="min-w-[480px]">
                  <TableHeader><TableRow className="bg-muted/30"><TableHead>Mô tả</TableHead><TableHead className="text-right">SL</TableHead><TableHead className="text-right">Đơn giá</TableHead><TableHead className="text-right">Thành tiền</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {doc.lineItems.length ? doc.lineItems.map((item, index) => (
                      <TableRow key={item.lineItemId || `${item.description}-${index}`}>
                        <TableCell className="font-medium text-sm">{item.description}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(item.unitPriceAmount, doc.currency)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatMoney(item.totalAmount, doc.currency)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">Không có mục hàng nào được trích xuất.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="grid gap-5 content-start">
          {(canCorrect || canApprove) && (
            <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md ring-1 ring-primary/10">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-base">Duyệt và phê duyệt</CardTitle>
                <CardDescription className="text-xs">Chỉnh sửa trường không chắc chắn, thêm ghi chú và phê duyệt kết quả đã xác minh.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4">
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="invoiceNumber" className="text-xs font-semibold">Số hóa đơn</Label>
                    <Input id="invoiceNumber" value={form.invoiceNumber} onChange={(e)=>updateFormField("invoiceNumber", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="vendorName" className="text-xs font-semibold">Nhà cung cấp</Label>
                    <Input id="vendorName" value={form.vendorName} onChange={(e)=>updateFormField("vendorName", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="invoiceDate" className="text-xs font-semibold">Ngày hóa đơn</Label>
                      <Input id="invoiceDate" type="date" value={form.invoiceDate} onChange={(e)=>updateFormField("invoiceDate", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="dueDate" className="text-xs font-semibold">Hạn thanh toán</Label>
                      <Input id="dueDate" type="date" value={form.dueDate} onChange={(e)=>updateFormField("dueDate", e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold">Tiền tệ</Label>
                      <Select value={form.currency} onValueChange={(v)=>updateFormField("currency", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {supportedCurrencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <span className="font-mono">{currency.code}</span>
                              <span className="ml-2 text-muted-foreground">{currency.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="subtotalAmount" className="text-xs font-semibold">Tạm tính</Label>
                      <Input id="subtotalAmount" inputMode="decimal" value={form.subtotalAmount} onChange={(e)=>updateFormField("subtotalAmount", e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="discountAmount" className="text-xs font-semibold">Giảm giá</Label>
                      <Input id="discountAmount" inputMode="decimal" value={form.discountAmount} onChange={(e)=>updateFormField("discountAmount", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="shippingAmount" className="text-xs font-semibold">Phí vận chuyển</Label>
                      <Input id="shippingAmount" inputMode="decimal" value={form.shippingAmount} onChange={(e)=>updateFormField("shippingAmount", e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="totalAmount" className="text-xs font-semibold">Tổng tiền</Label>
                      <Input id="totalAmount" inputMode="decimal" value={form.totalAmount} onChange={(e)=>updateFormField("totalAmount", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="taxAmount" className="text-xs font-semibold">Thuế</Label>
                      <Input id="taxAmount" inputMode="decimal" placeholder="Không phát hiện" value={form.taxAmount} onChange={(e)=>updateFormField("taxAmount", e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Mục hàng</Label>
                        <div className="mt-0.5 text-xs text-muted-foreground">Sửa mô tả, số lượng, đơn giá và thành tiền trước khi lưu.</div>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-8 cursor-pointer" onClick={addLineItem}>
                        <Plus className="size-3.5" />Thêm
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {lineItemForms.map((item, index) => (
                        <div key={`${item.lineItemId}-${index}`} className="grid gap-2 rounded-lg border bg-background p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">#{index + 1}</span>
                            <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeLineItem(index)}>
                              <Trash2 className="size-3.5" />
                              <span className="sr-only">Xóa mục hàng</span>
                            </Button>
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-[11px]">Mô tả</Label>
                            <Input value={item.description} onChange={(e)=>updateLineItemForm(index,{description:e.target.value})} className="h-8 text-xs" />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div className="grid gap-1.5">
                              <Label className="text-[11px]">SL</Label>
                              <Input inputMode="decimal" value={item.quantity} onChange={(e)=>updateLineItemForm(index,{quantity:e.target.value})} className="h-8 text-xs" />
                            </div>
                            <div className="grid gap-1.5">
                              <Label className="text-[11px]">Đơn giá</Label>
                              <Input inputMode="decimal" value={item.unitPriceAmount} onChange={(e)=>updateLineItemForm(index,{unitPriceAmount:e.target.value})} className="h-8 text-xs" />
                            </div>
                            <div className="grid gap-1.5">
                              <Label className="text-[11px]">Thuế</Label>
                              <Input inputMode="decimal" value={item.taxAmount} onChange={(e)=>updateLineItemForm(index,{taxAmount:e.target.value})} className="h-8 text-xs" />
                            </div>
                            <div className="grid gap-1.5">
                              <Label className="text-[11px]">Thành tiền</Label>
                              <Input inputMode="decimal" value={item.totalAmount} onChange={(e)=>updateLineItemForm(index,{totalAmount:e.target.value})} className="h-8 text-xs" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {!lineItemForms.length && (
                        <div className="rounded-lg border border-dashed bg-background p-3 text-center text-xs text-muted-foreground">
                          Chưa có mục hàng. Thêm thủ công nếu tài liệu có bảng dịch vụ/sản phẩm.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="reviewNote" className="text-xs font-semibold">Ghi chú duyệt</Label>
                    <Textarea id="reviewNote" value={reviewNote} onChange={(e)=>{ setIsDirty(true); setReviewNote(e.target.value) }} placeholder="Giải thích lý do chỉnh sửa hoặc phê duyệt" className="text-sm min-h-20 resize-none" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="cursor-pointer" onClick={handleSaveCorrection} disabled={!canCorrect||isReviewing}>
                    <Save className="size-4" />Lưu chỉnh sửa
                  </Button>
                  <Button variant="secondary" className="cursor-pointer" onClick={handleApprove} disabled={!canApprove||isReviewing}>
                    <BadgeCheck className="size-4" />Phê duyệt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {doc.status === "FAILED" && (
            <Card className="rounded-xl border-red-200 bg-red-50/70 shadow-sm dark:border-red-900 dark:bg-red-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-red-800 dark:text-red-200">
                  <ShieldAlert className="size-4" />
                  Tài liệu cần tải lên lại
                </CardTitle>
                <CardDescription className="text-xs text-red-700/75 dark:text-red-300/75">
                  Workflow không tạo được kết quả có thể kiểm duyệt. Hãy tải bản scan rõ hơn hoặc đúng định dạng để tạo lượt xử lý mới.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild className="cursor-pointer">
                  <Link to="/upload">
                    <UploadCloud className="size-4" />
                    Tải bản thay thế
                  </Link>
                </Button>
                <Button asChild variant="outline" className="cursor-pointer border-red-200 bg-white/70 text-red-900 hover:bg-white dark:border-red-900 dark:bg-transparent dark:text-red-100">
                  <Link to="/documents">Quay lại danh sách</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {doc.errorMessage && (
            <Card className="rounded-xl border-amber-200 shadow-sm dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300"><ShieldAlert className="size-4" />Ghi chú xử lý</CardTitle>
                <CardDescription className="text-xs">Dùng ghi chú này để quyết định tài liệu cần chỉnh sửa hay tải lên lại.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-amber-800 dark:text-amber-300">
                <p>{doc.errorMessage}</p>
                {doc.status === "FAILED" && (
                  <Button asChild variant="outline" size="sm" className="w-fit cursor-pointer">
                    <Link to="/upload">
                      <UploadCloud className="size-4" />
                      Tải lại tài liệu
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-base">Dòng thời gian trạng thái</CardTitle>
              <CardDescription className="text-xs">
                Tiến trình từ tải lên đến kết quả sử dụng được.
                {isPolling && <span className="ml-2 inline-flex items-center gap-1 text-primary"><span className="pulse-indicator bg-current" />Làm mới mỗi 5 giây</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-0 p-4">
              {timeline.map((item, i) => {
                const meta = statusMeta[item.status]
                const Icon = item.done ? CheckCircle2 : Clock3
                return (
                  <div key={item.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex size-7 items-center justify-center rounded-full border transition-colors ${item.done ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20" : "bg-background"}`}>
                        <Icon className={item.done ? "size-3.5 text-emerald-600" : "size-3.5 text-muted-foreground/40"} />
                      </div>
                      {i < timeline.length - 1 && <div className={`w-px flex-1 my-1 ${item.done ? "bg-emerald-200 dark:bg-emerald-900" : "bg-border"}`} />}
                    </div>
                    <div className={`pb-4 pt-0.5 ${i === timeline.length - 1 ? "pb-0" : ""}`}>
                      <div className={`text-sm font-medium ${item.done ? "" : "text-muted-foreground/60"}`}>{meta.label}</div>
                      <div className="text-xs text-muted-foreground/50">{item.done ? "Hoàn tất hoặc trạng thái hiện tại" : "Chờ chuyển đổi workflow"}</div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {role === "admin" && (
            <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4" />Artifacts lưu trữ</CardTitle>
                <CardDescription className="text-xs">Khóa dự kiến trong raw và processed buckets.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 text-sm">
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground"><Database className="size-3.5" />Raw S3 object</div>
                  <div className="break-all rounded-xl bg-muted/50 p-3 font-mono text-[10px] leading-5">{doc.rawS3Key}</div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground"><FileJson className="size-3.5" />Processed artifact</div>
                  <div className="break-all rounded-xl bg-muted/50 p-3 font-mono text-[10px] leading-5">{doc.processedS3Key}</div>
                </div>
                <Separator />
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <Link to="/documents"><ArrowLeft className="size-4" />Về danh sách</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(pendingApproval)}
        onOpenChange={(open) => {
          if (!open && !isReviewing) setPendingApproval(null)
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b bg-muted/20 px-5 py-4 pr-12">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                <BadgeCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base">Xác nhận phê duyệt tài liệu</DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5">
                  Kiểm tra nhanh dữ liệu cuối cùng trước khi chuyển tài liệu sang trạng thái đã duyệt.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {pendingApproval && (
            <div className="grid gap-4 px-5 py-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Nhà cung cấp</div>
                    <div className="mt-1 truncate text-sm font-semibold">{pendingApproval.fields.vendorName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Ngày hóa đơn</div>
                    <div className="mt-1 text-sm font-semibold">{pendingApproval.fields.invoiceDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Số dòng hàng</div>
                    <div className="mt-1 text-sm font-semibold">{pendingApproval.fields.lineItems.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Thay đổi sẽ lưu</div>
                    <div className="mt-1 text-sm font-semibold">{pendingApproval.corrections.length}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border bg-background px-4 py-3">
                  <div className="text-xs text-muted-foreground">Tổng tiền phê duyệt</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {formatMoney(pendingApproval.fields.totalAmount, pendingApproval.fields.currency)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
                Sau khi phê duyệt, tài liệu sẽ được xem là dữ liệu tài chính đã xác minh. Nếu cần chỉnh sửa thêm, hãy hủy và lưu lại form trước.
              </div>
            </div>
          )}

          <DialogFooter className="border-t bg-muted/10 px-5 py-4">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setPendingApproval(null)} disabled={isReviewing}>
              Hủy
            </Button>
            <Button type="button" className="cursor-pointer" onClick={handleConfirmApprove} disabled={isReviewing}>
              {isReviewing ? <RefreshCw className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              Xác nhận phê duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
