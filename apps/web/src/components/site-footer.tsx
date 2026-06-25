import { ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <Link
              to="/operations"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              DocuFlow AI runbook
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Serverless invoice and receipt processing on AWS with Amplify Hosting, Cognito, S3, Step Functions, Textract, Bedrock, DynamoDB, CloudWatch, and SNS.
          </p>
        </div>
      </div>
    </footer>
  )
}
