import "server-only"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"

/**
 * Permission denied error for use with requirePermission
 */
export class PermissionDeniedError extends Error {
  constructor(permission: string) {
    super(`Permission denied: ${permission}`)
    this.name = "PermissionDeniedError"
  }
}

/**
 * Fetches the permission keys for the current user's role
 * For internal use by permission checking functions
 */
async function getUserPermissionKeys(): Promise<string[]> {
  const user = await getUser()

  if (!user) {
    return []
  }

  // Use service role client to bypass RLS for reading permissions
  const supabase = createServiceRoleSupabaseClient()

  // Get the user's role_id from the database
  const { data: userData, error: userError } = await supabase
    .from("hmr_users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    console.error("Error fetching user role:", userError)
    return []
  }

  const roleId = userData.role

  // Get all permission keys for this role
  const { data: rolePermissions, error: permError } = await supabase
    .from("hmr_role_permission")
    .select(`
      hmr_permissions (
        permission_key,
        is_active
      )
    `)
    .eq("role_id", roleId)

  if (permError) {
    console.error("Error fetching role permissions:", permError)
    return []
  }

  // Extract active permission keys
  // Trim whitespace/newlines from keys to handle data entry issues
  const permissions: string[] = []
  for (const rp of rolePermissions || []) {
    const perm = rp.hmr_permissions as any
    if (perm && perm.is_active && perm.permission_key) {
      permissions.push(perm.permission_key.trim())
    }
  }

  return permissions
}

/**
 * Check if the current user has a specific permission
 * For use in Server Actions and API routes
 * Uses case-insensitive matching to handle database variations
 *
 * @param permissionKey - The permission key to check (e.g., "schools.edit")
 * @returns true if the user has the permission, false otherwise
 *
 * @example
 * const canEdit = await checkPermission('schools.edit')
 * if (!canEdit) {
 *   return { error: 'You do not have permission to edit schools' }
 * }
 */
export async function checkPermission(permissionKey: string): Promise<boolean> {
  const permissions = await getUserPermissionKeys()
  const keyLower = permissionKey.toLowerCase()
  return permissions.some(p => p.toLowerCase() === keyLower)
}

/**
 * Check if the current user has any of the specified permissions
 * Uses case-insensitive matching to handle database variations
 *
 * @param permissionKeys - Array of permission keys to check
 * @returns true if the user has at least one of the permissions
 *
 * @example
 * const canAccessReports = await checkAnyPermission([
 *   'reports.view_own',
 *   'reports.view_regional',
 *   'reports.view_all'
 * ])
 */
export async function checkAnyPermission(permissionKeys: string[]): Promise<boolean> {
  const permissions = await getUserPermissionKeys()
  const permissionsLower = permissions.map(p => p.toLowerCase())
  return permissionKeys.some(key => permissionsLower.includes(key.toLowerCase()))
}

/**
 * Check if the current user has all of the specified permissions
 * Uses case-insensitive matching to handle database variations
 *
 * @param permissionKeys - Array of permission keys to check
 * @returns true if the user has all of the permissions
 *
 * @example
 * const canManageUsers = await checkAllPermissions([
 *   'users.view',
 *   'users.create',
 *   'users.edit'
 * ])
 */
export async function checkAllPermissions(permissionKeys: string[]): Promise<boolean> {
  const permissions = await getUserPermissionKeys()
  const permissionsLower = permissions.map(p => p.toLowerCase())
  return permissionKeys.every(key => permissionsLower.includes(key.toLowerCase()))
}

/**
 * Require a specific permission or throw an error
 * For use when you want to abort an operation if the user lacks permission
 *
 * @param permissionKey - The permission key to require
 * @throws PermissionDeniedError if the user lacks the permission
 *
 * @example
 * export async function deleteSchool(schoolId: string) {
 *   await requirePermission('schools.delete')
 *   // ... proceed with deletion
 * }
 */
export async function requirePermission(permissionKey: string): Promise<void> {
  const hasPermission = await checkPermission(permissionKey)
  if (!hasPermission) {
    throw new PermissionDeniedError(permissionKey)
  }
}

/**
 * Require any of the specified permissions or throw an error
 *
 * @param permissionKeys - Array of permission keys (user needs at least one)
 * @throws PermissionDeniedError if the user lacks all specified permissions
 *
 * @example
 * export async function viewReports() {
 *   await requireAnyPermission(['reports.view_own', 'reports.view_all'])
 *   // ... proceed with viewing
 * }
 */
export async function requireAnyPermission(permissionKeys: string[]): Promise<void> {
  const hasPermission = await checkAnyPermission(permissionKeys)
  if (!hasPermission) {
    throw new PermissionDeniedError(permissionKeys.join(" or "))
  }
}

/**
 * Require all of the specified permissions or throw an error
 *
 * @param permissionKeys - Array of permission keys (user needs all of them)
 * @throws PermissionDeniedError if the user lacks any of the permissions
 *
 * @example
 * export async function manageUsers() {
 *   await requireAllPermissions(['users.view', 'users.edit', 'users.delete'])
 *   // ... proceed with management
 * }
 */
export async function requireAllPermissions(permissionKeys: string[]): Promise<void> {
  const hasPermission = await checkAllPermissions(permissionKeys)
  if (!hasPermission) {
    throw new PermissionDeniedError(permissionKeys.join(" and "))
  }
}
