import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoginForm } from '../../components/ui/login-form'

export function Login() {
  const { login, loginAsDemo, loginWithGoogle, isOnline } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (email: string, password: string) => {
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
