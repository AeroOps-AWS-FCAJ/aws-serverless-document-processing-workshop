"use client"

import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  TimerReset,
  UploadCloud,
} from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  documents,
  formatDate,
  formatMoney,
  monthlyVolume,
  statusMeta,
  vendorSpend,
  workflowSteps,
} from "@/lib/docuflow-data"

const totalDocuments = documents.length
const extractedCount = documents.filter((document) =>
  ["EXTRACTED", "REVIEWED"].includes(document.status)
).length
const reviewCount = documents.filter(
  (document) => document.status === "REVIEW_REQUIRED"
).length
const failedCount = documents.filter((document) => document.status === "FAILED").length
const totalSpendVnd = vendorSpend.reduce((sum, vendor) => sum + vendor.amount, 0)
const maxVendorSpend = Math.max(...vendorSpend.map((vendor) => vendor.amount))
const averageConfidence = Math.round(
  (documents.reduce((sum, document) => sum + document.confidenceScore, 0) /
    documents.length) *
    100
)

function StatusBadge({ status }: { status: keyof typeof statusMeta }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  )
}

function MonthlyVolumeChart() {
  const maxVolume = Math.max(
    ...monthlyVolume.flatMap((item) => [item.extracted, item.review, item.failed])
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-sm bg-teal-600" />
          Extracted
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-sm bg-amber-500" />
          Review
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-sm bg-red-500" />
          Failed
        </div>
      </div>
      <div className="grid h-72 grid-cols-6 items-end gap-4 border-b border-l px-4 pb-6 pt-4">
        {monthlyVolume.map((item) => (
          <div key={item.month} className="flex h-full flex-col justify-end gap-2">
            <div className="flex flex-1 items-end justify-center gap-1.5">
              <div
                className="w-5 rounded-t-sm bg-teal-600"
                style={{ height: `${(item.extracted / maxVolume) * 100}%` }}
                title={`${item.month}: ${item.extracted} extracted`}
              />
              <div
                className="w-5 rounded-t-sm bg-amber-500"
                style={{ height: `${(item.review / maxVolume) * 100}%` }}
                title={`${item.month}: ${item.review} review required`}
              />
              <div
                className="w-5 rounded-t-sm bg-red-500"
                style={{ height: `${(item.failed / maxVolume) * 100}%` }}
                title={`${item.month}: ${item.failed} failed`}
              />
            </div>
            <div className="text-center text-xs text-muted-foreground">{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <BaseLayout
      title="DocuFlow AI Overview"
      description="Frontend prototype for the serverless invoice and receipt processing MVP on AWS."
    >
      <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 lg:px-6">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Centralized documents</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {totalDocuments}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <FileText className="size-3.5" />
                MVP
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Invoices and receipts only</div>
            <div className="text-muted-foreground">Moves finance files out of email and local folders.</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Manual entries avoided</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {extractedCount}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Stable
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <Progress value={(extractedCount / totalDocuments) * 100} />
            <div className="text-muted-foreground">Vendor, date, tax, currency, and total are structured.</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Needs review</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {reviewCount}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <AlertTriangle className="size-3.5 text-amber-600" />
                Threshold
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Confidence threshold: 0.80</div>
            <div className="text-muted-foreground">Low confidence is visible, not a silent failure.</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Failed jobs</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {failedCount}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TimerReset className="size-3.5" />
                DLQ
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">SQS retry and DLQ path</div>
            <div className="text-muted-foreground">SNS alerts reviewer/admin on failure.</div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Tracked spend</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatMoney(totalSpendVnd, "VND")}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <CircleDollarSign className="size-3.5 text-teal-600" />
                Vendors
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="font-medium">Spend visibility by vendor</div>
            <div className="text-muted-foreground">Supports monthly review and budget checks.</div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[1.25fr_0.75fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly processing volume</CardTitle>
            <CardDescription>
              Demo projection for extracted, review-required, and failed documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyVolumeChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline readiness</CardTitle>
            <CardDescription>
              Shared flow from browser upload to processed JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workflowSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border p-3">
                <Badge variant="secondary">{index + 1}</Badge>
                <div className="min-w-0">
                  <div className="truncate font-medium">{step}</div>
                  <div className="text-muted-foreground text-xs">
                    Step Functions Standard workflow
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[0.75fr_1.25fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendor spend visibility</CardTitle>
            <CardDescription>
              Converts extracted invoice and receipt totals into searchable finance insight.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {vendorSpend.slice(0, 5).map((vendor) => (
              <div key={vendor.vendor} className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{vendor.vendor}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(vendor.amount, "VND")}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${(vendor.amount / maxVendorSpend) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Confidence {Math.round(vendor.confidence * 100)}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent documents</CardTitle>
                <CardDescription>
                  Latest records across the upload, extraction, review, and failure paths.
                </CardDescription>
              </div>
              <Badge variant="outline">
                <UploadCloud className="size-3.5" />
                Presigned URL flow
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[680px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.slice(0, 5).map((document) => (
                    <TableRow key={document.documentId}>
                      <TableCell>
                        <div className="font-medium">{document.fileName}</div>
                        <div className="text-muted-foreground text-xs">
                          {document.vendorName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={document.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(document.totalAmount, document.currency)}
                      </TableCell>
                      <TableCell>{formatDate(document.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="text-muted-foreground text-sm">
            Average confidence across demo records: {averageConfidence}%
          </CardFooter>
        </Card>
      </div>
    </BaseLayout>
  )
}
