"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, School, Calendar, ChevronRight, ArrowLeft, Loader2, FileText, CheckCircle2, Inbox } from "lucide-react"
import { useRouter } from "next/navigation"
import { AdminReportForm } from '@/components/admin-report-form'
import { getSchoolsWithRegions, getMissingMonthsForSchool, getSchoolDetails } from '@/app/actions/admin'
import { useToast } from "@/components/ui/use-toast"

interface School {
  id: string
  name: string
  created_at: string
  region_name: string
}

interface MissingMonth {
  month: number
  year: number
  displayName: string
}

interface SchoolDetails {
  id: string
  name: string
  grade: string
  code: string
  educationDistrict: string
  schoolLevel: string
}

export function AdminSubmitReportClient() {
  const [currentStep, setCurrentStep] = useState(1) // 1: School Selection, 2: Month Selection, 3: Form
  const [schools, setSchools] = useState<School[]>([])
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetails | null>(null)
  const [missingMonths, setMissingMonths] = useState<MissingMonth[]>([])
  const [selectedMonth, setSelectedMonth] = useState<MissingMonth | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSchools, setLoadingSchools] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch real schools from the API
  useEffect(() => {
    const fetchSchools = async () => {
      setLoadingSchools(true)
      try {
        const result = await getSchoolsWithRegions()

        if (result.error) {
          toast({
            title: "Error loading schools",
            description: result.error,
            variant: "destructive",
          })
          return
        }

        setSchools(result.schools)
        setFilteredSchools(result.schools)
      } catch (error) {
        console.error('Error fetching schools:', error)
        toast({
          title: "Error loading schools",
          description: "Failed to fetch schools. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingSchools(false)
      }
    }

    fetchSchools()
  }, [])

  // Filter schools based on search
  useEffect(() => {
    const filtered = schools.filter(school =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.region_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredSchools(filtered)
  }, [searchTerm, schools])

  const handleSchoolSelect = async (school: School) => {
    setSelectedSchool(school)
    setLoading(true)

    try {
      // Fetch school details and missing months in parallel
      const [schoolDetailsResult, missingMonthsResult] = await Promise.all([
        getSchoolDetails(school.id),
        getMissingMonthsForSchool(school.id)
      ])

      // Check for school details error
      if (!schoolDetailsResult) {
        toast({
          title: "Error loading school details",
          description: "Failed to fetch school information. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Check for missing months error
      if (missingMonthsResult.error) {
        toast({
          title: "Error loading missing months",
          description: missingMonthsResult.error,
          variant: "destructive",
        })
        return
      }

      setSchoolDetails(schoolDetailsResult)
      setMissingMonths(missingMonthsResult.missingMonths)
      setCurrentStep(2)
    } catch (error) {
      console.error('Error fetching school data:', error)
      toast({
        title: "Error loading school data",
        description: "Failed to fetch school information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMonthSelect = (month: MissingMonth) => {
    setSelectedMonth(month)
    setCurrentStep(3)
  }

  const handleBackToSchools = () => {
    setCurrentStep(1)
    setSelectedSchool(null)
    setMissingMonths([])
  }

  const handleBackToMonths = () => {
    setCurrentStep(2)
    setSelectedMonth(null)
  }

  const handleFormSuccess = () => {
    // Reset the form and go back to school selection
    setCurrentStep(1)
    setSelectedSchool(null)
    setSelectedMonth(null)
    setMissingMonths([])
  }

  if (currentStep === 3 && selectedSchool && selectedMonth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBackToMonths}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Month Selection
          </Button>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Submitting report for <strong className="text-slate-900 dark:text-white">{selectedSchool.name}</strong> - <strong className="text-slate-900 dark:text-white">{selectedMonth.displayName}</strong>
          </div>
        </div>
        <AdminReportForm
          schoolId={selectedSchool.id}
          schoolName={selectedSchool.name}
          schoolDetails={schoolDetails}
          monthYear={selectedMonth.displayName}
          onSuccess={handleFormSuccess}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Report Submission</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Submit monthly reports on behalf of schools</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 py-2">
        <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep >= 1
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
          }`}>
            {currentStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
          </div>
          <span className="text-sm font-medium hidden sm:inline">Select School</span>
        </div>
        <div className={`flex-1 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
        <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep >= 2
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
          }`}>
            {currentStep > 2 ? <CheckCircle2 className="h-5 w-5" /> : '2'}
          </div>
          <span className="text-sm font-medium hidden sm:inline">Select Month</span>
        </div>
        <div className={`flex-1 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
        <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep >= 3
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
          }`}>
            3
          </div>
          <span className="text-sm font-medium hidden sm:inline">Submit Report</span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-xl bg-white dark:bg-[hsl(222,47%,9%)] border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
        {currentStep === 1 && (
          <div className="p-6 space-y-6">
            {/* Step Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                <School className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Step 1: Select School</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose a school to submit a report for</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="school-search"
                placeholder="Search schools by name or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Schools List */}
            <div className="max-h-[400px] overflow-y-auto pr-1">
              {loadingSchools ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                  <p>Loading schools...</p>
                </div>
              ) : filteredSchools.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <Inbox className="h-12 w-12 mb-3 opacity-50" />
                  <p>No schools found matching your search.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredSchools.map((school) => (
                    <button
                      key={school.id}
                      onClick={() => handleSchoolSelect(school)}
                      disabled={loading}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 hover:from-blue-50 hover:to-white dark:hover:from-blue-900/20 dark:hover:to-slate-800/40 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-200 text-left group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
                          <School className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{school.name}</h3>
                          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                            {school.region_name}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && selectedSchool && (
          <div className="p-6 space-y-6">
            {/* Back Button & Selected Info */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToSchools}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Selected: <strong>{selectedSchool.name}</strong>
                </span>
              </div>
            </div>

            {/* Step Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Step 2: Select Missing Report Month</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose a month that {selectedSchool.name} hasn't submitted a report for
                </p>
              </div>
            </div>

            {/* Months List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                <p>Loading missing months...</p>
              </div>
            ) : missingMonths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-500/20 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">All reports are up to date!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This school has submitted all required monthly reports.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {missingMonths.map((month) => (
                  <button
                    key={`${month.year}-${month.month}`}
                    onClick={() => handleMonthSelect(month)}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 hover:from-amber-50 hover:to-white dark:hover:from-amber-900/20 dark:hover:to-slate-800/40 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all duration-200 text-left group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 group-hover:bg-amber-200 dark:group-hover:bg-amber-500/30 transition-colors flex-shrink-0">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{month.displayName}</h3>
                        <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                          Missing
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
