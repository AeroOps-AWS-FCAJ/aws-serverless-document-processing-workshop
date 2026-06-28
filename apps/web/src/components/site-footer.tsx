import { ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { getDocuFlowSession, roleHomePaths, roleLabels } from "@/lib/auth"

export function SiteFooter() {
  const session = getDocuFlowSession()
  const role = session?.role ?? "finance"

  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <Link
              to={roleHomePaths[role]}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              DocuFlow AI · {roleLabels[role]}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Secure invoice and receipt intake with role-based access and traceable processing status.
          </p>
        </div>
      </div>
    </footer>
  )
}
