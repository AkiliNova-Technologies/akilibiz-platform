import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useReduxAuth } from '@/hooks/useReduxAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkAuth, loading } = useReduxAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        await checkAuth()
      }
      setCheckingAuth(false)
    }
    
    verifyAuth()
  }, [isAuthenticated, checkAuth])

  if (checkingAuth || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}