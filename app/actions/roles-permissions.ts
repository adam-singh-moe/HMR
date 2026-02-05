"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"
import { revalidatePath } from "next/cache"
import { checkPermission, checkAnyPermission } from "@/lib/permissions"

export interface Role {
  id: string
  name: string
  created_at: string
}

export interface PermissionCategory {
  id: number
  category_key: string
  Label: string
  description: string | null
  display_order: number
  is_active: boolean
}

export interface Permission {
  id: number
  permission_key: string
  name: string
  description: string | null
  category: string
  display_order: number
  is_active: boolean
  is_locked: boolean | null
  is_system: boolean | null
  restricted_roles: string[] | null
}

export interface PermissionWithCategory extends Permission {
  category_label: string
}

export interface PermissionInCategory {
  id: number
  permission_key: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  is_locked: boolean | null
  is_system: boolean | null
  restricted_roles: string[] | null
}

export interface PermissionsGroupedByCategory {
  [categoryKey: string]: {
    label: string
    displayOrder: number
    permissions: PermissionInCategory[]
  }
}

export interface RolePermissionMapping {
  role_id: number
  permission_id: number
}

/**
 * Fetches all roles from hmr_user_roles
 * Accessible if user has roles.view OR roles.assign_permissions
 */
export async function getRoles(): Promise<{ roles: Role[]; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { roles: [], error: "User not authenticated." }
    }

    // Check if user has permission to view roles or assign permissions
    const [canViewRoles, canAssignPermissions] = await Promise.all([
      checkPermission("roles.view"),
      checkPermission("roles.assign_permissions"),
    ])

    if (!canViewRoles && !canAssignPermissions) {
      return { roles: [], error: "You do not have permission to view roles." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: roles, error } = await supabase
      .from("hmr_user_roles")
      .select("id, name, created_at")
      .order("id", { ascending: true })

    if (error) {
      console.error("Error fetching roles:", error)
      return { roles: [], error: "Failed to fetch roles." }
    }

    return { roles: roles || [], error: null }
  } catch (error) {
    console.error("Error in getRoles:", error)
    return { roles: [], error: "An unexpected error occurred." }
  }
}

/**
 * Fetches all permission categories from hmr_permission_categories
 * Accessible if user has permissions.view OR roles.assign_permissions
 */
export async function getPermissionCategories(): Promise<{
  categories: PermissionCategory[];
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return { categories: [], error: "User not authenticated." }
    }

    // Check if user has permission to view permissions or assign permissions to roles
    const [canViewPermissions, canAssignPermissions] = await Promise.all([
      checkPermission("permissions.view"),
      checkPermission("roles.assign_permissions"),
    ])

    if (!canViewPermissions && !canAssignPermissions) {
      return { categories: [], error: "You do not have permission to view categories." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: categories, error } = await supabase
      .from("hmr_permission_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching permission categories:", error)
      return { categories: [], error: "Failed to fetch permission categories." }
    }

    return { categories: categories || [], error: null }
  } catch (error) {
    console.error("Error in getPermissionCategories:", error)
    return { categories: [], error: "An unexpected error occurred." }
  }
}

/**
 * Fetches all permissions grouped by category
 * Accessible if user has permissions.view OR roles.assign_permissions
 */
export async function getPermissionsGroupedByCategory(): Promise<{
  permissionsByCategory: PermissionsGroupedByCategory
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return { permissionsByCategory: {}, error: "User not authenticated." }
    }

    // Check if user has permission to view permissions or assign permissions to roles
    const [canViewPermissions, canAssignPermissions] = await Promise.all([
      checkPermission("permissions.view"),
      checkPermission("roles.assign_permissions"),
    ])

    if (!canViewPermissions && !canAssignPermissions) {
      return { permissionsByCategory: {}, error: "You do not have permission to view permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch categories first
    const { data: categories, error: catError } = await supabase
      .from("hmr_permission_categories")
      .select("category_key, Label, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (catError) {
      console.error("Error fetching categories:", catError)
      return { permissionsByCategory: {}, error: "Failed to fetch categories." }
    }

    // Fetch all active permissions
    const { data: permissions, error: permError } = await supabase
      .from("hmr_permissions")
      .select("id, permission_key, name, description, category, display_order, is_active, is_locked, is_system, restricted_roles")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (permError) {
      console.error("Error fetching permissions:", permError)
      return { permissionsByCategory: {}, error: "Failed to fetch permissions." }
    }

    // Build category lookup map
    const categoryMap = new Map<string, { label: string; displayOrder: number }>()
    for (const cat of categories || []) {
      categoryMap.set(cat.category_key, {
        label: cat.Label,
        displayOrder: cat.display_order,
      })
    }

    // Group permissions by category
    const permissionsByCategory: PermissionsGroupedByCategory = {}

    for (const perm of permissions || []) {
      const categoryInfo = categoryMap.get(perm.category)
      if (!categoryInfo) continue // Skip if category not found or inactive

      if (!permissionsByCategory[perm.category]) {
        permissionsByCategory[perm.category] = {
          label: categoryInfo.label,
          displayOrder: categoryInfo.displayOrder,
          permissions: [],
        }
      }

      permissionsByCategory[perm.category].permissions.push(perm)
    }

    return { permissionsByCategory, error: null }
  } catch (error) {
    console.error("Error in getPermissionsGroupedByCategory:", error)
    return { permissionsByCategory: {}, error: "An unexpected error occurred." }
  }
}

/**
 * Fetches all role-permission mappings for the matrix
 * Returns a Set of "roleId:permissionId" strings for quick lookup
 * Accessible if user has permissions.view OR roles.assign_permissions
 */
export async function getRolePermissionsMatrix(): Promise<{
  mappings: Set<string>
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return { mappings: new Set(), error: "User not authenticated." }
    }

    // Check if user has permission to view permissions or assign permissions to roles
    const [canViewPermissions, canAssignPermissions] = await Promise.all([
      checkPermission("permissions.view"),
      checkPermission("roles.assign_permissions"),
    ])

    if (!canViewPermissions && !canAssignPermissions) {
      return { mappings: new Set(), error: "You do not have permission to view permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: rolePermissions, error } = await supabase
      .from("hmr_role_permission")
      .select("role_id, permission_id")

    if (error) {
      console.error("Error fetching role permissions:", error)
      return { mappings: new Set(), error: "Failed to fetch role permissions." }
    }

    // Build a Set for O(1) lookup
    const mappings = new Set<string>()
    for (const rp of rolePermissions || []) {
      mappings.add(`${rp.role_id}:${rp.permission_id}`)
    }

    return { mappings, error: null }
  } catch (error) {
    console.error("Error in getRolePermissionsMatrix:", error)
    return { mappings: new Set(), error: "An unexpected error occurred." }
  }
}

/**
 * Fetches role permissions as an array for serialization
 * Accessible if user has permissions.view OR roles.assign_permissions
 */
export async function getRolePermissionsArray(): Promise<{
  mappings: RolePermissionMapping[]
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return { mappings: [], error: "User not authenticated." }
    }

    // Check if user has permission to view permissions or assign permissions to roles
    const [canViewPermissions, canAssignPermissions] = await Promise.all([
      checkPermission("permissions.view"),
      checkPermission("roles.assign_permissions"),
    ])

    if (!canViewPermissions && !canAssignPermissions) {
      return { mappings: [], error: "You do not have permission to view permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: rolePermissions, error } = await supabase
      .from("hmr_role_permission")
      .select("role_id, permission_id")

    if (error) {
      console.error("Error fetching role permissions:", error)
      return { mappings: [], error: "Failed to fetch role permissions." }
    }

    return { mappings: rolePermissions || [], error: null }
  } catch (error) {
    console.error("Error in getRolePermissionsArray:", error)
    return { mappings: [], error: "An unexpected error occurred." }
  }
}

/**
 * Toggle a permission for a role (grant or revoke)
 */
export async function toggleRolePermission(
  roleId: string,
  permissionId: number,
  grant: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to edit permissions
    const canEdit = await checkPermission("permissions.edit")
    if (!canEdit) {
      return { success: false, error: "You do not have permission to modify role permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    if (grant) {
      // Grant permission - insert into junction table
      const { error } = await supabase
        .from("hmr_role_permission")
        .insert({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        })

      if (error) {
        // Check if it's a duplicate error (permission already granted)
        if (error.code === "23505") {
          return { success: true, error: null } // Already exists, treat as success
        }
        console.error("Error granting permission:", error)
        return { success: false, error: "Failed to grant permission." }
      }
    } else {
      // Revoke permission - delete from junction table
      const { error } = await supabase
        .from("hmr_role_permission")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId)

      if (error) {
        console.error("Error revoking permission:", error)
        return { success: false, error: "Failed to revoke permission." }
      }
    }

    // Revalidate all dashboard paths to ensure sidebars update
    revalidatePath("/dashboard/admin/roles-permissions")
    revalidatePath("/dashboard/admin", "layout")
    revalidatePath("/dashboard", "layout")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in toggleRolePermission:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Bulk toggle permissions for a role (grant or revoke all permissions in a category)
 */
export async function bulkTogglePermissions(
  roleId: string,
  permissionIds: number[],
  grant: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to edit permissions
    const canEdit = await checkPermission("permissions.edit")
    if (!canEdit) {
      return { success: false, error: "You do not have permission to modify role permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    if (grant) {
      // Grant all permissions - bulk insert
      const insertData = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from("hmr_role_permission")
        .upsert(insertData, { onConflict: "role_id,permission_id" })

      if (error) {
        console.error("Error bulk granting permissions:", error)
        return { success: false, error: "Failed to grant permissions." }
      }
    } else {
      // Revoke all permissions - bulk delete
      const { error } = await supabase
        .from("hmr_role_permission")
        .delete()
        .eq("role_id", roleId)
        .in("permission_id", permissionIds)

      if (error) {
        console.error("Error bulk revoking permissions:", error)
        return { success: false, error: "Failed to revoke permissions." }
      }
    }

    // Revalidate all dashboard paths to ensure sidebars update
    revalidatePath("/dashboard/admin/roles-permissions")
    revalidatePath("/dashboard/admin", "layout")
    revalidatePath("/dashboard", "layout")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in bulkTogglePermissions:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Create a new permission
 */
export async function createPermission(data: {
  permission_key: string
  name: string
  description?: string
  category: string
  display_order?: number
}): Promise<{ success: boolean; permission?: Permission; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to create permissions
    const canCreate = await checkPermission("permissions.create")
    if (!canCreate) {
      return { success: false, error: "You do not have permission to create permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if permission key already exists
    const { data: existing } = await supabase
      .from("hmr_permissions")
      .select("id")
      .eq("permission_key", data.permission_key.trim())
      .single()

    if (existing) {
      return { success: false, error: "A permission with this key already exists." }
    }

    // Create the new permission
    const { data: newPermission, error } = await supabase
      .from("hmr_permissions")
      .insert({
        permission_key: data.permission_key.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category,
        display_order: data.display_order || 0,
        is_active: true,
        is_locked: false,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating permission:", error)
      return { success: false, error: "Failed to create permission." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, permission: newPermission, error: null }
  } catch (error) {
    console.error("Error in createPermission:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Update an existing permission
 */
export async function updatePermission(
  permissionId: number,
  data: {
    name?: string
    description?: string
    category?: string
    display_order?: number
    restricted_roles?: string[] | null
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to edit permissions
    const canEdit = await checkPermission("permissions.edit")
    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.category !== undefined) updateData.category = data.category
    if (data.display_order !== undefined) updateData.display_order = data.display_order
    if (data.restricted_roles !== undefined) updateData.restricted_roles = data.restricted_roles

    const { error } = await supabase
      .from("hmr_permissions")
      .update(updateData)
      .eq("id", permissionId)

    if (error) {
      console.error("Error updating permission:", error)
      return { success: false, error: "Failed to update permission." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updatePermission:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Disable (lock) a permission - doesn't actually delete, just sets is_locked = true
 */
export async function disablePermission(
  permissionId: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to delete (disable) permissions
    const canDelete = await checkPermission("permissions.delete")
    if (!canDelete) {
      return { success: false, error: "You do not have permission to disable permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if permission is a system permission
    const { data: permission, error: fetchError } = await supabase
      .from("hmr_permissions")
      .select("is_system, permission_key")
      .eq("id", permissionId)
      .single()

    if (fetchError || !permission) {
      return { success: false, error: "Permission not found." }
    }

    // Prevent disabling system permissions
    if (permission.is_system) {
      return { success: false, error: "System permissions cannot be disabled." }
    }

    // Set is_locked to true (disable the permission)
    const { error } = await supabase
      .from("hmr_permissions")
      .update({ is_locked: true })
      .eq("id", permissionId)

    if (error) {
      console.error("Error disabling permission:", error)
      return { success: false, error: "Failed to disable permission." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in disablePermission:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Enable (unlock) a permission - sets is_locked = false
 */
export async function enablePermission(
  permissionId: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to edit permissions (enable is like editing)
    const canEdit = await checkPermission("permissions.edit")
    if (!canEdit) {
      return { success: false, error: "You do not have permission to enable permissions." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Set is_locked to false (enable the permission)
    const { error } = await supabase
      .from("hmr_permissions")
      .update({ is_locked: false })
      .eq("id", permissionId)

    if (error) {
      console.error("Error enabling permission:", error)
      return { success: false, error: "Failed to enable permission." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in enablePermission:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Create a new permission category
 */
export async function createPermissionCategory(data: {
  category_key: string
  Label: string
  description?: string
  display_order?: number
}): Promise<{ success: boolean; category?: PermissionCategory; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to create permissions
    const canCreate = await checkPermission("permissions.create")
    if (!canCreate) {
      return { success: false, error: "You do not have permission to create categories." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if category key already exists
    const { data: existing } = await supabase
      .from("hmr_permission_categories")
      .select("id")
      .eq("category_key", data.category_key.trim())
      .single()

    if (existing) {
      return { success: false, error: "A category with this key already exists." }
    }

    // Create the new category
    const { data: newCategory, error } = await supabase
      .from("hmr_permission_categories")
      .insert({
        category_key: data.category_key.trim(),
        Label: data.Label.trim(),
        description: data.description?.trim() || null,
        display_order: data.display_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return { success: false, error: "Failed to create category." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, category: newCategory, error: null }
  } catch (error) {
    console.error("Error in createPermissionCategory:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Get user's permission capabilities for the Roles & Permissions page
 */
export async function getUserPermissionCapabilities(): Promise<{
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return { canView: false, canCreate: false, canEdit: false, canDelete: false, error: "User not authenticated." }
    }

    const [canView, canCreate, canEdit, canDelete] = await Promise.all([
      checkPermission("permissions.view"),
      checkPermission("permissions.create"),
      checkPermission("permissions.edit"),
      checkPermission("permissions.delete"),
    ])

    return { canView, canCreate, canEdit, canDelete, error: null }
  } catch (error) {
    console.error("Error in getUserPermissionCapabilities:", error)
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, error: "An unexpected error occurred." }
  }
}

/**
 * Get user's role capabilities for the Roles & Permissions page
 */
export async function getUserRoleCapabilities(): Promise<{
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAssignPermissions: boolean
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canAssignPermissions: false,
        error: "User not authenticated."
      }
    }

    const [canView, canCreate, canEdit, canDelete, canAssignPermissions] = await Promise.all([
      checkPermission("roles.view"),
      checkPermission("roles.create"),
      checkPermission("roles.edit"),
      checkPermission("roles.delete"),
      checkPermission("roles.assign_permissions"),
    ])

    return { canView, canCreate, canEdit, canDelete, canAssignPermissions, error: null }
  } catch (error) {
    console.error("Error in getUserRoleCapabilities:", error)
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canAssignPermissions: false,
      error: "An unexpected error occurred."
    }
  }
}

/**
 * Fetches all roles with user count for roles management
 */
export async function getRolesWithUserCount(): Promise<{
  roles: (Role & { user_count: number })[];
  error: string | null
}> {
  try {
    const user = await getUser()

    if (!user) {
      return { roles: [], error: "User not authenticated." }
    }

    // Check if user has permission to view roles
    const canView = await checkPermission("roles.view")
    if (!canView) {
      return { roles: [], error: "You do not have permission to view roles." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch roles with user count
    const { data: roles, error: rolesError } = await supabase
      .from("hmr_user_roles")
      .select("id, name, created_at")
      .order("id", { ascending: true })

    if (rolesError) {
      console.error("Error fetching roles:", rolesError)
      return { roles: [], error: "Failed to fetch roles." }
    }

    // Fetch user counts per role (hmr_users.role is uuid that references hmr_user_roles.id)
    const { data: userCounts, error: countError } = await supabase
      .from("hmr_users")
      .select("role")

    if (countError) {
      console.error("Error fetching user counts:", countError)
      return { roles: [], error: "Failed to fetch user counts." }
    }

    // Count users per role - role is uuid that matches hmr_user_roles.id
    const countMap = new Map<string, number>()
    for (const u of userCounts || []) {
      if (u.role) {
        countMap.set(u.role, (countMap.get(u.role) || 0) + 1)
      }
    }

    // Merge counts with roles - match by role id (uuid)
    const rolesWithCount = (roles || []).map(role => ({
      ...role,
      user_count: countMap.get(role.id) || 0
    }))

    return { roles: rolesWithCount, error: null }
  } catch (error) {
    console.error("Error in getRolesWithUserCount:", error)
    return { roles: [], error: "An unexpected error occurred." }
  }
}

/**
 * Create a new role
 */
export async function createRole(data: {
  name: string
}): Promise<{ success: boolean; role?: Role; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to create roles
    const canCreate = await checkPermission("roles.create")
    if (!canCreate) {
      return { success: false, error: "You do not have permission to create roles." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if role name already exists (case-insensitive)
    const { data: existing } = await supabase
      .from("hmr_user_roles")
      .select("id")
      .ilike("name", data.name.trim())
      .single()

    if (existing) {
      return { success: false, error: "A role with this name already exists." }
    }

    // Create the new role
    const { data: newRole, error } = await supabase
      .from("hmr_user_roles")
      .insert({
        name: data.name.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating role:", error)
      return { success: false, error: "Failed to create role." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, role: newRole, error: null }
  } catch (error) {
    console.error("Error in createRole:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Update an existing role
 */
export async function updateRole(
  roleId: string,
  data: { name: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to edit roles
    const canEdit = await checkPermission("roles.edit")
    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit roles." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if another role with this name already exists (case-insensitive)
    const { data: existing } = await supabase
      .from("hmr_user_roles")
      .select("id")
      .ilike("name", data.name.trim())
      .neq("id", roleId)
      .single()

    if (existing) {
      return { success: false, error: "A role with this name already exists." }
    }

    // Update the role
    const { error } = await supabase
      .from("hmr_user_roles")
      .update({ name: data.name.trim() })
      .eq("id", roleId)

    if (error) {
      console.error("Error updating role:", error)
      return { success: false, error: "Failed to update role." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateRole:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}

/**
 * Delete a role (only if no users are assigned to it)
 */
export async function deleteRole(
  roleId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "User not authenticated." }
    }

    // Check if user has permission to delete roles
    const canDelete = await checkPermission("roles.delete")
    if (!canDelete) {
      return { success: false, error: "You do not have permission to delete roles." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if any users are assigned to this role (hmr_users.role is uuid referencing hmr_user_roles.id)
    const { data: usersWithRole, error: userCheckError } = await supabase
      .from("hmr_users")
      .select("id")
      .eq("role", roleId)
      .limit(1)

    if (userCheckError) {
      console.error("Error checking users for role:", userCheckError)
      return { success: false, error: "Failed to check if role is in use." }
    }

    if (usersWithRole && usersWithRole.length > 0) {
      return { success: false, error: "Cannot delete role. There are users assigned to this role." }
    }

    // Delete all role-permission mappings first
    const { error: mappingsError } = await supabase
      .from("hmr_role_permission")
      .delete()
      .eq("role_id", roleId)

    if (mappingsError) {
      console.error("Error deleting role permissions:", mappingsError)
      return { success: false, error: "Failed to delete role permissions." }
    }

    // Delete the role
    const { error } = await supabase
      .from("hmr_user_roles")
      .delete()
      .eq("id", roleId)

    if (error) {
      console.error("Error deleting role:", error)
      return { success: false, error: "Failed to delete role." }
    }

    revalidatePath("/dashboard/admin/roles-permissions")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteRole:", error)
    return { success: false, error: "An unexpected error occurred." }
  }
}
