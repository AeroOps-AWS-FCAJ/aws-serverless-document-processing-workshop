"use client"

import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { getDocuFlowSession, roleHomePaths } from "@/lib/auth"

export function ForbiddenError() {
  const navigate = useNavigate()
  const session = getDocuFlowSession()
  const homePath = session ? roleHomePaths[session.role] : "/auth/sign-in"

  return (
    <div className='mx-auto flex min-h-dvh flex-col items-center justify-center gap-8 p-8 md:gap-12 md:p-16'>
      <div className="flex aspect-video w-full max-w-3xl items-center justify-center rounded-xl border bg-muted">
        <div className="text-muted-foreground text-sm">DocuFlow AI role guard</div>
      </div>
      <div className='text-center'>
        <h1 className='mb-4 text-3xl font-bold'>403</h1>
        <h2 className="mb-3 text-2xl font-semibold">Forbidden</h2>
        <p>This page is not available for your current workspace role.</p>
        <div className='mt-6 flex items-center justify-center gap-4 md:mt-8'>
          <Button className='cursor-pointer' onClick={() => navigate(homePath)}>Return to workspace</Button>
        </div>
      </div>
    </div>
  )
}
