import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { School } from "lucide-react"
import { getSchoolsOverviewData } from "@/app/actions/education-official-reports"
import { SchoolsList } from "@/components/schools-list"
import { Suspense } from "react"

// Fast summary component that loads immediately
async function SchoolsSummary() {
  const { schools, error } = await getSchoolsOverviewData()
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading schools: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return <SchoolsList schools={schools} />
}

export default async function SchoolsPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading schools data...</span>
          </div>
        </CardContent>
      </Card>
    }>
      {/* @ts-ignore - Async component */}
      <SchoolsSummary />
    </Suspense>
  )
}
