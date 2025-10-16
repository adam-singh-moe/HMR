"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { getSubmittedReportsWithSearchAndPagination, getSchoolsForSearch, getRegionsForFilter, getSchoolLevelsForFilter } from "@/app/actions/education-official-reports"
import EnhancedAllReportsClient from "./EnhancedAllReportsClient"
import { AuthWrapper } from "@/components/auth-wrapper"

interface Report {
  id: any
  school_id: any
  month: any
  year: any
  status: any
  updated_at: any
  created_at: any
  headteacher_id: any
  school_name?: string
  region?: string
  head_teacher_name?: string
  sms_schools?: { 
    id: any
    name: any
    region_id: any
    sms_regions?: {
      id: any
      name: any
    } | {
      id: any
      name: any
    }[]
  } | null
  hmr_users?: {
    id: any
    name: any
    email: any
  } | null
}

interface School {
  id: string
  name: string
  region_id?: string
  region_name?: string
  sms_regions?: {
    id: string
    name: string
  } | {
    id: string
    name: string
  }[]
}

interface Region {
  id: string
  name: string
}

interface SchoolLevel {
  id: string
  name: string
}

export default function AllReportsPage() {
  return (
    <AuthWrapper requiredRole="Education Official">
      <AllReportsPageContent />
    </AuthWrapper>
  )
}

function AllReportsPageContent() {
  const [initialData, setInitialData] = useState<{
    reports: Report[]
    totalCount: number
    totalPages: number
    schools: School[]
    regions: Region[]
    schoolLevels: SchoolLevel[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchInitialData() {
      try {
        console.log("Starting to fetch initial data...")
        
        // Fetch each one individually to see which one fails
        console.log("Fetching reports...")
        const reportsResult = await getSubmittedReportsWithSearchAndPagination({
          page: 1,
          pageSize: 25,
          sortBy: "updated_at",
          sortOrder: "desc"
        })
        console.log("Reports result:", reportsResult)
        
        console.log("Fetching schools...")
        const schoolsResult = await getSchoolsForSearch()
        console.log("Schools result:", schoolsResult)
        
        console.log("Fetching regions...")
        const regionsResult = await getRegionsForFilter()
        console.log("Regions result:", regionsResult)
        
        console.log("Fetching school levels...")
        const schoolLevelsResult = await getSchoolLevelsForFilter()
        console.log("School levels result:", schoolLevelsResult)

        if (reportsResult.error) {
          console.error("Reports error:", reportsResult.error)
          setError(`Reports: ${reportsResult.error}`)
        } else if (schoolsResult.error) {
          console.error("Schools error:", schoolsResult.error)
          setError(`Schools: ${schoolsResult.error}`)
        } else if (regionsResult.error) {
          console.error("Regions error:", regionsResult.error)
          setError(`Regions: ${regionsResult.error}`)
        } else if (schoolLevelsResult.error) {
          console.error("School levels error:", schoolLevelsResult.error)
          setError(`School levels: ${schoolLevelsResult.error}`)
        } else {
          console.log("All data fetched successfully, setting initial data...")
          setInitialData({
            reports: (reportsResult.reports || []) as Report[],
            totalCount: reportsResult.totalCount || 0,
            totalPages: reportsResult.totalPages || 0,
            schools: schoolsResult.schools || [],
            regions: regionsResult.regions || [],
            schoolLevels: schoolLevelsResult.schoolLevels || []
          })
        }
      } catch (err) {
        console.error("Catch block error:", err)
        setError(`Failed to load reports: ${err}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-600">
              <p>Error loading reports: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-600">
              <p>No data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <EnhancedAllReportsClient
      initialReports={initialData.reports}
      initialTotalCount={initialData.totalCount}
      initialTotalPages={initialData.totalPages}
      initialSchools={initialData.schools}
      initialRegions={initialData.regions}
      initialSchoolLevels={initialData.schoolLevels}
    />
  )
}
