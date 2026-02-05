import { useState, useEffect, useCallback } from 'react'
import type { UserPermissions } from '@/types/permissions'

interface UsePermissionsResult {
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

export function usePermissions(): UsePermissionsResult {
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
      // Case-insensitive check to handle database variations
      const keyLower = key.toLowerCase()
      return permissions.some(p => p.toLowerCase() === keyLower)
    },
    [permissions]
  )

  const hasAnyPermission = useCallback(
    (keys: string[]): boolean => {
      // Case-insensitive check to handle database variations
      const permissionsLower = permissions.map(p => p.toLowerCase())
      return keys.some(key => permissionsLower.includes(key.toLowerCase()))
    },
    [permissions]
  )

  const hasAllPermissions = useCallback(
    (keys: string[]): boolean => {
      // Case-insensitive check to handle database variations
      const permissionsLower = permissions.map(p => p.toLowerCase())
      return keys.every(key => permissionsLower.includes(key.toLowerCase()))
    },
    [permissions]
  )

  return {
    permissions,
    roleId,
    roleName,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchPermissions,
  }
}
