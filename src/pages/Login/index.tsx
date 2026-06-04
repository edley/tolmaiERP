import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoginForm } from '../../components/ui/login-form'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60 * 1000

export function Login() {
  const { login, loginAsDemo, loginWithGoogle, isOnline } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const attemptsRef = useRef(0)
  const lockoutUntilRef = useRef(0)

  const handleLogin = async (email: string, password: string) => {
    const now = Date.now()
    if (now < lockoutUntilRef.current) {
      const remaining = Math.ceil((lockoutUntilRef.current - now) / 1000)
      setError(`Too many login attempts. Try again in ${remaining} seconds.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      attemptsRef.current = 0
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      attemptsRef.current++
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        lockoutUntilRef.current = now + LOCKOUT_MS
        attemptsRef.current = 0
        setError('Too many login attempts. Please try again in 1 minute.')
      } else {
        setError('Invalid email or password.')
      }
    }
    setSubmitting(false)
  }

  const handleGoogleLogin = () => {
    loginWithGoogle()
  }

  const handleDemoLogin = () => {
    loginAsDemo()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <LoginForm
          onLogin={handleLogin}
          onGoogleLogin={isOnline ? handleGoogleLogin : undefined}
          onDemoLogin={!isOnline ? handleDemoLogin : undefined}
          error={error}
          submitting={submitting}
          isOnline={isOnline}
          signUpLink={
            <>
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
            </>
          }
        />
      </div>
    </div>
  )
}
