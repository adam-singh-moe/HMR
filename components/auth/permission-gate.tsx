"use client"

import { ReactNode } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { AccessDenied } from "./access-denied"
import { Loader2 } from "lucide-react"

interface PermissionGateProps {
  /** Single permission key required */
  permission?: string
  /** Multiple permissions - user needs ANY of these */
  anyPermissions?: string[]
  /** Multiple permissions - user needs ALL of these */
  allPermissions?: string[]
  /** Allowed roles (in addition to or instead of permissions) */
  allowedRoles?: string[]
  /** Children to render if access is granted */
  children: ReactNode
  /** What to show when access is denied */
  fallback?: ReactNode
  /** Whether to show the default AccessDenied component or just hide content */
  showAccessDenied?: boolean
  /** Variant for AccessDenied component */
  accessDeniedVariant?: "full-page" | "card" | "inline"
  /** Custom message for access denied */
  accessDeniedMessage?: string
  /** Loading component while checking permissions */
  loadingComponent?: ReactNode
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="users.view">
 *   <UsersList />
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions
 * <PermissionGate anyPermissions={["reports.view_all", "reports.view_regional"]}>
 *   <ReportsPage />
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate allPermissions={["users.view", "users.edit"]}>
 *   <UserEditor />
 * </PermissionGate>
 *
 * @example
 * // Role-based access
 * <PermissionGate allowedRoles={["Admin", "Education Official"]}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // Hide content silently (no access denied message)
 * <PermissionGate permission="feature.beta" showAccessDenied={false}>
 *   <BetaFeature />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyPermissions,
  allPermissions,
  allowedRoles,
  children,
  fallback,
  showAccessDenied = true,
  accessDeniedVariant = "card",
  accessDeniedMessage,
  loadingComponent,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    roleName,
    isLoading
  } = usePermissions()

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  // Check access
  let hasAccess = false
  let requiredPermission: string | undefined

  // Check role-based access first
  if (allowedRoles && allowedRoles.length > 0) {
    if (roleName && allowedRoles.includes(roleName)) {
      hasAccess = true
    }
  }

  // Check single permission
  if (!hasAccess && permission) {
    hasAccess = hasPermission(permission)
    requiredPermission = permission
  }

  // Check any permissions
  if (!hasAccess && anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAnyPermission(anyPermissions)
    requiredPermission = anyPermissions.join(" | ")
  }

  // Check all permissions
  if (!hasAccess && allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions)
    requiredPermission = allPermissions.join(" & ")
  }

  // If no permission checks specified but roles were checked and passed
  if (!permission && !anyPermissions && !allPermissions && allowedRoles) {
    // Access was already determined by role check above
  }

  // If no checks specified at all, deny by default
  if (!permission && !anyPermissions && !allPermissions && !allowedRoles) {
    hasAccess = false
  }

  // Render based on access
  if (hasAccess) {
    return <>{children}</>
  }

  // Access denied
  if (fallback) {
    return <>{fallback}</>
  }

  if (!showAccessDenied) {
    return null
  }

  return (
    <AccessDenied
      variant={accessDeniedVariant}
      message={accessDeniedMessage || "You don't have permission to view this content."}
      permission={requiredPermission}
    />
  )
}

/**
 * Can - A simpler alias for PermissionGate that hides content silently
 * Use this for hiding UI elements like buttons or menu items
 *
 * @example
 * <Can permission="users.delete">
 *   <DeleteButton />
 * </Can>
 */
export function Can({
  permission,
  anyPermissions,
  allPermissions,
  allowedRoles,
  children,
  fallback = null,
}: Omit<PermissionGateProps, "showAccessDenied" | "accessDeniedVariant" | "accessDeniedMessage" | "loadingComponent">) {
  return (
    <PermissionGate
      permission={permission}
      anyPermissions={anyPermissions}
      allPermissions={allPermissions}
      allowedRoles={allowedRoles}
      showAccessDenied={false}
      loadingComponent={null}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}
