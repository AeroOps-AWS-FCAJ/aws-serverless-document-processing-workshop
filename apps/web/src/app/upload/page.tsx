"use client"

import { useMemo, useState } from "react"
import { FileUp, ShieldCheck, UploadCloud } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import { requestUploadUrl, type UploadUrlResponse } from "@/lib/docuflow-api"

const uploadChecks = [
  "PDF, JPG, PNG only",
  "Max file size 10 MB",
  "Max 5 pages during workshop development",
  "Presigned URL expires in 5 minutes",
  "Object key scoped by userId and documentId",
]

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"])
const maxFileSize = 10 * 1024 * 1024
const maxPageCount = 5

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("invoice-001.pdf")
  const [contentType, setContentType] = useState("application/pdf")
  const [fileSize, setFileSize] = useState("512000")
  const [pageCount, setPageCount] = useState("2")
  const [progress, setProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"IDLE" | "READY" | "REQUESTED" | "UPLOADED">("READY")
  const [response, setResponse] = useState<UploadUrlResponse | null>(null)
  const [message, setMessage] = useState("Select a sample invoice or receipt to start the demo flow.")

  const validationError = useMemo(() => {
    const parsedSize = Number(fileSize)
    const parsedPageCount = Number(pageCount)

    if (!fileName.trim()) return "fileName is required."
    if (!allowedTypes.has(contentType)) return "Only PDF, JPG, and PNG files are accepted."
    if (!Number.isFinite(parsedSize) || parsedSize <= 0) return "fileSize must be a positive number."
    if (parsedSize > maxFileSize) return "File size must be 10 MB or smaller."
    if (!Number.isInteger(parsedPageCount) || parsedPageCount <= 0) return "pageCount must be a positive integer."
    if (parsedPageCount > maxPageCount) return "Workshop files must be 5 pages or fewer."

    return null
  }, [contentType, fileName, fileSize, pageCount])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    setResponse(null)
    setProgress(0)

    if (!selectedFile) {
      setUploadStatus("READY")
      setMessage("Select a sample invoice or receipt to start the demo flow.")
      return
    }

    setFileName(selectedFile.name)
    setContentType(selectedFile.type || "application/octet-stream")
    setFileSize(String(selectedFile.size))
    setUploadStatus("READY")
    setMessage("File metadata loaded. Request a presigned URL next.")
  }

  const handleRequestUrl = async () => {
    if (validationError) {
      setMessage(validationError)
      return
    }

    setUploadStatus("REQUESTED")
    setProgress(15)
    const uploadResponse = await requestUploadUrl({
      fileName,
      contentType,
      fileSize: Number(fileSize),
      pageCount: Number(pageCount),
    })
    setResponse(uploadResponse)
    setProgress(35)
    setMessage(`Presigned URL generated for ${uploadResponse.documentId}.`)
  }

  const handleSimulateUpload = () => {
    if (!response) {
      setMessage("Request a presigned URL before simulating the S3 upload.")
      return
    }

    setProgress(100)
    setUploadStatus("UPLOADED")
    setMessage("Browser PUT completed. EventBridge and SQS can now start processing.")
  }

  return (
    <BaseLayout
      title="Upload"
      description="Prepare the frontend flow for Cognito users to request an upload URL and PUT invoice or receipt files directly to S3."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.35fr_0.65fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>New document</CardTitle>
            <CardDescription>
              This screen mirrors POST /uploads and the direct browser PUT to S3.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="document-file">Invoice or receipt file</Label>
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  <UploadCloud className="size-6" />
                </div>
                <div>
                  <div className="font-medium">Drop file here or browse</div>
                  <div className="text-muted-foreground text-sm">
                    Demo accepts invoice PDF, receipt JPG, or PNG scans.
                  </div>
                </div>
                <Input
                  id="document-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="max-w-sm"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="file-name">fileName</Label>
                <Input
                  id="file-name"
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content-type">contentType</Label>
                <Input
                  id="content-type"
                  value={contentType}
                  onChange={(event) => setContentType(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file-size">fileSize</Label>
                <Input
                  id="file-size"
                  inputMode="numeric"
                  value={fileSize}
                  onChange={(event) => setFileSize(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="page-count">pageCount</Label>
                <Input
                  id="page-count"
                  inputMode="numeric"
                  value={pageCount}
                  onChange={(event) => setPageCount(event.target.value)}
                />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Upload progress</div>
                  <div className="text-muted-foreground text-sm">
                    {response
                      ? `Browser PUT to ${response.s3Key}`
                      : file
                        ? `Ready to upload ${file.name}`
                        : "Waiting for file selection"}
                  </div>
                </div>
                <Badge variant="outline">{uploadStatus}</Badge>
              </div>
              <Progress value={progress} />
              <div className={validationError ? "mt-3 text-sm text-destructive" : "text-muted-foreground mt-3 text-sm"}>
                {validationError ?? message}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="cursor-pointer"
                onClick={handleRequestUrl}
                disabled={!!validationError || uploadStatus === "REQUESTED"}
              >
                <FileUp className="size-4" />
                Request upload URL
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={handleSimulateUpload}
                disabled={!response}
              >
                Simulate S3 upload
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Frontend validation</CardTitle>
              <CardDescription>
                These checks happen before API Gateway receives the request.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {uploadChecks.map((check) => (
                <div key={check} className="flex items-center gap-3 rounded-lg border p-3">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span className="text-sm">{check}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Response contract</CardTitle>
              <CardDescription>POST /uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs">
{response ? JSON.stringify(response, null, 2) : `{
  "documentId": "doc-001",
  "uploadUrl": "https://s3-presigned-url...",
  "s3Key": "raw/user-123/2026/06/24/doc-001/invoice-001.pdf",
  "expiresIn": 300
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
