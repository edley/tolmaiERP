import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Check, Trash2, Pencil, X } from 'lucide-react'
import { Modal } from '../Modal'
import { getTasks, addTask, updateTask, deleteTask } from '../../lib/tasks'
import type { UserTask } from '../../lib/tasks'

interface TaskManagerProps {
  open: boolean
  onClose: () => void
}

function dueStatus(task: UserTask): 'overdue' | 'today' | 'soon' | 'future' | 'done' | 'none' {
  if (task.completion_percentage >= 100) return 'done'
  if (!task.due_date) return 'none'
  const diff = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 3) return 'soon'
  return 'future'
}

const DUE_STYLES: Record<string, { dot: string; label: string }> = {
  overdue: { dot: 'bg-red-500', label: 'Overdue' },
  today:   { dot: 'bg-amber-500', label: 'Today' },
  soon:    { dot: 'bg-amber-400', label: '' },
  future:  { dot: 'bg-blue-500', label: '' },
  done:    { dot: 'bg-emerald-500', label: '' },
  none:    { dot: 'bg-slate-300', label: '' },
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function completionLabel(pct: number): string {
  if (pct === 0) return 'Not Started'
  if (pct === 100) return 'Completed'
  return `${pct}%`
}

export function TaskManager({ open, onClose }: TaskManagerProps) {
  const [tasks, setTasks] = useState<UserTask[]>([])
  const refresh = useCallback(() => setTasks(getTasks()), [])
  useEffect(() => { if (open) refresh() }, [open, refresh])

  const [newText, setNewText] = useState('')
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [newDueDate, setNewDueDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPct, setEditPct] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const addDateRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    if (!newText.trim()) return
    addTask(newText.trim(), newDueDate || undefined)
    setNewText('')
    setNewDueDate('')
    setShowAddOptions(false)
    refresh()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleToggle = (task: UserTask) => {
    if (task.completion_percentage >= 100) {
      updateTask(task.id, { completion_percentage: 0, completed: false })
    } else {
      updateTask(task.id, { completion_percentage: 100, completed: true })
    }
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteTask(id)
    refresh()
    if (editingId === id) setEditingId(null)
  }

  const startEdit = (task: UserTask) => {
    setEditingId(task.id)
    setEditText(task.text)
    setEditDueDate(task.due_date ?? '')
    setEditPct(task.completion_percentage)
  }

  const saveEdit = (id: string) => {
    const updates: Partial<Omit<UserTask, 'id' | 'created_at'>> = {}
    if (editText.trim()) updates.text = editText.trim()
    updates.due_date = editDueDate || ''
    updates.completion_percentage = editPct
    updateTask(id, updates)
    setEditingId(null)
    refresh()
  }

  const cancelEdit = () => setEditingId(null)

  const cyclePct = (task: UserTask) => {
    const next = task.completion_percentage >= 100 ? 0 : task.completion_percentage >= 50 ? 100 : 50
    updateTask(task.id, { completion_percentage: next })
    refresh()
  }

  const openTasks = tasks.filter((t) => t.completion_percentage < 100)
  const doneTasks = tasks.filter((t) => t.completion_percentage >= 100)

  return (
    <Modal open={open} onClose={onClose} title="My Tasks">
      <div className="space-y-1" style={{ minWidth: 420, maxWidth: 520 }}>
        {/* ── Quick Add ── */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onFocus={() => setShowAddOptions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setShowAddOptions(false); setNewText('') }
              }}
              placeholder="New Task…"
              className="w-full h-9 pl-3 pr-9 text-sm border border-[#dddbda] rounded text-[#16325c] bg-white hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded bg-[#0070d2] text-white hover:bg-[#005fb2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add options (due date) */}
        {showAddOptions && (
          <div className="flex items-center gap-2 pb-2 text-xs text-slate-500">
            <span className="font-medium">Due date:</span>
            <input
              ref={addDateRef}
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-7 px-2 text-xs border border-[#dddbda] rounded text-[#16325c] bg-white hover:border-[#0070d2] focus:border-[#0070d2] focus:outline-none transition-colors"
            />
            {newDueDate && (
              <button type="button" onClick={() => setNewDueDate('')} className="text-slate-400 hover:text-[#c23934]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* ── Open Tasks ── */}
        {openTasks.length > 0 && (
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-2 pb-1">
            Open ({openTasks.length})
          </div>
        )}

        {openTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isEditing={editingId === task.id}
            editText={editText}
            editDueDate={editDueDate}
            editPct={editPct}
            onEditTextChange={setEditText}
            onEditDueDateChange={setEditDueDate}
            onEditPctChange={setEditPct}
            onToggle={() => handleToggle(task)}
            onCyclePct={() => cyclePct(task)}
            onStartEdit={() => startEdit(task)}
            onSaveEdit={() => saveEdit(task.id)}
            onCancelEdit={cancelEdit}
            onDelete={() => handleDelete(task.id)}
          />
        ))}

        {/* ── Empty state ── */}
        {openTasks.length === 0 && doneTasks.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No tasks yet. Type above to add one.</p>
        )}

        {/* ── Completed Tasks ── */}
        {doneTasks.length > 0 && (
          <>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-3 pb-1 border-t border-slate-100 mt-2">
              Completed ({doneTasks.length})
            </div>
            {doneTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isEditing={false}
                editText=""
                editDueDate=""
                editPct={0}
                onEditTextChange={() => {}}
                onEditDueDateChange={() => {}}
                onEditPctChange={() => {}}
                onToggle={() => handleToggle(task)}
                onCyclePct={() => cyclePct(task)}
                onStartEdit={() => {}}
                onSaveEdit={() => {}}
                onCancelEdit={() => {}}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </>
        )}
      </div>
    </Modal>
  )
}

/* ──────────────────────────────────────────────
 * TaskRow
 * ────────────────────────────────────────────── */
interface TaskRowProps {
  task: UserTask
  isEditing: boolean
  editText: string
  editDueDate: string
  editPct: number
  onEditTextChange: (v: string) => void
  onEditDueDateChange: (v: string) => void
  onEditPctChange: (v: number) => void
  onToggle: () => void
  onCyclePct: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

function TaskRow({
  task,
  isEditing,
  editText,
  editDueDate,
  editPct,
  onEditTextChange,
  onEditDueDateChange,
  onEditPctChange,
  onToggle,
  onCyclePct,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: TaskRowProps) {
  const editRef = useRef<HTMLInputElement>(null)
  const status = dueStatus(task)
  const ds = DUE_STYLES[status]
  const done = task.completion_percentage >= 100

  useEffect(() => {
    if (isEditing) setTimeout(() => editRef.current?.focus(), 0)
  }, [isEditing])

  /* ── Editing mode ── */
  if (isEditing) {
    return (
      <div className="rounded border border-[#0070d2] bg-white px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={editRef}
            type="text"
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="flex-1 h-8 px-2 text-sm border border-[#dddbda] rounded text-[#16325c] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
          />
          <button type="button" onClick={onSaveEdit} className="p-1.5 text-[#007a33] hover:bg-emerald-50 rounded transition-colors" title="Save">
            <Check className="w-4 h-4" />
          </button>
          <button type="button" onClick={onCancelEdit} className="p-1.5 text-slate-400 hover:text-[#c23934] hover:bg-red-50 rounded transition-colors" title="Cancel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Due</span>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => onEditDueDateChange(e.target.value)}
              className="h-7 px-2 text-xs border border-[#dddbda] rounded text-[#16325c] bg-white hover:border-[#0070d2] focus:border-[#0070d2] focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Progress</span>
            <input
              type="range" min={0} max={100} step={5}
              value={editPct}
              onChange={(e) => onEditPctChange(Number(e.target.value))}
              className="flex-1 h-1 accent-[#0070d2]"
            />
            <span className="text-xs font-mono text-slate-500 w-8 text-right">{editPct}%</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Display mode ── */
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded transition-colors group ${done ? 'opacity-60' : 'hover:bg-slate-50'}`}>
      {/* Checkbox */}
      <button type="button" onClick={onToggle} className={`shrink-0 w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors ${
        done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-[#0070d2]'
      }`}>
        {done && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Subject */}
      <span
        onClick={onStartEdit}
        className={`flex-1 text-sm min-w-0 truncate cursor-pointer ${done ? 'line-through text-slate-400' : 'text-[#16325c] font-medium hover:text-[#0070d2]'}`}
        title="Click to edit"
      >
        {task.text}
      </span>

      {/* Status pill (click to cycle) */}
      <button
        type="button"
        onClick={onCyclePct}
        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
          task.completion_percentage === 0
            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            : task.completion_percentage >= 100
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-blue-50 text-blue-700'
        }`}
        title="Click to change status"
      >
        {completionLabel(task.completion_percentage)}
      </button>

      {/* Due date */}
      {task.due_date ? (
        <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] ${ds.dot === 'bg-red-500' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ds.dot}`} />
          {fmtDate(task.due_date)}
          {status === 'overdue' && <span className="text-red-600 font-semibold">· Overdue</span>}
        </span>
      ) : (
        <span className="shrink-0 text-[11px] text-slate-300">—</span>
      )}

      {/* Progress bar (thin) */}
      <div className="shrink-0 w-16">
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${done ? 'bg-emerald-400' : task.completion_percentage > 0 ? 'bg-[#0070d2]' : ''}`}
            style={{ width: `${task.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button type="button" onClick={onStartEdit} className="p-1 text-slate-400 hover:text-[#0070d2] hover:bg-[#e8f4fe] rounded transition-colors" title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="p-1 text-slate-400 hover:text-[#c23934] hover:bg-red-50 rounded transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
