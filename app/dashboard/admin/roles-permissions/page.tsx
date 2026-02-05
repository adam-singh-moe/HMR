import {
  getRoles,
  getPermissionsGroupedByCategory,
  getPermissionCategories,
  getRolePermissionsArray,
  getUserPermissionCapabilities,
  getUserRoleCapabilities,
  getRolesWithUserCount,
} from "@/app/actions/roles-permissions"
import { RolesPermissionsTabs } from "@/components/admin/roles-permissions-tabs"
import { Shield, AlertCircle, ShieldAlert } from "lucide-react"

export default async function RolesPermissionsPage() {
  // First check if user has any permission to view this page
  const [permissionCapabilities, roleCapabilities] = await Promise.all([
    getUserPermissionCapabilities(),
    getUserRoleCapabilities(),
  ])

  // User needs either roles.view or roles.assign_permissions to access this page
  const hasAnyAccess = roleCapabilities.canView || roleCapabilities.canAssignPermissions

  if (!hasAnyAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white">
            Roles & Permissions
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <ShieldAlert className="h-16 w-16 text-red-400 dark:text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center">
            You do not have permission to view the Roles & Permissions page.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  // Fetch all data in parallel
  const [rolesResult, rolesWithCountResult, permissionsResult, categoriesResult, mappingsResult] = await Promise.all([
    getRoles(),
    roleCapabilities.canView ? getRolesWithUserCount() : Promise.resolve({ roles: [], error: null }),
    getPermissionsGroupedByCategory(),
    getPermissionCategories(),
    getRolePermissionsArray(),
  ])

  const { roles, error: rolesError } = rolesResult
  const { roles: rolesWithUserCount, error: rolesWithCountError } = rolesWithCountResult
  const { permissionsByCategory, error: permissionsError } = permissionsResult
  const { categories, error: categoriesError } = categoriesResult
  const { mappings, error: mappingsError } = mappingsResult

  // Check for critical errors based on what the user can access
  // If user can only view roles tab, we need rolesWithUserCount
  // If user can only assign permissions, we need roles, permissions, categories, mappings
  const rolesTabError = roleCapabilities.canView && rolesWithCountError
  const permissionsTabError = roleCapabilities.canAssignPermissions && (rolesError || permissionsError || categoriesError || mappingsError)

  // Only show error if ALL tabs fail
  const criticalError = (!roleCapabilities.canView || rolesTabError) && (!roleCapabilities.canAssignPermissions || permissionsTabError)

  if (criticalError) {
    const errorMessage = rolesTabError || permissionsTabError || rolesError || permissionsError || categoriesError || mappingsError
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white">
            Roles & Permissions
          </h2>
        </div>
        <div className="flex items-center gap-3 py-8 px-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>Error loading data: {errorMessage}</span>
        </div>
      </div>
    )
  }

  // Convert mappings array to a Set-like format for the client component
  const permissionMappings = mappings.map((m) => `${m.role_id}:${m.permission_id}`)

  // Calculate total permissions count
  const totalPermissions = Object.values(permissionsByCategory).reduce(
    (sum, cat) => sum + cat.permissions.length,
    0
  )

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Roles & Permissions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage role-based access control for the system
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {roles.length} roles
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {totalPermissions} permissions
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {categories.length} categories
          </span>
        </div>
      </div>

      {/* Tabs Component */}
      <RolesPermissionsTabs
        rolesWithUserCount={rolesWithUserCount}
        roleCapabilities={roleCapabilities}
        roles={roles}
        permissionsByCategory={permissionsByCategory}
        categories={categories}
        permissionMappings={permissionMappings}
        permissionCapabilities={permissionCapabilities}
      />
    </div>
  )
}
