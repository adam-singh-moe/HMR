"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSchoolsByReadinessStatus, getRegionsForFilter } from "@/app/actions/school-readiness-detailed-stats"
import { Pagination } from "@/components/pagination"
import { RegionFilter } from "@/components/region-filter"
import { SchoolLevelFilter } from "@/components/school-level-filter"
import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, XCircle, ChevronDown, CheckCircle2, Search } from "lucide-react"
import { format } from "date-fns"

interface School {
  id: string
  name: string
  region_id: string
  sms_regions: {
    id: string
    name: string
  } | null
  readiness_status?: string
  readiness_reason?: string
  readiness_checklist?: any
  readiness_updated_at?: string
  school_level?: string
}

interface Region {
  id: string
  name: string
}

const checklistItems = [
  { id: "yard_weeded", description: "Is the yard weeded?" },
  { id: "classrooms_cleaned", description: "Are all classrooms cleaned and organized?" },
  { id: "toilets_functional", description: "Are all student and teacher toilets functional?" },
  { id: "water_supply", description: "Is the water supply working properly?" },
  { id: "electrical_system", description: "Is the electrical system safe and functional?" },
  { id: "safety_equipment", description: "Are fire extinguishers and safety equipment in place?" },
  { id: "teaching_materials", description: "Are teaching materials and resources ready?" },
  { id: "furniture_repaired", description: "Are desks and chairs repaired and arranged?" },
  { id: "compound_secured", description: "Is the school compound properly secured?" },
  { id: "staff_briefed", description: "Have all staff been briefed and are ready?" },
]

export default function NotReadySchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>("")
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const pageSize = 20

  // Helper function to get checklist progress
  const getChecklistProgress = (checklist: Record<string, boolean>) => {
    if (!checklist) return { completed: 0, total: checklistItems.length, percentage: 0 }
    const completed = Object.values(checklist).filter(Boolean).length
    const total = checklistItems.length
    return { completed, total, percentage: Math.round((completed / total) * 100) }
  }

  const handleSchoolLevelChange = (level: string) => {
    setSelectedSchoolLevel(level)
    setCurrentPage(1) // Reset to first page when filter changes
    setSearchTerm("") // Clear search when level changes
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedSchool) {
        setExpandedSchool(null)
      }
    }

    if (expandedSchool) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedSchool])

  useEffect(() => {
    fetchRegions()
  }, [])

  useEffect(() => {
    fetchSchools(currentPage)
  }, [currentPage, selectedRegion, selectedSchoolLevel])

  // Filter schools based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSchools(schools)
    } else {
      const filtered = schools.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSchools(filtered)
    }
  }, [searchTerm, schools])

  async function fetchRegions() {
    try {
      const result = await getRegionsForFilter()
      if (result.error) {
        console.error("Failed to load regions:", result.error)
      } else {
        setRegions(result.regions)
      }
    } catch (err) {
      console.error("Failed to load regions:", err)
    }
  }

  async function fetchSchools(page: number) {
    try {
      setLoading(true)
      const regionId = selectedRegion === "all" ? undefined : selectedRegion
      const result = await getSchoolsByReadinessStatus('not_ready', page, pageSize, regionId, selectedSchoolLevel || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        setSchools(result.schools as School[])
        setFilteredSchools(result.schools as School[]) // Initialize filtered schools
        setTotalPages(result.totalPages)
        setTotalCount(result.totalCount)
      }
    } catch (err) {
      setError("Failed to load schools")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId)
    setCurrentPage(1) // Reset to first page when filter changes
    setSearchTerm("") // Clear search when region changes
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button asChild>
            <Link href="/dashboard/education-official/school-readiness">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" asChild>
          <Link href="/dashboard/education-official/school-readiness">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Schools Not Ready to Reopen</h1>
          <p className="text-gray-600">Schools that have completed their readiness assessment but are not yet ready to reopen</p>
        </div>
      </div>

      {/* Filters - Always visible */}
      <div className="space-y-6">
        <div className="flex justify-end gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search schools by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <RegionFilter
            regions={regions}
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
            disabled={loading}
          />
          <SchoolLevelFilter
            selectedLevel={selectedSchoolLevel}
            onLevelChange={handleSchoolLevelChange}
            disabled={loading}
          />
        </div>
      </div>

      {filteredSchools.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 
                "No Schools Found" :
                selectedRegion === "all" ? 
                  "No Not Ready Schools Found" : 
                  "No Not Ready Schools Found in Selected Region"
              }
            </div>
            <p className="text-gray-600">
              {searchTerm ? 
                "No schools match your search criteria." :
                selectedRegion === "all" ? 
                  "No schools have been marked as not ready to reopen yet." :
                  "No schools in the selected region have been marked as not ready to reopen yet."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {filteredSchools.length} schools not ready to reopen
                </span>
                {selectedRegion && (
                  <Badge variant="outline">
                    {selectedRegion}
                  </Badge>
                )}
                {selectedSchoolLevel && (
                  <Badge variant="outline">
                    {selectedSchoolLevel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSchools.map((school) => (
              <Card key={school.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold truncate flex-1">{school.name}</h3>
                      
                      {/* Clickable Status Badge */}
                      <button
                        onClick={() => {
                          setExpandedSchool(expandedSchool === school.id ? null : school.id)
                        }}
                        className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Not Ready
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedSchool === school.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{school.sms_regions?.name || 'Unknown Region'}</span>
                      </div>
                      {school.readiness_updated_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">{format(new Date(school.readiness_updated_at), 'MMM dd')}</span>
                        </div>
                      )}
                    </div>

                    {school.readiness_reason && (
                      <div className="bg-red-50 p-2 rounded text-xs">
                        <div className="font-medium text-red-800 mb-1">Issues:</div>
                        <div className="text-red-700 line-clamp-2">
                          {school.readiness_reason}
                        </div>
                      </div>
                    )}

                    {/* Checklist Dropdown */}
                    {expandedSchool === school.id && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">School Readiness Checklist</h4>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const progress = getChecklistProgress(school.readiness_checklist)
                              return (
                                <>
                                  <div className="text-sm text-gray-600">
                                    {progress.completed} / {progress.total} completed
                                  </div>
                                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                                    <div 
                                      className="h-2 bg-green-500 rounded-full transition-all duration-300"
                                      style={{ width: `${progress.percentage}%` }}
                                    ></div>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        
                        <div className="grid gap-2">
                          {school.readiness_checklist && Object.keys(school.readiness_checklist).length > 0 ? (
                            checklistItems.map((item) => {
                              const isCompleted = school.readiness_checklist[item.id] || false
                              return (
                                <div 
                                  key={item.id} 
                                  className={`flex items-center gap-3 p-2 rounded transition-colors ${
                                    isCompleted 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-red-50 border border-red-200'
                                  }`}
                                >
                                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                    isCompleted 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-red-500 text-white'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                  </div>
                                  <span className={`text-sm ${
                                    isCompleted ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {item.description}
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <div className="text-center text-gray-500 text-sm py-4 border border-gray-200 rounded">
                              No checklist data available
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
