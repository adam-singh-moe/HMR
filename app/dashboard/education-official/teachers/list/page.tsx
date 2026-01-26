"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  School,
  GraduationCap,
  Award,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  ArrowLeft,
  Eye,
  BarChart3
} from "lucide-react"
import { getTeachersForEducationOfficial, getSchoolsWithTeacherCount, Teacher } from "@/app/actions/teachers"

// Simple date formatter
const formatDate = (dateString?: string) => {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

type SchoolWithCount = {
  id: string
  name: string
  region_id: string
  teacher_count: number
}

export default function EducationOfficialTeachersPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schools, setSchools] = useState<SchoolWithCount[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Pagination states
  const [currentPageSchools, setCurrentPageSchools] = useState(1)
  const [currentPageTeachers, setCurrentPageTeachers] = useState(1)
  const itemsPerPage = 10

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const fetchSchools = async () => {
    setLoading(true)
    const result = await getSchoolsWithTeacherCount()
    if (!result.error) {
      setSchools(result.schools as SchoolWithCount[])
    }
    setLoading(false)
  }

  const fetchTeachersForSchool = async (schoolId: string) => {
    setLoadingTeachers(true)
    setError(null)
    try {
      const result = await getTeachersForEducationOfficial(schoolId)
      if (result.error) {
        setError(result.error)
      } else {
        setTeachers(result.teachers as Teacher[])
      }
    } catch (err) {
      setError("Failed to load teachers")
    } finally {
      setLoadingTeachers(false)
    }
  }

  const handleViewSchool = (schoolId: string) => {
    setSelectedSchoolId(schoolId)
    setSearchQuery("")
    setCurrentPageTeachers(1)
    setExpandedRows(new Set())
    fetchTeachersForSchool(schoolId)
  }

  const handleBackToSchools = () => {
    setSelectedSchoolId(null)
    setTeachers([])
    setSearchQuery("")
    setCurrentPageSchools(1)
    setExpandedRows(new Set())
  }

  useEffect(() => {
    fetchSchools()
  }, [])

  const filteredSchools = schools.filter(school => {
    return school.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const selectedSchool = schools.find(s => s.id === selectedSchoolId)

  // Calculate total teacher count
  const totalTeacherCount = schools.reduce((sum, s) => sum + s.teacher_count, 0)
  const schoolsWithTeachers = schools.filter(s => s.teacher_count > 0).length

  // Pagination calculations
  const totalPagesSchools = Math.ceil(filteredSchools.length / itemsPerPage)
  const totalPagesTeachers = Math.ceil(filteredTeachers.length / itemsPerPage)

  const paginatedSchools = filteredSchools.slice(
    (currentPageSchools - 1) * itemsPerPage,
    currentPageSchools * itemsPerPage
  )

  const paginatedTeachers = filteredTeachers.slice(
    (currentPageTeachers - 1) * itemsPerPage,
    currentPageTeachers * itemsPerPage
  )

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPageSchools(1)
  }, [searchQuery, selectedSchoolId === null])

  useEffect(() => {
    setCurrentPageTeachers(1)
  }, [searchQuery, selectedSchoolId])

  // Generate page numbers with ellipsis
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
              <Users className="h-5 w-5 text-white" />
            </div>
            Teachers by School
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">View and manage teacher details across schools</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/education-official/teachers')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 border-0 rounded-xl h-10 px-4"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Teachers */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80">Total Teachers</p>
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{totalTeacherCount}</p>
        </div>

        {/* Schools with Teachers */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80">Schools with Teachers</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <School className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{schoolsWithTeachers}</p>
            <span className="text-sm text-emerald-600/70 dark:text-emerald-400/70">/ {schools.length}</span>
          </div>
        </div>

        {/* Dynamic Card */}
        <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200/80 dark:border-violet-500/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-violet-600/80 dark:text-violet-400/80">
              {selectedSchoolId ? "Teachers in School" : "Total Schools"}
            </p>
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-violet-700 dark:text-violet-400">
            {selectedSchoolId ? teachers.length : filteredSchools.length}
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
                {selectedSchoolId ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToSchools}
                      className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                      <School className="h-5 w-5 text-white" />
                    </div>
                    <span>Teachers at {selectedSchool?.name}</span>
                    <Badge className="ml-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-base px-3 py-1 border border-blue-200 dark:border-blue-800">
                      {teachers.length}
                    </Badge>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                      <School className="h-5 w-5 text-white" />
                    </div>
                    <span>Schools Overview</span>
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                {selectedSchoolId
                  ? `Viewing all teachers at ${selectedSchool?.name}`
                  : "Select a school to view teacher details"
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedSchoolId ? fetchTeachersForSchool(selectedSchoolId) : fetchSchools()}
                disabled={loading || loadingTeachers}
                className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 ${(loading || loadingTeachers) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder={selectedSchoolId ? "Search by teacher name..." : "Search schools..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-6 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
                </div>
                <span className="text-slate-600 dark:text-slate-400">Loading...</span>
              </div>
            </div>
          ) : !selectedSchoolId ? (
            /* Schools List View */
            filteredSchools.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-800/50 rounded-full w-fit mx-auto mb-4">
                  <School className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {searchQuery ? "No schools found matching your search." : "No schools available."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">School Name</TableHead>
                        <TableHead className="text-center text-slate-600 dark:text-slate-400 font-semibold">Teacher Count</TableHead>
                        <TableHead className="text-right text-slate-600 dark:text-slate-400 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSchools.map((school) => (
                        <TableRow key={school.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <School className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{school.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${school.teacher_count > 0 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}>
                              {school.teacher_count} {school.teacher_count === 1 ? 'teacher' : 'teachers'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSchool(school.id)}
                              disabled={school.teacher_count === 0}
                              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 disabled:opacity-50"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Schools Summary */}
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                    Showing {((currentPageSchools - 1) * itemsPerPage) + 1} to {Math.min(currentPageSchools * itemsPerPage, filteredSchools.length)} of {filteredSchools.length} schools
                  </div>
                </div>

                {/* Pagination for Schools */}
                {totalPagesSchools > 1 && (
                  <div className="flex items-center justify-end mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPageSchools(prev => Math.max(1, prev - 1))}
                            className={`${currentPageSchools === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg`}
                          />
                        </PaginationItem>
                        {getPageNumbers(currentPageSchools, totalPagesSchools).map((page, index) => (
                          <PaginationItem key={`${page}-${index}`}>
                            {page === '...' ? (
                              <span className="px-4 py-2 text-slate-400 dark:text-slate-500">...</span>
                            ) : (
                              <PaginationLink
                                onClick={() => setCurrentPageSchools(page as number)}
                                isActive={currentPageSchools === page}
                                className={`cursor-pointer rounded-lg ${currentPageSchools === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPageSchools(prev => Math.min(totalPagesSchools, prev + 1))}
                            className={`${currentPageSchools === totalPagesSchools ? 'pointer-events-none opacity-50' : 'cursor-pointer'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )
          ) : loadingTeachers ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
                </div>
                <span className="text-slate-600 dark:text-slate-400">Loading teachers...</span>
              </div>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full w-fit mx-auto mb-4">
                <Users className="h-12 w-12 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery ? "No teachers found matching your search." : "No teachers found at this school."}
              </p>
            </div>
          ) : (
            /* Teachers List View */
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Name</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Status</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Email</TableHead>
                      <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Degrees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTeachers.map((teacher) => (
                      <React.Fragment key={teacher.id}>
                        <TableRow
                          className={`cursor-pointer border-b border-slate-100 dark:border-slate-700/50 transition-all duration-200 ${
                            expandedRows.has(teacher.id)
                              ? 'bg-blue-50/50 dark:bg-blue-900/20'
                              : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                          }`}
                          onClick={() => toggleRow(teacher.id)}
                        >
                          <TableCell className="w-[40px]">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30">
                              {expandedRows.has(teacher.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-white">
                            {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                          </TableCell>
                          <TableCell>
                            {teacher.status ? (
                              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {teacher.status}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {teacher.email_address ? (
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                                <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                <span className="truncate max-w-[180px]" title={teacher.email_address}>
                                  {teacher.email_address}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              {teacher.has_masters_degree && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                  <GraduationCap className="h-3 w-3" />
                                  MA
                                </Badge>
                              )}
                              {(teacher.has_phd === "yes" || teacher.has_phd === "true") && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Award className="h-3 w-3" />
                                  PhD
                                </Badge>
                              )}
                              {!teacher.has_masters_degree && teacher.has_phd !== "yes" && teacher.has_phd !== "true" && <span className="text-slate-400 dark:text-slate-500">-</span>}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details Row */}
                        {expandedRows.has(teacher.id) && (
                          <TableRow key={`${teacher.id}-details`} className="bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-slate-800/50">
                            <TableCell colSpan={5} className="p-0">
                              <div className="px-6 py-6 border-l-4 border-blue-500 dark:border-blue-400">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Personal Info Card */}
                                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all duration-300">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                        <Users className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      Personal Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Date of Birth</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{formatDate(teacher.date_of_birth)}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Status</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{teacher.status || '-'}</p>
                                      </div>
                                      {teacher.contact_number && (
                                        <div className="col-span-2 space-y-1">
                                          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Contact</span>
                                          <p className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                            {teacher.contact_number}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Education Card */}
                                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-emerald-400/50 dark:hover:border-emerald-500/50 transition-all duration-300">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                      <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                        <BookOpen className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      Education
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">CPCE Major</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{teacher.cpce_major || '-'}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">CPCE Minor</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{teacher.cpce_minor || '-'}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">UG Major</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{teacher.ug_major || '-'}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">UG Minor</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{teacher.ug_minor || '-'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Appointments Card */}
                                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-all duration-300">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                      <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                                        <Calendar className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      Appointments
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Current Appointment</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{formatDate(teacher.current_appt_date)}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Last Appointment</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{formatDate(teacher.last_appt_date)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Advanced Degrees Card */}
                                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-violet-400/50 dark:hover:border-violet-500/50 transition-all duration-300">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                      <div className="p-1.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                                        <GraduationCap className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      Advanced Degrees
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Master's Degree</span>
                                        {teacher.has_masters_degree ? (
                                          <p className="font-medium text-violet-600 dark:text-violet-400">{teacher.masters_degree || 'Yes'}</p>
                                        ) : (
                                          <p className="text-slate-500 dark:text-slate-400">No</p>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">PhD</span>
                                        {(teacher.has_phd === "yes" || teacher.has_phd === "true") ? (
                                          <p className="font-medium text-amber-600 dark:text-amber-400">{teacher.phd || 'Yes'}</p>
                                        ) : (
                                          <p className="text-slate-500 dark:text-slate-400">No</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
                {/* Teachers Summary */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                  Total: {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''} at {selectedSchool?.name}
                </div>
              </div>

              {/* Pagination for Teachers */}
              {totalPagesTeachers > 1 && (
                <div className="flex items-center justify-end mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPageTeachers(prev => Math.max(1, prev - 1))}
                          className={`${currentPageTeachers === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg`}
                        />
                      </PaginationItem>
                      {getPageNumbers(currentPageTeachers, totalPagesTeachers).map((page, index) => (
                        <PaginationItem key={`${page}-${index}`}>
                          {page === '...' ? (
                            <span className="px-4 py-2 text-slate-400 dark:text-slate-500">...</span>
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPageTeachers(page as number)}
                              isActive={currentPageTeachers === page}
                              className={`cursor-pointer rounded-lg ${currentPageTeachers === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPageTeachers(prev => Math.min(totalPagesTeachers, prev + 1))}
                          className={`${currentPageTeachers === totalPagesTeachers ? 'pointer-events-none opacity-50' : 'cursor-pointer'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
