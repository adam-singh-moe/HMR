"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"
import type { UserPermissions } from "@/types/permissions"

/**
 * Fetches all permission keys for the current user's role
 * Returns an array of permission strings like ["schools.edit", "users.view"]
 */
export async function getUserPermissions(): Promise<UserPermissions | null> {
  const user = await getUser()

  if (!user) {
    console.log("[getUserPermissions] No user found")
    return null
  }

  console.log("[getUserPermissions] User ID:", user.id)

  // Use service role client to bypass RLS for reading permissions
  const supabase = createServiceRoleSupabaseClient()

  // Get the user's role information from the database
  const { data: userData, error: userError } = await supabase
    .from("hmr_users")
    .select(`
      role,
      hmr_user_roles (
        id,
        name
      )
    `)
    .eq("id", user.id)
    .single()

  if (userError || !userData) {
    console.error("[getUserPermissions] Error fetching user role:", userError)
    return null
  }

  const roleId = userData.role
  const roleName = (userData.hmr_user_roles as any)?.name || "Unknown"

  console.log("[getUserPermissions] Role ID:", roleId, "Role Name:", roleName)

  // Get all permission keys for this role by joining hmr_role_permission with hmr_permissions
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
    console.error("[getUserPermissions] Error fetching role permissions:", permError)
    return null
  }

  console.log("[getUserPermissions] Raw role permissions count:", rolePermissions?.length || 0)

  // Extract permission keys from the joined data, filtering for active permissions only
  // Trim whitespace/newlines from keys to handle data entry issues
  const permissions: string[] = []
  for (const rp of rolePermissions || []) {
    const perm = rp.hmr_permissions as any
    if (perm && perm.is_active && perm.permission_key) {
      permissions.push(perm.permission_key.trim())
    }
  }

  console.log("[getUserPermissions] Final permissions count:", permissions.length)
  console.log("[getUserPermissions] Permissions:", permissions)

  return {
    permissions,
    role_id: roleId,
    role_name: roleName,
  }
}

/**
 * Checks if the current user has a specific permission
 */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const userPermissions = await getUserPermissions()
  if (!userPermissions) {
    return false
  }
  return userPermissions.permissions.includes(permissionKey)
}

/**
 * Checks if the current user has any of the specified permissions
 */
export async function hasAnyPermission(permissionKeys: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions()
  if (!userPermissions) {
    return false
  }
  return permissionKeys.some(key => userPermissions.permissions.includes(key))
}

/**
 * Checks if the current user has all of the specified permissions
 */
export async function hasAllPermissions(permissionKeys: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions()
  if (!userPermissions) {
    return false
  }
  return permissionKeys.every(key => userPermissions.permissions.includes(key))
}
