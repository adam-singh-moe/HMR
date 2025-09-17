"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { getSchoolReadinessPercentage } from "@/app/actions/school-readiness-stats"
import Link from "next/link"

interface ReadinessData {
  totalSchools: number
  readySchools: number
  percentage: number
}

export function SchoolReadinessIndicator() {
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReadinessData() {
      try {
        const result = await getSchoolReadinessPercentage()
        if (result.success && result.data) {
          setReadinessData(result.data)
        } else {
          setError(result.error || "Failed to load readiness data")
        }
      } catch (err) {
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchReadinessData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg shadow">
          <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">School Readiness</span>
            <span className="text-sm font-semibold text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !readinessData) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg border border-red-200 shadow">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div className="flex flex-col">
            <span className="text-xs text-red-500">School Readiness</span>
            <span className="text-sm font-semibold text-red-700">Error loading data</span>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500 text-white hover:bg-green-600 border-green-500"
    if (percentage >= 60) return "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500" 
    return "bg-red-500 text-white hover:bg-red-600 border-red-500"
  }

  const getIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard/education-official/school-readiness">
        <Badge 
          className={`${getStatusColor(readinessData.percentage)} flex items-center gap-2 text-sm font-semibold px-4 py-2 cursor-pointer transition-all duration-200 shadow hover:shadow-lg border`}
          title={`${readinessData.readySchools} of ${readinessData.totalSchools} schools ready - Click to view details`}
        >
          {getIcon(readinessData.percentage)}
          <div className="flex flex-col items-start">
            <span className="text-xs opacity-90">School Readiness</span>
            <span className="text-sm font-bold">{readinessData.percentage.toFixed(1)}%</span>
          </div>
        </Badge>
      </Link>
    </div>
  )
}
