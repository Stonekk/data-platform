import { useMemo, type ReactElement } from 'react'
import { GripVertical, Plus, Trash2, Wand2 } from 'lucide-react'

import { mockScenes, type ScriptTaskAllocation, type TaskScript } from '@/data/mock'
import {
  createEmptyGroupingDraft,
  type TaskGroupingDraft,
} from '@/lib/scriptBatchWorkflow'
import { mergeAllocations } from '@/lib/taskScriptAccess'
import { cn } from '@/lib/utils'

export type ScriptGroupingEditorProps = {
  confirmedScripts: TaskScript[]
  drafts: TaskGroupingDraft[]
  onDraftsChange: (drafts: TaskGroupingDraft[]) => void
  defaultTaskType: string
  defaultTargetCount: number
  allocations: ScriptTaskAllocation[]
  groupingConfirmed: boolean
  onGroupingConfirmedChange: (confirmed: boolean) => void
  onApplySuggested: () => void
}

export function ScriptGroupingEditor({
  confirmedScripts,
  drafts,
  onDraftsChange,
  defaultTaskType,
  defaultTargetCount,
  allocations,
  groupingConfirmed,
  onGroupingConfirmedChange,
  onApplySuggested,
}: ScriptGroupingEditorProps): ReactElement {
  const scriptById = useMemo(() => {
    const m = new Map<string, TaskScript>()
    for (const s of confirmedScripts) m.set(s.taskId, s)
    return m
  }, [confirmedScripts])

  const assignedIds = new Set(drafts.flatMap((d) => d.scriptIds))
  const unassigned = confirmedScripts.filter((s) => !assignedIds.has(s.taskId))

  function removeDraft(id: string): void {
    onDraftsChange(drafts.filter((d) => d.id !== id))
    onGroupingConfirmedChange(false)
  }

  function moveScriptToGroup(scriptId: string, groupId: string): void {
    const script = scriptById.get(scriptId)
    if (!script) return
    const without = drafts.map((d) => ({
      ...d,
      scriptIds: d.scriptIds.filter((id) => id !== scriptId),
      allocations: d.allocations.filter((a) => a.scriptId !== scriptId),
    }))
    const next = without.map((d) => {
      if (d.id !== groupId) return d
      const scriptIds = [...d.scriptIds, scriptId]
      return {
        ...d,
        scriptIds,
        allocations: mergeAllocations(scriptIds, [...d.allocations, ...allocations], defaultTargetCount),
      }
    })
    onDraftsChange(next)
    onGroupingConfirmedChange(false)
  }

  function removeScriptFromGroup(scriptId: string, groupId: string): void {
    const next = drafts.map((d) => {
      if (d.id !== groupId) return d
      const scriptIds = d.scriptIds.filter((id) => id !== scriptId)
      return {
        ...d,
        scriptIds,
        allocations: d.allocations.filter((a) => a.scriptId !== scriptId),
      }
    })
    onDraftsChange(next)
    onGroupingConfirmedChange(false)
  }

  const canConfirm =
    unassigned.length === 0 &&
    drafts.length > 0 &&
    drafts.every((d) => d.scriptIds.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
        <button
          type="button"
          onClick={onApplySuggested}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Wand2 className="size-4" />
          采用系统建议分组
        </button>
        <button
          type="button"
          onClick={() => {
            onDraftsChange([...drafts, createEmptyGroupingDraft(defaultTaskType)])
            onGroupingConfirmedChange(false)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <Plus className="size-4" />
          新建空分组
        </button>
        <button
          type="button"
          disabled={!canConfirm || groupingConfirmed}
          onClick={() => onGroupingConfirmedChange(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          确认分组方案
        </button>
        {groupingConfirmed && (
          <span className="self-center text-xs font-medium text-emerald-700">分组已锁定</span>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
          <p className="text-sm font-medium text-amber-900">
            未分组台本 ({unassigned.length})
          </p>
          <ul className="mt-2 space-y-2">
            {unassigned.map((script) => (
              <li
                key={script.taskId}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
              >
                <GripVertical className="size-4 text-slate-300" aria-hidden />
                <span className="min-w-0 flex-1 font-mono text-xs">{script.taskId}</span>
                <span className="text-xs text-text-secondary truncate max-w-[200px]">
                  {mockScenes.find((s) => s.id === script.sceneId)?.name ?? script.sceneId}
                </span>
                {drafts.length > 0 ? (
                  <select
                    className="rounded border border-border px-2 py-1 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) moveScriptToGroup(script.taskId, e.target.value)
                      e.target.value = ''
                    }}
                  >
                    <option value="">加入分组…</option>
                    {drafts.map((d, i) => (
                      <option key={d.id} value={d.id}>
                        分组 {i + 1}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-amber-800">请先创建或采用建议分组</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {drafts.map((draft, index) => (
          <div
            key={draft.id}
            className={cn(
              'rounded-xl border bg-card p-4 shadow-sm',
              groupingConfirmed ? 'border-emerald-300' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-text">任务单元草案 {index + 1}</h4>
                <label className="mt-2 block text-xs text-text-secondary">
                  任务类型
                  <p className="mt-0.5 text-sm font-medium text-text">{defaultTaskType}</p>
                  <span className="text-[10px] text-text-secondary">与需求采集类型一致，不可单独修改</span>
                </label>
              </div>
              {!groupingConfirmed && (
                <button
                  type="button"
                  onClick={() => removeDraft(draft.id)}
                  className="rounded p-1 text-rose-600 hover:bg-rose-50"
                  title="删除分组"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            <ul className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {draft.scriptIds.length === 0 && (
                <li className="text-xs text-text-secondary py-4 text-center">拖入或从上方分配台本</li>
              )}
              {draft.scriptIds.map((scriptId) => {
                const script = scriptById.get(scriptId)
                const target =
                  draft.allocations.find((a) => a.scriptId === scriptId)?.targetCount ??
                  allocations.find((a) => a.scriptId === scriptId)?.targetCount ??
                  defaultTargetCount
                return (
                  <li
                    key={scriptId}
                    className="flex items-center gap-2 rounded-lg border border-border bg-slate-50/80 px-2 py-1.5 text-xs"
                  >
                    <span className="flex-1 truncate font-mono">{scriptId}</span>
                    <span className="text-text-secondary shrink-0">
                      {script
                        ? `${mockScenes.find((s) => s.id === script.sceneId)?.name ?? ''} · ${target}条`
                        : ''}
                    </span>
                    {!groupingConfirmed && (
                      <button
                        type="button"
                        onClick={() => removeScriptFromGroup(scriptId, draft.id)}
                        className="text-rose-600 hover:underline shrink-0"
                      >
                        移出
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {drafts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-text-secondary">
          点击「采用系统建议分组」或「新建空分组」开始编排
        </p>
      )}
    </div>
  )
}
