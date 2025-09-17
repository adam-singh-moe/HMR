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
import { ArrowLeft, MapPin, AlertTriangle, Search } from "lucide-react"

interface School {
  id: string
  name: string
  region_id: string
  sms_regions: {
    id: string
    name: string
  } | null
}

interface Region {
  id: string
  name: string
}

export default function NoStatusSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const pageSize = 20

  useEffect(() => {
    fetchRegions()
  }, [])

  useEffect(() => {
    fetchSchools(currentPage)
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
      const result = await getSchoolsByReadinessStatus('no_status', page, pageSize, regionId)
      if (result.error) {
        setError(result.error)
      } else {
        setSchools(result.schools)
        setFilteredSchools(result.schools) // Initialize filtered schools
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
          <h1 className="text-3xl font-bold">Schools Without Status Update</h1>
          <p className="text-gray-600">Schools that haven't submitted their readiness assessment yet</p>
        </div>
      </div>

      {filteredSchools.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 
                "No Schools Found" : 
                selectedRegion === "all" ? 
                  "All Schools Have Status Updates" : 
                  "All Schools in Selected Region Have Status Updates"
              }
            </div>
            <p className="text-gray-600">
              {searchTerm ? 
                "No schools match your search criteria." :
                selectedRegion === "all" ? 
                  "All schools have submitted their readiness assessments." :
                  "All schools in the selected region have submitted their readiness assessments."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div className="text-sm font-medium text-yellow-800">
                  These schools need to complete their readiness assessment
                </div>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                School administrators should log in to the system and complete their school readiness checklist.
              </p>
            </div>
            
            <div className="flex gap-2">
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSchools.map((school) => (
              <Card key={school.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold truncate flex-1">{school.name}</h3>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        No Status
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{school.sms_regions?.name || 'Unknown Region'}</span>
                    </div>
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
