import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, School, Users, FileText, TrendingUp, Eye, Mail, Calendar, BarChart3, PieChart } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getSchoolStatistics } from "@/app/actions/education-official-reports"
import { SchoolCharts } from "@/components/school-charts"
import { SchoolReportsTable } from "@/components/school-reports-table"

interface SchoolPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SchoolPage({ params }: SchoolPageProps) {
  const { id } = await params
  const { schoolData, error } = await getSchoolStatistics(id)

  if (error || !schoolData) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/education-official/schools">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Schools
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{schoolData.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{schoolData.region}</span>
              {schoolData.headTeacher && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <School className="h-4 w-4" />
                    <span>Head Teacher: {schoolData.headTeacher.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* School Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Enrollment</p>
                <p className="text-2xl font-bold">{schoolData.statistics.currentEnrollment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Attendance</p>
                <p className="text-2xl font-bold">{schoolData.statistics.averageAttendance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{schoolData.statistics.totalReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{schoolData.statistics.totalStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Head Teacher Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Head Teacher Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schoolData.headTeacher ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{schoolData.headTeacher.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{schoolData.headTeacher.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No head teacher assigned to this school.</p>
              <p className="text-sm text-muted-foreground mt-2">
                A head teacher needs to be assigned to submit monthly reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <SchoolCharts schoolData={schoolData} />

      {/* Recent Reports */}
      <SchoolReportsTable reports={schoolData.reports} schoolId={schoolData.id} />
    </div>
  )
}
