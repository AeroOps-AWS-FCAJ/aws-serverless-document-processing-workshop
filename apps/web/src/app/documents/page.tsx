"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Plus, RefreshCw, Search } from "lucide-react"
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
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
  type DocumentType,
} from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { getDocuFlowSession } from "@/lib/auth"
import { isApiConfigured, listDocuments } from "@/lib/docuflow-api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

function DocumentDrawer({
  document,
  showTechnical,
}: {
  document: DocumentRecord
  showTechnical: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(document.documentId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Eye className="size-4" />
          <span className="sr-only">View document</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{document.fileName}</DrawerTitle>
          <DrawerDescription>
            {document.documentId} · {document.documentType}
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 overflow-y-auto px-4 text-sm">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={document.status} />
          </div>
          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Vendor</span>
              <span className="font-medium text-right">{document.vendorName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Invoice date</span>
              <span className="font-medium">{document.invoiceDate}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total amount</span>
              <span className="font-medium">
                {formatMoney(document.totalAmount, document.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Tax amount</span>
              <span className="font-medium">
                {document.taxAmount === null
                  ? "Not detected"
                  : formatMoney(document.taxAmount, document.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">
                {Math.round(document.confidenceScore * 100)}%
              </span>
            </div>
          </div>
          {document.reviewReasons.length > 0 && (
            <div className="rounded-lg border border-amber-200 p-3 dark:border-amber-900">
              <div className="font-medium">Review reasons</div>
              <ul className="text-muted-foreground mt-2 grid gap-1">
                {document.reviewReasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>
          )}
          {showTechnical && (
            <div className="grid gap-3 rounded-lg border p-3">
              <div>
                <div className="text-muted-foreground">Raw object</div>
                <div className="mt-1 break-all font-mono text-xs">
                  {document.s3RawPath}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Processed object</div>
                <div className="mt-1 break-all font-mono text-xs">
                  {document.s3ProcessedPath}
                </div>
              </div>
            </div>
          )}
          {document.errorMessage && (
            <div className="rounded-lg border border-amber-200 p-3 text-amber-700 dark:border-amber-900 dark:text-amber-300">
              {document.errorMessage}
            </div>
          )}
        </div>
        <DrawerFooter>
          <Button asChild className="cursor-pointer">
            <Link to={`/documents/${document.documentId}`}>Open detail</Link>
          </Button>
          <Button variant="outline" className="cursor-pointer" onClick={handleCopy}>
            {copied ? "Copied" : "Copy documentId"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default function DocumentsPage() {
  const { documents: allDocuments, mergeDocuments, resetDocuments } = useDocuFlowDocuments()
  const session = getDocuFlowSession()
  const role = session?.role ?? "finance"
  const documents =
    role === "finance"
      ? allDocuments.filter((document) => document.userId === session?.userId)
      : allDocuments
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">("ALL")
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  const [nextToken, setNextToken] = useState<string | null>(null)
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return documents.filter((document) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          document.documentId,
          document.fileName,
          document.vendorName,
          document.status,
          document.documentType,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesStatus = statusFilter === "ALL" || document.status === statusFilter
      const matchesType = typeFilter === "ALL" || document.documentType === typeFilter

      return matchesQuery && matchesStatus && matchesType
    })
  }, [documents, query, statusFilter, typeFilter])

  const handleRefresh = async (token?: string) => {
    if (!isApiConfigured()) {
      setSyncMessage("Local demo data is already current.")
      return
    }

    setIsRefreshing(true)
    setSyncMessage("")
    try {
      const response = await listDocuments(token ? { nextToken: token } : {})
      mergeDocuments(response.items)
      setNextToken(response.nextToken)
      setSyncMessage(`${response.items.length} document${response.items.length === 1 ? "" : "s"} synchronized.`)
    } catch {
      setSyncMessage("Documents could not be refreshed. Try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <BaseLayout
      title="Documents"
      description="Search uploaded invoices and receipts, then open a record to view its result and status."
    >
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-3">
            <div>
              <CardTitle>Document inventory</CardTitle>
              <CardDescription>
                {filteredDocuments.length} of {documents.length} documents shown.
                {syncMessage && <span className="ml-2" role="status">{syncMessage}</span>}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search document or vendor..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "ALL")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {Object.entries(statusMeta).map(([status, meta]) => (
                      <SelectItem key={status} value={status}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | "ALL")}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                  </SelectContent>
                </Select>
                {role === "admin" && (
                  <Button variant="outline" className="cursor-pointer" onClick={resetDocuments}>
                    Reset sample data
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => handleRefresh()}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
                  Refresh
                </Button>
                <Button asChild className="cursor-pointer">
                  <Link to="/upload">
                    <Plus className="size-4" />
                    Upload
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.documentId}>
                      <TableCell>
                        <div className="font-medium">{document.fileName}</div>
                        <div className="text-muted-foreground text-xs">
                          {document.documentId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{document.documentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={document.status} />
                      </TableCell>
                      <TableCell>{document.vendorName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(document.totalAmount, document.currency)}
                      </TableCell>
                      <TableCell>{formatDate(document.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DocumentDrawer document={document} showTechnical={role === "admin"} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredDocuments.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No documents match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {nextToken && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleRefresh(nextToken)}
                  disabled={isRefreshing}
                >
                  Load more
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
