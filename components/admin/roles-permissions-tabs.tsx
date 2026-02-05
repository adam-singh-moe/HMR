"use client"

import { useState } from "react"
import { Shield, Users, Key } from "lucide-react"
import { cn } from "@/lib/utils"
import { RolesManagement } from "./roles-management"
import { RolesPermissionsMatrix } from "./roles-permissions-matrix"
import type { Role, PermissionsGroupedByCategory, PermissionCategory } from "@/app/actions/roles-permissions"

interface RoleWithUserCount extends Role {
  user_count: number
}

interface RolesPermissionsTabsProps {
  // Roles tab data
  rolesWithUserCount: RoleWithUserCount[]
  roleCapabilities: {
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canAssignPermissions: boolean
  }
  // Permissions tab data
  roles: Role[]
  permissionsByCategory: PermissionsGroupedByCategory
  categories: PermissionCategory[]
  permissionMappings: string[]
  permissionCapabilities: {
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }
}

export function RolesPermissionsTabs({
  rolesWithUserCount,
  roleCapabilities,
  roles,
  permissionsByCategory,
  categories,
  permissionMappings,
  permissionCapabilities,
}: RolesPermissionsTabsProps) {
  // Determine which tabs to show
  const showRolesTab = roleCapabilities.canView
  const showPermissionsTab = roleCapabilities.canAssignPermissions

  // Default to the first available tab
  const defaultTab = showRolesTab ? "roles" : showPermissionsTab ? "permissions" : "none"
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">(defaultTab as "roles" | "permissions")

  // If no tabs are available, show access denied
  if (!showRolesTab && !showPermissionsTab) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <Shield className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Access</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center">
          You do not have permission to view roles or permissions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {showRolesTab && (
          <button
            onClick={() => setActiveTab("roles")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
              activeTab === "roles"
                ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            <Users className="h-4 w-4" />
            Roles
          </button>
        )}
        {showPermissionsTab && (
          <button
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
              activeTab === "permissions"
                ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            <Key className="h-4 w-4" />
            Assign Permissions
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "roles" && showRolesTab && (
          <RolesManagement
            roles={rolesWithUserCount}
            canCreate={roleCapabilities.canCreate}
            canEdit={roleCapabilities.canEdit}
            canDelete={roleCapabilities.canDelete}
          />
        )}
        {activeTab === "permissions" && showPermissionsTab && (
          <RolesPermissionsMatrix
            roles={roles}
            permissionsByCategory={permissionsByCategory}
            categories={categories}
            initialMappings={permissionMappings}
            canCreate={permissionCapabilities.canCreate}
            canEdit={permissionCapabilities.canEdit}
            canDelete={permissionCapabilities.canDelete}
          />
        )}
      </div>
    </div>
  )
}
