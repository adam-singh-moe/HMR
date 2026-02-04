"use client"

import { ReactNode } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/components/auth-wrapper"
import { AccessDenied } from "./access-denied"
import { Loader2 } from "lucide-react"

interface PageGuardProps {
  /** Single permission key required */
  permission?: string
  /** Multiple permissions - user needs ANY of these */
  anyPermissions?: string[]
  /** Multiple permissions - user needs ALL of these */
  allPermissions?: string[]
  /** Allowed roles (in addition to or instead of permissions) */
  allowedRoles?: string[]
  /** Page title for the access denied message */
  pageTitle?: string
  /** Children to render if access is granted */
  children: ReactNode
  /** Custom loading component */
  loadingComponent?: ReactNode
}

/**
 * PageGuard - Full page protection with loading state and access denied screen
 *
 * Use this to wrap entire pages that require specific permissions or roles.
 * Shows a full-page loading spinner while checking permissions, then either
 * renders the page content or a full-page access denied screen.
 *
 * @example
 * // In a page component
 * export default function UsersPage() {
 *   return (
 *     <PageGuard
 *       permission="users.view_all"
 *       pageTitle="User Management"
 *     >
 *       <UsersContent />
 *     </PageGuard>
 *   )
 * }
 *
 * @example
 * // Multiple permissions (any)
 * <PageGuard
 *   anyPermissions={["reports.view_all", "reports.view_regional"]}
 *   pageTitle="Reports"
 * >
 *   <ReportsContent />
 * </PageGuard>
 *
 * @example
 * // Role-based access
 * <PageGuard
 *   allowedRoles={["Admin"]}
 *   pageTitle="Admin Settings"
 * >
 *   <AdminSettings />
 * </PageGuard>
 */
export function PageGuard({
  permission,
  anyPermissions,
  allPermissions,
  allowedRoles,
  pageTitle,
  children,
  loadingComponent,
}: PageGuardProps) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    roleName,
    isLoading: isPermissionsLoading
  } = usePermissions()

  const isLoading = isAuthLoading || isPermissionsLoading

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Checking permissions...
        </p>
      </div>
    )
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <AccessDenied
        variant="full-page"
        title="Authentication Required"
        message="Please sign in to access this page."
        showBackButton={false}
        showHomeButton={false}
        customAction={{
          label: "Sign In",
          onClick: () => window.location.href = "/auth"
        }}
      />
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
    requiredPermission = anyPermissions.join(" or ")
  }

  // Check all permissions
  if (!hasAccess && allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions)
    requiredPermission = allPermissions.join(" and ")
  }

  // If no checks specified at all, allow access (page should implement own checks)
  if (!permission && !anyPermissions && !allPermissions && !allowedRoles) {
    hasAccess = true
  }

  // Render based on access
  if (hasAccess) {
    return <>{children}</>
  }

  // Build access denied message
  const message = pageTitle
    ? `You don't have permission to access ${pageTitle}.`
    : "You don't have permission to access this page."

  return (
    <AccessDenied
      variant="card"
      title="Access Denied"
      message={message}
      permission={requiredPermission}
    />
  )
}
