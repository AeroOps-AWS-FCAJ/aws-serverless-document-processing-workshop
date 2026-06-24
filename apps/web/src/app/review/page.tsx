"use client"

import { useState } from "react"
import { Save, TriangleAlert } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { documents, formatMoney, type DocumentRecord } from "@/lib/docuflow-data"

function getReviewForm(document: DocumentRecord) {
  return {
    vendorName: document.vendorName,
    invoiceDate: document.invoiceDate,
    currency: document.currency,
    totalAmount: String(document.totalAmount),
    reviewerNotes:
      document.taxAmount === null
        ? "Tax amount was not visible in the receipt. Marked as null and verified total amount manually."
        : "Reviewed extracted fields and confirmed the normalized result.",
  }
}

export default function ReviewPage() {
  const [records, setRecords] = useState(documents)
  const reviewItems = records.filter((document) =>
    ["REVIEW_REQUIRED", "FAILED"].includes(document.status)
  )
  const [activeId, setActiveId] = useState(reviewItems[0]?.documentId ?? documents[0].documentId)
  const activeDocument =
    records.find((document) => document.documentId === activeId) ?? reviewItems[0] ?? records[0]
  const [form, setForm] = useState(() => getReviewForm(activeDocument))
  const [saveMessage, setSaveMessage] = useState("Ready to save reviewer correction.")

  const selectDocument = (document: DocumentRecord) => {
    setActiveId(document.documentId)
    setForm(getReviewForm(document))
    setSaveMessage(`Editing ${document.documentId}.`)
  }

  const saveReview = () => {
    setRecords((currentRecords) =>
      currentRecords.map((document) =>
        document.documentId === activeDocument.documentId
          ? {
              ...document,
              vendorName: form.vendorName,
              invoiceDate: form.invoiceDate,
              currency: form.currency,
              totalAmount: Number(form.totalAmount.replace(/[^0-9.]/g, "")) || document.totalAmount,
              status: "REVIEWED",
              missingFields: [],
              errorMessage: null,
              updatedAt: new Date().toISOString(),
            }
          : document
      )
    )
    setSaveMessage(`${activeDocument.documentId} saved as REVIEWED in the frontend demo state.`)
  }

  return (
    <BaseLayout
      title="Review Queue"
      description="Human review path for low-confidence extraction, missing fields, and failed files."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Documents that should trigger SNS alerts for reviewer/admin users.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {reviewItems.map((document) => (
              <button
                key={document.documentId}
                type="button"
                onClick={() => selectDocument(document)}
                className={
                  document.documentId === activeDocument.documentId
                    ? "grid gap-2 rounded-lg border border-primary p-3 text-left"
                    : "grid gap-2 rounded-lg border p-3 text-left hover:bg-muted/50"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{document.fileName}</div>
                    <div className="text-muted-foreground text-sm">
                      {document.vendorName} · {Math.round(document.confidenceScore * 100)}%
                    </div>
                  </div>
                  <Badge variant={document.status === "FAILED" ? "destructive" : "outline"}>
                    {document.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document.missingFields.map((field) => (
                    <Badge key={field} variant="secondary">
                      {field}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
            {!reviewItems.length && (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                No documents currently require review.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Correction form</CardTitle>
            <CardDescription>
              PUT /documents/{activeDocument.documentId}/review moves the record to REVIEWED.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 p-3 text-amber-700 dark:border-amber-900 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-4" />
              <div className="text-sm">
                {activeDocument.errorMessage ?? saveMessage}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="vendor">vendorName</Label>
                <Input
                  id="vendor"
                  value={form.vendorName}
                  onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-date">invoiceDate</Label>
                <Input
                  id="invoice-date"
                  value={form.invoiceDate}
                  onChange={(event) => setForm((current) => ({ ...current, invoiceDate: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">currency</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase() === "USD" ? "USD" : "VND",
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">totalAmount</Label>
                <Input
                  id="amount"
                  value={form.totalAmount}
                  onChange={(event) => setForm((current) => ({ ...current, totalAmount: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Reviewer notes</Label>
              <Textarea
                id="notes"
                value={form.reviewerNotes}
                onChange={(event) => setForm((current) => ({ ...current, reviewerNotes: event.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="cursor-pointer" onClick={saveReview}>
                <Save className="size-4" />
                Save as reviewed
              </Button>
              <Button variant="outline" className="cursor-pointer">
                Keep in review
              </Button>
            </div>
            <div className="text-muted-foreground text-sm">
              Current display amount: {formatMoney(activeDocument.totalAmount, activeDocument.currency)}
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
