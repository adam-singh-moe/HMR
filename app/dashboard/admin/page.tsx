'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserCounts, getSchoolCount, getRegionCount, getPendingVerifications, getSchoolsWithRegions, getUserRegistrationData, getSchoolsByRegion } from "@/app/actions/admin"
import { SchoolsList } from "@/components/admin/schools-list"
import Link from "next/link"
import { Users, School, Map, ArrowRight, UserCheck, TrendingUp, PieChart, Baby, Loader2 } from "lucide-react"
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
  Pie,
  Area,
  AreaChart
} from "recharts"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6']

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Overview</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Admin dashboard and system metrics</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  const { userCounts, schoolCount, regionCount, pendingVerifications } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Admin dashboard and system metrics</p>
        </div>
      </div>

      {/* Pending Verifications Alert */}
      {pendingVerifications.verifications.length > 0 && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20 p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
              <UserCheck className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-300">Pending Verifications</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                {pendingVerifications.verifications.length} Education Official{pendingVerifications.verifications.length !== 1 ? 's' : ''} awaiting verification
              </p>
              <Link
                href="/dashboard/admin/verifications"
                className="inline-flex items-center gap-1 text-sm font-medium text-red-700 dark:text-red-400 mt-2 hover:underline"
              >
                Review Verifications <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats - Colorful Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="relative overflow-hidden rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{userCounts.totalUsers}</p>
              <p className="text-xs text-blue-500/80 dark:text-blue-400/70 mt-2 leading-relaxed">
                {userCounts.headTeachers} Head Teachers<br />
                {userCounts.regionalOfficers} Regional Officers<br />
                {userCounts.educationOfficials} Education Officials
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <Link
            href="/dashboard/admin/users"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-4 hover:underline"
          >
            Manage Users <ArrowRight className="h-3 w-3" />
          </Link>
          {/* Decorative gradient */}
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-2xl" />
        </div>

        {/* Schools */}
        <div className="relative overflow-hidden rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Schools</p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{schoolCount}</p>
              <p className="text-xs text-emerald-500/80 dark:text-emerald-400/70 mt-2">
                Across {regionCount} regions
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
              <School className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <Link
            href="/dashboard/admin/schools"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-4 hover:underline"
          >
            Manage Schools <ArrowRight className="h-3 w-3" />
          </Link>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-200/30 dark:bg-emerald-500/10 rounded-full blur-2xl" />
        </div>

        {/* Nursery Assessments */}
        <div className="relative overflow-hidden rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Nursery Assessments</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">-</p>
              <p className="text-xs text-purple-500/80 dark:text-purple-400/70 mt-2">
                Manage nursery assessments
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/20">
              <Baby className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <Link
            href="/dashboard/admin/nursery-assessments"
            className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 mt-4 hover:underline"
          >
            Manage Assessments <ArrowRight className="h-3 w-3" />
          </Link>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-2xl" />
        </div>

        {/* Regions */}
        <div className="relative overflow-hidden rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Regions</p>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{regionCount}</p>
              <p className="text-xs text-amber-500/80 dark:text-amber-400/70 mt-2">
                Administrative regions
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20">
              <Map className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <Link
            href="/dashboard/admin/regions"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 mt-4 hover:underline"
          >
            Manage Regions <ArrowRight className="h-3 w-3" />
          </Link>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* User Registration Trend */}
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              User Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chartData.userRegistration.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.userRegistration}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#374151', opacity: 0.3 }}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#374151', opacity: 0.3 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 11%)',
                        border: '1px solid hsl(222, 47%, 20%)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} fill="url(#colorTotal)" name="Total" />
                    <Line type="monotone" dataKey="Head Teacher" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Regional Officer" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Education Official" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  No registration data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schools by Region */}
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <PieChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Schools by Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chartData.schoolsByRegion.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData.schoolsByRegion}
                      cx="50%"
                      cy="50%"
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                      label={({ region, count }: any) => `${region}: ${count}`}
                      outerRadius={90}
                      innerRadius={40}
                      dataKey="count"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {chartData.schoolsByRegion.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 11%)',
                        border: '1px solid hsl(222, 47%, 20%)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  No school distribution data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
