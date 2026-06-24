import {
  documents,
  testCases,
  type DocumentRecord,
} from "@/lib/docuflow-data"

export interface UploadUrlRequest {
  fileName: string
  contentType: string
  fileSize: number
  pageCount: number
}

export interface UploadUrlResponse {
  documentId: string
  uploadUrl: string
  s3Key: string
  expiresIn: number
  status: DocumentRecord["status"]
}

export interface ReviewUpdateRequest {
  documentId: string
  vendorName: string
  invoiceDate: string
  currency: DocumentRecord["currency"]
  totalAmount: number
  reviewerNotes: string
}

const demoLatency = 250

function wait(ms = demoLatency) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function listDocuments() {
  await wait()
  return documents
}

export async function getDocument(documentId: string) {
  await wait()
  return documents.find((document) => document.documentId === documentId) ?? null
}

export async function requestUploadUrl(
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  await wait()

  const documentId = `doc-${Math.floor(100 + Math.random() * 900)}`

  return {
    documentId,
    uploadUrl: "https://s3-presigned-url.example.com/docuflow-demo",
    s3Key: `raw/user-123/2026/06/24/${documentId}/${request.fileName}`,
    expiresIn: 300,
    status: "UPLOADED",
  }
}

export async function updateReview(request: ReviewUpdateRequest) {
  await wait()
  return {
    ...request,
    status: "REVIEWED" as const,
    reviewedAt: new Date().toISOString(),
  }
}

export async function listTestCases() {
  await wait()
  return testCases
}
