import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserDetails } from "@/app/actions/users"
import { getReportCounts, getSchoolCount, getCurrentMonthExpenditure, getAverageStudentAttendance, getRecentReportsWithSchools, getRegionalStatistics } from "@/app/actions/education-official-reports"
import { getSchoolReadinessPercentage } from "@/app/actions/school-readiness-stats"
import { CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileText, School, Users, TrendingUp, Eye, Calendar, Globe, Activity, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EducationOfficialAssessmentCard } from "@/components/school-assessment-entry-card"
import Link from "next/link"

export default async function EducationOfficialPage() {
  const { user } = await getUserDetails()
  const { totalReports, currentMonthReports, error: reportCountsError } = await getReportCounts()
  const { totalSchools, error: schoolCountError } = await getSchoolCount()
  const { totalExpenditure, error: expenditureError } = await getCurrentMonthExpenditure()
  const { averageAttendance, error: attendanceError } = await getAverageStudentAttendance()
  const { reports: recentReports, error: recentReportsError } = await getRecentReportsWithSchools()
  const { regionStats, error: regionStatsError } = await getRegionalStatistics()
  const readinessResult = await getSchoolReadinessPercentage()
  const readinessData = readinessResult.success ? readinessResult.data : null

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
        <Alert className="border-orange-300 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10">
          <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">Account Verification Pending</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400/80 text-sm lg:text-base">
            Your Education Official account is currently pending admin verification. You will be able to access the full
            dashboard once an administrator approves your account.
          </AlertDescription>
        </Alert>

        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg lg:text-xl text-slate-900 dark:text-white">Welcome, {user?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 text-sm lg:text-base">
              Thank you for registering as an Education Official. Your account access is currently limited while we
              verify your credentials. This process typically takes 1-2 business days.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get readiness status color
  const getReadinessColor = (percentage: number) => {
    if (percentage >= 70) return { bg: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/25', text: 'text-emerald-400' }
    if (percentage >= 40) return { bg: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25', text: 'text-amber-400' }
    return { bg: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/25', text: 'text-red-400' }
  }

  const readinessColors = readinessData ? getReadinessColor(readinessData.percentage) : { bg: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/25', text: 'text-slate-400' }

  // Show full dashboard for verified users
  return (
    <div className="space-y-5 lg:space-y-6">

      {/* Header Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5 tracking-tight">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
          System Overview
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Monitor key metrics and performance indicators</p>
      </div>

      {/* Error Alerts */}
      {(reportCountsError || schoolCountError || expenditureError || attendanceError || recentReportsError || regionStatsError) && (
        <Alert className="border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-300">Error Loading Dashboard Data</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-400/80 text-sm">
            Some data failed to load. Please refresh the page or contact support.
          </AlertDescription>
        </Alert>
      )}

      {/* School Assessment Entry Card */}
      <EducationOfficialAssessmentCard />

      {/* Overview Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reports */}
        <div className="px-5 py-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border-l-[3px] border-l-emerald-500 border border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-emerald-400 mt-1">{totalReports?.toLocaleString() || 0}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium mt-0.5">+{currentMonthReports || 0} this month</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Total Schools */}
        <div className="px-5 py-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border-l-[3px] border-l-purple-500 border border-purple-100 dark:border-purple-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Schools</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalSchools?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Across all regions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Avg Student Attendance */}
        <div className="px-5 py-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/30 border-l-[3px] border-l-orange-500 border border-orange-100 dark:border-orange-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Student Attendance</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-orange-400 mt-1">{averageAttendance || 0}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">System-wide average</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* Total Expenditure */}
        <div className="px-5 py-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border-l-[3px] border-l-blue-500 border border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenditure</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-blue-400 mt-1">${totalExpenditure?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Current month</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent School Reports */}
        <Card className="lg:col-span-2 bg-white dark:bg-[hsl(222,47%,11%)] border border-slate-200/80 dark:border-slate-700/30 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border-b border-slate-200/80 dark:border-slate-700/30">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Recent School Reports</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{recentReports?.length || 0} reports this period</p>
                </div>
              </div>
              <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-0 text-xs">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentReports && recentReports.length > 0 ? (
              <div className="max-h-[450px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-700/30 hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3">Report</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3">School</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3">Region</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3">Status</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReports.map((report, index) => (
                      <TableRow
                        key={report.id}
                        className={`border-b border-slate-100 dark:border-slate-800/30 transition-all duration-200 cursor-pointer
                          ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30 dark:bg-slate-800/20'}
                          hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-l-2 hover:border-l-blue-500`}
                      >
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{report.title}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{report.school.name}</p>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/30">
                            <Globe className="w-3 h-3" />
                            {report.region.name}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${report.status === 'submitted'
                              ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}
                          >
                            {report.status === 'submitted' && <CheckCircle className="w-3 h-3" />}
                            {report.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(report.submittedAt)}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-500">{getTimeAgo(report.submittedAt)}</p>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">No recent reports available</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Reports will appear here once submitted</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - School Readiness & Regional Performance */}
        <div className="space-y-4 lg:space-y-6">
          {/* School Readiness Card */}
          <Link href="/dashboard/education-official/school-readiness">
            <div className={`p-5 rounded-xl bg-gradient-to-br ${readinessColors.bg} text-white shadow-lg ${readinessColors.shadow} cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <span className="text-sm font-semibold">National School Readiness</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-70" />
              </div>
              {readinessData ? (
                <>
                  <p className="text-4xl font-bold">{readinessData.percentage.toFixed(1)}%</p>
                  <p className="text-sm text-white/80 mt-1">
                    {readinessData.readySchools} of {readinessData.totalSchools} schools ready
                  </p>
                  <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full transition-all duration-500"
                      style={{ width: `${readinessData.percentage}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">--</p>
                  <p className="text-sm text-white/70 mt-1">Unable to load readiness data</p>
                </>
              )}
              <p className="text-xs text-white/60 mt-3">Click to view detailed breakdown</p>
            </div>
          </Link>

          {/* Regional Performance */}
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50 pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Regional Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {regionStats && regionStats.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {regionStats.map((region, index) => {
                    const colors = [
                      { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30' },
                      { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/30' },
                      { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
                      { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/30' },
                      { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/30' },
                    ]
                    const colorSet = colors[index % colors.length]
                    return (
                      <Link
                        key={region.region}
                        href={`/dashboard/region/${region.region_id}`}
                        className={`flex items-center justify-between p-3 rounded-lg ${colorSet.bg} border ${colorSet.border} hover:shadow-md transition-all duration-200 cursor-pointer`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${colorSet.text}`}>{region.region}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {region.schools} schools • {region.reports} reports
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${colorSet.text} opacity-50`} />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No regional data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
