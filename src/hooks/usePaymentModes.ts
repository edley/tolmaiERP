import { useState, useEffect } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { getPaymentModes as getLocalModes } from '../lib/paymentModes'
import type { PaymentMode } from '../lib/paymentModes'
import { useCompany } from '../contexts/CompanyContext'
import { useViewFilter } from '../contexts/ViewFilterContext'
import { useAccounts } from './useAccounts'
import type { Account } from '../types'

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const LEGACY_IDS = {
  bank: '11111111-1111-4111-8111-111111111111',
  cash: '22222222-2222-4222-8222-222222222222',
}

function findCashAccounts(accounts: Account[]) {
  const cashAccounts = accounts.filter((a) => a.is_cash_account && !a.is_group)
  return {
    bank: cashAccounts.find((a) => a.code === '1120') ?? cashAccounts[0] ?? null,
    cash: cashAccounts.find((a) => a.code === '1110') ?? cashAccounts[0] ?? null,
  }
}

function resolveGlAccount(modeName: string, accounts: Account[]): string | null {
  const { bank, cash } = findCashAccounts(accounts)
  if (modeName === 'Bank') return bank?.id ?? null
  if (modeName === 'Cash') return cash?.id ?? null
  return null
}

const BASE_KEY = 'payment_modes'

function backfillGlAccounts(modesList: PaymentMode[], accountsList: Account[]): PaymentMode[] {
  if (accountsList.length === 0) return modesList
  return modesList.map((m) => {
    if (m.gl_account_id) return m
    const glId = resolveGlAccount(m.name, accountsList)
    return glId ? { ...m, gl_account_id: glId } : m
  })
}

export function usePaymentModes() {
  const { currentCompany } = useCompany()
  const viewFilter = useViewFilter()
  const { accounts, loading: accountsLoading } = useAccounts()
  const [modes, setModes] = useState<PaymentMode[]>(() => getLocalModes())

  useEffect(() => {
    const companyId = currentCompany?.id
    if (!companyId || !isOnline() || !supabase) {
      setModes((prev) => backfillGlAccounts(prev, accounts))
      return
    }

    if (accountsLoading) return

    const sb = supabase
    let q = sb.from('payment_modes').select('*').eq('company_id', companyId)

    if (viewFilter === 'recent') {
      q = q.limit(20)
    } else if (viewFilter === '10days') {
      q = q.gte('created_at', daysAgo(10))
    }

    q.then(async ({ data, error }) => {
        if (error) {
          setModes((prev) => backfillGlAccounts(prev, accounts))
          return
        }

        let dbModes = (data ?? []) as PaymentMode[]

        if (dbModes.length === 0) {
          const legacyIds = [LEGACY_IDS.bank, LEGACY_IDS.cash]
          const { data: existingModes } = await sb
            .from('payment_modes')
            .select('*')
            .in('id', legacyIds)
            .eq('company_id', companyId)
            .limit(2)

          const { bank: bankAccount, cash: cashAccount } = findCashAccounts(accounts)

          if (existingModes && existingModes.length > 0) {
            dbModes = await Promise.all(
              existingModes.map(async (m) => {
                const glAccountId = m.gl_account_id ?? (m.name === 'Bank' ? bankAccount?.id : cashAccount?.id) ?? null
                await sb
                  .from('payment_modes')
                  .upsert({ id: m.id, name: m.name, gl_account_id: glAccountId, company_id: companyId })
                  .select()
                return { ...m, gl_account_id: glAccountId } as PaymentMode
              })
            )
          } else {
            const seeds = [
              { name: 'Bank', gl_account_id: bankAccount?.id ?? null, company_id: companyId },
              { name: 'Cash', gl_account_id: cashAccount?.id ?? null, company_id: companyId },
            ]
            const { data: inserted, error: insErr } = await sb
              .from('payment_modes')
              .insert(seeds)
              .select()

            if (!insErr && inserted) {
              dbModes = inserted as PaymentMode[]
            }
          }
        } else {
          const { bank: bankAccount, cash: cashAccount } = findCashAccounts(accounts)
          let updated = false
          const patched = dbModes.map((m) => {
            if (m.name === 'Bank' && !m.gl_account_id && bankAccount) {
              updated = true
              return { ...m, gl_account_id: bankAccount.id }
            }
            if (m.name === 'Cash' && !m.gl_account_id && cashAccount) {
              updated = true
              return { ...m, gl_account_id: cashAccount.id }
            }
            return m
          })
          if (updated) {
            dbModes = patched
            sb
              .from('payment_modes')
              .upsert(patched.map((m) => ({ ...m, company_id: companyId })))
              .then()
          }
        }

        dbModes = backfillGlAccounts(dbModes, accounts)

        // Merge DB modes with local modes — prefer local data when both exist
        // (local has the full fields like bank_account_no, address, etc.)
        const localModes = getLocalModes()
        const merged: PaymentMode[] = []
        const seen = new Set<string>()
        for (const lm of localModes) {
          seen.add(lm.id)
          const db = dbModes.find((m) => m.id === lm.id)
          if (db) {
            merged.push({ ...db, ...lm })
          } else {
            merged.push(lm)
          }
        }
        for (const dm of dbModes) {
          if (!seen.has(dm.id)) {
            merged.push(dm)
            seen.add(dm.id)
          }
        }

        if (merged.length > 0) {
          localStorage.setItem(`${BASE_KEY}_${companyId}`, JSON.stringify(merged))
        }
        setModes(merged)
      })
  }, [currentCompany?.id, accounts, accountsLoading, viewFilter])

  return { modes }
}
