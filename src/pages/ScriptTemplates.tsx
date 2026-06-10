import { useMemo, useState, type ReactElement } from 'react'
import { Pencil, Plus } from 'lucide-react'

import { DataTable, type DataTableColumn, Modal, StatusBadge } from '@/components/ui'
import type { ScriptDifficulty, ScriptTemplate } from '@/data/mock'
import {
  updatePlatformScriptTemplates,
  usePlatformScriptTemplates,
} from '@/data/scriptTemplateStore'

const DIFFICULTY_LABEL: Record<ScriptDifficulty, string> = {
  simple: '简单',
  complex: '复杂',
  correction: '纠错',
}

type TemplateForm = {
  name: string
  applicableSceneTypes: string
  difficulty: ScriptDifficulty
  instructionSkeleton: string
  stepSlots: string
  status: ScriptTemplate['status']
}

const EMPTY_FORM: TemplateForm = {
  name: '',
  applicableSceneTypes: '',
  difficulty: 'complex',
  instructionSkeleton: '在{scene}，使用{props}，完成{taskType}；动作{actions}。',
  stepSlots: '',
  status: 'active',
}

export default function ScriptTemplates(): ReactElement {
  const templates = usePlatformScriptTemplates()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM)

  const columns: DataTableColumn<ScriptTemplate>[] = useMemo(
    () => [
      { key: 'id', title: 'ID' },
      { key: 'name', title: '模板名称' },
      {
        key: 'applicableSceneTypes',
        title: '适用场景类型',
        render: (row) => row.applicableSceneTypes.join('、') || '—',
      },
      {
        key: 'difficulty',
        title: '难度',
        render: (row) => DIFFICULTY_LABEL[row.difficulty],
      },
      {
        key: 'status',
        title: '状态',
        render: (row) => (
          <StatusBadge status={row.status === 'active' ? '启用' : '停用'} size="sm" />
        ),
      },
      {
        key: 'steps',
        title: '步骤数',
        render: (row) => `${row.stepSlots.length} 步`,
      },
      {
        key: 'actions',
        title: '操作',
        render: (row) => (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-50"
          >
            <Pencil className="size-3" />
            编辑
          </button>
        ),
      },
    ],
    [],
  )

  function openCreate(): void {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  function openEdit(row: ScriptTemplate): void {
    setEditingId(row.id)
    setForm({
      name: row.name,
      applicableSceneTypes: row.applicableSceneTypes.join('、'),
      difficulty: row.difficulty,
      instructionSkeleton: row.instructionSkeleton,
      stepSlots: row.stepSlots.join('\n'),
      status: row.status,
    })
    setEditorOpen(true)
  }

  function handleSave(): void {
    if (!form.name.trim()) return
    const applicableSceneTypes = form.applicableSceneTypes
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const stepSlots = form.stepSlots
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (editingId) {
      updatePlatformScriptTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: form.name.trim(),
                applicableSceneTypes,
                difficulty: form.difficulty,
                instructionSkeleton: form.instructionSkeleton.trim(),
                stepSlots: stepSlots.length > 0 ? stepSlots : t.stepSlots,
                status: form.status,
              }
            : t,
        ),
      )
    } else {
      const id = `tpl-${String(templates.length + 1).padStart(3, '0')}`
      updatePlatformScriptTemplates((prev) => [
        ...prev,
        {
          id,
          name: form.name.trim(),
          applicableSceneTypes,
          difficulty: form.difficulty,
          instructionSkeleton: form.instructionSkeleton.trim(),
          stepSlots: stepSlots.length > 0 ? stepSlots : ['步骤一', '步骤二'],
          status: form.status,
        },
      ])
    }
    setEditorOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">台本模板</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            供 AI 生成台本时填槽；场景库可挂载默认模板。占位符：{' '}
            <code className="text-xs">{'{scene} {props} {actions} {taskType}'}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="size-4" />
          新增模板
        </button>
      </div>

      <DataTable columns={columns} data={templates} />

      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? '编辑台本模板' : '新增台本模板'}
        size="lg"
      >
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">模板名称 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">适用场景类型（顿号分隔）</span>
            <input
              value={form.applicableSceneTypes}
              onChange={(e) => setForm((f) => ({ ...f, applicableSceneTypes: e.target.value }))}
              placeholder="家庭服务、零售物流"
              className="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">难度档</span>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, difficulty: e.target.value as ScriptDifficulty }))
                }
                className="h-9 w-full rounded-md border border-slate-200 px-2"
              >
                <option value="simple">简单</option>
                <option value="complex">复杂</option>
                <option value="correction">纠错</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">状态</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as ScriptTemplate['status'],
                  }))
                }
                className="h-9 w-full rounded-md border border-slate-200 px-2"
              >
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">说明骨架</span>
            <textarea
              rows={2}
              value={form.instructionSkeleton}
              onChange={(e) => setForm((f) => ({ ...f, instructionSkeleton: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">步骤槽位（每行一步）</span>
            <textarea
              rows={5}
              value={form.stepSlots}
              onChange={(e) => setForm((f) => ({ ...f, stepSlots: e.target.value }))}
              placeholder={'步骤一\n步骤二\n步骤三'}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-xs"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
