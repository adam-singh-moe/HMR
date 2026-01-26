"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  GraduationCap,
  Award,
  UserCheck,
  UserX,
  BarChart3,
  List,
  RefreshCw,
  Loader2,
  Filter,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import { getTeacherStatistics, getSchoolsWithTeacherCount, TeacherStats } from "@/app/actions/teachers"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function TeachersDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>("all")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const filters: any = {}
      if (selectedSchool && selectedSchool !== 'all') filters.schoolId = selectedSchool
      if (selectedGender && selectedGender !== 'all') filters.gender = selectedGender
      if (selectedSchoolLevel && selectedSchoolLevel !== 'all') filters.schoolLevel = selectedSchoolLevel
      if (selectedRegion && selectedRegion !== 'all') filters.regionId = selectedRegion

      const [statsResult, schoolsResult] = await Promise.all([
        getTeacherStatistics(filters),
        getSchoolsWithTeacherCount()
      ])

      if (statsResult.error) {
        setError(statsResult.error)
      } else {
        setStats(statsResult.stats)
      }

      if (!schoolsResult.error) {
        setSchools(schoolsResult.schools)
      }
    } catch (err) {
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedSchool, selectedGender, selectedSchoolLevel, selectedRegion])

  const handleClearFilters = () => {
    setSelectedSchool("all")
    setSelectedGender("all")
    setSelectedSchoolLevel("all")
    setSelectedRegion("all")
  }

  // Prepare chart data
  const trainingData = stats ? [
    { name: 'Trained', value: stats.trained, color: '#10b981' },
    { name: 'Untrained', value: stats.untrained, color: '#f59e0b' }
  ] : []

  const genderData = stats ? [
    { name: 'Male', value: stats.byGender.male, fill: '#3b82f6' },
    { name: 'Female', value: stats.byGender.female, fill: '#ec4899' }
  ].filter(item => item.value > 0) : []

  const cpceAttendanceData = stats ? [
    { name: 'Attending CPCE', value: stats.attendingCpce, color: '#10b981' },
    { name: 'Not Attending', value: stats.notAttendingCpce, color: '#6b7280' }
  ].filter(item => item.value > 0) : []

  const degreeData = stats ? [
    { name: "Master's", value: stats.withMasters, fill: '#8b5cf6' },
    { name: "PhD", value: stats.withPhd, fill: '#f59e0b' }
  ] : []

  // Select styling classes
  const selectTriggerClass = "h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
  const selectContentClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Teachers Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Overview of teacher statistics and demographics</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/education-official/teachers/list')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 rounded-xl h-10 px-4"
        >
          <List className="h-4 w-4 mr-2" />
          View Teachers by School
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-white">
            <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Filters
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">Filter teacher statistics by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.filter(s => s.teacher_count > 0).map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name} ({school.teacher_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSchoolLevel} onValueChange={setSelectedSchoolLevel}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="1">Nursery</SelectItem>
                <SelectItem value="2">Primary</SelectItem>
                <SelectItem value="3">Secondary</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="1">Region 1</SelectItem>
                <SelectItem value="2">Region 2</SelectItem>
                <SelectItem value="3">Region 3</SelectItem>
                <SelectItem value="4">Region 4</SelectItem>
                <SelectItem value="5">Region 5</SelectItem>
                <SelectItem value="6">Region 6</SelectItem>
                <SelectItem value="7">Region 7</SelectItem>
                <SelectItem value="8">Region 8</SelectItem>
                <SelectItem value="9">Region 9</SelectItem>
                <SelectItem value="10">Region 10</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1 h-10 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={fetchData}
                className="h-10 w-10 p-0 rounded-lg border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="ml-3 text-slate-500 dark:text-slate-400 font-medium">Loading statistics...</span>
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Teachers */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80">Total Teachers</p>
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.total}</p>
            </div>

            {/* Trained */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80">Trained</p>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.trained}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                {stats.total > 0 ? Math.round((stats.trained / stats.total) * 100) : 0}% of total
              </p>
            </div>

            {/* Untrained */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-amber-600/80 dark:text-amber-400/80">Untrained</p>
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{stats.untrained}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                {stats.total > 0 ? Math.round((stats.untrained / stats.total) * 100) : 0}% of total
              </p>
            </div>

            {/* Master's Degree */}
            <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200/80 dark:border-violet-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-violet-600/80 dark:text-violet-400/80">Master's Degree</p>
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-violet-700 dark:text-violet-400">{stats.withMasters}</p>
              <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">
                {stats.total > 0 ? Math.round((stats.withMasters / stats.total) * 100) : 0}% of total
              </p>
            </div>

            {/* PhD */}
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200/80 dark:border-orange-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-orange-600/80 dark:text-orange-400/80">PhD</p>
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                  <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">{stats.withPhd}</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                {stats.total > 0 ? Math.round((stats.withPhd / stats.total) * 100) : 0}% of total
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Status */}
            <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">Training Status</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">Trained vs Untrained Teachers</CardDescription>
              </CardHeader>
              <CardContent>
                {trainingData.length > 0 && (trainingData[0].value > 0 || trainingData[1].value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={trainingData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="none"
                      >
                        {trainingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 dark:text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <TrendingUp className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium">No training data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">Gender Distribution</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">Teachers by gender</CardDescription>
              </CardHeader>
              <CardContent>
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={genderData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148, 163, 184, 0.15)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 dark:text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Users className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium">No gender data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CPCE Attendance */}
            <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">CPCE Attendance</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">Teachers currently attending CPCE</CardDescription>
              </CardHeader>
              <CardContent>
                {cpceAttendanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={cpceAttendanceData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148, 163, 184, 0.15)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {cpceAttendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 dark:text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <GraduationCap className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium">No CPCE attendance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Degrees */}
            <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">Advanced Degrees</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">Teachers with Master's and PhD</CardDescription>
              </CardHeader>
              <CardContent>
                {degreeData.length > 0 && (degreeData[0].value > 0 || degreeData[1].value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={degreeData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148, 163, 184, 0.15)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {degreeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 dark:text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Award className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium">No advanced degree data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-base font-medium">No data available</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  )
}
