import type React from "react"
import { getPendingVerifications } from "@/app/actions/admin"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { verifications: pendingVerifications } = await getPendingVerifications()
  const pendingCount = pendingVerifications.length

  return (
    <AdminLayoutClient pendingCount={pendingCount}>
      {children}
    </AdminLayoutClient>
  )
}
