import type { ReactNode } from "react"
import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, School, BarChart3, Activity } from "lucide-react"
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
          <nav className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button asChild variant="ghost" className="justify-start text-xs sm:text-sm" size="sm">
                <Link href="/dashboard/education-official" className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Overview</span>
                  <span className="sm:hidden">Overview</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs sm:text-sm" size="sm">
                <Link href="/dashboard/education-official/reports" className="flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">All Reports</span>
                  <span className="sm:hidden">Reports</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs sm:text-sm" size="sm">
                <Link href="/dashboard/education-official/schools" className="flex items-center gap-2">
                  <School className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Schools</span>
                  <span className="sm:hidden">Schools</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start text-xs sm:text-sm" size="sm">
                <Link href="/dashboard/education-official/physical-education-reports" className="flex items-center gap-2">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Physical Education Reports</span>
                  <span className="sm:hidden">PE Reports</span>
                </Link>
              </Button>
            </div>
            
            {/* School Readiness Indicator */}
            <div className="mt-2 sm:mt-0">
              <SchoolReadinessIndicator />
            </div>
          </nav>
        </CardContent>
      </Card>

      {children}
    </div>
  )
}
