import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserDetails } from "@/app/actions/users"
import { getReportCounts, getSchoolCount, getCurrentMonthExpenditure, getAverageStudentAttendance, getRecentReportsWithSchools, getRegionalStatistics } from "@/app/actions/education-official-reports"
import { CheckCircle, Clock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileText, School, Users, TrendingUp, Eye, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SchoolReadinessIndicator } from "@/components/school-readiness-indicator"
import Link from "next/link"

export default async function EducationOfficialPage() {
  const { user } = await getUserDetails()
  const { totalReports, currentMonthReports, error: reportCountsError } = await getReportCounts()
  const { totalSchools, error: schoolCountError } = await getSchoolCount()
  const { totalExpenditure, error: expenditureError } = await getCurrentMonthExpenditure()
  const { averageAttendance, error: attendanceError } = await getAverageStudentAttendance()
  const { reports: recentReports, error: recentReportsError } = await getRecentReportsWithSchools()
  const { regionStats, error: regionStatsError } = await getRegionalStatistics()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Less than an hour ago"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "1 day ago"
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks === 1) return "1 week ago"
    return `${diffInWeeks} weeks ago`
  }

  // If user is not verified, show pending message
  if (!user?.is_verified) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Account Verification Pending</AlertTitle>
          <AlertDescription className="text-orange-700 text-sm lg:text-base">
            Your Education Official account is currently pending admin verification. You will be able to access the full
            dashboard once an administrator approves your account. Please contact your system administrator if you have
            any questions.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg lg:text-xl">Welcome, {user?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm lg:text-base">
              Thank you for registering as an Education Official. Your account access is currently limited while we
              verify your credentials. This process typically takes 1-2 business days.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show full dashboard for verified users
  return (
    <div className="space-y-4 lg:space-y-6">

      {/* Header Section with School Readiness */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">System Overview</h2>
          <p className="text-muted-foreground">Monitor key metrics and performance indicators</p>
        </div>
        <div className="flex-shrink-0">
          <SchoolReadinessIndicator />
        </div>
      </div>

      {/* Error Alerts */}
      {(reportCountsError || schoolCountError || expenditureError || attendanceError || recentReportsError || regionStatsError) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTitle className="text-red-800">Error Loading Dashboard Data</AlertTitle>
          <AlertDescription className="text-red-700 text-sm lg:text-base">
            {reportCountsError && <div>• Report counts: {reportCountsError}</div>}
            {schoolCountError && <div>• School count: {schoolCountError}</div>}
            {expenditureError && <div>• Expenditure data: {expenditureError}</div>}
            {attendanceError && <div>• Attendance data: {attendanceError}</div>}
            {recentReportsError && <div>• Recent reports: {recentReportsError}</div>}
            {regionStatsError && <div>• Regional statistics: {regionStatsError}</div>}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{totalReports}</div>
            <p className="text-xs text-green-600 font-medium">+{currentMonthReports} this month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-purple-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{totalSchools}</div>
            <p className="text-xs text-purple-500 font-medium">Across all regions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg Student Attendance</CardTitle>
            <Users className="h-4 w-4 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{averageAttendance}%</div>
            <p className="text-xs text-orange-500 font-medium">System-wide average</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenditure</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              ${totalExpenditure.toLocaleString()}
            </div>
            <p className="text-xs text-green-500 font-medium">Current month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {/* Recent School Reports */}
        <Card className="lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent School Reports ({recentReports?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports && recentReports.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-[550px] overflow-y-auto border rounded-md scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 border-b">
                      <TableRow>
                        <TableHead>Report</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Head Teacher</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{report.title}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {report.id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{report.school.name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs">
                            {report.region.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-xs">{report.headTeacher.name}</p>
                            {report.headTeacher.email && (
                              <p className="text-xs text-blue-600 truncate max-w-24">{report.headTeacher.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === 'submitted' ? 'default' : 'secondary'}
                            className={report.status === 'submitted' ? 'bg-green-100 text-green-700 border-green-200 text-xs' : 'text-xs'}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs">{formatDate(report.submittedAt)}</p>
                            <p className="text-xs text-muted-foreground">{getTimeAgo(report.submittedAt)}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent reports available.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Performance */}
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base lg:text-lg text-slate-700">Regional Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {regionStats && regionStats.length > 0 ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {regionStats.map((region, index) => {
                  const colors = ["text-red-600", "text-blue-600", "text-green-600", "text-purple-600", "text-orange-600"]
                  const bgColors = ["bg-red-50", "bg-blue-50", "bg-green-50", "bg-purple-50", "bg-orange-50"]
                  const hoverColors = ["hover:bg-red-100", "hover:bg-blue-100", "hover:bg-green-100", "hover:bg-purple-100", "hover:bg-orange-100"]
                  return (
                    <Link
                      key={region.region}
                      href={`/dashboard/region/${region.region_id}`}
                      className={`flex items-center justify-between p-3 rounded-lg ${bgColors[index % bgColors.length]} ${hoverColors[index % hoverColors.length]} transition-colors duration-200 cursor-pointer`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${colors[index % colors.length]}`}>{region.region}</p>
                        <p className="text-xs text-slate-600">
                          <span className="font-medium text-slate-700">{region.schools}</span> schools •{" "}
                          <span className="font-medium text-slate-700">{region.reports}</span> reports
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className={`text-sm font-bold ${colors[index % colors.length]}`}>{region.schools}</p>
                        <p className="text-xs text-slate-500">Schools</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No regional data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
