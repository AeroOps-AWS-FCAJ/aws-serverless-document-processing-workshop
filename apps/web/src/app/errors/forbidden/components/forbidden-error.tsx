"use client"

import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export function ForbiddenError() {
  const navigate = useNavigate()

  return (
    <div className='mx-auto flex min-h-dvh flex-col items-center justify-center gap-8 p-8 md:gap-12 md:p-16'>
      <div className="flex aspect-video w-full max-w-3xl items-center justify-center rounded-xl border bg-muted">
        <div className="text-muted-foreground text-sm">DocuFlow AI role guard</div>
      </div>
      <div className='text-center'>
        <h1 className='mb-4 text-3xl font-bold'>403</h1>
        <h2 className="mb-3 text-2xl font-semibold">Forbidden</h2>
        <p>Access to this resource is forbidden. You don't have the necessary permissions to view this page.</p>
        <div className='mt-6 flex items-center justify-center gap-4 md:mt-8'>
          <Button className='cursor-pointer' onClick={() => navigate('/dashboard')}>Go Back Home</Button>
          <Button variant='outline' className='flex cursor-pointer items-center gap-1' onClick={() => navigate('/operations')}>
            Open runbook
          </Button>
        </div>
      </div>
    </div>
  )
}
