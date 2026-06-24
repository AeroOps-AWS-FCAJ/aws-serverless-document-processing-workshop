"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Search } from "lucide-react"
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
  documents,
  formatDate,
  formatMoney,
  statusMeta,
  type DocumentRecord,
} from "@/lib/docuflow-data"

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

function DocumentDrawer({ document }: { document: DocumentRecord }) {
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
          {document.errorMessage && (
            <div className="rounded-lg border border-amber-200 p-3 text-amber-700 dark:border-amber-900 dark:text-amber-300">
              {document.errorMessage}
            </div>
          )}
        </div>
        <DrawerFooter>
          <Button asChild className="cursor-pointer">
            <Link to={`/documents/${document.documentId}`}>Open result JSON</Link>
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
  const [query, setQuery] = useState("")
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return documents

    return documents.filter((document) =>
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
    )
  }, [query])

  return (
    <BaseLayout
      title="Documents"
      description="Track invoice and receipt records from upload through extraction, review, and failure states."
    >
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-3">
            <div>
              <CardTitle>Document inventory</CardTitle>
              <CardDescription>
                Mocked from the shared data contract used by DynamoDB and S3 processed JSON.
              </CardDescription>
            </div>
            <div className="relative max-w-sm">
              <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search id, vendor, status..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted">
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
                          <DocumentDrawer document={document} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
