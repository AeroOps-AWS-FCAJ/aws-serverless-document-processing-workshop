"use client"

import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { useLanguage } from "@/lib/i18n"

export function UnauthorizedError() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className='mx-auto flex min-h-dvh flex-col items-center justify-center gap-8 p-8 md:gap-12 md:p-16'>
      <div className="flex aspect-video w-full max-w-3xl items-center justify-center rounded-xl border bg-muted">
        <div className="text-muted-foreground text-sm">{t("error.unauthorizedEyebrow")}</div>
      </div>
      <div className='text-center'>
        <h1 className='mb-4 text-3xl font-bold'>401</h1>
        <h2 className="mb-3 text-2xl font-semibold">{t("error.unauthorizedTitle")}</h2>
        <p>{t("error.unauthorizedBody")}</p>
        <div className='mt-6 flex items-center justify-center gap-4 md:mt-8'>
          <Button className='cursor-pointer' onClick={() => navigate('/dashboard')}>{t("error.backHome")}</Button>
          <Button variant='outline' className='flex cursor-pointer items-center gap-1' onClick={() => navigate('/operations')}>
            {t("error.openRunbook")}
          </Button>
        </div>
      </div>
    </div>
  )
}
