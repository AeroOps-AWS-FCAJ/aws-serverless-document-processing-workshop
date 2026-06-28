"use client"

import { CheckSquare, ClipboardList, Film, ShieldCheck } from "lucide-react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { demoScript, testCases } from "@/lib/docuflow-data"

const definitionOfDone = [
  "Users enter through CloudFront and the frontend deploys successfully with Amplify Hosting",
  "Cognito login works for the demo user",
  "API Gateway REST API calls Lambda for upload/status/result",
  "Presigned URL upload writes to S3 raw bucket",
  "S3 ObjectCreated event routes through EventBridge and SQS/DLQ",
  "Step Functions executes Textract and AI Proxy External AI normalization",
  "Secrets Manager holds the External AI API key",
  "DynamoDB stores metadata and processing status",
  "S3 processed bucket contains result JSON",
  "CloudWatch Logs, X-Ray trace, SNS, and SES email alert evidence are captured",
  "AWS Budgets alerts exist at $5, $10, and $20",
  "Cleanup script removes stack resources",
]

export default function EvidencePage() {
  return (
    <BaseLayout
      title="Evidence"
      description="Test plan, demo script, and Definition of Done for the simplified Free Tier-friendly MVP."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5" />
              Test plan
            </CardTitle>
            <CardDescription>
              Evidence checklist aligned to upload, extraction, External AI, alerts, and cleanup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Test case</TableHead>
                    <TableHead>Expected result</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase) => (
                    <TableRow key={testCase.id}>
                      <TableCell className="font-mono">{testCase.id}</TableCell>
                      <TableCell className="font-medium">{testCase.name}</TableCell>
                      <TableCell>{testCase.expected}</TableCell>
                      <TableCell className="text-muted-foreground">{testCase.evidence}</TableCell>
                      <TableCell>
                        <Badge variant={testCase.state === "Ready" ? "outline" : "secondary"}>
                          {testCase.state}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="size-5" />
                Demo script
              </CardTitle>
              <CardDescription>
                Seven-minute flow for mentor/reviewer walkthrough.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {demoScript.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-lg border p-3">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Secret hygiene
              </CardTitle>
              <CardDescription>
                Required proof before publishing source or screenshots.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-lg border p-3">No API key in frontend source.</div>
              <div className="rounded-lg border p-3">No `.env` containing API key in GitHub.</div>
              <div className="rounded-lg border p-3">No API key printed in CloudWatch logs.</div>
              <div className="rounded-lg border p-3">No raw invoice image sent externally unless approved.</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="size-5" />
              Definition of Done
            </CardTitle>
            <CardDescription>
              MVP is complete when these integration and cost-control items are evidenced.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {definitionOfDone.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border p-3">
                <CheckSquare className="mt-0.5 size-4 text-emerald-600" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
