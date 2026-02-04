"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { School, MapPin, FileText, Search, Filter, X, ChevronLeft, ChevronRight, RefreshCw, Loader2, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-wrapper"
import { usePermissions } from "@/hooks/use-permissions"
import { getSchoolsOverviewData } from "@/app/actions/education-official-reports"

interface SchoolData {
  id: string
  name: string
  region: string
  schoolLevel: string
  code: string | null
  grade: string | null
  status: string
}

export default function SchoolsOverviewPage() {
  const { user } = useAuth()
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()
  const [schools, setSchools] = useState<SchoolData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>("all")
  const [selectedGrade, setSelectedGrade] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Check permissions
  const canViewAll = hasPermission("schools_overview.view_all")
  const canViewRegional = hasPermission("schools_overview.view_regional")
  const hasAccess = canViewAll || canViewRegional

  // Fetch schools data
  useEffect(() => {
    if (permissionsLoading || !hasAccess) {
      if (!permissionsLoading && !hasAccess) {
        setIsLoading(false)
      }
      return
    }

    const fetchSchools = async () => {
      setIsLoading(true)
      try {
        const result = await getSchoolsOverviewData()
        if (result.error) {
          setError(result.error)
          setSchools([])
        } else {
          setSchools(result.schools || [])
          setError(null)
        }
      } catch (err) {
        console.error("Error fetching schools:", err)
        setError("Failed to load schools data.")
        setSchools([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchools()
  }, [permissionsLoading, hasAccess])

  // Refresh schools data
  const refreshSchools = async () => {
    setIsLoading(true)
    try {
      const result = await getSchoolsOverviewData()
      if (result.error) {
        setError(result.error)
      } else {
        setSchools(result.schools || [])
        setError(null)
      }
    } catch (err) {
      console.error("Error refreshing schools:", err)
      setError("Failed to refresh schools data.")
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique regions for the filter dropdown with counts
  const regions = useMemo(() => {
    const regionCounts = schools.reduce((acc, school) => {
      acc[school.region] = (acc[school.region] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(regionCounts)
      .sort()
      .map(region => ({
        name: region,
        count: regionCounts[region]
      }))
  }, [schools])

  // Get unique school levels for the filter dropdown with counts
  const schoolLevels = useMemo(() => {
    const levelCounts = schools.reduce((acc, school) => {
      if (school.schoolLevel) {
        acc[school.schoolLevel] = (acc[school.schoolLevel] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return Object.keys(levelCounts)
      .sort()
      .map(level => ({
        name: level,
        count: levelCounts[level]
      }))
  }, [schools])

  // Get unique grades for the filter dropdown with counts
  const grades = useMemo(() => {
    const gradeCounts = schools.reduce((acc, school) => {
      if (school.grade) {
        acc[school.grade] = (acc[school.grade] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return Object.keys(gradeCounts)
      .sort()
      .map(grade => ({
        name: grade,
        count: gradeCounts[grade]
      }))
  }, [schools])

  // Filter schools based on search query and selected filters
  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch = searchQuery === "" ||
        school.name.toLowerCase().includes(searchLower) ||
        school.region.toLowerCase().includes(searchLower)
      const matchesRegion = selectedRegion === "all" || school.region === selectedRegion
      const matchesSchoolLevel = selectedSchoolLevel === "all" || school.schoolLevel === selectedSchoolLevel
      const matchesGrade = selectedGrade === "all" || school.grade === selectedGrade
      return matchesSearch && matchesRegion && matchesSchoolLevel && matchesGrade
    })
  }, [schools, searchQuery, selectedRegion, selectedSchoolLevel, selectedGrade])

  // Calculate pagination
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSchools = filteredSchools.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedRegion, selectedSchoolLevel, selectedGrade, itemsPerPage])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedRegion("all")
    setSelectedSchoolLevel("all")
    setSelectedGrade("all")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery !== "" || selectedRegion !== "all" || selectedSchoolLevel !== "all" || selectedGrade !== "all"

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  // Show access denied if no permission
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="text-center py-12">
              <ShieldAlert className="h-16 w-16 mx-auto text-red-400 dark:text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Access Denied</h2>
              <p className="text-slate-500 dark:text-slate-400">
                You do not have permission to view Schools Overview.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                Contact your administrator if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <School className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            Schools Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {canViewAll
              ? "View detailed reports, statistics, and analytics for all schools."
              : `View schools in ${user?.region_name || 'your region'}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
            {filteredSchools.length} schools
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 sm:min-w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search schools by name, region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                />
              </div>
              {/* Only show region filter if user can view all */}
              {canViewAll && (
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="sm:w-48 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region.name} value={region.name}>
                        {region.name} ({region.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedSchoolLevel} onValueChange={setSelectedSchoolLevel}>
                <SelectTrigger className="sm:w-48 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All School Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All School Levels</SelectItem>
                  {schoolLevels.map((level) => (
                    <SelectItem key={level.name} value={level.name}>
                      {level.name} ({level.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="sm:w-40 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade.name} value={grade.name}>
                      {grade.name} ({grade.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              {/* Refresh Button */}
              <Button
                onClick={refreshSchools}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-slate-600 dark:text-slate-400"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schools Grid */}
      <Card className="bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 shadow-sm rounded-xl">
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-slate-600 dark:text-slate-400">Loading schools data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              <p>{error}</p>
              <Button onClick={refreshSchools} className="mt-4" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-8">
              <School className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                {hasActiveFilters ? "No schools match your search criteria." : "No schools found."}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters to see all schools
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              {/* Schools Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedSchools.map((school) => (
                  <Link key={school.id} href={`/dashboard/schools-overview/${school.id}`}>
                    <Card className="hover:shadow-lg hover:border-blue-500/50 dark:hover:border-blue-500/30 transition-all duration-200 cursor-pointer group bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {school.name}
                            </CardTitle>
                            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                              <MapPin className="h-3 w-3" />
                              {school.region}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={school.status === "active" ? "default" : "secondary"} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                              {school.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <School className="h-4 w-4" />
                            <span>{school.schoolLevel}</span>
                          </div>
                          {school.code && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <FileText className="h-4 w-4" />
                              <span className="text-xs font-mono">{school.code}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-left flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              {school.grade ? "Grade" : "School Type"}
                            </p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {school.grade || school.schoolLevel}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform duration-200">
                            <span className="text-sm font-medium">View Details</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination and Page Size Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Page Size Control */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-20 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-slate-500 dark:text-slate-400">per page</span>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="hidden sm:flex"
                    >
                      First
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>

                    <div className="flex items-center space-x-1">
                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1

                        if (!showPage) {
                          if (page === 2 && currentPage > 3) {
                            return <span key={page} className="px-2 text-slate-400">...</span>
                          }
                          if (page === totalPages - 1 && currentPage < totalPages - 2) {
                            return <span key={page} className="px-2 text-slate-400">...</span>
                          }
                          return null
                        }

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-8"
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="hidden sm:flex"
                    >
                      Last
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
