import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Download, TrendingUp, Users, School, Calendar, Eye } from "lucide-react"
import Link from "next/link"
import { AdminReportsClient } from "./components/AdminReportsClient"
import { getSubmittedReportsWithSearchAndPagination, getReportCounts } from "@/app/actions/education-official-reports"

export default async function AdminReportsPage() {
  // Get initial reports data
  const { reports: initialReports, totalCount, totalPages, error } = await getSubmittedReportsWithSearchAndPagination({
    page: 1,
    pageSize: 25,
    searchTerm: "",
    selectedRegionId: "",
    selectedSchoolLevel: "",
    sortBy: "updated_at",
    sortOrder: "desc"
  })

  // Get report statistics
  const { totalReports: allTimeTotal, currentMonthReports } = await getReportCounts()

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
          <p className="text-muted-foreground">View and manage all school reports</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading reports: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
        <p className="text-muted-foreground">View and manage all school reports across regions</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allTimeTotal || 0}</div>
            <p className="text-xs text-muted-foreground">All time submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthReports || 0}</div>
            <p className="text-xs text-muted-foreground">Reports submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Reports</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount || 0}</div>
            <p className="text-xs text-muted-foreground">Available to view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminReportsClient 
            reports={initialReports || []}
            totalPages={totalPages || 0}
            currentPage={1}
          />
        </CardContent>
      </Card>
    </div>
  )
}
