'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, School, CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { getRegionalSchoolReadinessData } from "@/app/actions/regional-officer-school-readiness"

interface SchoolReadinessData {
  schools: Array<{
    id: string
    name: string
    readiness_status: string | null
    readiness_reason: string | null
    readiness_checklist_items: any | null
    readiness_updated_at: string | null
    latest_report_date: string | null
  }>
  summary: {
    total_schools: number
    ready_schools: number
    not_ready_schools: number
    no_status_schools: number
    ready_percentage: number
    not_ready_percentage: number
    no_status_percentage: number
  }
}

export default function SchoolReadinessPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [data, setData] = useState<SchoolReadinessData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20) // 20 schools per page
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null) // Track which school is expanded

  useEffect(() => {
    loadSchoolReadinessData()
  }, [user])

  const loadSchoolReadinessData = async () => {
    if (!user?.region_name) return

    setError(null)
    
    try {
      const result = await getRegionalSchoolReadinessData(user.region_name)
      //console.log('School readiness data result:', result)
      
      if (result.success && result.data) {
        //console.log('School data:', result.data.schools)
        // Check for checklist items in the first school with readiness status
        const schoolWithReadiness = result.data.schools.find(s => s.readiness_status)
        if (schoolWithReadiness) {
          //console.log('First school with readiness:', schoolWithReadiness)
          //console.log('Checklist items:', schoolWithReadiness.readiness_checklist_items)
        }
        setData(result.data)
      } else {
        setError(result.error || "Failed to load school readiness data")
      }
    } catch (err) {
      console.error('Error loading school readiness data:', err)
      setError("An unexpected error occurred")
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        )
      case 'not_ready':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Not Ready
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Status
          </Badge>
        )
    }
  }

  const filteredSchools = data?.schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "ready" && school.readiness_status === "ready") ||
      (statusFilter === "not_ready" && school.readiness_status === "not_ready") ||
      (statusFilter === "no_status" && !school.readiness_status)
    
    return matchesSearch && matchesStatus
  }) || []

  // Pagination calculations
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSchools = filteredSchools.slice(startIndex, endIndex)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={loadSchoolReadinessData} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => router.back()} variant="default">
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <School className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">School Readiness Overview</h1>
              <p className="text-gray-600">Monitor the readiness status of schools in your region</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Schools</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.summary?.total_schools || 0}</p>
                </div>
                <School className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ready</p>
                  <p className="text-2xl font-bold text-green-600">{data?.summary?.ready_schools || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Not Ready</p>
                  <p className="text-2xl font-bold text-red-600">{data?.summary?.not_ready_schools || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">No Status</p>
                  <p className="text-2xl font-bold text-gray-600">{data?.summary?.no_status_schools || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>School List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="not_ready">Not Ready</SelectItem>
                  <SelectItem value="no_status">No Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schools List */}
            <div>
              {/* Pagination Info */}
              {filteredSchools.length > 0 && (
                <div className="text-sm text-gray-600 mb-4">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredSchools.length)} of {filteredSchools.length} schools
                </div>
              )}
              
              {filteredSchools.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {!data ? "Loading school readiness data..." : "No schools found matching your criteria."}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginatedSchools.map((school) => (
                  <div key={school.id} className="bg-white border border-gray-200 rounded-lg">
                    <div
                      onClick={() => setExpandedSchool(expandedSchool === school.id ? null : school.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{school.name}</h3>
                        {school.readiness_reason && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Reason:</strong> {school.readiness_reason}
                          </p>
                        )}
                        {school.readiness_updated_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last updated: {new Date(school.readiness_updated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {getStatusBadge(school.readiness_status)}
                        {/* Debug: Always show chevron for schools with readiness status */}
                        {school.readiness_status && (
                          expandedSchool === school.id ? 
                            <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Expandable Checklist Section */}
                    {expandedSchool === school.id && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-3">Readiness Details</h4>
                        <div className="space-y-2">
                          {school.readiness_checklist_items ? (
                            typeof school.readiness_checklist_items === 'object' && !Array.isArray(school.readiness_checklist_items) ? (
                              // Handle object format like {"yard_weeded": true, "water_supply": true, ...}
                              Object.entries(school.readiness_checklist_items).map(([key, value], index: number) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  {value ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  )}
                                  <span className={value ? "text-green-800" : "text-red-800"}>
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value ? 'Complete' : 'Incomplete'}
                                  </span>
                                </div>
                              ))
                            ) : Array.isArray(school.readiness_checklist_items) ? (
                              // Handle array format
                              school.readiness_checklist_items.map((item: any, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  {item.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  )}
                                  <span className={item.completed ? "text-green-800" : "text-red-800"}>
                                    {item.item || item.name || item.description || JSON.stringify(item)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-600">
                                <strong>Checklist data:</strong> {JSON.stringify(school.readiness_checklist_items, null, 2)}
                              </div>
                            )
                          ) : (
                            <div className="space-y-1">
                              <div className="text-sm text-gray-600">
                                <strong>Status:</strong> {school.readiness_status}
                              </div>
                              <div className="text-sm text-gray-600">
                                <strong>Reason:</strong> {school.readiness_reason}
                              </div>
                              <div className="text-sm text-gray-600">
                                <strong>Updated:</strong> {school.readiness_updated_at ? new Date(school.readiness_updated_at).toLocaleDateString() : 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500 mt-2">
                                No detailed checklist available for this assessment.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i))
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    }).filter((button, index, array) => 
                      array.findIndex(b => b.key === button.key) === index
                    )}
                  </div>

                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
