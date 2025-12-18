import type React from "react"
import { getPendingVerifications } from "@/app/actions/admin"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

interface SchoolAssessmentAdminLayoutProps {
  children: React.ReactNode
}

export default async function SchoolAssessmentAdminLayout({ children }: SchoolAssessmentAdminLayoutProps) {
  const { verifications: pendingVerifications } = await getPendingVerifications()
  const pendingCount = pendingVerifications.length

  return (
    <AdminLayoutClient pendingCount={pendingCount}>
      {children}
    </AdminLayoutClient>
  )
}
