import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
}

export function DataTable<T extends object>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found',
  pageSize = 25,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const tableRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))

  const pageData = useMemo(() => {
    const start = page * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">{emptyMessage}</div>
    )
  }

  return (
    <div className="flex flex-col">
      <div
        ref={tableRef}
        className="overflow-auto"
        style={{
          scrollbarColor: '#c9c7c5 #f3f3f3',
          scrollbarWidth: 'auto',
        }}
      >
        <table className="min-w-full divide-y divide-slate-200" style={{ tableLayout: 'auto' }}>
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {pageData.map((row, i) => (
              <tr key={'id' in (row as object) ? ((row as Record<string, unknown>).id as string) ?? i : i} className="hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-700 whitespace-nowrap ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#dddbda] bg-white">
          <span className="text-xs text-[#514f4d]">
            {data.length} record{data.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-7 w-7 flex items-center justify-center rounded border border-[#dddbda] text-[#514f4d] hover:bg-[#f3f3f3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-[#514f4d] min-w-[60px] text-center select-none">
              {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-7 w-7 flex items-center justify-center rounded border border-[#dddbda] text-[#514f4d] hover:bg-[#f3f3f3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
