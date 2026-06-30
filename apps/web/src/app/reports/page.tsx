"use client"

import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBarChart2,
  FileWarning,
  PieChart,
  ReceiptText,
  TrendingUp,
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
import { useAuth } from "@/contexts/auth-context"
import {
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
  type DocumentStatus,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"

function toVnd(document: DocumentRecord) {
  return document.currency === "USD" ? document.totalAmount * 25_000 : document.totalAmount
}

function escapeCsv(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function exportCsv(documents: DocumentRecord[]) {
  const header = ["documentId", "fileName", "vendor", "type", "status", "currency", "amount", "amountVnd", "confidence", "updatedAt"]
  const rows = documents.map((document) => [
    document.documentId,
    document.fileName,
    document.vendorName,
    document.documentType,
    document.status,
    document.currency,
    document.totalAmount,
    toVnd(document),
    Math.round(document.confidenceScore * 100),
    document.updatedAt,
  ])
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = "docuflow-user-report.csv"
  link.click()
  URL.revokeObjectURL(url)
}

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

export default function ReportsPage() {
  const { documents } = useDocuFlowDocuments()
  const { session } = useAuth()
  const visibleDocuments = useMemo(
    () => documents.filter((document) => session?.role === "admin" || document.userId === session?.userId),
    [documents, session?.role, session?.userId]
  )

  const reportableDocuments = useMemo(
    () => visibleDocuments.filter((document) => document.totalAmount > 0),
    [visibleDocuments]
  )

  const totalVnd = reportableDocuments.reduce((sum, document) => sum + toVnd(document), 0)
  const approvedVnd = reportableDocuments
    .filter((document) => document.status === "APPROVED")
    .reduce((sum, document) => sum + toVnd(document), 0)
  const reviewExposure = visibleDocuments.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status)
  ).length
  const averageConfidence = visibleDocuments.length
    ? Math.round((visibleDocuments.reduce((sum, document) => sum + document.confidenceScore, 0) / visibleDocuments.length) * 100)
    : 0

  const vendorRows = useMemo(() => {
    const grouped = new Map<string, { vendor: string; amount: number; documents: number; confidence: number }>()
    reportableDocuments.forEach((document) => {
      const current = grouped.get(document.vendorName) ?? {
        vendor: document.vendorName,
        amount: 0,
        documents: 0,
        confidence: 0,
      }
      current.amount += toVnd(document)
      current.documents += 1
      current.confidence += document.confidenceScore
      grouped.set(document.vendorName, current)
    })
    return [...grouped.values()]
      .map((row) => ({ ...row, confidence: Math.round((row.confidence / row.documents) * 100) }))
      .sort((a, b) => b.amount - a.amount)
  }, [reportableDocuments])

  const monthlyRows = useMemo(() => {
    const grouped = new Map<string, { month: string; amount: number; documents: number }>()
    reportableDocuments.forEach((document) => {
      const date = new Date(document.invoiceDate)
      const month = Number.isNaN(date.getTime())
        ? "Unknown"
        : date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      const current = grouped.get(month) ?? { month, amount: 0, documents: 0 }
      current.amount += toVnd(document)
      current.documents += 1
      grouped.set(month, current)
    })
    return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month))
  }, [reportableDocuments])

  const maxVendorAmount = Math.max(...vendorRows.map((row) => row.amount), 1)
  const maxMonthlyAmount = Math.max(...monthlyRows.map((row) => row.amount), 1)

  const statusRows = (Object.keys(statusMeta) as DocumentStatus[]).map((status) => ({
    status,
    count: visibleDocuments.filter((document) => document.status === status).length,
  }))

  return (
    <BaseLayout
      title="Reports"
      description="Simple finance reports from extracted invoice and receipt metadata."
    >
      <section className="px-4 lg:px-6">
        <div className="overflow-hidden border bg-[#10261d] text-white">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d8ff72]/40 bg-[#d8ff72]/15 font-mono text-[10px] uppercase text-[#d8ff72]">
                  Finance report
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/5 font-mono text-[10px] uppercase text-white/75">
                  {session?.role === "admin" ? "All workspaces" : "My workspace"}
                </Badge>
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
                Spend, vendors, confidence, and exception exposure from extracted documents.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62">
                This turns the DynamoDB metadata story into a user-facing report: vendor spend,
                monthly totals, document mix, and records that still need attention.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button className="bg-[#d8ff72] text-[#10261d] hover:bg-[#c7ee5f]" onClick={() => exportCsv(visibleDocuments)}>
                  <Download className="size-4" />
                  Export report CSV
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/documents">
                    Open ledger
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12 xl:border-l xl:border-t-0">
              {[
                { label: "Total spend", value: formatMoney(totalVnd, "VND"), icon: BadgeDollarSign },
                { label: "Approved spend", value: formatMoney(approvedVnd, "VND"), icon: CheckCircle2 },
                { label: "Needs attention", value: reviewExposure, icon: FileWarning },
                { label: "Avg confidence", value: `${averageConfidence}%`, icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border-b border-r border-white/12 p-4 last:border-r-0 sm:p-5">
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <Icon className="size-4 text-[#d8ff72]" />
                      <span className="font-mono text-[10px] text-white/35">RPT</span>
                    </div>
                    <div className="text-xl font-semibold text-white sm:text-2xl">{item.value}</div>
                    <div className="mt-1 text-xs text-white/50">{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 px-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Vendor spend
            </CardTitle>
            <CardDescription>VND-normalized spend by extracted vendor.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            {vendorRows.length ? (
              vendorRows.map((row) => (
                <div key={row.vendor} className="grid gap-2 border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{row.vendor}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.documents} document{row.documents > 1 ? "s" : ""} - {row.confidence}% avg confidence
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold">{formatMoney(row.amount, "VND")}</div>
                  </div>
                  <div className="h-2 overflow-hidden bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${Math.max(8, (row.amount / maxVendorAmount) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-dashed p-6 text-sm text-muted-foreground">No extracted spend is available yet.</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Monthly totals
              </CardTitle>
              <CardDescription>Invoice/receipt value by invoice date.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              {monthlyRows.map((row) => (
                <div key={row.month} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{row.month}</span>
                    <span className="font-mono text-muted-foreground">{formatMoney(row.amount, "VND")}</span>
                  </div>
                  <Progress value={(row.amount / maxMonthlyAmount) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/25">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="size-5" />
                Status mix
              </CardTitle>
              <CardDescription>Current processing distribution.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {statusRows.filter((row) => row.count > 0).map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-3 border p-3">
                  <StatusBadge status={row.status} />
                  <span className="font-mono text-sm">{row.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <Card>
          <CardHeader className="border-b bg-muted/25">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart2 className="size-5" />
              Report rows
            </CardTitle>
            <CardDescription>Latest reportable documents with confidence and action state.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDocuments
                    .slice()
                    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
                    .map((document) => (
                      <TableRow key={document.documentId}>
                        <TableCell>
                          <div className="font-medium">{document.fileName}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <ReceiptText className="size-3.5" />
                            {document.documentType}
                          </div>
                        </TableCell>
                        <TableCell>{document.vendorName}</TableCell>
                        <TableCell>{formatMoney(document.totalAmount, document.currency)}</TableCell>
                        <TableCell><StatusBadge status={document.status} /></TableCell>
                        <TableCell>{Math.round(document.confidenceScore * 100)}%</TableCell>
                        <TableCell>{formatDate(document.updatedAt)}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/documents/${document.documentId}`}>
                              View
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </BaseLayout>
  )
}
