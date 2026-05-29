import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function Signup() {
  const { user, loading, signup, isOnline } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) { setError('Fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSubmitting(true)
    setError(null)
    try {
      await signup(email, password, name)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-[#dddbda] shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[#d2f4e0] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#007a33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-lg font-bold text-[#16325c] mb-2">Check your email</h2>
          <p className="text-sm text-[#514f4d] mb-6">We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.</p>
          <Link to="/login" className="text-[#0070d2] font-semibold text-sm hover:underline">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#16325c]">Tolmai ERP</h1>
          <p className="text-sm text-[#514f4d] mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-lg border border-[#dddbda] shadow-sm p-8">
          {error && (
            <div className="mb-4 bg-[#fef0f0] border-l-4 border-[#c23934] p-3 rounded-r text-sm text-[#c23934] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                placeholder="John Smith"
              />
            </div>
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
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !isOnline}
              className="w-full h-9 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-xs text-[#514f4d] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0070d2] font-semibold hover:underline">Sign In</Link>
          </p>
        </div>

        {!isOnline && (
          <div className="mt-4 bg-[#fef7e0] border border-[#f9d84a] p-3 rounded text-xs text-[#6b5200] text-center">
            Set <code className="font-mono bg-white px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono bg-white px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable user registration.
          </div>
        )}
      </div>
    </div>
  )
}
