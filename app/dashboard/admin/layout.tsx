import type React from "react"
import { getPendingVerifications } from "@/app/actions/admin"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

// Force dynamic rendering for admin routes that use cookies
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
