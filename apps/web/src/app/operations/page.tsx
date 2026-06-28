"use client"

import { Activity, Bell, Braces, GitBranch, Shield, WalletCards } from "lucide-react"
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
  architectureServices,
  costGuardrails,
  operationalChecks,
  teamModules,
  workflowSteps,
} from "@/lib/docuflow-data"

const iamRoles = [
  "docuflow-dev-upload-lambda-role",
  "docuflow-dev-start-job-lambda-role",
  "docuflow-dev-processing-role",
  "docuflow-dev-status-lambda-role",
  "docuflow-dev-alert-role",
]

export default function OperationsPage() {
  return (
    <BaseLayout
      title="Operations"
      description="Runbook view for the Free Tier and $200-credit-friendly DocuFlow AI architecture."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-5" />
              Step Functions workflow
            </CardTitle>
            <CardDescription>
              Lean workflow for upload, Textract, AI Proxy normalization, save, alert, and cleanup evidence.
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
              Cost-aware signals that should appear in the workshop evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[560px]">
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
              Amplify-hosted frontend calls API Gateway REST API; no server-side rendering.
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
              Runtime roles stay separate; External AI key is read from AWS Secrets Manager.
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
                SNS triggers SES email notifications on FAILED and REVIEW_REQUIRED outcomes.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Architecture map</CardTitle>
            <CardDescription>
              Services retained in the simplified MVP and the cost-control rule attached to each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Layer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Rule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {architectureServices.map((item) => (
                    <TableRow key={`${item.layer}-${item.service}`}>
                      <TableCell className="font-medium">{item.layer}</TableCell>
                      <TableCell>{item.service}</TableCell>
                      <TableCell className="text-muted-foreground">{item.rule}</TableCell>
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
              <WalletCards className="size-5" />
              Cost guardrails
            </CardTitle>
            <CardDescription>
              Free Tier and $200 credit friendly constraints.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {costGuardrails.map((item) => (
              <div key={item.item} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.item}</div>
                    <div className="text-muted-foreground text-sm">{item.value}</div>
                  </div>
                  <Badge variant="outline">{item.owner}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Team ownership</CardTitle>
            <CardDescription>
              Current five-person split from the updated architecture document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[720px]">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Focus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamModules.map((item) => (
                    <TableRow key={item.member}>
                      <TableCell className="font-medium">{item.member}</TableCell>
                      <TableCell>{item.module}</TableCell>
                      <TableCell className="text-muted-foreground">{item.focus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
