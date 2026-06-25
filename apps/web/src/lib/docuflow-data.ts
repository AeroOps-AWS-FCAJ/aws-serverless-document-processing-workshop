import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  Loader2,
  type LucideIcon,
} from "lucide-react"

export type DocumentStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "EXTRACTED"
  | "REVIEW_REQUIRED"
  | "FAILED"
  | "REVIEWED"

export type DocumentType = "INVOICE" | "RECEIPT"

export interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface DocumentRecord {
  documentId: string
  fileName: string
  documentType: DocumentType
  status: DocumentStatus
  vendorName: string
  invoiceDate: string
  currency: "VND" | "USD"
  totalAmount: number
  taxAmount: number | null
  confidenceScore: number
  createdAt: string
  updatedAt: string
  owner: string
  s3RawPath: string
  s3ProcessedPath: string
  missingFields: string[]
  lineItems: LineItem[]
  errorMessage: string | null
}

export interface StatusMeta {
  label: string
  tone: string
  icon: LucideIcon
}

export const statusMeta: Record<DocumentStatus, StatusMeta> = {
  UPLOADED: {
    label: "Uploaded",
    tone: "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
    icon: Clock3,
  },
  PROCESSING: {
    label: "Processing",
    tone: "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300",
    icon: Loader2,
  },
  EXTRACTED: {
    label: "Extracted",
    tone: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  REVIEW_REQUIRED: {
    label: "Review required",
    tone: "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300",
    icon: FileWarning,
  },
  FAILED: {
    label: "Failed",
    tone: "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300",
    icon: AlertTriangle,
  },
  REVIEWED: {
    label: "Reviewed",
    tone: "border-violet-200 text-violet-700 dark:border-violet-900 dark:text-violet-300",
    icon: FileCheck2,
  },
}

export const documents: DocumentRecord[] = [
  {
    documentId: "doc-001",
    fileName: "invoice-aws-amplify-june.pdf",
    documentType: "INVOICE",
    status: "EXTRACTED",
    vendorName: "AWS Vietnam Partner",
    invoiceDate: "2026-06-08",
    currency: "VND",
    totalAmount: 2500000,
    taxAmount: 250000,
    confidenceScore: 0.93,
    createdAt: "2026-06-24T08:12:00Z",
    updatedAt: "2026-06-24T08:13:18Z",
    owner: "finance.user",
    s3RawPath: "raw/user-123/2026/06/24/doc-001/invoice-aws-amplify-june.pdf",
    s3ProcessedPath: "processed/user-123/2026/06/24/doc-001/result.json",
    missingFields: [],
    lineItems: [
      {
        description: "AWS Amplify frontend hosting",
        quantity: 1,
        unitPrice: 2250000,
        amount: 2250000,
      },
    ],
    errorMessage: null,
  },
  {
    documentId: "doc-002",
    fileName: "receipt-office-supplies.jpg",
    documentType: "RECEIPT",
    status: "REVIEW_REQUIRED",
    vendorName: "Minh Long Office",
    invoiceDate: "2026-06-19",
    currency: "VND",
    totalAmount: 842000,
    taxAmount: null,
    confidenceScore: 0.74,
    createdAt: "2026-06-24T08:30:00Z",
    updatedAt: "2026-06-24T08:31:10Z",
    owner: "finance.user",
    s3RawPath: "raw/user-123/2026/06/24/doc-002/receipt-office-supplies.jpg",
    s3ProcessedPath: "processed/user-123/2026/06/24/doc-002/result.json",
    missingFields: ["taxAmount", "currency confidence"],
    lineItems: [
      {
        description: "Office paper and folders",
        quantity: 4,
        unitPrice: 140000,
        amount: 560000,
      },
      {
        description: "Printer ink",
        quantity: 1,
        unitPrice: 282000,
        amount: 282000,
      },
    ],
    errorMessage: "Confidence below threshold 0.80",
  },
  {
    documentId: "doc-003",
    fileName: "invoice-saas-license.pdf",
    documentType: "INVOICE",
    status: "PROCESSING",
    vendorName: "SaaS Ops Co.",
    invoiceDate: "2026-06-21",
    currency: "USD",
    totalAmount: 680,
    taxAmount: 0,
    confidenceScore: 0.88,
    createdAt: "2026-06-24T08:42:00Z",
    updatedAt: "2026-06-24T08:42:42Z",
    owner: "finance.user",
    s3RawPath: "raw/user-123/2026/06/24/doc-003/invoice-saas-license.pdf",
    s3ProcessedPath: "processed/user-123/2026/06/24/doc-003/result.json",
    missingFields: [],
    lineItems: [
      {
        description: "Annual SaaS license",
        quantity: 1,
        unitPrice: 680,
        amount: 680,
      },
    ],
    errorMessage: null,
  },
  {
    documentId: "doc-004",
    fileName: "blurry-travel-receipt.png",
    documentType: "RECEIPT",
    status: "FAILED",
    vendorName: "Unknown",
    invoiceDate: "2026-06-22",
    currency: "VND",
    totalAmount: 0,
    taxAmount: null,
    confidenceScore: 0.18,
    createdAt: "2026-06-24T08:45:00Z",
    updatedAt: "2026-06-24T08:45:36Z",
    owner: "reviewer.user",
    s3RawPath: "raw/user-456/2026/06/24/doc-004/blurry-travel-receipt.png",
    s3ProcessedPath: "failed/user-456/2026/06/24/doc-004/error.json",
    missingFields: ["vendorName", "totalAmount", "currency"],
    lineItems: [],
    errorMessage: "Image is too blurry for Textract AnalyzeExpense",
  },
  {
    documentId: "doc-005",
    fileName: "invoice-cleaning-service.pdf",
    documentType: "INVOICE",
    status: "REVIEWED",
    vendorName: "Green Clean Services",
    invoiceDate: "2026-06-17",
    currency: "VND",
    totalAmount: 1350000,
    taxAmount: 135000,
    confidenceScore: 0.79,
    createdAt: "2026-06-23T15:15:00Z",
    updatedAt: "2026-06-24T07:10:00Z",
    owner: "reviewer.user",
    s3RawPath: "raw/user-456/2026/06/23/doc-005/invoice-cleaning-service.pdf",
    s3ProcessedPath: "processed/user-456/2026/06/23/doc-005/result.json",
    missingFields: [],
    lineItems: [
      {
        description: "Monthly office cleaning",
        quantity: 1,
        unitPrice: 1350000,
        amount: 1350000,
      },
    ],
    errorMessage: null,
  },
]

export const workflowSteps = [
  "ValidateInput",
  "UpdateStatusProcessing",
  "RunTextractAnalyzeExpense",
  "NormalizeWithBedrock",
  "ValidateNormalizedJson",
  "CalculateConfidence",
  "SaveResult",
  "NotifyIfNeeded",
]

export const monthlyVolume = [
  { month: "Jan", extracted: 32, review: 6, failed: 2 },
  { month: "Feb", extracted: 45, review: 8, failed: 3 },
  { month: "Mar", extracted: 58, review: 10, failed: 4 },
  { month: "Apr", extracted: 72, review: 9, failed: 3 },
  { month: "May", extracted: 84, review: 12, failed: 5 },
  { month: "Jun", extracted: 96, review: 14, failed: 4 },
]

export const apiContracts = [
  {
    method: "POST",
    path: "/uploads",
    purpose: "Generate a 5-minute S3 presigned URL for PDF/JPG/PNG upload.",
  },
  {
    method: "GET",
    path: "/documents",
    purpose: "List documents by Cognito user using userId-createdAt-index.",
  },
  {
    method: "GET",
    path: "/documents/{id}",
    purpose: "Return status, extracted summary fields, confidence, and storage keys.",
  },
  {
    method: "GET",
    path: "/documents/{id}/result",
    purpose: "Return the processed S3 JSON result for audit and export workflows.",
  },
  {
    method: "PUT",
    path: "/documents/{id}/review",
    purpose: "Persist corrected fields and move REVIEW_REQUIRED documents to REVIEWED.",
  },
]

export const operationalChecks = [
  {
    name: "SQS DLQ depth",
    value: "0",
    state: "Healthy",
  },
  {
    name: "Step Functions failed executions",
    value: "1",
    state: "Watch",
  },
  {
    name: "CloudWatch log retention",
    value: "7 days",
    state: "Configured",
  },
  {
    name: "AWS Budget threshold",
    value: "$5 / $10",
    state: "Configured",
  },
]

export const testCases = [
  {
    id: "TC-01",
    name: "Upload clear invoice",
    owner: "M1 + M3",
    expected: "EXTRACTED with vendor, date, total, tax, and currency.",
    evidence: "Document detail + S3 processed result.json",
    state: "Ready",
  },
  {
    id: "TC-02",
    name: "Upload clear receipt",
    owner: "M1 + M3",
    expected: "Receipt fields are extracted and saved.",
    evidence: "Document list + DynamoDB item",
    state: "Ready",
  },
  {
    id: "TC-03",
    name: "Upload blurry or incomplete file",
    owner: "M3 + M5",
    expected: "REVIEW_REQUIRED or FAILED with SNS alert.",
    evidence: "Review queue + alert screenshot",
    state: "Ready",
  },
  {
    id: "TC-04",
    name: "Upload unsupported file type",
    owner: "M1 + M2",
    expected: "Rejected before Textract or marked FAILED.",
    evidence: "Upload validation + workflow error",
    state: "Todo",
  },
  {
    id: "TC-05",
    name: "Simulate Textract or Bedrock error",
    owner: "M2 + M3",
    expected: "Retry/Catch path updates status to FAILED.",
    evidence: "Step Functions failed execution",
    state: "Todo",
  },
  {
    id: "TC-06",
    name: "Clean up resources",
    owner: "M5",
    expected: "CloudFormation stack and storage resources are removed.",
    evidence: "Cleanup command output",
    state: "Todo",
  },
]

export const roleCapabilities = [
  {
    role: "end-user",
    canUpload: true,
    canReview: false,
    canOperate: false,
    description: "Uploads invoices or receipts and views own documents.",
  },
  {
    role: "reviewer",
    canUpload: true,
    canReview: true,
    canOperate: false,
    description: "Reviews low-confidence extracted fields and marks records as reviewed.",
  },
  {
    role: "admin",
    canUpload: true,
    canReview: true,
    canOperate: true,
    description: "Monitors alerts, IAM ownership, budget checks, and cleanup readiness.",
  },
]

export const demoScript = [
  "Introduce manual invoice and receipt pain point.",
  "Open architecture and explain Amplify hosting plus the AWS processing layers.",
  "Sign in with Cognito and upload a clear invoice.",
  "Watch status move from UPLOADED to PROCESSING to EXTRACTED.",
  "Open document detail and review extracted fields.",
  "Open a low-confidence file and save reviewer correction.",
  "Show Step Functions, CloudWatch, SNS, S3, and DynamoDB evidence.",
  "Close with budget guardrails and cleanup plan.",
]

export const statusDistribution = Object.entries(statusMeta).map(([status, meta]) => ({
  status,
  label: meta.label,
  count: documents.filter((document) => document.status === status).length,
}))

export const vendorSpend = documents
  .filter((document) => document.totalAmount > 0)
  .map((document) => ({
    vendor: document.vendorName,
    amount: document.currency === "USD" ? document.totalAmount * 25000 : document.totalAmount,
    confidence: document.confidenceScore,
  }))
  .sort((a, b) => b.amount - a.amount)

export function formatMoney(value: number, currency: "VND" | "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
