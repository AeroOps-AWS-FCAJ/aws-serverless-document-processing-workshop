"use client"

import { Activity, Bell, Braces, GitBranch, Shield } from "lucide-react"
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
import {
  apiContracts,
  operationalChecks,
  workflowSteps,
} from "@/lib/docuflow-data"

const iamRoles = [
  "UploadUrlLambdaRole",
  "JobStarterLambdaRole",
  "StateMachineRole",
  "ExtractionLambdaRole",
  "MetadataLambdaRole",
]

export default function OperationsPage() {
  return (
    <BaseLayout
      title="Operations"
      description="Runbook view for workflow, API contract, alerts, IAM ownership, and demo evidence."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-5" />
              Step Functions workflow
            </CardTitle>
            <CardDescription>
              Standard workflow states expected by the MVP.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {workflowSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border p-3">
                <Badge variant="secondary">{index + 1}</Badge>
                <span className="font-medium">{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Operational checks
            </CardTitle>
            <CardDescription>
              CloudWatch, SNS, DLQ, and budget signals for the workshop demo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Check</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationalChecks.map((check) => (
                    <TableRow key={check.name}>
                      <TableCell className="font-medium">{check.name}</TableCell>
                      <TableCell>{check.value}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{check.state}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Braces className="size-5" />
              API contract
            </CardTitle>
            <CardDescription>
              Frontend integration surface for API Gateway and Lambda handlers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {apiContracts.map((contract) => (
              <div key={contract.path} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{contract.method}</Badge>
                  <span className="font-mono text-sm">{contract.path}</span>
                </div>
                <p className="text-muted-foreground text-sm">{contract.purpose}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Security ownership
            </CardTitle>
            <CardDescription>
              Runtime roles should stay separate and least-privilege.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {iamRoles.map((role) => (
              <div key={role} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span className="font-mono text-sm">{role}</span>
                <Badge variant="outline">Least privilege</Badge>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Bell className="size-4 text-amber-600" />
              <span className="text-sm">
                SNS topic docuflow-alerts notifies reviewer/admin on FAILED or REVIEW_REQUIRED.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
