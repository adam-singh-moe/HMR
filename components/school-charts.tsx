"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, BarChart3, DollarSign, Users } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from "recharts"

interface SchoolData {
  id: string
  name: string
  region: string
  headTeacher?: {
    name: string
    email: string
  } | null
  statistics: {
    totalReports: number
    averageAttendance: number
    averageTeacherAttendance: number
    currentEnrollment: number
    totalStaff: number
    lastReportDate: string | null
    monthlyTrends: Array<{
      month: string
      monthShort: string
      attendance: number
      teacherAttendance: number
      studentAttendance: number
      enrollment: number
      expenditure: number
      monthYear: string
    }>
  }
  reports: any[]
}

interface SchoolChartsProps {
  schoolData: SchoolData
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function SchoolCharts({ schoolData }: SchoolChartsProps) {
  const { statistics } = schoolData

  // Get available years from monthly trends
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(
      statistics.monthlyTrends.map(trend => trend.monthYear.split('-')[0])
    )).sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)
    return years
  }, [statistics.monthlyTrends])

  // Set current year as default
  const currentYear = new Date().getFullYear().toString()
  const defaultYear = availableYears.includes(currentYear) ? currentYear : availableYears[0]
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear || 'all')

  // Filter monthly trends based on selected year
  const filteredMonthlyTrends = useMemo(() => {
    if (selectedYear === 'all') {
      return statistics.monthlyTrends
    }
    return statistics.monthlyTrends.filter(trend => 
      trend.monthYear.startsWith(selectedYear)
    )
  }, [statistics.monthlyTrends, selectedYear])

  // Format monthly trends data for charts
  const monthlyData = filteredMonthlyTrends.map(trend => ({
    ...trend,
    attendanceRate: trend.studentAttendance,
    enrollmentGrowth: trend.enrollment
  }))

  // Calculate attendance trend (positive, negative, or stable)
  const attendanceTrend = () => {
    if (monthlyData.length < 2) return { trend: 'stable', percentage: 0 }
    
    const recent = monthlyData.slice(-3) // Last 3 months
    const earlier = monthlyData.slice(-6, -3) // Previous 3 months
    
    const recentAvg = recent.reduce((sum, item) => sum + item.studentAttendance, 0) / recent.length
    const earlierAvg = earlier.length > 0 
      ? earlier.reduce((sum, item) => sum + item.studentAttendance, 0) / earlier.length 
      : recentAvg
    
    const diff = recentAvg - earlierAvg
    
    if (Math.abs(diff) < 1) return { trend: 'stable', percentage: 0 }
    return { 
      trend: diff > 0 ? 'positive' : 'negative', 
      percentage: Math.abs(diff).toFixed(1)
    }
  }

  const { trend, percentage } = attendanceTrend()

  return (
    <>
      {/* Year Filter - Top Right */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
            Year:
          </label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student vs Teacher Attendance Rate Chart - Full Width */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student vs Teacher Attendance Rates
            {selectedYear !== 'all' && (
              <span className="text-sm text-gray-500">({selectedYear})</span>
            )}
            {trend !== 'stable' && (
              <span className={`text-sm px-2 py-1 rounded-full ${
                trend === 'positive' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {trend === 'positive' ? '↗' : '↘'} {percentage}%
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="monthShort" 
                stroke="#64748b"
                fontSize={12}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="#64748b"
                fontSize={12}
                tick={{ fill: '#64748b' }}
                label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  `${value}%`, 
                  name === 'studentAttendance' ? 'Student Attendance' : 'Teacher Attendance'
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="studentAttendance"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Student Attendance"
                dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: 'white' }}
                activeDot={{ r: 7, fill: '#1d4ed8', strokeWidth: 2, stroke: 'white' }}
              />
              <Line
                type="monotone"
                dataKey="teacherAttendance"
                stroke="#10b981"
                strokeWidth={3}
                name="Teacher Attendance"
                dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: 'white' }}
                activeDot={{ r: 7, fill: '#059669', strokeWidth: 2, stroke: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom Two Charts - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expenditure Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Monthly Expenditure
              {selectedYear !== 'all' && (
                <span className="text-sm text-gray-500">({selectedYear})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="monthShort" 
                  stroke="#64748b"
                  fontSize={11}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={11}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Expenditure']}
                />
                <Bar 
                  dataKey="expenditure" 
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enrollment Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Enrollment
              {selectedYear !== 'all' && (
                <span className="text-sm text-gray-500">({selectedYear})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="monthShort" 
                  stroke="#64748b"
                  fontSize={11}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={11}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => [`${value} students`, 'Enrollment']}
                />
                <Bar 
                  dataKey="enrollmentGrowth" 
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
