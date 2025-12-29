"use client"

import { AuthWrapper } from "@/components/auth-wrapper"
import { RegionalAIInsightsContent } from "./ai-insights-content"

export default function RegionalAIInsightsPage() {
  return (
    <AuthWrapper requiredRole="Regional Officer">
      <RegionalAIInsightsContent />
    </AuthWrapper>
  )
}
