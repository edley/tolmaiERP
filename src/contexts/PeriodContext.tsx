import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { getPeriods, getCurrentPeriodId, setCurrentPeriodId as savePeriodId, savePeriods } from '../lib/periods'
import { supabase, isOnline } from '../lib/supabase'
import { useCompany } from './CompanyContext'
import type { AccountingPeriod } from '../types'

interface PeriodContextType {
  periods: AccountingPeriod[]
  currentPeriod: AccountingPeriod | null
  setCurrentPeriod: (id: string) => void
  refresh: () => void
}

const PeriodContext = createContext<PeriodContextType | null>(null)

export function PeriodProvider({ children }: { children: ReactNode }) {
  const { currentCompany } = useCompany()
  const [, forceRender] = useState(0)
  const [synced, setSynced] = useState(false)
  const prevCompanyRef = useRef<string | undefined>(undefined)
  const refresh = useCallback(() => forceRender((t) => t + 1), [])

  const periods = getPeriods()
  const currentId = getCurrentPeriodId()
  const currentPeriod = periods.find((p) => p.id === currentId) ?? null

  const setCurrentPeriod = useCallback((id: string) => {
    savePeriodId(id)
    refresh()
  }, [refresh])

  useEffect(() => {
    const companyId = currentCompany?.id
    if (!companyId) return
    if (!isOnline() || !supabase) return

    const companyChanged = prevCompanyRef.current !== undefined && prevCompanyRef.current !== companyId
    if (synced && !companyChanged) return
    prevCompanyRef.current = companyId
    if (!synced) setSynced(true)

    supabase.from('accounting_periods').select('*').eq('company_id', companyId).order('start_date')
      .then(({ data, error }) => {
        if (error) { console.error('Failed to fetch periods:', error.message); return }
        if (data && data.length > 0) {
          const mapped: AccountingPeriod[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            start_date: r.start_date,
            end_date: r.end_date,
            status: r.status,
          }))
          savePeriods(mapped)
          const stillValid = mapped.find((p) => p.id === currentId)
          if (!stillValid) {
            const now = new Date()
            const found = mapped.find((p) => {
              const s = new Date(p.start_date)
              const e = new Date(p.end_date)
              e.setHours(23, 59, 59, 999)
              return now >= s && now <= e
            })
            if (found) setCurrentPeriod(found.id)
          }
          refresh()
        } else {
          const local = getPeriods()
          supabase!.from('accounting_periods').insert(
            local.map((p) => ({
              id: p.id,
              name: p.name,
              start_date: p.start_date,
              end_date: p.end_date,
              status: p.status,
              company_id: companyId,
            }))
          ).then(({ error: insErr }) => {
            if (insErr) console.error('Failed to seed accounting_periods:', insErr.message)
          })
        }
      })
  }, [currentCompany?.id])

  return (
    <PeriodContext.Provider value={{ periods, currentPeriod, setCurrentPeriod, refresh }}>
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider')
  return ctx
}
