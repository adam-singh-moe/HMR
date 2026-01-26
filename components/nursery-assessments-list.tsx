"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { EyeIcon, CalendarIcon, AcademicCapIcon } from "@heroicons/react/24/outline"
import { Eye, Calendar, GraduationCap, FileText, Loader2 } from "lucide-react"
import { getSubmittedNurseryAssessments } from "@/app/actions/nursery-assessment"
import { useAuth } from "@/components/auth-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Assessment {
  id: string
  created_at: string
  assessment_type: string
  enrollment: number
  status: string
  schools: {
    name: string
    region: string
  }
  users: {
    name: string
    email: string
  }
}

export function NurseryAssessmentsList() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>("all")
  
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      fetchAssessments()
    }
  }, [user])

  const fetchAssessments = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const result = await getSubmittedNurseryAssessments(user.id)
      
      if (result.error) {
        setError(result.error)
      } else {
        setAssessments(result.assessments)
        setFilteredAssessments(result.assessments)
      }
    } catch (err) {
      setError('Failed to load assessments')
      console.error('Error fetching assessments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter assessments when filter criteria change
  useEffect(() => {
    let filtered = assessments

    if (selectedYear !== "all") {
      filtered = filtered.filter(assessment => {
        const assessmentYear = new Date(assessment.created_at).getFullYear().toString()
        return assessmentYear === selectedYear
      })
    }

    if (selectedAssessmentType !== "all") {
      filtered = filtered.filter(assessment => assessment.assessment_type === selectedAssessmentType)
    }

    setFilteredAssessments(filtered)
  }, [assessments, selectedYear, selectedAssessmentType])

  const handleViewDetails = (assessmentId: string) => {
    // Navigate to detailed view page
    const backUrl = encodeURIComponent('/dashboard/head-teacher?tab=view-assessments&subtab=view-assessments&mainTab=nursery-assessment')
    window.location.href = `/dashboard/nursery-assessment/view/${assessmentId}?back=${backUrl}`
  }

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-blue-500 dark:text-blue-400 mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Loading Assessments</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
            Please wait while we fetch your assessments...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">Error Loading Assessments</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">{error}</p>
          <Button onClick={fetchAssessments} variant="outline" className="rounded-lg">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (assessments.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">No Assessments Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm max-w-md">
            You haven't submitted any nursery assessments yet. Use the "Submit Assessment" tab to create your first assessment.
          </p>
        </div>
      </div>
    )
  }

  // Get unique years and assessment types for filter options
  const availableYears = Array.from(new Set(
    assessments.map(assessment => 
      new Date(assessment.created_at).getFullYear().toString()
    )
  )).sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)

  const availableAssessmentTypes = Array.from(new Set(
    assessments.map(assessment => assessment.assessment_type)
  )).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Submitted Assessments
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse and review previously submitted nursery assessments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{filteredAssessments.length} Assessments</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-40">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
            <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableAssessmentTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(selectedYear !== "all" || selectedAssessmentType !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedYear("all")
              setSelectedAssessmentType("all")
            }}
            className="h-9 rounded-lg border-slate-200 dark:border-slate-700"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {filteredAssessments.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">No Assessments Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">No assessments match the selected filters.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedYear("all")
                setSelectedAssessmentType("all")
              }}
              className="rounded-lg"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAssessments.map((assessment) => (
            <div
              key={assessment.id}
              className="group relative bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
              onClick={() => handleViewDetails(assessment.id)}
            >
              {/* Left accent border */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />

              <div className="p-5 pl-6">
                {/* Header with icon and badge */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800/50">
                    <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {format(new Date(assessment.created_at), 'MMMM yyyy')}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Submitted
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {assessment.schools?.name || 'Unknown School'}
                    </p>
                  </div>
                </div>

                {/* Assessment Type Badge */}
                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{assessment.assessment_type}</span>
                </div>

                {/* Details */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(assessment.created_at), 'M/d/yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{assessment.enrollment}</span>
                      <span>Students</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
