"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSchoolsByReadinessStatus, getRegionsForFilter } from "@/app/actions/school-readiness-detailed-stats"
import { Pagination } from "@/components/pagination"
import { RegionFilter } from "@/components/region-filter"
import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, CheckCircle, AlertCircle, ChevronDown, Search } from "lucide-react"
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

export default function ReadySchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const itemsPerPage = 20

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId)
    setCurrentPage(1) // Reset to first page when filter changes
    setSearchTerm("") // Clear search when region changes
  }

  const toggleSchoolExpansion = (schoolId: string) => {
    setExpandedSchool(expandedSchool === schoolId ? null : schoolId)
  }

  const getChecklistProgress = (checklist: any) => {
    if (!checklist || typeof checklist !== 'object') return { completed: 0, total: 0 }
    
    const completed = Object.values(checklist).filter(value => value === true).length
    const total = checklistItems.length
    return { completed, total }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [schoolsResult, regionsResult] = await Promise.all([
          getSchoolsByReadinessStatus("ready", currentPage, itemsPerPage, selectedRegion || undefined),
          getRegionsForFilter()
        ])

        if (!schoolsResult.error) {
          setSchools(schoolsResult.schools || [])
          setFilteredSchools(schoolsResult.schools || []) // Initialize filtered schools
          setTotalPages(schoolsResult.totalPages)
        } else {
          setError(schoolsResult.error || "Failed to fetch schools")
        }

        if (!regionsResult.error) {
          setRegions(regionsResult.regions || [])
        }
      } catch (err) {
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentPage, selectedRegion])

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

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading ready schools...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/education-official/school-readiness">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ready Schools</h1>
            <p className="text-gray-600">Schools that are ready to reopen</p>
          </div>
        </div>
      </div>

      {/* Search and Region Filter */}
      <div className="flex justify-end gap-2">
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
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-lg font-medium">
            {filteredSchools.length > 0 ? `${filteredSchools.length} ready school${filteredSchools.length !== 1 ? 's' : ''}` : 'No ready schools found'}
          </span>
          {selectedRegion && (
            <Badge variant="outline">
              {regions.find(r => r.id === selectedRegion)?.name || selectedRegion}
            </Badge>
          )}
        </div>
        
        {totalPages > 1 && (
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schools List */}
      {!error && (
        <div className="grid gap-4">
          {filteredSchools.length > 0 ? (
            filteredSchools.map((school) => {
              const checklistProgress = getChecklistProgress(school.readiness_checklist)
              const isExpanded = expandedSchool === school.id
              
              return (
                <Card key={school.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {school.name}
                          </h3>
                          <Badge 
                            variant="default" 
                            className="bg-green-600 hover:bg-green-700 cursor-pointer"
                            onClick={() => toggleSchoolExpansion(school.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                            <ChevronDown 
                              className={`h-3 w-3 ml-1 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                            />
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{school.sms_regions?.name || 'Unknown Region'}</span>
                          </div>
                          
                          {school.readiness_updated_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Updated {format(new Date(school.readiness_updated_at), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>

                        {school.readiness_reason && (
                          <div className="mt-3 p-3 bg-green-100 rounded-lg">
                            <p className="text-sm font-medium text-green-800 mb-1">Status Reason:</p>
                            <p className="text-sm text-green-700">{school.readiness_reason}</p>
                          </div>
                        )}

                        {/* Checklist Dropdown */}
                        {isExpanded && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">School Readiness Checklist</h4>
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-gray-600">
                                  {checklistProgress.completed} / {checklistProgress.total} completed
                                </div>
                                <div className="w-16 h-2 bg-gray-200 rounded-full">
                                  <div 
                                    className="h-2 bg-green-500 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${checklistProgress.total > 0 ? (checklistProgress.completed / checklistProgress.total) * 100 : 0}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid gap-2">
                              {checklistItems.map((item) => {
                                const isCompleted = school.readiness_checklist?.[item.id] === true
                                return (
                                  <div 
                                    key={item.id} 
                                    className={`flex items-center gap-3 p-2 rounded transition-colors ${
                                      isCompleted 
                                        ? 'bg-green-50 border border-green-200' 
                                        : 'bg-gray-50 border border-gray-200'
                                    }`}
                                  >
                                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                      isCompleted 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-300 text-gray-500'
                                    }`}>
                                      {isCompleted && <CheckCircle className="h-3 w-3" />}
                                    </div>
                                    <span className={`text-sm ${
                                      isCompleted ? 'text-green-700' : 'text-gray-600'
                                    }`}>
                                      {item.description}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            !loading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? "No schools found" : "No ready schools found"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm 
                        ? `No schools match your search criteria.`
                        : selectedRegion 
                          ? `No schools in the selected region have been marked as ready to reopen yet.`
                          : `No schools have been marked as ready to reopen yet.`
                      }
                    </p>
                    {selectedRegion && !searchTerm && (
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedRegion("")}
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={schools.length * totalPages} // Approximate total
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}
