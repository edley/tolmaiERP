import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { DB_TABLES, type DbTableMeta } from '../../lib/dbTables'
import { PageLayout } from '../../components/PageLayout'
import { Search, ChevronLeft, ChevronRight, Loader2, Database } from 'lucide-react'

interface ColumnMeta {
  name: string
  type: string
}

const ROWS_PER_PAGE = 25

export function ObjectManager() {
  const [selectedTable, setSelectedTable] = useState<DbTableMeta | null>(null)
  const [columns, setColumns] = useState<ColumnMeta[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const filteredTables = search
    ? DB_TABLES.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()) || t.table.toLowerCase().includes(search.toLowerCase()))
    : DB_TABLES

  const fetchData = useCallback(async (table: DbTableMeta, pageNum: number) => {
    if (table.hasLocalStorage) {
      const raw = localStorage.getItem(`tolmai_${table.table}`)
      const data = raw ? JSON.parse(raw) : []
      const keys = new Set<string>()
      for (const row of data) {
        for (const k of Object.keys(row)) keys.add(k)
      }
      setColumns(Array.from(keys).map((k) => ({ name: k, type: 'string' })))
      setRows(data)
      setCount(data.length)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const from = pageNum * ROWS_PER_PAGE
      const to = from + ROWS_PER_PAGE - 1

      const { data, error: err, count: total } = await supabase!
        .from(table.table)
        .select('*', { count: 'exact' })
        .range(from, to)

      if (err) throw err

      if (data && data.length > 0) {
        setColumns(Object.keys(data[0]).map((k) => ({ name: k, type: typeof data[0][k] })))
      } else {
        setColumns([])
      }
      setRows(data ?? [])
      setCount(total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table')
      setRows([])
      setColumns([])
      setCount(0)
    }
    setLoading(false)
  }, [])

  const openTable = (table: DbTableMeta) => {
    setSelectedTable(table)
    setPage(0)
    fetchData(table, 0)
  }

  const totalPages = Math.max(1, Math.ceil(count / ROWS_PER_PAGE))

  const goToPage = (p: number) => {
    if (p < 0 || p >= totalPages) return
    setPage(p)
    if (selectedTable) fetchData(selectedTable, p)
  }

  return (
    <PageLayout title="Object Manager" description="Browse all database tables used by the application">
      {!selectedTable ? (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-xs border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
            />
          </div>

          {(() => {
            const groups = filteredTables.reduce((acc, t) => {
              (acc[t.category] ??= []).push(t)
              return acc
            }, {} as Record<string, DbTableMeta[]>)

            return Object.entries(groups).map(([category, tables]) => (
              <div key={category}>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tables.map((t) => (
                    <button
                      key={t.table}
                      onClick={() => openTable(t)}
                      className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-slate-200 hover:border-[#0070d2] hover:shadow-sm transition-all text-left"
                    >
                      <Database className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#16325c]">{t.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{t.table}{t.hasLocalStorage ? ' (localStorage)' : ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedTable(null); setRows([]); setColumns([]); setError(null) }}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0070d2] hover:text-[#005fb2] hover:underline"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to tables
            </button>
            <div className="text-xs text-slate-400">|</div>
            <span className="text-xs font-semibold text-[#16325c]">{selectedTable.label}</span>
            <span className="text-[10px] text-slate-400 font-mono">{selectedTable.table}</span>
            {selectedTable.hasLocalStorage && (
              <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded">localStorage</span>
            )}
          </div>

          {error && (
            <div className="bg-[#fef0f0] border-l-4 border-[#c23934] p-3 rounded-r text-xs text-[#c23934] font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[#0070d2]" />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                {columns.length === 0 && rows.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Table is empty.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">#</th>
                        {columns.map((col) => (
                          <th key={col.name} className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {col.name}
                            <span className="text-[9px] text-slate-400 font-normal ml-1">({col.type})</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                          <td className="px-2.5 py-1.5 text-[10px] text-slate-400 font-mono whitespace-nowrap">{page * ROWS_PER_PAGE + i + 1}</td>
                          {columns.map((col) => (
                            <td key={col.name} className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap max-w-[200px] truncate">
                              {formatCell(row[col.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {!selectedTable.hasLocalStorage && count > ROWS_PER_PAGE && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{count} rows total</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 0}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-medium text-[#16325c]">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages - 1}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageLayout>
  )
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
