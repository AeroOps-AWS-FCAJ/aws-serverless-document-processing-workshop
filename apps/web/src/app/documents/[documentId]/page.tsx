"use client"

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft, BadgeCheck, CheckCircle2, Clock3, Database, FileJson,
  FileText, ListChecks, Save, ShieldAlert, TrendingUp,
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
import { formatDate, formatMoney, statusMeta, type DocumentRecord, type DocumentStatus } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { useAuth } from "@/contexts/auth-context"
import { getDocument, isApiConfigured, reviewDocument } from "@/lib/docuflow-api"
import { CONFIDENCE_THRESHOLD } from "@docuflow/shared-config"
import { toast } from "sonner"

function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = statusMeta[status]; const Icon = meta.icon
  return <Badge variant="outline" className={meta.tone}><Icon className="size-3.5" />{meta.label}</Badge>
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

function DocumentPreview({ doc }: { doc: DocumentRecord }) {
  return (
    <Card className="overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" />Xem trước tài liệu nguồn</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">{doc.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
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
            {[["Ngày", doc.invoiceDate],["Tiền tệ",doc.currency],["Độ tin cậy",`${Math.round(doc.confidenceScore*100)}%`]].map(([l,v])=>(
              <div key={l}><div className="text-xs text-muted-foreground mb-0.5">{l}</div><div className="font-semibold">{v}</div></div>
            ))}
          </div>
          <div className="mt-5 grid gap-2">
            {doc.lineItems.length ? doc.lineItems.map((item) => (
              <div key={item.description} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3 text-sm">
                <div><div className="font-medium">{item.description}</div><div className="text-muted-foreground text-xs mt-0.5">SL {item.quantity}</div></div>
                <div className="text-right font-semibold tabular-nums">{formatMoney(item.amount, doc.currency)}</div>
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
      </CardContent>
    </Card>
  )
}

export default function DocumentDetailPage() {
  const { documentId } = useParams()
  const { documents, updateDocument } = useDocuFlowDocuments()
  const { session } = useAuth()
  const role = session?.role ?? "finance"
  const matched = documents.find((d) => d.documentId === documentId)
  const doc = matched && (role !== "finance" || matched.userId === session?.userId) ? matched : undefined
  const canReview = role === "finance" || role === "admin"
  const docStatus = doc?.status
  const [reviewNote, setReviewNote] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [form, setForm] = useState({ vendorName:"", invoiceDate:"", currency:"VND" as DocumentRecord["currency"], totalAmount:"", taxAmount:"" })

  useEffect(() => {
    if (!doc) return
    setForm({ vendorName:doc.vendorName, invoiceDate:doc.invoiceDate, currency:doc.currency, totalAmount:String(doc.totalAmount), taxAmount:doc.taxAmount===null?"":String(doc.taxAmount) })
    setReviewNote(doc.reviewerNote ?? "")
  }, [doc])

  useEffect(() => {
    if (!documentId || !isApiConfigured() || !docStatus || !["UPLOADED","QUEUED","PROCESSING"].includes(docStatus)) { setIsPolling(false); return }
    let cancelled = false; setIsPolling(true)
    const poll = async () => { try { const r = await getDocument(documentId); if (!cancelled && r) updateDocument(documentId, r) } catch { if (!cancelled) setIsPolling(false) } }
    void poll()
    const id = window.setInterval(poll, 5000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [documentId, docStatus, updateDocument])

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
  const canCorrect = canReview && ["REVIEW_REQUIRED","CORRECTED"].includes(doc.status)
  const canApprove = canReview && ["EXTRACTED","CORRECTED","REVIEW_REQUIRED"].includes(doc.status)

  const handleSaveCorrection = async () => {
    const fields = { vendorName:form.vendorName.trim()||"Unknown", invoiceDate:form.invoiceDate, currency:form.currency, totalAmount:Number(form.totalAmount)||0, taxAmount:form.taxAmount.trim()?Number(form.taxAmount):null }
    setIsReviewing(true)
    try {
      const res = await reviewDocument(doc.documentId, { action:"CORRECT", correctedFields:fields, ...(reviewNote.trim()?{reviewerNote:reviewNote.trim()}:{}) })
      updateDocument(doc.documentId, { ...fields, status:res.status, reviewReasons:[], correctedFields:res.correctedFields, reviewedAt:res.reviewedAt, reviewedBy:res.reviewedBy, reviewerNote:reviewNote.trim()||null, errorMessage:null })
      toast.success("Đã lưu chỉnh sửa. Tài liệu sẵn sàng để phê duyệt.")
    } catch { toast.error("Không thể lưu chỉnh sửa. Vui lòng thử lại.") }
    finally { setIsReviewing(false) }
  }

  const handleApprove = async () => {
    setIsReviewing(true)
    try {
      const res = await reviewDocument(doc.documentId, { action:"APPROVE", ...(reviewNote.trim()?{reviewerNote:reviewNote.trim()}:{}) })
      updateDocument(doc.documentId, { status:res.status, reviewReasons:[], reviewedAt:res.reviewedAt, reviewedBy:res.reviewedBy, reviewerNote:reviewNote.trim()||null, errorMessage:null })
      toast.success("Tài liệu đã được phê duyệt.")
    } catch { toast.error("Không thể phê duyệt. Vui lòng thử lại.") }
    finally { setIsReviewing(false) }
  }

  return (
    <BaseLayout title={doc.fileName} description={`${doc.documentId} · ${doc.documentType === "INVOICE" ? "Hóa đơn" : "Biên nhận"} · ${statusMeta[doc.status].label}`}>
      <div className="grid gap-5 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">

        {/* Left column */}
        <div className="grid gap-5 content-start">
          <DocumentPreview doc={doc} />

          <Card className="rounded-xl shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Tóm tắt trích xuất</CardTitle>
                  <CardDescription className="text-xs">Các trường có cấu trúc được trích xuất từ tài liệu đã tải lên.</CardDescription>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Nhà cung cấp", doc.vendorName],
                  ["Ngày hóa đơn", doc.invoiceDate],
                  ["Tổng tiền", formatMoney(doc.totalAmount, doc.currency)],
                  ["Thuế", doc.taxAmount === null ? "Không phát hiện" : formatMoney(doc.taxAmount, doc.currency)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 font-semibold text-sm">{value}</div>
                  </div>
                ))}
              </div>

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

              {doc.reviewReasons.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    <ListChecks className="size-4" />Lý do cần duyệt
                  </div>
                  <ul className="mt-2.5 grid gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    {doc.reviewReasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden>·</span><span>{r}</span></li>)}
                  </ul>
                </div>
              )}

              {doc.reviewedAt && (
                <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                  <div><div className="text-xs text-muted-foreground">Ngày duyệt</div><div className="mt-1 text-sm font-medium">{formatDate(doc.reviewedAt)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Người duyệt</div><div className="mt-1 text-sm font-medium">{doc.reviewedBy ?? "Không xác định"}</div></div>
                  {doc.reviewerNote && <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Ghi chú</div><div className="mt-1 text-sm leading-6">{doc.reviewerNote}</div></div>}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border">
                <Table className="min-w-[480px]">
                  <TableHeader><TableRow className="bg-muted/30"><TableHead>Mô tả</TableHead><TableHead className="text-right">SL</TableHead><TableHead className="text-right">Đơn giá</TableHead><TableHead className="text-right">Thành tiền</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {doc.lineItems.length ? doc.lineItems.map((item) => (
                      <TableRow key={item.description}>
                        <TableCell className="font-medium text-sm">{item.description}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(item.unitPrice, doc.currency)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatMoney(item.amount, doc.currency)}</TableCell>
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
                    <Label htmlFor="vendorName" className="text-xs font-semibold">Nhà cung cấp</Label>
                    <Input id="vendorName" value={form.vendorName} onChange={(e)=>setForm((c)=>({...c,vendorName:e.target.value}))} className="h-9 text-sm" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="invoiceDate" className="text-xs font-semibold">Ngày hóa đơn</Label>
                      <Input id="invoiceDate" type="date" value={form.invoiceDate} onChange={(e)=>setForm((c)=>({...c,invoiceDate:e.target.value}))} className="h-9 text-sm" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold">Tiền tệ</Label>
                      <Select value={form.currency} onValueChange={(v)=>setForm((c)=>({...c,currency:v as DocumentRecord["currency"]}))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="totalAmount" className="text-xs font-semibold">Tổng tiền</Label>
                      <Input id="totalAmount" inputMode="decimal" value={form.totalAmount} onChange={(e)=>setForm((c)=>({...c,totalAmount:e.target.value}))} className="h-9 text-sm" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="taxAmount" className="text-xs font-semibold">Thuế</Label>
                      <Input id="taxAmount" inputMode="decimal" placeholder="Không phát hiện" value={form.taxAmount} onChange={(e)=>setForm((c)=>({...c,taxAmount:e.target.value}))} className="h-9 text-sm" />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="reviewNote" className="text-xs font-semibold">Ghi chú duyệt</Label>
                    <Textarea id="reviewNote" value={reviewNote} onChange={(e)=>setReviewNote(e.target.value)} placeholder="Giải thích lý do chỉnh sửa hoặc phê duyệt" className="text-sm min-h-20 resize-none" />
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

          {doc.errorMessage && (
            <Card className="rounded-xl border-amber-200 shadow-sm dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300"><ShieldAlert className="size-4" />Ghi chú xử lý</CardTitle>
                <CardDescription className="text-xs">Dùng ghi chú này để quyết định tài liệu cần chỉnh sửa hay tải lên lại.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-amber-800 dark:text-amber-300">{doc.errorMessage}</CardContent>
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
                  <div className="break-all rounded-xl bg-muted/50 p-3 font-mono text-[10px] leading-5">{doc.s3RawPath}</div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground"><FileJson className="size-3.5" />Processed artifact</div>
                  <div className="break-all rounded-xl bg-muted/50 p-3 font-mono text-[10px] leading-5">{doc.s3ProcessedPath}</div>
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
    </BaseLayout>
  )
}
