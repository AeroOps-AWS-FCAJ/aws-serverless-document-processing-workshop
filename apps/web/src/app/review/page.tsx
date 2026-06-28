"use client"

import { BadgeCheck, Bell, CircleAlert, ExternalLink, ListChecks } from "lucide-react"
import { Link } from "react-router-dom"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, statusMeta } from "@/lib/docuflow-data"
import { useDocuFlowDocuments } from "@/lib/docuflow-store"
import { getDocuFlowSession } from "@/lib/auth"

export default function ReviewPage() {
  const { documents: allDocuments } = useDocuFlowDocuments()
  const session = getDocuFlowSession()
  const role = session?.role ?? "finance"
  const documents =
    role === "finance"
      ? allDocuments.filter((document) => document.userId === session?.userId)
      : allDocuments
  const alertItems = documents
    .filter((document) => ["REVIEW_REQUIRED", "FAILED", "CORRECTED"].includes(document.status))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
  const reviewRequiredCount = documents.filter((document) => document.status === "REVIEW_REQUIRED").length
  const failedCount = documents.filter((document) => document.status === "FAILED").length
  const correctedCount = documents.filter((document) => document.status === "CORRECTED").length

  return (
    <BaseLayout
      title="Review queue"
      description={role === "admin"
        ? "Monitor unresolved documents across the system."
        : "Verify uncertain fields, resolve failed files, and approve your corrected results."}
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1fr_0.8fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Attention queue
            </CardTitle>
            <CardDescription>
              Open a document to correct extracted fields or approve the final result.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertItems.map((document) => {
                    const meta = statusMeta[document.status]
                    const Icon = meta.icon

                    return (
                      <TableRow key={document.documentId}>
                        <TableCell>
                          <div className="font-medium">{document.fileName}</div>
                          <div className="text-muted-foreground text-xs">
                            {document.documentId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.tone}>
                            <Icon className="size-3.5" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.status === "CORRECTED"
                            ? "Corrected fields are ready for approval."
                            : document.reviewReasons.length
                              ? document.reviewReasons.join("; ")
                              : document.errorMessage ?? "One or more required fields could not be confirmed."}
                        </TableCell>
                        <TableCell>{formatDate(document.updatedAt)}</TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/documents/${document.documentId}`}>
                              {document.status === "CORRECTED"
                                ? "Approve"
                                : document.status === "FAILED"
                                  ? "Inspect"
                                  : "Review"}
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!alertItems.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No documents need attention.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleAlert className="size-5" />
                Queue summary
              </CardTitle>
              <CardDescription>
                Current workload by required action.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span>Review required</span>
                <Badge variant="outline">{reviewRequiredCount}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span>Failed</span>
                <Badge variant="outline">{failedCount}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span>Corrected, waiting approval</span>
                <Badge variant="outline">{correctedCount}</Badge>
              </div>
              <div className="border-t pt-3">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <BadgeCheck className="size-4" />
                  Review path
                </div>
                Check the source, correct uncertain fields, save the correction, then approve the verified result.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-5" />
                Review checklist
              </CardTitle>
              <CardDescription>
                Confirm the business fields before approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {["Vendor matches the source document", "Invoice date and currency are correct", "Total and tax amounts reconcile", "Review note explains any correction"].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
