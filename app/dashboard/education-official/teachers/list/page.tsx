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
  MapPin,
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
    setSearchQuery("") // Clear search when switching to teachers view
    setCurrentPageTeachers(1) // Reset to first page
    setExpandedRows(new Set())
    fetchTeachersForSchool(schoolId)
  }

  const handleBackToSchools = () => {
    setSelectedSchoolId(null)
    setTeachers([])
    setSearchQuery("") // Clear search when switching back to schools view
    setCurrentPageSchools(1) // Reset to first page
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
    const maxVisible = 5 // Show max 5 page numbers
    
    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      // Always show last page
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/education-official/teachers')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Teachers by School</h1>
            <p className="text-gray-500 text-sm">View and manage teacher details</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/education-official/teachers')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-3xl font-bold">{totalTeacherCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Schools with Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <School className="h-8 w-8 text-green-600" />
              <span className="text-3xl font-bold">{schoolsWithTeachers}</span>
              <span className="text-gray-500 text-sm">/ {schools.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {selectedSchoolId ? "Teachers in School" : "Schools"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-purple-600" />
              <span className="text-3xl font-bold">
                {selectedSchoolId ? teachers.length : filteredSchools.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {selectedSchoolId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToSchools}
                    className="mr-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <School className="h-5 w-5" />
                {selectedSchoolId ? `Teachers at ${selectedSchool?.name}` : "Schools Overview"}
                {selectedSchoolId && (
                  <Badge className="ml-2 bg-primary text-primary-foreground text-base px-3 py-1">
                    {teachers.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
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
              >
                <RefreshCw className={`h-4 w-4 ${(loading || loadingTeachers) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={selectedSchoolId ? "Search by teacher name..." : "Search schools..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          ) : !selectedSchoolId ? (
            /* Schools List View */
            filteredSchools.length === 0 ? (
              <div className="text-center py-12">
                <School className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? "No schools found matching your search." : "No schools available."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead className="text-center">Teacher Count</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSchools.map((school) => (
                        <TableRow key={school.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{school.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={school.teacher_count > 0 ? "default" : "secondary"}>
                              {school.teacher_count} {school.teacher_count === 1 ? 'teacher' : 'teachers'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSchool(school.id)}
                              disabled={school.teacher_count === 0}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination for Schools */}
              {totalPagesSchools > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPageSchools - 1) * itemsPerPage) + 1} to {Math.min(currentPageSchools * itemsPerPage, filteredSchools.length)} of {filteredSchools.length} schools
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPageSchools(prev => Math.max(1, prev - 1))}
                          className={currentPageSchools === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {getPageNumbers(currentPageSchools, totalPagesSchools).map((page, index) => (
                        <PaginationItem key={`${page}-${index}`}>
                          {page === '...' ? (
                            <span className="px-4 py-2">...</span>
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPageSchools(page as number)}
                              isActive={currentPageSchools === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPageSchools(prev => Math.min(totalPagesSchools, prev + 1))}
                          className={currentPageSchools === totalPagesSchools ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
            )
          ) : loadingTeachers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading teachers...</span>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No teachers found matching your search." : "No teachers found at this school."}
              </p>
            </div>
          ) : (
            /* Teachers List View */
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Degrees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTeachers.map((teacher) => (
                      <React.Fragment key={teacher.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleRow(teacher.id)}
                        >
                          <TableCell className="w-[40px]">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {expandedRows.has(teacher.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        <TableCell className="font-medium">
                          {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                        </TableCell>
                        <TableCell>
                          {teacher.status ? (
                            <Badge variant="secondary" className="text-xs">
                              {teacher.status}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {teacher.email_address ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="truncate max-w-[150px]" title={teacher.email_address}>
                                {teacher.email_address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {teacher.has_masters_degree && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                MA
                              </Badge>
                            )}
                            {(teacher.has_phd === "yes" || teacher.has_phd === "true") && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                PhD
                              </Badge>
                            )}
                            {!teacher.has_masters_degree && teacher.has_phd !== "yes" && teacher.has_phd !== "true" && "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      {expandedRows.has(teacher.id) && (
                        <TableRow className="bg-gray-50/30 hover:bg-gray-50/30">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-6 py-5 border-l-4 border-primary/30 bg-gradient-to-r from-blue-50/30 to-transparent">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {/* Personal Info */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Users className="h-4 w-4 text-primary" />
                                    Personal Information
                                  </h4>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500 block text-xs">Date of Birth</span>
                                      <span className="font-medium">{formatDate(teacher.date_of_birth)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block text-xs">Status</span>
                                      <span className="font-medium">{teacher.status || '-'}</span>
                                    </div>
                                    {teacher.contact_number && (
                                      <div className="col-span-2">
                                        <span className="text-gray-500 block text-xs">Contact</span>
                                        <span className="font-medium flex items-center gap-1">
                                          <Phone className="h-3 w-3 text-gray-400" />
                                          {teacher.contact_number}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Education */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    Education
                                  </h4>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500 block text-xs">CPCE Major</span>
                                      <span className="font-medium">{teacher.cpce_major || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block text-xs">CPCE Minor</span>
                                      <span className="font-medium">{teacher.cpce_minor || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block text-xs">UG Major</span>
                                      <span className="font-medium">{teacher.ug_major || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block text-xs">UG Minor</span>
                                      <span className="font-medium">{teacher.ug_minor || '-'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Appointments */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Appointments
                                  </h4>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500 block text-xs">Current Appointment</span>
                                      <span className="font-medium">{formatDate(teacher.current_appt_date)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block text-xs">Last Appointment</span>
                                      <span className="font-medium">{formatDate(teacher.last_appt_date)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Advanced Degrees */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                    Advanced Degrees
                                  </h4>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500 block text-xs">Master's Degree</span>
                                      {teacher.has_masters_degree ? (
                                        <span className="font-medium text-green-600">{teacher.masters_degree || 'Yes'}</span>
                                      ) : (
                                        <span className="text-gray-400">No</span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block text-xs">PhD</span>
                                      {(teacher.has_phd === "yes" || teacher.has_phd === "true") ? (
                                        <span className="font-medium text-green-600">{teacher.phd || 'Yes'}</span>
                                      ) : (
                                        <span className="text-gray-400">No</span>
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
            </div>
            
            {/* Pagination for Teachers */}
            {totalPagesTeachers > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPageTeachers - 1) * itemsPerPage) + 1} to {Math.min(currentPageTeachers * itemsPerPage, filteredTeachers.length)} of {filteredTeachers.length} teachers
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPageTeachers(prev => Math.max(1, prev - 1))}
                        className={currentPageTeachers === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {getPageNumbers(currentPageTeachers, totalPagesTeachers).map((page, index) => (
                      <PaginationItem key={`${page}-${index}`}>
                        {page === '...' ? (
                          <span className="px-4 py-2">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => setCurrentPageTeachers(page as number)}
                            isActive={currentPageTeachers === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPageTeachers(prev => Math.min(totalPagesTeachers, prev + 1))}
                        className={currentPageTeachers === totalPagesTeachers ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
          )}

          {/* Summary */}
          {!loading && selectedSchoolId && filteredTeachers.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total: {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''} at {selectedSchool?.name}
            </div>
          )}
          {!loading && !selectedSchoolId && filteredSchools.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total: {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
