import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { getAuthenticatorAssuranceLevel } from '../../lib/mfa'
import { MFAChallenge } from './MFAChallenge'

export function MFAGate() {
  const [ready, setReady] = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    ;(async () => {
      try {
        const aal = await getAuthenticatorAssuranceLevel()
        if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
          setShowChallenge(true)
        }
      } catch {
        // If MFA check fails, allow access
      } finally {
        setReady(true)
      }
    })()
  }, [])

  const handleVerified = () => {
    setShowChallenge(false)
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3f3f3]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0070d2] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#514f4d]">Loading...</span>
        </div>
      </div>
    )
  }

  if (showChallenge) {
    return <MFAChallenge onVerified={handleVerified} />
  }

  return <Outlet />
}
