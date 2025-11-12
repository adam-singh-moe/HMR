"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { CalendarIcon, Loader2, FileTextIcon, ClockIcon } from "lucide-react"
import { getMissingMonthsForSchool, getDraftReports } from "@/app/actions/hmr-reports"
import { MonthlyReportForm } from "@/components/monthly-report-form"

interface PreviousReportFormProps {
  onSuccess?: () => void
}

interface MissingMonth {
  month: number
  year: number
  displayName: string
}

interface DraftReport {
  id: string
  month: number
  year: number
  displayName: string
  lastModified: string
  created_at: string
  updated_at: string
}

export function PreviousReportForm({ onSuccess }: PreviousReportFormProps) {
  const [missingMonths, setMissingMonths] = useState<MissingMonth[]>([])
  const [draftReports, setDraftReports] = useState<DraftReport[]>([])
  const [loadingMissingMonths, setLoadingMissingMonths] = useState(false)
  const [loadingDraftReports, setLoadingDraftReports] = useState(false)
  const [selectedMissingMonth, setSelectedMissingMonth] = useState<MissingMonth | null>(null)
  const [selectedDraftReport, setSelectedDraftReport] = useState<DraftReport | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Load missing months and draft reports on component mount
  useEffect(() => {
    loadMissingMonths()
    loadDraftReports()
  }, [])

  const loadMissingMonths = async () => {
    setLoadingMissingMonths(true)
    try {
      const result = await getMissingMonthsForSchool()
      if (result.error) {
        console.error("Error loading missing months:", result.error)
        setMissingMonths([])
      } else {
        setMissingMonths(result.missingMonths)
      }
    } catch (error) {
      console.error("Error loading missing months:", error)
      setMissingMonths([])
    } finally {
      setLoadingMissingMonths(false)
    }
  }

  const loadDraftReports = async () => {
    setLoadingDraftReports(true)
    try {
      const result = await getDraftReports()
      if (result.error) {
        console.error("Error loading draft reports:", result.error)
        setDraftReports([])
      } else {
        setDraftReports(result.draftReports)
      }
    } catch (error) {
      console.error("Error loading draft reports:", error)
      setDraftReports([])
    } finally {
      setLoadingDraftReports(false)
    }
  }

  const handleMonthSelection = (value: string) => {
    const selected = missingMonths.find(m => m.displayName === value)
    setSelectedMissingMonth(selected || null)
  }

  const handleContinue = () => {
    if (selectedMissingMonth) {
      setShowForm(true)
    }
  }

  const handleContinueDraft = (draftReport: DraftReport) => {
    setSelectedDraftReport(draftReport)
    setShowForm(true)
  }

  const handleBackToSelection = () => {
    setShowForm(false)
    setSelectedMissingMonth(null)
    setSelectedDraftReport(null)
  }

  const handleFormSuccess = () => {
    // Reload missing months and draft reports after successful submission
    loadMissingMonths()
    loadDraftReports()
    setShowForm(false)
    setSelectedMissingMonth(null)
    setSelectedDraftReport(null)
    if (onSuccess) {
      onSuccess()
    }
  }

  if (showForm && (selectedMissingMonth || selectedDraftReport)) {
    const reportData = selectedMissingMonth 
      ? {
          month: selectedMissingMonth.month,
          year: selectedMissingMonth.year,
          displayName: selectedMissingMonth.displayName
        }
      : {
          month: selectedDraftReport!.month,
          year: selectedDraftReport!.year,
          displayName: selectedDraftReport!.displayName
        }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToSelection}
          >
            ← Back to Selection
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-primary-700">
              {selectedDraftReport ? 'Continue Draft Report' : 'Submit Report'} for {reportData.displayName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedDraftReport 
                ? 'Continue editing your draft report and submit when ready.'
                : 'Complete the form below to submit your report for this missing period.'
              }
            </p>
          </div>
        </div>

        <MonthlyReportForm 
          previousReportData={reportData}
          reportId={selectedDraftReport?.id}
          onSuccess={handleFormSuccess}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="gradient-header rounded-lg sm:rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-white/20 rounded-lg flex-shrink-0">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Submit Previous Report</h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Submit reports for months you may have missed or continue editing draft reports
            </p>
          </div>
        </div>
      </div>

      {/* Content with padding */}
      <div className="px-6 space-y-6">
        {/* Draft Reports Section */}
        {(loadingDraftReports || draftReports.length > 0) && (
        <Card className="gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-primary-700 flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              Draft Reports
            </CardTitle>
            <CardDescription>
              Continue editing and submit your incomplete reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingDraftReports ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                <span className="ml-2 text-primary-600 mt-3">Loading draft reports...</span>
              </div>
            ) : draftReports.length === 0 ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <FileTextIcon className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-gray-600">No draft reports found.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {draftReports.map((draftReport) => (
                  <div key={draftReport.id} className="bg-white border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{draftReport.displayName}</h4>
                        <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>Draft</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>Last modified:</span>
                        <span>{draftReport.lastModified}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleContinueDraft(draftReport)}
                      className="w-full"
                      variant="outline"
                    >
                      Continue Editing
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Reports Section */}
      <Card className="gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-primary-700">Missing Reports</CardTitle>
          <CardDescription>
            Select a month below to submit a report for a period you may have missed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingMissingMonths ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
              <span className="ml-2 text-primary-600 mt-3">Loading missing reports...</span>
            </div>
          ) : missingMonths.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">All Reports Submitted</h4>
              <p className="text-gray-600 max-w-md mx-auto">
                You have submitted reports for all previous months. There are no missing reports to complete.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="missing-month">Select Missing Month/Year *</Label>
                <Select
                  value={selectedMissingMonth?.displayName || ""}
                  onValueChange={handleMonthSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a month to submit report for" />
                  </SelectTrigger>
                  <SelectContent>
                    {missingMonths.map((month) => (
                      <SelectItem key={`${month.month}-${month.year}`} value={month.displayName}>
                        {month.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  {missingMonths.length} missing {missingMonths.length === 1 ? 'report' : 'reports'} found
                </p>
              </div>

              {selectedMissingMonth && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">Ready to Continue</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        You have selected <strong>{selectedMissingMonth.displayName}</strong>. 
                        Click "Continue" below to proceed with filling out this report.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={handleContinue}
                      className="w-full sm:w-auto"
                    >
                      Continue with {selectedMissingMonth.displayName} Report
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
