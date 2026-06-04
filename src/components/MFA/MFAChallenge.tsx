import { useState, useEffect } from 'react'
import { listFactors, challengeFactor, verifyFactor, type MFAFactor } from '../../lib/mfa'

interface MFAChallengeProps {
  onVerified: () => void
}

export function MFAChallenge({ onVerified }: MFAChallengeProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [factors, setFactors] = useState<MFAFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    ;(async () => {
      const f = await listFactors()
      setFactors(f.filter((x) => x.factor_type === 'totp' && x.status === 'verified'))
      setLoading(false)
    })()
  }, [])

  const handleSubmit = async () => {
    setError('')
    setVerifying(true)
    try {
      const totpFactor = factors[0]
      if (!totpFactor) {
        setError('No TOTP factors found. Please set up MFA in your settings.')
        setVerifying(false)
        return
      }
      const challengeId = await challengeFactor(totpFactor.id)
      await verifyFactor(totpFactor.id, challengeId, code)
      onVerified()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3f3f3]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0070d2] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#514f4d]">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f3f3f3]">
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm w-full max-w-sm mx-4 p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#0070d2] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[#16325c]">Two-Factor Authentication</h1>
          <p className="text-sm text-[#514f4d] mt-1">
            Enter the code from your authenticator app.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#fef3e8] border border-[#e09b6d] rounded text-sm text-[#a12b0b]">
            {error}
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full h-12 text-center text-2xl tracking-[0.5em] font-mono border border-[#dddbda] rounded outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={code.length !== 6 || verifying}
          className="w-full h-10 bg-[#0070d2] text-white text-sm font-bold rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {verifying ? 'Verifying...' : 'Verify'}
        </button>
      </div>
    </div>
  )
}
