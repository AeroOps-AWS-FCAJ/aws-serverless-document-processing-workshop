"use client"

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface TablePaginationProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  isLoading?: boolean
  className?: string
}

function getPageItems(page: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) pages.push("ellipsis-left")
  for (let item = start; item <= end; item += 1) pages.push(item)
  if (end < totalPages - 1) pages.push("ellipsis-right")
  pages.push(totalPages)

  return pages
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  isLoading = false,
  className,
}: TablePaginationProps) {
  const { t } = useLanguage()
  const safeTotalPages = Math.max(1, totalPages)
  const currentPage = Math.min(Math.max(page, 1), safeTotalPages)
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)
  const pages = getPageItems(currentPage, safeTotalPages)
  const canGoPrevious = currentPage > 1 && !isLoading
  const canGoNext = currentPage < safeTotalPages && !isLoading

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          {t("table.showingRange", { from: firstItem, to: lastItem, total: totalItems })}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>{t("table.rowsPerPage")}</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))} disabled={isLoading}>
              <SelectTrigger size="sm" className="h-8 w-[76px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)} className="cursor-pointer">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
            <ChevronFirst className="size-4" />
            <span className="sr-only">{t("table.firstPage")}</span>
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(currentPage - 1)} disabled={!canGoPrevious}>
            <ChevronLeft className="size-4" />
            <span className="sr-only">{t("table.previousPage")}</span>
          </Button>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((item) => (
            typeof item === "number" ? (
              <Button
                key={item}
                type="button"
                variant={item === currentPage ? "default" : "outline"}
                size="icon"
                className="size-8"
                onClick={() => onPageChange(item)}
                disabled={isLoading || item === currentPage}
              >
                {item}
              </Button>
            ) : (
              <span key={item} className="grid size-8 place-items-center text-muted-foreground">
                <MoreHorizontal className="size-4" />
              </span>
            )
          ))}
        </div>

        <div className="px-2 text-xs font-medium text-muted-foreground sm:hidden">
          Trang {currentPage}/{safeTotalPages}
        </div>

        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(currentPage + 1)} disabled={!canGoNext}>
            <ChevronRight className="size-4" />
            <span className="sr-only">{t("table.nextPage")}</span>
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onPageChange(safeTotalPages)} disabled={!canGoNext}>
            <ChevronLast className="size-4" />
            <span className="sr-only">{t("table.lastPage")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
