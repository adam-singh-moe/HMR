"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  School,
  BarChart3,
  List,
  RefreshCw,
  Loader2
} from "lucide-react"
import { getTeacherStatistics, getSchoolsWithTeacherCount, TeacherStats } from "@/app/actions/teachers"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
    { name: 'Untrained', value: stats.untrained, color: '#ef4444' }
  ] : []

  const genderData = stats ? [
    { name: 'Male', value: stats.byGender.male, fill: '#3b82f6' },
    { name: 'Female', value: stats.byGender.female, fill: '#ec4899' }
  ].filter(item => item.value > 0) : []

  const cpceAttendanceData = stats ? [
    { name: 'Currently Attending', value: stats.attendingCpce, color: '#10b981' },
    { name: 'Not Attending', value: stats.notAttendingCpce, color: '#6b7280' }
  ].filter(item => item.value > 0) : []

  const degreeData = stats ? [
    { name: "Master's Degree", value: stats.withMasters },
    { name: "PhD", value: stats.withPhd }
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teachers Analytics</h1>
          <p className="text-gray-500 mt-1">Overview of teacher statistics and demographics</p>
        </div>
        <Button onClick={() => router.push('/dashboard/education-official/teachers/list')}>
          <List className="h-4 w-4 mr-2" />
          View Teachers by School
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter teacher statistics by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.filter(s => s.teacher_count > 0).map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name} ({school.teacher_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger>
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSchoolLevel} onValueChange={setSelectedSchoolLevel}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="1">Nursery</SelectItem>
                <SelectItem value="2">Primary</SelectItem>
                <SelectItem value="3">Secondary</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
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
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="flex-1">
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading statistics...</span>
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Teachers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <span className="text-3xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Trained</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-8 w-8 text-green-600" />
                  <span className="text-3xl font-bold">{stats.trained}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? Math.round((stats.trained / stats.total) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Untrained</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserX className="h-8 w-8 text-red-600" />
                  <span className="text-3xl font-bold">{stats.untrained}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? Math.round((stats.untrained / stats.total) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Master's Degree</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-8 w-8 text-purple-600" />
                  <span className="text-3xl font-bold">{stats.withMasters}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? Math.round((stats.withMasters / stats.total) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">PhD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Award className="h-8 w-8 text-orange-600" />
                  <span className="text-3xl font-bold">{stats.withPhd}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? Math.round((stats.withPhd / stats.total) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Status */}
            <Card>
              <CardHeader>
                <CardTitle>Training Status</CardTitle>
                <CardDescription>Trained vs Untrained Teachers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={trainingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {trainingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Teachers by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={genderData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value">
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CPCE Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>CPCE Attendance</CardTitle>
                <CardDescription>Teachers currently attending CPCE</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cpceAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value">
                      {cpceAttendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Advanced Degrees */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Degrees</CardTitle>
                <CardDescription>Teachers with Master's and PhD</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={degreeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </div>
  )
}
