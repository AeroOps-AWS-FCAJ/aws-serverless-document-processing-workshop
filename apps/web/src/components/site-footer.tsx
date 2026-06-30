import { ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { getDocuFlowSession, roleHomePaths, roleLabels } from "@/lib/auth"

export function SiteFooter() {
  const session = getDocuFlowSession()
  const role = session?.role ?? "finance"

  return (
    <footer className="border-t bg-background/70">
      <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <Link
              to={roleHomePaths[role]}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              DocuFlow AI · {roleLabels[role]}
            </Link>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            Amplify · Cognito · Step Functions · Textract · DynamoDB
          </p>
        </div>
      </div>
    </footer>
  )
}
