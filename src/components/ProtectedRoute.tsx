import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { user, loading, passwordResetRequired } = useAuth()
  const location = useLocation()

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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (passwordResetRequired && location.pathname !== '/force-password-reset') {
    return <Navigate to="/force-password-reset" replace />
  }

  return <Outlet />
}
