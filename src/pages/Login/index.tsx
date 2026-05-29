import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function Login() {
  const { login, loginAsDemo, loginWithGoogle, loginWithApple, isOnline } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password'); return }
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

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#16325c]">Tolmai ERP</h1>
          <p className="text-sm text-[#514f4d] mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-lg border border-[#dddbda] shadow-sm p-8">
          {error && (
            <div className="mb-4 bg-[#fef0f0] border-l-4 border-[#c23934] p-3 rounded-r text-sm text-[#c23934] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                placeholder="··········"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !isOnline}
              className="w-full h-9 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {isOnline && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 border-t border-[#dddbda]" />
                <span className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">or</span>
                <div className="flex-1 border-t border-[#dddbda]" />
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full h-9 text-sm font-medium text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={loginWithApple}
                  className="w-full h-9 text-sm font-medium text-white bg-black rounded hover:bg-[#333] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Continue with Apple
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-[#514f4d] mt-5">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-[#0070d2] font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>

        {!isOnline && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => { loginAsDemo(); navigate('/', { replace: true }) }}
              className="w-full h-9 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors"
            >
              Continue as Demo User
            </button>
            <p className="text-xs text-[#514f4d] text-center">
              Demo mode — set <code className="font-mono bg-[#f3f3f3] px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono bg-[#f3f3f3] px-1 rounded">VITE_SUPABASE_ANON_KEY</code> for real auth.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
