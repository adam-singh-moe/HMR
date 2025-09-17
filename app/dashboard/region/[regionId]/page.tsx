"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSchoolsByRegion, getRegionById } from "@/app/actions/regional-schools"
import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react"
import { format } from "date-fns"

interface School {
  id: string
  name: string
  region_id: string
  readiness_status?: 'ready' | 'not_ready' | null
  readiness_reason?: string
  readiness_updated_at?: string
  sms_regions?: {
    id: string
    name: string
  }
}

interface Region {
  id: string
  name: string
}

export default function RegionalSchoolsPage() {
  const params = useParams()
  const regionId = params.regionId as string
  
  const [schools, setSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [region, setRegion] = useState<Region | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Filter schools based on search term and status
  useEffect(() => {
    let filtered = schools

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(school => {
        if (statusFilter === "ready") return school.readiness_status === "ready"
        if (statusFilter === "not_ready") return school.readiness_status === "not_ready"
        if (statusFilter === "no_status") return !school.readiness_status
        return true
      })
    }

    setFilteredSchools(filtered)
  }, [searchTerm, statusFilter, schools])

  useEffect(() => {
    async function fetchData() {
      if (!regionId) return
      
      setLoading(true)
      try {
        // Note: We'll need to create these server actions
        const [schoolsResult, regionResult] = await Promise.all([
          getSchoolsByRegion(regionId),
          getRegionById(regionId)
        ])

        if (schoolsResult.error) {
          setError(schoolsResult.error)
        } else {
          setSchools(schoolsResult.schools || [])
          setFilteredSchools(schoolsResult.schools || [])
        }

        if (regionResult.error) {
          console.error("Failed to load region:", regionResult.error)
        } else if (regionResult.region) {
          setRegion(regionResult.region)
        }
      } catch (err) {
        setError("Failed to load regional data")
        console.error("Regional data fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [regionId])

  const getStatusInfo = (status: string | null | undefined) => {
    switch (status) {
      case 'ready':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Ready',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        }
      case 'not_ready':
        return {
          icon: <XCircle className="w-4 h-4" />,
          text: 'Not Ready',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        }
      default:
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          text: 'No Status',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        }
    }
  }

  const getStatusCounts = () => {
    const ready = schools.filter(s => s.readiness_status === 'ready').length
    const notReady = schools.filter(s => s.readiness_status === 'not_ready').length
    const noStatus = schools.filter(s => !s.readiness_status).length
    return { ready, notReady, noStatus }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
            <Link href="/dashboard/education-official">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" asChild>
          <Link href="/dashboard/education-official">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {region ? `${region.name} Schools` : 'Regional Schools'}
          </h1>
          <p className="text-gray-600">
            School readiness status for all schools in this region
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{schools.length}</div>
            <div className="text-sm text-gray-600">Total Schools</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{statusCounts.ready}</div>
            <div className="text-sm text-green-600">Ready Schools</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{statusCounts.notReady}</div>
            <div className="text-sm text-red-600">Not Ready</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{statusCounts.noStatus}</div>
            <div className="text-sm text-yellow-600">No Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search schools..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="whitespace-nowrap"
          >
            All ({schools.length})
          </Button>
          <Button
            variant={statusFilter === "ready" ? "default" : "outline"}
            onClick={() => setStatusFilter("ready")}
            className="whitespace-nowrap"
          >
            Ready ({statusCounts.ready})
          </Button>
          <Button
            variant={statusFilter === "not_ready" ? "default" : "outline"}
            onClick={() => setStatusFilter("not_ready")}
            className="whitespace-nowrap"
          >
            Not Ready ({statusCounts.notReady})
          </Button>
          <Button
            variant={statusFilter === "no_status" ? "default" : "outline"}
            onClick={() => setStatusFilter("no_status")}
            className="whitespace-nowrap"
          >
            No Status ({statusCounts.noStatus})
          </Button>
        </div>
      </div>

      {/* Schools List */}
      <div className="space-y-4">
        {filteredSchools.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {searchTerm || statusFilter !== "all" 
                ? "No schools match your current filters." 
                : "No schools found in this region."
              }
            </CardContent>
          </Card>
        ) : (
          filteredSchools.map((school) => {
            const statusInfo = getStatusInfo(school.readiness_status)
            
            return (
              <Card key={school.id} className={`border ${statusInfo.borderColor} hover:shadow-md transition-shadow`}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${statusInfo.bgColor} ${statusInfo.textColor} border-current flex items-center gap-1`}
                        >
                          {statusInfo.icon}
                          {statusInfo.text}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{region?.name || 'Region'}</span>
                        </div>
                        {school.readiness_updated_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Updated {format(new Date(school.readiness_updated_at), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      {school.readiness_reason && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          <strong>Reason:</strong> {school.readiness_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Results Summary */}
      {filteredSchools.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {filteredSchools.length} of {schools.length} schools
        </div>
      )}
    </div>
  )
}
