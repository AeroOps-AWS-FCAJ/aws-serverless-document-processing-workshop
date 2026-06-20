# DocuFlow AI

Serverless intelligent invoice and receipt processing platform on AWS.

This repository contains the application code for DocuFlow AI. Workshop documentation lives in the companion `docuflow-ai-workshop` repository.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, served via Amazon S3 + CloudFront
- **Backend**: AWS Lambda (Node.js 20.x, TypeScript) orchestrated by AWS Step Functions
- **AI**: Amazon Textract `AnalyzeExpense` + Amazon Bedrock (Nova Lite)
- **Data**: Amazon DynamoDB on-demand, Amazon S3
- **Eventing**: Amazon EventBridge + Amazon SQS
- **Auth**: Amazon Cognito
- **IaC**: AWS SAM
- **Region**: `ap-southeast-1` (Singapore)

## Repository Layout

    docuflow-ai/
    ├── apps/web/                  # React + Vite frontend
    ├── packages/
    │   ├── shared-types/          # Zod schemas, DTOs
    │   └── shared-config/         # ESLint, tsconfig, prettier
    ├── services/
    │   ├── functions/             # 5 Lambda handlers
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

## Workshop Modules

Resources are added to the SAM template per workshop module:

| Module | Adds |
|---|---|
| 5.2 Prerequisites | Bootstrap stack, IAM baseline |
| 5.3 Frontend / Auth / Upload | Cognito User Pool, SPA S3 bucket, CloudFront, `presignUpload` Lambda |
| 5.4 Storage / Ingestion / Workflow | `docuflow-raw`, `docuflow-processed`, EventBridge rule, SQS + DLQ, `startProcessing` Lambda |
| 5.5 AI Extraction | Step Functions state machine, Bedrock IAM, `validateExtraction` Lambda |
| 5.6 Data / Result / Review | DynamoDB `Documents`, API Gateway, `updateStatus` and `reviewUpdate` Lambdas |
| 5.7 Observability / Security / IaC | CloudWatch alarms, SNS `docuflow-alerts`, AWS Budgets, KMS hardening |
| 5.8 Cleanup | Teardown script and verification |

## License

Proprietary — FCAJ Internship Project, 2026.
