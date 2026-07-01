import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  Loader2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import type {
  DocumentResult,
  DocumentStatus,
  DocumentType,
  LineItem,
} from "@docuflow/shared-types"

export type { DocumentStatus, DocumentType, LineItem }

export type DocumentRecord = DocumentResult

export interface StatusMeta {
  label: string
  tone: string
  icon: LucideIcon
}

export const statusMeta: Record<DocumentStatus, StatusMeta> = {
  UPLOADED: {
    label: "Đã tải lên",
    tone: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    icon: Clock3,
  },
  QUEUED: {
    label: "Đang xếp hàng",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-300",
    icon: Clock3,
  },
  PROCESSING: {
    label: "Đang xử lý",
    tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Loader2,
  },
  EXTRACTED: {
    label: "Đã trích xuất",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  REVIEW_REQUIRED: {
    label: "Cần kiểm duyệt",
    tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300",
    icon: FileWarning,
  },
  FAILED: {
    label: "Thất bại",
    tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300",
    icon: AlertTriangle,
  },
  CORRECTED: {
    label: "Đã chỉnh sửa",
    tone: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-900/30 dark:text-violet-300",
    icon: FileCheck2,
  },
  APPROVED: {
    label: "Đã duyệt",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    icon: ShieldCheck,
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
    aiProvider: "external-ai-api",
    normalizationMethod: "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API",
    createdAt: "2026-06-24T08:12:00Z",
    updatedAt: "2026-06-24T08:13:18Z",
    userId: "user-123",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-123/doc-001/original.pdf",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-123/doc-001/result.json",
    reviewReasons: [],
    lineItems: [
      {
        description: "AWS Amplify frontend hosting",
        quantity: 1,
        unitPrice: 2250000,
        amount: 2250000,
      },
    ],
    errorMessage: null,
    correctedFields: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNote: null,
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
    aiProvider: "external-ai-api",
    normalizationMethod: "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API",
    createdAt: "2026-06-24T08:30:00Z",
    updatedAt: "2026-06-24T08:31:10Z",
    userId: "user-123",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-123/doc-002/original.jpg",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-123/doc-002/result.json",
    reviewReasons: ["taxAmount missing", "currency confidence is low"],
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
    errorMessage: "Some required fields could not be confirmed automatically.",
    correctedFields: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNote: null,
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
    aiProvider: "external-ai-api",
    normalizationMethod: "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API",
    createdAt: "2026-06-24T08:42:00Z",
    updatedAt: "2026-06-24T08:42:42Z",
    userId: "user-123",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-123/doc-003/original.pdf",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-123/doc-003/result.json",
    reviewReasons: [],
    lineItems: [
      {
        description: "Annual SaaS license",
        quantity: 1,
        unitPrice: 680,
        amount: 680,
      },
    ],
    errorMessage: null,
    correctedFields: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNote: null,
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
    aiProvider: "not-called",
    normalizationMethod: "FAILED_BEFORE_NORMALIZE",
    createdAt: "2026-06-24T08:45:00Z",
    updatedAt: "2026-06-24T08:45:36Z",
    userId: "user-456",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-456/doc-004/original.png",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-456/doc-004/error.json",
    reviewReasons: ["vendorName missing", "totalAmount missing", "currency missing"],
    lineItems: [],
    errorMessage: "The image is too blurry to read. Upload a clearer scan or photo.",
    correctedFields: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNote: null,
  },
  {
    documentId: "doc-005",
    fileName: "invoice-cleaning-service.pdf",
    documentType: "INVOICE",
    status: "APPROVED",
    vendorName: "Green Clean Services",
    invoiceDate: "2026-06-17",
    currency: "VND",
    totalAmount: 1350000,
    taxAmount: 135000,
    confidenceScore: 0.79,
    aiProvider: "external-ai-api",
    normalizationMethod: "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API",
    createdAt: "2026-06-23T15:15:00Z",
    updatedAt: "2026-06-24T07:10:00Z",
    userId: "user-456",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-456/doc-005/original.pdf",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-456/doc-005/result.json",
    reviewReasons: [],
    lineItems: [
      {
        description: "Monthly office cleaning",
        quantity: 1,
        unitPrice: 1350000,
        amount: 1350000,
      },
    ],
    errorMessage: null,
    correctedFields: null,
    reviewedAt: "2026-06-24T07:10:00Z",
    reviewedBy: "finance.user",
    reviewerNote: "Verified against the source invoice.",
  },
  {
    documentId: "doc-006",
    fileName: "invoice-catering-june.pdf",
    documentType: "INVOICE",
    status: "QUEUED",
    vendorName: "Pending extraction",
    invoiceDate: "2026-06-24",
    currency: "VND",
    totalAmount: 0,
    taxAmount: null,
    confidenceScore: 0,
    aiProvider: "not-called",
    normalizationMethod: "TEXTRACT_ONLY",
    createdAt: "2026-06-24T09:05:00Z",
    updatedAt: "2026-06-24T09:05:16Z",
    userId: "user-123",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-123/doc-006/original.pdf",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-123/doc-006/result.json",
    reviewReasons: [],
    lineItems: [],
    errorMessage: "Waiting for background processing to start.",
    correctedFields: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNote: null,
  },
  {
    documentId: "doc-007",
    fileName: "receipt-parking-corrected.jpg",
    documentType: "RECEIPT",
    status: "CORRECTED",
    vendorName: "District Parking",
    invoiceDate: "2026-06-18",
    currency: "VND",
    totalAmount: 120000,
    taxAmount: null,
    confidenceScore: 0.71,
    aiProvider: "external-ai-api",
    normalizationMethod: "TEXTRACT_PLUS_AI_PROXY_EXTERNAL_API",
    createdAt: "2026-06-23T09:10:00Z",
    updatedAt: "2026-06-24T10:20:00Z",
    userId: "user-456",
    s3RawPath: "s3://docuflow-dev-raw/raw/user-456/doc-007/original.jpg",
    s3ProcessedPath: "s3://docuflow-dev-processed/processed/user-456/doc-007/result.json",
    reviewReasons: ["taxAmount missing"],
    lineItems: [],
    errorMessage: "A finance user corrected the missing vendor and amount fields",
    correctedFields: {
      vendorName: "District Parking",
      totalAmount: 120000,
    },
    reviewedAt: "2026-06-24T10:20:00Z",
    reviewedBy: "finance.user",
    reviewerNote: "Corrected vendor and total amount from the receipt.",
  },
]

export const workflowSteps = [
  "QueueJobWithEventBridgeAndSQS",
  "StartStepFunctionsExecution",
  "ValidateInput",
  "ExtractWithTextract",
  "NormalizeWithAIProxy",
  "ScoreAndUpdateStatus",
  "SaveMetadataToDynamoDB",
  "SaveProcessedJsonToS3",
  "TriggerSnsSesNotification",
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
    path: "/documents/upload-url",
    purpose: "Generate a 5-minute S3 presigned URL for PDF/JPG/PNG upload.",
  },
  {
    method: "GET",
    path: "/documents",
    purpose: "List documents by Cognito user using userId-createdAt-index.",
  },
  {
    method: "GET",
    path: "/documents/{documentId}",
    purpose: "Return document metadata, status, extracted fields, and review information.",
  },
  {
    method: "POST",
    path: "/documents/{documentId}/review",
    purpose: "Persist corrected fields or approve a reviewed document result.",
  },
]

export const operationalChecks = [
  {
    name: "Edge delivery",
    value: "CloudFront + Amplify",
    state: "Configured",
  },
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
    value: "3 days",
    state: "Configured",
  },
  {
    name: "AWS Budget threshold",
    value: "$5 / $10 / $20",
    state: "Configured",
  },
  {
    name: "External AI key",
    value: "Secrets Manager",
    state: "No frontend secret",
  },
  {
    name: "X-Ray traces",
    value: "API + Lambda",
    state: "Enabled",
  },
]

export const testCases = [
  {
    id: "TC-01",
    name: "Upload clear invoice",
    owner: "Tinh + Tra + Tai",
    expected: "EXTRACTED with vendor, date, total, tax, and currency.",
    evidence: "Document detail + S3 processed result.json",
    state: "Ready",
  },
  {
    id: "TC-02",
    name: "Upload clear receipt",
    owner: "Tinh + Tra + Tai",
    expected: "Receipt fields are extracted and saved.",
    evidence: "Document list + DynamoDB item",
    state: "Ready",
  },
  {
    id: "TC-03",
    name: "Upload blurry or incomplete file",
    owner: "Tai + Tinh + Duong",
    expected: "REVIEW_REQUIRED or FAILED with SNS alert.",
    evidence: "Review queue + alert screenshot",
    state: "Ready",
  },
  {
    id: "TC-04",
    name: "Upload unsupported file type",
    owner: "Tinh + Tra",
    expected: "Rejected before Textract or marked FAILED.",
    evidence: "Upload validation + workflow error",
    state: "Todo",
  },
  {
    id: "TC-05",
    name: "External AI API timeout or invalid JSON",
    owner: "Tai + Tra + Duong",
    expected: "Retry/Catch path updates status to FAILED.",
    evidence: "Step Functions failed execution",
    state: "Todo",
  },
  {
    id: "TC-06",
    name: "Clean up resources",
    owner: "Duong + Tra",
    expected: "SAM/CloudFormation stack and Amplify hosting resources are removed.",
    evidence: "Cleanup command output",
    state: "Todo",
  },
]

export const roleCapabilities = [
  {
    role: "finance",
    canUpload: true,
    canReview: true,
    canOperate: false,
    description: "Uploads and views own documents, verifies uncertain fields, and approves results.",
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
  "Watch status move from UPLOADED to QUEUED to PROCESSING to EXTRACTED.",
  "Open document detail and review extracted fields.",
  "Open a low-confidence file and show REVIEW_REQUIRED alert handling.",
  "Show Step Functions, CloudWatch, X-Ray, SNS/SES, S3, DynamoDB, and Secrets Manager evidence.",
  "Close with budget guardrails and cleanup plan.",
]

export const architectureServices = [
  { layer: "Edge / Frontend", service: "CloudFront + Amplify Hosting", rule: "Managed HTTPS entry point for the React/Vite SPA" },
  { layer: "Auth", service: "Amazon Cognito", rule: "Email/password, no SMS OTP" },
  { layer: "API", service: "API Gateway REST API", rule: "Upload URL, list, detail, and review endpoints" },
  { layer: "Storage", service: "Amazon S3", rule: "Raw and processed buckets, Block Public Access" },
  { layer: "Ingestion", service: "EventBridge + SQS/DLQ", rule: "S3 ObjectCreated events are queued before workflow start" },
  { layer: "Workflow", service: "Step Functions Standard", rule: "Auditable per-document execution history" },
  { layer: "Extraction", service: "Textract AnalyzeExpense", rule: "Limit test pages below 20 total" },
  { layer: "Normalize", service: "AI Proxy Lambda + External AI API", rule: "Backend only, key from Secrets Manager" },
  { layer: "Data", service: "DynamoDB + S3 processed", rule: "One table and small demo dataset" },
  { layer: "Ops", service: "CloudWatch + X-Ray + SNS/SES", rule: "Logs, traces, alarms, and email notifications" },
  { layer: "Governance", service: "IAM + KMS + CloudTrail + Budgets + SAM", rule: "Least privilege, encryption, audit, spend guardrails, cleanup" },
]

export const costGuardrails = [
  { item: "Demo documents", value: "Max 10 files", owner: "Team" },
  { item: "Demo pages", value: "Under 20 pages total", owner: "AI module" },
  { item: "CloudWatch logs", value: "3-day retention", owner: "Duong" },
  { item: "AWS Budgets", value: "$5, $10, $20 alerts", owner: "Duong" },
  { item: "External AI API", value: "Free quota or existing credits", owner: "Tai" },
  { item: "Cleanup", value: "Delete stack and check leftovers", owner: "Duong + Tra" },
]

export const teamModules = [
  { member: "Hoang Trong Tra", module: "Integration, Ingestion, Workflow", focus: "S3 raw, EventBridge, SQS/DLQ, Job Starter Lambda, Step Functions" },
  { member: "Vu Duy Tai", module: "AI Extraction and Normalization", focus: "Textract, AI Proxy Lambda, External AI API, confidence/status" },
  { member: "Nguyen Huu Tinh", module: "Frontend, Auth, User Flow", focus: "CloudFront, Amplify, Cognito, API integration, upload/result/review UI" },
  { member: "Lam Quang Loc", module: "Data Persistence", focus: "DynamoDB, S3 processed JSON, document metadata, reports" },
  { member: "Pham Tung Duong", module: "Ops, Security, IaC", focus: "IAM, KMS, Secrets Manager, CloudTrail, Budgets, SAM, observability" },
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

export function formatMoney(value: number, currency?: string | null) {
  const safeCurrency = (currency || "VND").toUpperCase()
  const finalCurrency = /^[A-Z]{3}$/.test(safeCurrency) ? safeCurrency : "VND"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: finalCurrency,
    maximumFractionDigits: finalCurrency === "VND" ? 0 : 2,
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
