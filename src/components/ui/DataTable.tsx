import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type DataTableColumn<T> = {
  key: string
  title: string
  render?: (row: T, rowIndex: number) => ReactNode
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  onRowClick?: (row: T, rowIndex: number) => void
  className?: string
}

function getCellValue<T>(row: T, key: string): ReactNode {
  if (row !== null && typeof row === 'object' && key in row) {
    const v = (row as Record<string, unknown>)[key]
    if (v === null || v === undefined) return '—'
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      return String(v)
    }
  }
  return '—'
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
}: DataTableProps<T>): ReactElement {
  const clickable: boolean = Boolean(onRowClick)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-text-secondary"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(row, rowIndex)
                        }
                      : undefined
                  }
                  className={cn(
                    'transition-colors',
                    rowIndex % 2 === 1 && 'bg-slate-50/50',
                    clickable &&
                      'cursor-pointer hover:bg-primary/5 focus-within:bg-primary/5',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-text tabular-nums"
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : getCellValue(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
