import type React from "react"
import { redirect } from "next/navigation"
import { getPendingVerifications } from "@/app/actions/admin"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"
import { getUserPermissions } from "@/app/actions/permissions"
import { getUser } from "@/app/actions/auth"

interface SchoolAssessmentAdminLayoutProps {
  children: React.ReactNode
}

export default async function SchoolAssessmentAdminLayout({ children }: SchoolAssessmentAdminLayoutProps) {
  // Security check: Only allow Admin users
  const user = await getUser()
  if (!user || user.role !== "Admin") {
    redirect("/auth")
  }

  const [verificationsResult, userPermissions] = await Promise.all([
    getPendingVerifications(),
    getUserPermissions()
  ])

  const pendingCount = verificationsResult.verifications.length
  const permissions = userPermissions?.permissions || []

  return (
    <AdminLayoutClient pendingCount={pendingCount} userPermissions={permissions}>
      {children}
    </AdminLayoutClient>
  )
}
