import type React from "react"
import { getPendingVerifications } from "@/app/actions/admin"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"
import { getUserPermissions } from "@/app/actions/permissions"

// Force dynamic rendering for admin routes that use cookies
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const [verificationsResult, userPermissions] = await Promise.all([
    getPendingVerifications(),
    getUserPermissions()
  ])

  const pendingCount = verificationsResult.verifications.length
  const permissions = userPermissions?.permissions || []

  // Debug logging
  console.log("[Admin Layout] User permissions result:", userPermissions)
  console.log("[Admin Layout] Permissions array:", permissions)
  console.log("[Admin Layout] Permissions count:", permissions.length)

  return (
    <AdminLayoutClient pendingCount={pendingCount} userPermissions={permissions}>
      {children}
    </AdminLayoutClient>
  )
}
