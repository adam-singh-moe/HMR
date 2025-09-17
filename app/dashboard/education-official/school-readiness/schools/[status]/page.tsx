"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSchoolsByReadinessStatus } from "@/app/actions/school-readiness-detailed"
import Link from "next/link"
import { ChevronLeft, Search, MapPin, Calendar, FileText } from "lucide-react"
import { format } from "date-fns"

interface SchoolWithReadiness {
  id: string
  name: string
  region: string
  readinessStatus: 'ready' | 'not-ready' | 'no-status'
  lastUpdated: string | null
  reason: string | null
}

export default function SchoolsByReadinessStatus() {
  const params = useParams()
  const status = params?.status as 'ready' | 'not-ready' | 'no-status'
  
  const [schools, setSchools] = useState<SchoolWithReadiness[]>([])
  const [filteredSchools, setFilteredSchools] = useState<SchoolWithReadiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ready':
        return {
          title: 'Schools Ready to Reopen',
          description: 'Schools that have completed their readiness assessment and are ready to reopen',
          color: 'bg-green-100 text-green-800',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'not-ready':
        return {
          title: 'Schools Not Ready to Reopen',
          description: 'Schools that have assessed their readiness but are not yet ready to reopen',
          color: 'bg-red-100 text-red-800',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'no-status':
        return {
          title: 'Schools Without Status Update',
          description: 'Schools that have not yet provided their readiness status',
          color: 'bg-gray-100 text-gray-800',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
      default:
        return {
          title: 'Schools',
          description: 'School readiness status',
          color: 'bg-gray-100 text-gray-800',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const statusInfo = getStatusInfo(status)

  useEffect(() => {
    async function fetchSchools() {
      if (!status) return
      
      try {
        setLoading(true)
        const result = await getSchoolsByReadinessStatus(status)
        
        if (result.error) {
          setError(result.error)
        } else {
          setSchools(result.schools)
          setFilteredSchools(result.schools)
        }
      } catch (err) {
        setError("Failed to load schools")
      } finally {
        setLoading(false)
      }
    }

    fetchSchools()
  }, [status])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSchools(schools)
    } else {
      const filtered = schools.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.region.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSchools(filtered)
    }
  }, [searchTerm, schools])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded mb-4"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/education-official/school-readiness">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{statusInfo.title}</h1>
          <p className="text-gray-600 mt-2">{statusInfo.description}</p>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search schools by name or region..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            {filteredSchools.length} schools found
          </Badge>
        </div>
      </div>

      {/* Schools List */}
      {filteredSchools.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              {searchTerm ? "No schools found matching your search." : "No schools found in this category."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSchools.map((school) => (
            <Card key={school.id} className={`${statusInfo.bgColor} ${statusInfo.borderColor}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{school.name}</h3>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{school.region}</span>
                          </div>
                          
                          {school.lastUpdated && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Updated {format(new Date(school.lastUpdated), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          
                          {school.reason && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>Has notes</span>
                            </div>
                          )}
                        </div>

                        {school.reason && (
                          <div className="mt-3 p-3 bg-white rounded-lg border">
                            <div className="text-sm font-medium text-gray-700 mb-1">Reason/Notes:</div>
                            <div className="text-sm text-gray-600">{school.reason}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={statusInfo.color}>
                      {status === 'ready' ? 'Ready to Reopen' : 
                       status === 'not-ready' ? 'Not Ready' : 
                       'No Status Update'}
                    </Badge>
                    
                    {/* Action button - could be used for viewing school details */}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/education-official/schools/${school.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="text-center text-sm text-gray-600">
            Showing {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'} 
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
