import { useMemo, useState, type ReactElement } from 'react'

import { SearchFilter } from '@/components/ui'
import {
  categoriesForScene,
  SCENE_ACTION_CATEGORIES,
  type SceneActionCategory,
} from '@/data/atomicActions'
import { coldStartScenes } from '@/data/seed/coldStartScenes'
import { cn } from '@/lib/utils'

export default function AtomicActions(): ReactElement {
  const [selectedSceneId, setSelectedSceneId] = useState(coldStartScenes[0]?.id ?? '')
  const [search, setSearch] = useState('')

  const sceneCategories = useMemo(
    () => categoriesForScene(selectedSceneId),
    [selectedSceneId],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sceneCategories
    return sceneCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.primitives.some((p) => p.toLowerCase().includes(q)),
    )
  }, [sceneCategories, search])

  const selectedScene = coldStartScenes.find((s) => s.id === selectedSceneId)
  const totalPrimitives = useMemo(
    () => new Set(SCENE_ACTION_CATEGORIES.flatMap((c: SceneActionCategory) => c.primitives)).size,
    [],
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">原子动作库</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          按场景查看动作大类及其原语全集；台本配置时仅勾选当前场景下的动作大类
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">场景</p>
          <p className="mt-1 text-2xl font-semibold">{coldStartScenes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">场景×动作大类</p>
          <p className="mt-1 text-2xl font-semibold">{SCENE_ACTION_CATEGORIES.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">去重原语</p>
          <p className="mt-1 text-2xl font-semibold">{totalPrimitives}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">重点覆盖</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {SCENE_ACTION_CATEGORIES.filter((c: SceneActionCategory) => c.highlight).length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <p className="px-2 py-1.5 text-xs font-medium text-slate-500">场景</p>
          <ul className="space-y-0.5">
            {coldStartScenes.map((scene) => {
              const count = categoriesForScene(scene.id).length
              return (
                <li key={scene.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSceneId(scene.id)
                      setSearch('')
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                      selectedSceneId === scene.id
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <span>{scene.name}</span>
                    <span className="text-xs text-slate-400">{count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-3">
          <SearchFilter
            searchPlaceholder={`在「${selectedScene?.name ?? ''}」内搜索动作大类或原语…`}
            searchValue={search}
            onSearchChange={setSearch}
            filters={[]}
            activeFilters={{}}
            onFilterChange={() => {}}
          />

          <div className="space-y-2">
            {filtered.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
            {filtered.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                无匹配的动作大类
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryCard({ category }: { category: SceneActionCategory }): ReactElement {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className={cn('font-medium text-slate-900', category.highlight && 'text-amber-900')}>
          {category.name}
        </h4>
        {category.highlight ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
            重点覆盖
          </span>
        ) : null}
        <span className="text-xs text-slate-400">{category.primitives.length} 种原语</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{category.primitives.join('、')}</p>
      <p className="mt-1 font-mono text-[10px] text-slate-400">{category.id}</p>
    </div>
  )
}
