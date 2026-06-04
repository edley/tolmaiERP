export interface UserTask {
  id: string
  text: string
  completed: boolean
  due_date: string
  completion_percentage: number
  created_at: string
}

function storageKey(): string {
  const cid = localStorage.getItem('tolmai_company_id') ?? ''
  const uid = localStorage.getItem('tolmai_user_id') ?? ''
  return `tasks_${cid}_${uid}`
}

function oldStorageKey(): string {
  const cid = localStorage.getItem('tolmai_company_id') ?? ''
  return `tasks_${cid}_`
}

function migrateOldKey() {
  const oldKey = oldStorageKey()
  const curKey = storageKey()
  if (oldKey === curKey) return
  try {
    const raw = localStorage.getItem(oldKey)
    if (raw) {
      localStorage.setItem(curKey, raw)
      localStorage.removeItem(oldKey)
    }
  } catch { /* ignore */ }
}

function loadTasks(): UserTask[] {
  migrateOldKey()
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveTasks(tasks: UserTask[]) {
  localStorage.setItem(storageKey(), JSON.stringify(tasks))
}

export function getTasks(): UserTask[] {
  return loadTasks()
}

export function addTask(text: string, dueDate?: string): UserTask {
  const tasks = loadTasks()
  const task: UserTask = {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    due_date: dueDate ?? '',
    completion_percentage: 0,
    created_at: new Date().toISOString(),
  }
  tasks.unshift(task)
  saveTasks(tasks)
  return task
}

export function updateTask(id: string, updates: Partial<Omit<UserTask, 'id' | 'created_at'>>) {
  const tasks = loadTasks()
  const idx = tasks.findIndex((t) => t.id === id)
  if (idx === -1) return

  if (updates.completion_percentage !== undefined) {
    updates.completed = updates.completion_percentage >= 100
  }

  tasks[idx] = { ...tasks[idx], ...updates }
  saveTasks(tasks)
}

export function deleteTask(id: string) {
  saveTasks(loadTasks().filter((t) => t.id !== id))
}
