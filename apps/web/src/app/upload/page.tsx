"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LockKeyhole,
  UploadCloud,
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
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { requestUploadUrl, uploadDocumentFile } from "@/lib/docuflow-api"
import {
  createQueuedDocument,
  nextUploadStatus,
  useDocuFlowDocuments,
} from "@/lib/docuflow-store"

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"])
const maxFileSize = 10 * 1024 * 1024

const uploadRules = [
  "PDF, JPG, and PNG files",
  "Maximum file size of 10 MB",
  "Up to 5 pages per document",
  "Private access for signed-in users",
]

const nextSteps = [
  {
    title: "Secure upload",
    detail: "The original file is stored privately under your account.",
  },
  {
    title: "Background processing",
    detail: "Vendor, date, tax, total, and line items are extracted automatically.",
  },
  {
    title: "Result or review",
    detail: "You can track the result; uncertain fields are added to your review queue.",
  },
]

export default function UploadPage() {
  const { upsertDocument } = useDocuFlowDocuments()
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [state, setState] = useState<"IDLE" | "UPLOADING" | "COMPLETE" | "ERROR">("IDLE")
  const [message, setMessage] = useState("Choose one invoice or receipt to begin.")
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null)

  const validationError = useMemo(() => {
    if (!file) return "Choose a file before uploading."
    if (!allowedTypes.has(file.type)) return "This file type is not supported. Use PDF, JPG, or PNG."
    if (file.size > maxFileSize) return "This file is larger than 10 MB."
    return null
  }, [file])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    setProgress(0)
    setCreatedDocumentId(null)
    setState("IDLE")
    setMessage(selectedFile ? `${selectedFile.name} is ready to upload.` : "Choose one invoice or receipt to begin.")
  }

  const handleUpload = async () => {
    if (!file || validationError) {
      setState("ERROR")
      setMessage(validationError ?? "Choose a file before uploading.")
      return
    }

    try {
      setState("UPLOADING")
      setProgress(20)
      setMessage("Uploading document securely...")

      const request = {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        pageCount: 1,
      }
      const response = await requestUploadUrl(request)
      setProgress(45)
      setMessage("Secure upload URL received. Uploading the document...")
      await uploadDocumentFile(response.uploadUrl, file)
      setProgress(75)
      setMessage("Upload complete. Adding document to the processing queue...")

      const queuedDocument = {
        ...createQueuedDocument(request, response),
        status: nextUploadStatus("UPLOADED"),
      }
      upsertDocument(queuedDocument)
      setCreatedDocumentId(queuedDocument.documentId)
      setProgress(100)
      setState("COMPLETE")
      setMessage("Document uploaded. Processing will continue in the background.")
    } catch {
      setState("ERROR")
      setMessage("The upload could not be started. Check the file and try again.")
    }
  }

  return (
    <BaseLayout
      title="Upload document"
      description="Add an invoice or receipt and continue working while it is processed."
    >
      <div className="grid items-start gap-6 px-4 lg:grid-cols-[1.15fr_0.85fr] lg:px-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Choose a document</CardTitle>
            <CardDescription>One invoice or receipt per upload.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="document-file">Invoice or receipt</Label>
              <label
                htmlFor="document-file"
                className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-muted/20 p-6 text-center transition-colors hover:border-foreground/30 hover:bg-muted/40"
              >
                <div className="flex size-12 items-center justify-center rounded-md border bg-background">
                  {file ? <FileText className="size-6 text-emerald-700" /> : <UploadCloud className="size-6" />}
                </div>
                <div>
                  <div className="font-medium">{file ? file.name : "Select a file to upload"}</div>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || "Unknown file type"}`
                      : "PDF, JPG, or PNG · Maximum 10 MB"}
                  </div>
                </div>
                <span className="rounded-md border bg-background px-3 py-2 text-sm font-medium">
                  {file ? "Choose another file" : "Browse files"}
                </span>
              </label>
              <input
                id="document-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            {(file || state !== "IDLE") && (
              <div className="rounded-md border p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Upload status</div>
                    <div className={state === "ERROR" ? "mt-1 text-sm text-destructive" : "text-muted-foreground mt-1 text-sm"}>
                      {validationError && file ? validationError : message}
                    </div>
                  </div>
                  <Badge variant="outline">{state}</Badge>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="cursor-pointer sm:min-w-44"
                onClick={handleUpload}
                disabled={!file || !!validationError || state === "UPLOADING" || state === "COMPLETE"}
              >
                <UploadCloud className="size-4" />
                {state === "UPLOADING" ? "Uploading..." : "Upload and process"}
              </Button>
              {createdDocumentId && (
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link to={`/documents/${createdDocumentId}`}>
                    Track document
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>What happens next</CardTitle>
              <CardDescription>The document remains traceable from upload to result.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {nextSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4 p-4">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-muted-foreground mt-1 text-sm leading-5">{step.detail}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="size-4" />
                File requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5">
              {uploadRules.map((rule) => (
                <div key={rule} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
