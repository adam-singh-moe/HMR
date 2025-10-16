import type { ReactNode } from "react"
import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, School, BarChart3, Activity, Brain } from "lucide-react"
import { SchoolReadinessIndicator } from "@/components/school-readiness-indicator"

export default async function EducationOfficialLayout({ children }: { children: ReactNode }) {
  const { user, role, error } = await getUserDetails()

  if (error || !user || role !== "Education Official") {
    redirect("/auth")
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-700">Education Official Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Monitor reports and school performance across the system</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card className="gradient-card border-0 shadow-md">
        <CardContent className="p-3 sm:p-4">
          <nav className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full">
            <div className="flex flex-row gap-1 overflow-x-auto scrollbar-hide w-full min-w-0">
              <Button asChild variant="ghost" className="justify-start text-xs whitespace-nowrap flex-shrink-0" size="sm">
                <Link href="/dashboard/education-official" className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>Overview</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs whitespace-nowrap flex-shrink-0" size="sm">
                <Link href="/dashboard/education-official/reports" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Reports</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs whitespace-nowrap flex-shrink-0" size="sm">
                <Link href="/dashboard/education-official/schools" className="flex items-center gap-1">
                  <School className="h-3 w-3" />
                  <span>Schools</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs whitespace-nowrap flex-shrink-0" size="sm">
                <Link href="/dashboard/education-official/physical-education-reports" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>PE Reports</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs whitespace-nowrap flex-shrink-0" size="sm">
                <Link href="/dashboard/education-official/ai-reports" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  <span>AI Insights</span>
                </Link>
              </Button>
            </div>
            
            {/* School Readiness Indicator */}
            <div className="flex-shrink-0">
              <SchoolReadinessIndicator />
            </div>
          </nav>
        </CardContent>
      </Card>

      {children}
    </div>
  )
}
