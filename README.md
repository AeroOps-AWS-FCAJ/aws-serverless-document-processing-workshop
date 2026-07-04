# DocuFlow AI

Serverless intelligent invoice and receipt processing platform on AWS.

This repository contains the application code for DocuFlow AI. Workshop documentation lives in the companion `docuflow-ai-workshop` repository.

## Stack

- **Frontend**: React 19 + TypeScript + Vite, delivered through Amazon CloudFront and AWS Amplify Hosting
- **Backend**: AWS Lambda (Node.js 20.x, TypeScript) orchestrated by AWS Step Functions
- **AI**: Amazon Textract `AnalyzeExpense` + AI Proxy Lambda calling an External AI API
- **Data**: Amazon DynamoDB on-demand, Amazon S3
- **Eventing**: Amazon EventBridge + Amazon SQS
- **Observability**: Amazon CloudWatch + AWS X-Ray
- **Alerting**: Amazon SNS + Amazon SES
- **Auth**: Amazon Cognito
- **Security / Governance**: IAM, AWS KMS, AWS Secrets Manager, AWS CloudTrail, AWS Budgets
- **IaC**: AWS SAM / CloudFormation
- **Region**: `ap-southeast-1` (Singapore)

## Repository Layout

    docuflow-ai/
    ├── apps/web/                  # React + Vite frontend
    ├── packages/
    │   ├── shared-types/          # Frontend data and API contracts
    │   └── shared-config/         # Shared status and confidence settings
    ├── services/
    │   ├── functions/             # Lambda handlers
    │   └── statemachines/         # Step Functions ASL JSON
    └── infrastructure/            # AWS SAM template

## Prerequisites

- Node.js 20+
- pnpm 9+
- AWS CLI v2 configured for `ap-southeast-1`
- AWS SAM CLI

## Quick Start

Install dependencies and run checks:

    pnpm install
    pnpm run lint
    pnpm run typecheck
    pnpm run test

Validate and deploy the SAM stack:

    sam validate --lint --template infrastructure/template.yaml
    sam build
    sam deploy --guided   # first deploy only
    sam deploy            # subsequent deploys

Run the frontend locally:

    pnpm --filter docuflow-ai-web dev

The local web demo starts at `/auth/sign-in`. Protected application routes such as
`/dashboard`, `/upload`, `/documents`, `/review`, `/operations`, `/evidence`, and
`/settings/notifications` redirect to sign-in until a session exists. Role guards then
limit administrator routes.

The sign-in page provides two local demo roles:

- Finance: `finance@docuflow.ai`
- System administrator: `admin@docuflow.ai`
- Password: `password`

The current frontend stores a small role-aware `localStorage` session so the workshop
demo can show authentication, role-specific navigation, ownership filtering, and route
authorization before Cognito is wired. Production auth should replace this mock session
with Cognito tokens, group claims, and API-side authorization checks.

## Frontend Flow

1. User signs in through the Cognito-ready auth screen.
2. Finance users enter the document overview and handle their own review queue;
   administrators enter operations and can inspect all documents.
3. Users upload invoice or receipt files through `POST /documents/upload-url`, receive a
   5-minute S3 presigned URL, then upload the original file directly to S3.
4. The S3 ObjectCreated event is routed through EventBridge and SQS/DLQ before
   Job Starter Lambda starts Step Functions.
5. Processing status moves from `UPLOADED` to `QUEUED` and `PROCESSING`, then
   branches to `EXTRACTED`, `REVIEW_REQUIRED`, or `FAILED`. Reviewed documents can
   continue through `CORRECTED` and `APPROVED`.
6. Finance users handle their own low-confidence or failed documents in the review
   queue and save corrected fields with `POST /documents/{documentId}/review`.

Role boundaries in the frontend:

- Finance users upload and view only their own records, correct uncertain fields,
  and approve verified results.
- Administrators can inspect all records and access operations, project evidence,
  and alert settings.

Auth pages are intentionally not listed in the in-app sidebar. The sidebar is for
the authenticated workspace only; logout is available from the user menu.

Frontend API contract:

- `POST /documents/upload-url` returns `documentId`, `uploadUrl`, `s3RawPath`, and `expiresIn`.
- `GET /documents` returns `items[]` and `nextToken` and supports status filtering.
- `GET /documents/{documentId}` returns metadata, extracted fields, status, and review information.
- `POST /documents/{documentId}/review` corrects fields or approves a reviewed result.

Set `VITE_API_BASE_URL` to call the API Gateway REST API. Without that variable the
frontend uses local sample data, simulated upload latency, and the same request/response
contracts so frontend work can continue before backend integration is available.

## Workshop Modules

Resources are added to the SAM template per workshop module:

| Module | Adds |
|---|---|
| 5.2 Prerequisites | Bootstrap stack, IAM baseline |
| 5.3 Frontend / Auth / Upload | Amazon CloudFront, AWS Amplify Hosting, Cognito User Pool, `presignUpload` Lambda |
| 5.4 Storage / Ingestion / Workflow | `docuflow-raw`, `docuflow-processed`, EventBridge rule, SQS + DLQ, `startProcessing` Lambda |
| 5.5 AI Extraction | Step Functions state machine, Textract, AI Proxy Lambda, External AI API secret, `confidenceStatus` Lambda |
| 5.6 Data / Result / Review | DynamoDB `Documents`, S3 processed JSON, API Gateway, status/result/review Lambdas |
| 5.7 Observability / Security / IaC | CloudWatch alarms, X-Ray traces, SNS/SES alerts, Secrets Manager, CloudTrail, AWS Budgets, KMS hardening |
| 5.8 Cleanup | Teardown script and verification |

## License

Proprietary — FCAJ Internship Project, 2026.
