import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Company } from '../types'

const DEFAULT_COMPANY_ID = '00000000-0000-4000-8000-000000000001'

interface CompanyContextType {
  currentCompany: Company | null
  availableCompanies: Company[]
  switchCompany: (companyId: string) => Promise<void>
  loading: boolean
  refresh: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextType | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCompanies = useCallback(async () => {
    if (!user || !isOnline()) {
      setAvailableCompanies([])
      setCurrentCompany(null)
      setLoading(false)
      return
    }

    try {
      const { data: companies, error } = await supabase!
        .rpc('get_user_companies', { p_user_id: user.id })

      if (error) throw error
      const list = (companies ?? []) as Company[]
      setAvailableCompanies(list)

      const saved = localStorage.getItem('tolmai_company_id')
      const match = saved ? list.find((c) => c.id === saved) : null
      if (match) {
        setCurrentCompany(match)
      } else {
        const defaultComp = list.find((c) => c.id === DEFAULT_COMPANY_ID) ?? list[0] ?? null
        setCurrentCompany(defaultComp)
        if (defaultComp) localStorage.setItem('tolmai_company_id', defaultComp.id)
      }
    } catch {
      setAvailableCompanies([])
      setCurrentCompany(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const switchCompany = useCallback(async (companyId: string) => {
    const company = availableCompanies.find((c) => c.id === companyId)
    if (!company) return
    setCurrentCompany(company)
    localStorage.setItem('tolmai_company_id', companyId)
  }, [availableCompanies])

  return (
    <CompanyContext.Provider value={{ currentCompany, availableCompanies, switchCompany, loading, refresh: fetchCompanies }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
