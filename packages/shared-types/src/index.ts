export type DocumentStatus =
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "EXTRACTED"
  | "REVIEW_REQUIRED"
  | "FAILED"
  | "CORRECTED"
  | "APPROVED"

export type DocumentType = "INVOICE" | "RECEIPT" | "UNKNOWN"
export type Currency = string

export interface LineItem {
  lineItemId: string
  description: string
  quantity: number
  unitPriceAmount: number
  taxAmount: number
  totalAmount: number
  confidenceScore: number
}

export interface CorrectedFields {
  documentType?: DocumentType
  invoiceNumber?: string
  vendorName?: string
  invoiceDate?: string
  dueDate?: string
  currency?: Currency
  subtotalAmount?: number
  discountAmount?: number
  shippingAmount?: number
  totalAmount?: number
  taxAmount?: number | null
  lineItems?: LineItem[]
}

export interface DocumentResult {
  documentId: string
  userId: string
  originalFileName: string
  documentType: DocumentType
  status: DocumentStatus
  invoiceNumber?: string
  vendorName: string
  invoiceDate: string
  dueDate?: string
  currency: Currency
  subtotalAmount?: number
  discountAmount?: number
  shippingAmount?: number
  totalAmount: number
  taxAmount: number | null
  confidenceScore: number
  reviewStatus: "NOT_REQUIRED" | "PENDING" | "CORRECTED" | "APPROVED" | "REJECTED"
  reviewReasonCodes: string[]
  aiProvider: "external-ai-api" | "not-called"
  normalizationMethod:
    | "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API"
    | "TEXTRACT_ONLY"
    | "FAILED_BEFORE_NORMALIZE"
  rawS3Key: string
  processedS3Key: string
  sourceUrl?: string | null
  createdAt: string
  updatedAt: string
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
  documentType?: DocumentType
}

export interface UploadUrlResponse {
  documentId: string
  uploadUrl: string
  rawS3Key: string
  expiresInSeconds: number
  uploadHeaders: Record<string, string>
}

export interface CorrectionItem {
  fieldName: string
  oldValue: any
  newValue: any
}

export interface ReviewDocumentRequest {
  reviewStatus: "CORRECTED" | "APPROVED"
  corrections?: CorrectionItem[]
  reviewerNote?: string
}

export interface ReviewDocumentResponse {
  documentId: string
  status: "CORRECTED" | "APPROVED"
  reviewStatus: "CORRECTED" | "APPROVED"
  updatedAt: string
}

export interface DeleteDocumentResponse {
  documentId: string
  deleted: boolean
  deletedAt?: string
}

export interface DeleteDocumentsResponse {
  documentIds: string[]
  deletedCount: number
  deletedAt?: string
}
