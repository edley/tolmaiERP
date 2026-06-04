import { useState, useEffect } from 'react'
import { listFactors, unenrollFactor, type MFAFactor } from '../../lib/mfa'
import { MFAEnroll } from './MFAEnroll'
import { useAuth } from '../../contexts/AuthContext'

export function MFASettings() {
  const { isOnline } = useAuth()
  const [factors, setFactors] = useState<MFAFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEnroll, setShowEnroll] = useState(false)
  const [unenrolling, setUnenrolling] = useState<string | null>(null)

  const loadFactors = async () => {
    setLoading(true)
    try {
      const f = await listFactors()
      setFactors(f)
    } catch {
      setError('Failed to load MFA factors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOnline) loadFactors()
    else setLoading(false)
  }, [isOnline])

  const handleUnenroll = async (factorId: string) => {
    setError('')
    setUnenrolling(factorId)
    try {
      await unenrollFactor(factorId)
      setFactors((prev) => prev.filter((f) => f.id !== factorId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unenroll factor')
    } finally {
      setUnenrolling(null)
    }
  }

  const handleEnrolled = () => {
    setShowEnroll(false)
    loadFactors()
  }

  if (!isOnline) return null

  const verifiedFactors = factors.filter((f) => f.status === 'verified')

  return (
    <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#514f4d] uppercase tracking-wider">
            Two-Factor Authentication
          </h2>
          <p className="text-xs text-[#514f4d] mt-0.5">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-[#fef3e8] border border-[#e09b6d] rounded text-sm text-[#a12b0b]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#0070d2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showEnroll ? (
          <MFAEnroll
            onEnrolled={handleEnrolled}
            onCancelled={() => setShowEnroll(false)}
          />
        ) : verifiedFactors.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#f3f3f3] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#514f4d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm text-[#514f4d] mb-1">MFA is not enabled</p>
            <p className="text-xs text-[#514f4d] mb-4">
              Protect your account with an authenticator app
            </p>
            <button
              onClick={() => setShowEnroll(true)}
              className="inline-flex items-center gap-1.5 px-4 h-9 bg-[#0070d2] text-white text-sm font-bold rounded hover:bg-[#005fb2] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Set Up MFA
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {verifiedFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 border border-[#dddbda] rounded"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e8f4fe] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#0070d2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#16325c]">
                      {factor.friendly_name ?? 'Authenticator App'}
                    </div>
                    <div className="text-xs text-[#514f4d]">
                      {factor.factor_type === 'totp' ? 'TOTP' : 'Phone'} &middot; Added {new Date(factor.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnenroll(factor.id)}
                  disabled={unenrolling === factor.id}
                  className="px-3 h-8 text-xs font-bold text-[#a12b0b] bg-white border border-[#e09b6d] rounded hover:bg-[#fef3e8] disabled:opacity-50 transition-colors"
                >
                  {unenrolling === factor.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
