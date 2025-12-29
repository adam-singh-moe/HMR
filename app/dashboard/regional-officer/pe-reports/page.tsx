"use client"

import { AuthWrapper } from "@/components/auth-wrapper"
import { RegionalPEReportsContent } from "./pe-reports-content"

export default function RegionalPEReportsPage() {
  return (
    <AuthWrapper requiredRole="Regional Officer">
      <RegionalPEReportsContent />
    </AuthWrapper>
  )
}
