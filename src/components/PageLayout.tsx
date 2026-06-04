import { useState, type ReactNode } from 'react'
import { useRBAC } from '../hooks/useRBAC'
import { type DocType, type CrudOp, DOC_TYPE_LABELS } from '../lib/permissions'
import { ViewFilterContext, type ViewFilterValue } from '../contexts/ViewFilterContext'
import { ViewFilter } from './ui/view-filter'

interface PageProps {
  title: string
  description?: string
  actions?: ReactNode
  docType?: DocType
  children: ReactNode
}

const CRUD_LABELS: Record<CrudOp, { label: string; icon: string }> = {
  create: { label: 'Create', icon: '+' },
  read: { label: 'Read', icon: '👁' },
  update: { label: 'Update', icon: '✎' },
  delete: { label: 'Delete', icon: '✕' },
}

export function PageLayout({ title, description, actions, docType, children }: PageProps) {
  const { crud } = useRBAC()
  const [viewFilter, setViewFilter] = useState<ViewFilterValue>('all')

  return (
    <ViewFilterContext.Provider value={viewFilter}>
      <div>
        {/* ── Fixed Header ── */}
        <div className="sticky top-0 z-10 bg-[#f3f3f3] border-b border-[#dddbda] px-3 sm:px-5 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-[#16325c] truncate">{title}</h1>
              {description && <p className="text-xs sm:text-sm text-[#514f4d] mt-0.5">{description}</p>}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
              <ViewFilter value={viewFilter} onChange={setViewFilter} />
              {actions}
            </div>
          </div>

          {/* ── CRUD Task Bar ── */}
          {docType && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#dddbda]">
              <span className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider mr-1 shrink-0">
                Tasks
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.entries(CRUD_LABELS) as [CrudOp, { label: string; icon: string }][]).map(([op, meta]) => {
                  const allowed = crud(docType, op)
                  return (
                    <span
                      key={op}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors ${
                        allowed
                          ? 'bg-[#e8f4fe] text-[#0070d2] border-[#0070d2]'
                          : 'bg-white text-[#c9c7c5] border-[#dddbda]'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${allowed ? 'bg-[#0070d2]' : 'bg-[#dddbda]'}`} />
                      {meta.label}
                    </span>
                  )
                })}
              </div>
              <span className="text-[10px] text-[#514f4d] ml-auto shrink-0">
                {DOC_TYPE_LABELS[docType]}
              </span>
            </div>
          )}
        </div>

        <div className="px-3 sm:px-5 lg:px-8 py-3 sm:py-5">
          {children}
        </div>
      </div>
    </ViewFilterContext.Provider>
  )
}
