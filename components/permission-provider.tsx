'use client'

import * as React from 'react'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { UserPermissions } from '@/types/permissions'

interface PermissionContextValue {
  permissions: string[]
  roleId: string | null
  roleName: string | null
  isLoading: boolean
  error: string | null
  hasPermission: (key: string) => boolean
  hasAnyPermission: (keys: string[]) => boolean
  hasAllPermissions: (keys: string[]) => boolean
  refetch: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

interface PermissionProviderProps {
  children: React.ReactNode
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [permissions, setPermissions] = useState<string[]>([])
  const [roleId, setRoleId] = useState<string | null>(null)
  const [roleName, setRoleName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/permissions')

      if (!response.ok) {
        if (response.status === 401) {
          setPermissions([])
          setRoleId(null)
          setRoleName(null)
          return
        }
        throw new Error('Failed to fetch permissions')
      }

      const data: UserPermissions = await response.json()
      setPermissions(data.permissions)
      setRoleId(data.role_id)
      setRoleName(data.role_name)
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
      setPermissions([])
      setRoleId(null)
      setRoleName(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const hasPermission = useCallback(
    (key: string): boolean => {
      return permissions.includes(key)
    },
    [permissions]
  )

  const hasAnyPermission = useCallback(
    (keys: string[]): boolean => {
      return keys.some(key => permissions.includes(key))
    },
    [permissions]
  )

  const hasAllPermissions = useCallback(
    (keys: string[]): boolean => {
      return keys.every(key => permissions.includes(key))
    },
    [permissions]
  )

  const value = useMemo(
    () => ({
      permissions,
      roleId,
      roleName,
      isLoading,
      error,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refetch: fetchPermissions,
    }),
    [permissions, roleId, roleName, isLoading, error, hasPermission, hasAnyPermission, hasAllPermissions, fetchPermissions]
  )

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissionContext(): PermissionContextValue {
  const context = useContext(PermissionContext)

  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }

  return context
}
