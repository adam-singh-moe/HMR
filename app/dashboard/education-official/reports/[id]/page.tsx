"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getReportDetails } from "@/app/actions/education-official-reports"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, School, Calendar, User, MapPin, FileText, Printer, Loader2 } from "lucide-react"
import { AuthWrapper } from "@/components/auth-wrapper"

function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  return months[month - 1] || "Unknown"
}

export default function ReportPage() {
  return (
    <AuthWrapper requiredRole="Education Official">
      <ReportPageContent />
    </AuthWrapper>
  )
}

function ReportPageContent() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReport() {
      try {
        const { report: data, error: err } = await getReportDetails(id)
        if (err || !data) {
          setError(err || "Report not found")
        } else {
          setReport(data)
        }
      } catch (e) {
        setError("Failed to load report")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchReport()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-slate-600 dark:text-slate-400">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
          <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Report Not Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error || "The requested report could not be loaded."}</p>
          <Button onClick={() => router.push('/dashboard/education-official/reports')} variant="outline" className="border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/education-official/reports">
          <Button variant="outline" size="sm" className="w-fit border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {getMonthName(report.month)} {report.year} Report
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {report.school?.name}
            </p>
          </div>
          <Badge className="text-xs font-medium border-0 whitespace-nowrap rounded-full px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Report Overview */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Basic Information */}
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50">
              <CardTitle className="flex items-center text-base text-slate-900 dark:text-white">
                <School className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                Report Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Period</span>
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{getMonthName(report.month)} {report.year}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Head Teacher</span>
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{report.headTeacherName || "Not specified"}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Region</span>
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{report.school?.region || "Unknown"}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <School className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">School Level</span>
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{report.schoolLevel || "Not specified"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Sections */}
          {report.sections && report.sections.length > 0 && (
            <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
              <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50">
                <CardTitle className="text-base text-slate-900 dark:text-white">Report Details</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                  Detailed information submitted in this report
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-6">
                  {report.sections.map((section: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{section.title}</h4>
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                        {Object.entries(section.data || {}).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/30 last:border-0">
                            <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium text-slate-900 dark:text-white">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Submission Details */}
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50">
              <CardTitle className="text-base text-slate-900 dark:text-white">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Submitted</span>
                <p className="font-semibold text-sm text-slate-900 dark:text-white mt-1">
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {report.updatedAt && report.updatedAt !== report.createdAt && (
                <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</span>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mt-1">
                    {new Date(report.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Report ID</span>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1 break-all">{report.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-700/50">
              <CardTitle className="text-base text-slate-900 dark:text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Link href={`/dashboard/education-official/schools/${report.schoolId}`}>
                  <Button variant="outline" className="w-full border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                    <School className="w-4 h-4 mr-2" />
                    View School Details
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="w-full border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
