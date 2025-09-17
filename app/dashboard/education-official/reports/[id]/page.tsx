import { notFound } from "next/navigation"
import { getUser } from "@/app/actions/auth"
import { getReportDetails } from "@/app/actions/education-official-reports"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, School, Calendar, User, MapPin } from "lucide-react"

interface ReportPageProps {
  params: Promise<{ id: string }>
}

function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  return months[month - 1] || "Unknown"
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params
  const user = await getUser()

  if (!user || user.role !== "Education Official") {
    notFound()
  }

  const { report, error } = await getReportDetails(id)

  if (error || !report) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/education-official">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getMonthName(report.month)} {report.year} Report
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              {report.school?.name}
            </p>
          </div>
          <Badge 
            variant={report.status === "submitted" ? "default" : "secondary"}
            className="text-sm"
          >
            {report.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <School className="w-5 h-5 mr-2" />
                Report Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Period:</span>
                  <span className="font-medium">{getMonthName(report.month)} {report.year}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Head Teacher:</span>
                  <span className="font-medium">{report.headTeacherName || "Not specified"}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Region:</span>
                  <span className="font-medium">{report.school?.region || "Unknown"}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <School className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">School Level:</span>
                  <span className="font-medium">{report.schoolLevel || "Not specified"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Sections */}
          {report.sections && report.sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
                <CardDescription>
                  Detailed information submitted in this report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {report.sections.map((section: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{section.title}</h4>
                      <div className="text-sm text-gray-600 space-y-2">
                        {Object.entries(section.data || {}).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
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
        <div className="space-y-6">
          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-gray-600">Submitted:</span>
                <p className="font-medium">
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
                <div>
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <p className="font-medium">
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

              <div>
                <span className="text-sm text-gray-600">Report ID:</span>
                <p className="font-mono text-sm">{report.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href={`/dashboard/education-official/schools/${report.schoolId}`}>
                  <Button variant="outline" className="w-full">
                    <School className="w-4 h-4 mr-2" />
                    View School Details
                  </Button>
                </Link>
                
                <Button variant="outline" className="w-full" onClick={() => window.print()}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
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
