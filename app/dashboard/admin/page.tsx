'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserCounts, getSchoolCount, getRegionCount, getPendingVerifications, getSchoolsWithRegions, getUserRegistrationData, getSchoolsByRegion } from "@/app/actions/admin"
import { SchoolsList } from "@/components/admin/schools-list"
import Link from "next/link"
import { Users, School, Map, ArrowRight, UserCheck, TrendingUp, PieChart, Baby } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>({
    userRegistration: [],
    schoolsByRegion: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load basic dashboard data
      const [userCounts, schoolCount, regionCount, pendingVerifications, schoolsWithRegions] = await Promise.all([
        getUserCounts(),
        getSchoolCount(),
        getRegionCount(),
        getPendingVerifications(),
        getSchoolsWithRegions()
      ])

      setDashboardData({
        userCounts,
        schoolCount,
        regionCount,
        pendingVerifications,
        schoolsWithRegions
      })

      // Load chart data
      const [userRegistrationData, schoolsByRegionData] = await Promise.all([
        getUserRegistrationData(),
        getSchoolsByRegion()
      ])

      setChartData({
        userRegistration: userRegistrationData.data || [],
        schoolsByRegion: schoolsByRegionData.data || []
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold">System Overview</h2>
        <div className="text-center py-8">Loading dashboard data...</div>
      </div>
    )
  }

  const { userCounts, schoolCount, regionCount, pendingVerifications } = dashboardData

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold">System Overview</h2>

      {/* Pending Verifications */}
      {pendingVerifications.verifications.length > 0 && (
        <div className="grid gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-red-800">Pending Verifications</CardTitle>
              <UserCheck className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">{pendingVerifications.verifications.length}</div>
              <div className="text-xs text-red-700 mt-1">Education Officials awaiting verification</div>
              <Link
                href="/dashboard/admin/verifications"
                className="text-xs text-red-700 flex items-center gap-1 mt-3 hover:underline"
              >
                Review Verifications <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCounts.totalUsers}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {userCounts.headTeachers} Head Teachers, {userCounts.regionalOfficers} Regional Officers, {userCounts.educationOfficials} Education
              Officials
            </div>
            <Link
              href="/dashboard/admin/users"
              className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline"
            >
              Manage Users <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Across {regionCount} regions</div>
            <Link
              href="/dashboard/admin/schools"
              className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline"
            >
              Manage Schools <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Nursery Classes</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <div className="text-xs text-muted-foreground mt-1">Schools with nursery classes</div>
            <Link
              href="/dashboard/admin/nursery-schools"
              className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline"
            >
              Manage Classes <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Regions</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regionCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Administrative regions</div>
            <Link
              href="/dashboard/admin/regions"
              className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline"
            >
              Manage Regions <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* User Registration Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartData.userRegistration.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.userRegistration}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Head Teacher" stroke="#8884d8" />
                    <Line type="monotone" dataKey="Regional Officer" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="Education Official" stroke="#ffc658" />
                    <Line type="monotone" dataKey="total" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No registration data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schools by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Schools by Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartData.schoolsByRegion.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData.schoolsByRegion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ region, count }) => `${region}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {chartData.schoolsByRegion.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No school distribution data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schools List */}
      <div className="mt-4 sm:mt-6">
        {/* <SchoolsList schools={schools} error={schoolsError} /> */}
      </div>
    </div>
  )
}
