import { useState, useEffect } from 'react'
import { enrollTOTP, challengeFactor, verifyFactor } from '../../lib/mfa'

interface MFAEnrollProps {
  onEnrolled: () => void
  onCancelled: () => void
}

export function MFAEnroll({ onEnrolled, onCancelled }: MFAEnrollProps) {
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<'loading' | 'qr' | 'verifying'>('loading')

  useEffect(() => {
    ;(async () => {
      try {
        const result = await enrollTOTP('Authenticator App')
        setFactorId(result.id)
        setQrCode(result.totp?.qr_code ?? '')
        setSecret(result.totp?.secret ?? '')
        setStep('qr')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start enrollment')
        setStep('qr')
      }
    })()
  }, [])

  const handleEnable = async () => {
    setError('')
    setStep('verifying')
    try {
      const challengeId = await challengeFactor(factorId)
      await verifyFactor(factorId, challengeId, verifyCode)
      onEnrolled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStep('qr')
    }
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#0070d2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-[#fef3e8] border border-[#e09b6d] rounded text-sm text-[#a12b0b]">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-[#514f4d] mb-3">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
          </p>
          {qrCode && (
            <img
              src={qrCode}
              alt="QR Code"
              className="mx-auto border border-[#dddbda] rounded-lg"
              style={{ width: 180, height: 180 }}
            />
          )}
        </div>

        {secret && (
          <div className="text-center">
            <p className="text-xs text-[#514f4d] mb-1">Or enter this code manually:</p>
            <code className="text-xs font-mono bg-[#f3f3f3] px-3 py-1.5 rounded border border-[#dddbda] select-all">
              {secret}
            </code>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">
            Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full h-9 px-3 text-sm text-center tracking-[0.3em] font-mono border border-[#dddbda] rounded outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2]"
            disabled={step === 'verifying'}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancelled}
            disabled={step === 'verifying'}
            className="flex-1 h-9 text-sm font-bold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEnable}
            disabled={verifyCode.length !== 6 || step === 'verifying'}
            className="flex-1 h-9 bg-[#0070d2] text-white text-sm font-bold rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {step === 'verifying' ? 'Verifying...' : 'Enable'}
          </button>
        </div>

        <p className="text-xs text-[#514f4d] text-center">
          After scanning, enter the 6-digit code shown in your authenticator app to verify.
        </p>
      </div>
    </div>
  )
}
