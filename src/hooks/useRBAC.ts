import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { canAccess, type UserType } from '../lib/rbac'
import { canCrud, type DocType, type CrudOp } from '../lib/permissions'

export function useRBAC() {
  const { user } = useAuth()

  const userType = useMemo<UserType | null>(() => {
    if (!user?.role) return null
    const valid: UserType[] = ['Superuser', 'Manager', 'Team Leader', 'User']
    if (valid.includes(user.role as UserType)) return user.role as UserType
    return 'User'
  }, [user])

  const isSuperuser = userType === 'Superuser'

  const canAccessMenu = useMemo(() => {
    return (menuKey: string) => canAccess(userType, menuKey)
  }, [userType])

  const crud = useMemo(() => {
    return (docType: DocType, op: CrudOp) => canCrud(userType, docType, op)
  }, [userType])

  return { userType, isSuperuser, canAccessMenu, crud, user }
}
