"use client"

import { useState, useMemo, useEffect } from "react"
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
import { School, MapPin, FileText, Search, Filter, X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import Link from "next/link"

interface School {
  id: string
  name: string
  region: string
  schoolLevel: string
  code: string | null
  grade: string | null
  status: string
}

interface SchoolsListProps {
  schools: School[]
}

// Cache key for schools data
const SCHOOLS_CACHE_KEY = 'education-officer-schools-cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Cache utilities
const saveToCache = (data: School[]) => {
  const cacheData = {
    schools: data,
    timestamp: Date.now()
  }
  localStorage.setItem(SCHOOLS_CACHE_KEY, JSON.stringify(cacheData))
}

const getFromCache = (): School[] | null => {
  try {
    const cached = localStorage.getItem(SCHOOLS_CACHE_KEY)
    if (!cached) return null
    
    const { schools, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > CACHE_DURATION
    
    if (isExpired) {
      localStorage.removeItem(SCHOOLS_CACHE_KEY)
      return null
    }
    
    return schools
  } catch {
    return null
  }
}

const clearCache = () => {
  localStorage.removeItem(SCHOOLS_CACHE_KEY)
}

//testing
export function SchoolsList({ schools: initialSchools }: SchoolsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [schools, setSchools] = useState<School[]>(initialSchools)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Initialize cache on mount
  useEffect(() => {
    const cachedSchools = getFromCache()
    if (cachedSchools && cachedSchools.length > 0) {
      setSchools(cachedSchools)
    } else {
      // Save initial schools to cache
      saveToCache(initialSchools)
      setLastUpdated(new Date())
    }
  }, [initialSchools])

  // Function to refresh schools data
  const refreshSchools = async () => {
    setIsLoading(true)
    try {
      // Clear client-side cache
      clearCache()
      
      // Fetch fresh data from server with cache refresh
      const response = await fetch('/api/education-official/schools?refresh=true', {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const freshData = await response.json()
        if (freshData.schools) {
          setSchools(freshData.schools)
          saveToCache(freshData.schools)
          setLastUpdated(new Date())
        }
      } else {
        console.error('Failed to refresh schools data')
      }
    } catch (error) {
      console.error('Failed to refresh schools:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate summary statistics
  const totalSchools = schools.length
  
  const schoolsWithDetails = useMemo(() => {
    return schools.filter(school => school.code || school.grade).length
  }, [schools])

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

  // Filter schools based on search query and selected region
  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch = searchQuery === "" || 
        school.name.toLowerCase().includes(searchLower) ||
        school.region.toLowerCase().includes(searchLower)
      const matchesRegion = selectedRegion === "all" || school.region === selectedRegion
      return matchesSearch && matchesRegion
    })
  }, [schools, searchQuery, selectedRegion])

  // Calculate pagination
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSchools = filteredSchools.slice(startIndex, endIndex)

  // Add keyboard shortcut for search (Ctrl/Cmd + K) and pagination (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search schools"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      
      // Pagination keyboard shortcuts
      if (event.target === document.body) {
        if (event.key === 'ArrowLeft' && currentPage > 1) {
          event.preventDefault()
          setCurrentPage(currentPage - 1)
        }
        if (event.key === 'ArrowRight' && currentPage < totalPages) {
          event.preventDefault()
          setCurrentPage(currentPage + 1)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedRegion, itemsPerPage])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedRegion("all")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery !== "" || selectedRegion !== "all"

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Schools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search schools by name or region... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Region Filter */}
              <div className="w-full sm:w-64">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by region" />
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
              </div>

              {/* Items per page selector */}
              <div className="w-full sm:w-32">
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="15">15 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                onClick={refreshSchools}
                disabled={isLoading}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Results Summary with Pagination Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSchools.length)} of {filteredSchools.length} schools
                {hasActiveFilters && (
                  <span className="ml-2 text-blue-600">
                    (filtered from {schools.length} total)
                  </span>
                )}
                {lastUpdated && (
                  <span className="ml-2 text-xs text-gray-500">
                    • Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              {totalPages > 1 && (
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schools Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSchools.length === 0 ? (
            <div className="text-center py-8">
              <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? "No schools match your search criteria." : "No schools found."}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters to see all schools
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Instruction Text */}
              <div className="bg-muted/50 rounded-lg p-4 border border-dashed border-muted-foreground/20">
                <p className="text-sm text-muted-foreground text-center">
                  💡 <strong>Tip:</strong> Click on any school card below to view detailed reports, statistics, and analytics for that school.
                </p>
              </div>
              
              {/* Schools Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedSchools.map((school) => (
                  <Link key={school.id} href={`/dashboard/education-official/schools/${school.id}`}>
                    <Card className="hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {school.name}
                            </CardTitle>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {school.region}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={school.status === "active" ? "default" : "secondary"}>
                              {school.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-muted-foreground" />
                            <span>{school.schoolLevel}</span>
                          </div>
                          {school.code && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-mono">{school.code}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-left flex-1">
                            <p className="text-xs text-muted-foreground">
                              {school.grade ? "Grade" : "School Type"}
                            </p>
                            <p className="text-sm font-medium">
                              {school.grade || school.schoolLevel}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform duration-200">
                            <span className="text-sm font-medium">View Details</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} • {filteredSchools.length} total schools
                    <span className="hidden sm:inline text-xs ml-2">
                      (Use ← → arrow keys to navigate)
                    </span>
                  </div>
                  
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
                        // Show first page, last page, current page, and pages around current page
                        const showPage = 
                          page === 1 || 
                          page === totalPages || 
                          Math.abs(page - currentPage) <= 1
                        
                        if (!showPage) {
                          // Show ellipsis for gaps
                          if (page === 2 && currentPage > 3) {
                            return <span key={page} className="px-2 text-muted-foreground">...</span>
                          }
                          if (page === totalPages - 1 && currentPage < totalPages - 2) {
                            return <span key={page} className="px-2 text-muted-foreground">...</span>
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
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
