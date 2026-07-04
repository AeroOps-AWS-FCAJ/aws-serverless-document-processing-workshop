"use client"

import type { ReactNode } from "react"
import { useLanguage } from "@/lib/i18n"
import { Columns3, ListChecks, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type TableColumnVisibility = Record<string, boolean>

export interface BulkTableColumn {
  key: string
  label: string
  locked?: boolean
}

interface TableBulkControlsProps {
  selectedCount: number
  totalCount: number
  allSelected: boolean
  columns: BulkTableColumn[]
  columnVisibility: TableColumnVisibility
  onToggleAll: (checked: boolean) => void
  onClearSelection: () => void
  onColumnVisibilityChange: (key: string, visible: boolean) => void
  onResetColumns?: () => void
  className?: string
  children?: ReactNode
}

export function TableBulkControls({
  selectedCount,
  totalCount,
  allSelected,
  columns,
  columnVisibility,
  onToggleAll,
  onClearSelection,
  onColumnVisibilityChange,
  onResetColumns,
  className,
  children,
}: TableBulkControlsProps) {
  const { t } = useLanguage()
  const visibleColumnCount = columns.filter((column) => columnVisibility[column.key] !== false).length
  const selectable = totalCount > 0

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        selectedCount > 0 && "border-primary/25 bg-primary/5",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 text-xs font-medium shadow-xs transition-colors hover:bg-muted/40">
          <Checkbox
            aria-label={t("table.selectAllAria")}
            checked={selectable && allSelected}
            disabled={!selectable}
            onCheckedChange={(value) => onToggleAll(value === true)}
          />
          <span>{allSelected && selectedCount > 0 ? t("table.clearSelection") : t("table.selectAll")}</span>
        </label>
        <div className={cn("flex items-center gap-2 font-medium", selectedCount > 0 ? "text-primary" : "text-muted-foreground")}>
          <ListChecks className="size-4" />
          {selectedCount > 0 ? t("table.selectedCount", { count: selectedCount }) : t("table.rowCount", { count: totalCount })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 && children}
        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 cursor-pointer" onClick={onClearSelection}>{t("common.deselect")}</Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 cursor-pointer">
              <Columns3 className="size-3.5" />{t("common.columns")}<span className="font-mono text-[10px] text-muted-foreground">{visibleColumnCount}/{columns.length}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">{t("table.columns")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={columnVisibility[column.key] !== false}
                disabled={column.locked}
                onCheckedChange={(value) => onColumnVisibilityChange(column.key, value === true)}
                onSelect={(event) => event.preventDefault()}
                className="cursor-pointer"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
            {onResetColumns && (
              <>
                <DropdownMenuSeparator />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start px-2 text-xs"
                  onClick={onResetColumns}
                >
                  <RotateCcw className="size-3.5" />{t("common.showAllColumns")}</Button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
