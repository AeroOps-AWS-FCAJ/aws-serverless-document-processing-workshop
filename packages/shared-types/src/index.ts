export type DocumentStatus =
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "EXTRACTED"
  | "REVIEW_REQUIRED"
  | "FAILED"
  | "CORRECTED"
  | "APPROVED"

export type DocumentType = "INVOICE" | "RECEIPT"
export type Currency = "VND" | "USD"

export interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface CorrectedFields {
  vendorName?: string
  invoiceDate?: string
  currency?: Currency
  totalAmount?: number
  taxAmount?: number | null
}

export interface DocumentResult {
  documentId: string
  userId: string
  fileName: string
  documentType: DocumentType
  status: DocumentStatus
  vendorName: string
  invoiceDate: string
  currency: Currency
  totalAmount: number
  taxAmount: number | null
  confidenceScore: number
  reviewReasons: string[]
  aiProvider: "external-ai-api" | "not-called"
  normalizationMethod:
    | "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API"
    | "TEXTRACT_ONLY"
    | "FAILED_BEFORE_NORMALIZE"
  s3RawPath: string
  s3ProcessedPath: string
  createdAt: string
  updatedAt: string
  correctedFields: CorrectedFields | null
  reviewedAt: string | null
  reviewedBy: string | null
  reviewerNote: string | null
  lineItems: LineItem[]
  errorMessage: string | null
}

export interface ListDocumentsResponse {
  items: DocumentResult[]
  nextToken: string | null
}

export interface ListDocumentsRequest {
  status?: DocumentStatus
  nextToken?: string
}

export interface UploadUrlRequest {
  originalFileName: string
  mimeType: string
  fileSizeBytes: number
  pageCount: number
}

export interface UploadUrlResponse {
  documentId: string
  uploadUrl: string
  s3RawPath: string
  expiresIn: number
}

export interface ReviewDocumentRequest {
  reviewStatus: "CORRECTED" | "APPROVED"
  correctedFields?: CorrectedFields
  reviewerNote?: string
}

export interface ReviewDocumentResponse {
  documentId: string
  status: "CORRECTED" | "APPROVED"
  correctedFields: CorrectedFields | null
  reviewedAt: string
  reviewedBy: string
}
