"use client"

import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LanguageToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { language, setLanguage, toggleLanguage, t } = useLanguage()

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleLanguage}
        aria-label={t("language.switch")}
        title={t("language.switch")}
        className={cn("size-9 shrink-0 bg-background/70 shadow-sm backdrop-blur", className)}
      >
        <span className="font-mono text-[10px] font-semibold uppercase">{language.toUpperCase()}</span>
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-full border border-border/80 bg-background/70 p-0.5 shadow-sm backdrop-blur",
        className
      )}
      aria-label={t("language.switch")}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setLanguage("vi")}
        aria-pressed={language === "vi"}
        className={cn(
          "h-7 gap-1.5 rounded-full px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
          language === "vi"
            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <Languages className="size-3.5" />
        VI
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={cn(
          "h-7 rounded-full px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
          language === "en"
            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        EN
      </Button>
    </div>
  )
}
