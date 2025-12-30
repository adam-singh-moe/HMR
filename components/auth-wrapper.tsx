"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: string
  region_name?: string
  school_name?: string
  school_id?: string
  school_level?: string
}

interface AuthWrapperProps {
  children: React.ReactNode
  requiredRole?: string | string[]
  fallback?: React.ReactNode
}

export function AuthWrapper({ children, requiredRole, fallback }: AuthWrapperProps): any {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/user')
        
        if (!response.ok) {
          throw new Error('Not authenticated')
        }
        
        const userData = await response.json()
        setUser(userData)
        
        // Check role authorization if required
        if (requiredRole) {
          const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
          if (!allowedRoles.includes(userData.role)) {
            router.push('/auth')
            return
          }
        }
        
        setIsAuthorized(true)
      } catch (error) {
        console.error('Authentication check failed:', error)
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [requiredRole, router])

  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  if (!isAuthorized) {
    return null // Will redirect, so don't render anything
  }

  return <>{children}</>
}

// Hook to get current user in client components
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      try {
        const response = await fetch('/api/user')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      } catch (error) {
        console.error('Failed to get user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [])

  return { user, isLoading }
}
