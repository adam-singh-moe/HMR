"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, School, Calendar, ChevronRight, ArrowLeft, Loader2 } from "lucide-react"
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
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Month Selection
          </Button>
          <div className="text-sm text-gray-600">
            Submitting report for <strong>{selectedSchool.name}</strong> - <strong>{selectedMonth.displayName}</strong>
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Admin Report Submission
          </CardTitle>
          <CardDescription>
            Submit monthly reports on behalf of schools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {currentStep === 1 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="school-search" className="text-base font-medium">
                    Step 1: Select School
                  </Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="school-search"
                      placeholder="Search schools by name or region..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loadingSchools ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-gray-600">Loading schools...</p>
                    </div>
                  ) : filteredSchools.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No schools found matching your search.
                    </div>
                  ) : (
                    filteredSchools.map((school) => (
                      <Card 
                        key={school.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                        onClick={() => handleSchoolSelect(school)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium text-gray-900">{school.name}</h3>
                              <p className="text-sm text-gray-600">Region: {school.region_name}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && selectedSchool && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Button 
                  variant="outline" 
                  onClick={handleBackToSchools}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Schools
                </Button>
                <div className="text-sm text-gray-600">
                  Selected: <strong>{selectedSchool.name}</strong>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Step 2: Select Missing Report Month
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a month that {selectedSchool.name} hasn't submitted a report for
                  </p>
                </div>

                {loading ? (
                  <div className="text-center py-8">Loading missing months...</div>
                ) : missingMonths.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">All reports are up to date!</p>
                    <p className="text-sm text-gray-600">This school has submitted all required monthly reports.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {missingMonths.map((month) => (
                      <Card 
                        key={`${month.year}-${month.month}`}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                        onClick={() => handleMonthSelect(month)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium text-gray-900">{month.displayName}</h3>
                              <p className="text-sm text-red-600">Report Missing</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
