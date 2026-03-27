import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

import { ChevronDown, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SearchFilterOption = {
  value: string
  label: string
}

export type SearchFilterDef = {
  key: string
  label: string
  options: SearchFilterOption[]
}

export type SearchFilterProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: SearchFilterDef[]
  activeFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  className?: string
  searchPlaceholder?: string
}

export function SearchFilter({
  searchValue,
  onSearchChange,
  filters,
  activeFilters,
  onFilterChange,
  className,
  searchPlaceholder = '搜索…',
}: SearchFilterProps): ReactElement {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | PointerEvent): void {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) {
        setOpenKey(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-sm text-text outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active: string | undefined = activeFilters[f.key]
          const activeLabel: string =
            f.options.find((o) => o.value === active)?.label ?? f.label

          const isOpen: boolean = openKey === f.key

          return (
            <div key={f.key} className="relative">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : f.key)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/5 text-primary'
                    : 'border-border bg-white text-text hover:border-slate-300 hover:bg-slate-50',
                )}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <span className="max-w-[140px] truncate">{activeLabel}</span>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-text-secondary transition-transform',
                    isOpen && 'rotate-180',
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 z-20 mt-1 max-h-60 min-w-[200px] overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg ring-1 ring-slate-950/5"
                >
                  {f.options.map((opt) => {
                    const selected: boolean = activeFilters[f.key] === opt.value
                    return (
                      <li key={opt.value} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full px-3 py-2 text-left text-sm transition-colors',
                            selected
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'text-text hover:bg-slate-50',
                          )}
                          onClick={() => {
                            onFilterChange(f.key, opt.value)
                            setOpenKey(null)
                          }}
                        >
                          {opt.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
