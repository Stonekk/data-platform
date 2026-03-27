import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type TabItem = {
  key: string
  label: string
}

export type TabsProps = {
  tabs: TabItem[]
  activeTab: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
}: TabsProps): ReactElement {
  return (
    <div
      className={cn(
        'inline-flex w-full gap-1 rounded-lg border border-border bg-slate-50/80 p-1',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected: boolean = tab.key === activeTab
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={cn(
              'min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm font-medium transition-colors',
              selected
                ? 'bg-card text-text shadow-sm ring-1 ring-slate-950/5'
                : 'text-text-secondary hover:bg-white/60 hover:text-text',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
