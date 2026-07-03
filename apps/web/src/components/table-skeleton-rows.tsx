"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

interface TableSkeletonRowsProps {
  rows: number
  columns: number
}

export function TableSkeletonRows({ rows, columns }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-row-${rowIndex}`} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="h-[64px]">
              <Skeleton className={columnIndex === 0 ? "h-4 w-4" : columnIndex === 1 ? "h-4 w-44 max-w-full" : "h-4 w-24 max-w-full"} />
              {columnIndex === 1 && <Skeleton className="mt-2 h-3 w-28 max-w-full" />}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
