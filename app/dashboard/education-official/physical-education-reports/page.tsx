"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, Activity, Users, MapPin, Calendar, AlertCircle, Filter, FileText, Download, Search, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { getPhysicalEducationReports, getRegionsForFilter } from "@/app/actions/education-official-reports"
import { Pagination } from "@/components/pagination"


interface PhysicalEducationReport {
  id: string
  report_id: string
  month: number
  year: number
  region_id: string
  region_name: string
  school_id: string
  school_name: string
  total_students: number
  activities: string
  challenges: string
  created_at: string
}

interface Region {
  id: string
  name: string
}

export default function PhysicalEducationReportsPage() {
  const [reports, setReports] = useState<PhysicalEducationReport[]>([])
  const [filteredReports, setFilteredReports] = useState<PhysicalEducationReport[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10) // 10 reports per page

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [reportsResult, regionsResult] = await Promise.all([
          getPhysicalEducationReports(),
          getRegionsForFilter()
        ])
        
        if (reportsResult.error) {
          setError(reportsResult.error)
        } else {
          setReports(reportsResult.reports)
        }

        if (regionsResult.error) {
          console.error("Failed to load regions:", regionsResult.error)
        } else {
          setRegions(regionsResult.regions)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter reports when filters change
  useEffect(() => {
    let filtered = reports

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(report => report.month === parseInt(selectedMonth))
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(report => report.year === parseInt(selectedYear))
    }

    // Apply region filter
    if (selectedRegion !== "all") {
      filtered = filtered.filter(report => report.region_id === selectedRegion)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(report => 
        report.school_name.toLowerCase().includes(searchLower) ||
        report.region_name.toLowerCase().includes(searchLower) ||
        report.activities.toLowerCase().includes(searchLower) ||
        report.challenges.toLowerCase().includes(searchLower)
      )
    }

    setFilteredReports(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [reports, selectedMonth, selectedYear, selectedRegion, searchQuery])

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageReports = filteredReports.slice(startIndex, endIndex)

  // Pagination handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Get unique years from reports for year filter
  const availableYears = Array.from(new Set(reports.map(report => report.year))).sort((a, b) => b - a)

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedMonth("all")
    setSelectedYear("all")
    setSelectedRegion("all")
    setSearchQuery("")
  }

  // Check if any filters are active
  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all" || selectedRegion !== "all" || searchQuery.trim() !== ""

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true)

      // Dynamically import jsPDF (client-side only)
      const jsPDF = (await import('jspdf')).default

      if (filteredReports.length === 0) {
        toast({
          title: "No Data",
          description: "No physical education reports found for the selected period.",
          variant: "destructive"
        })
        return
      }

      // Create new PDF document
      const doc = new jsPDF()

      // Simple, clean document header
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(0, 0, 0)
      doc.text('Physical Education Reports', pageWidth / 2, 25, { align: 'center' })
      
      // Subtitle
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(60, 60, 60)
      doc.text('Ministry of Education - Republic of Guyana', pageWidth / 2, 35, { align: 'center' })
      
      // Simple line separator
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(20, 45, pageWidth - 20, 45)

      const filterText = `${selectedMonth !== "all" ? monthNames[parseInt(selectedMonth) - 1] : "All Months"} ${selectedYear !== "all" ? selectedYear : "All Years"}`
      
      // Report information
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      
      doc.text(`Report Period: ${filterText}`, 20, 55)
      doc.text(`Total Reports: ${filteredReports.length}`, 20, 62)
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 69)

      // Helper function to wrap text with better handling
      const wrapText = (text: string, maxWidth: number, fontSize: number = 9): string[] => {
        doc.setFontSize(fontSize)
        const words = text.split(' ')
        const lines: string[] = []
        let currentLine = ''

        words.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word
          const textWidth = doc.getTextWidth(testLine)
          
          if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        })

        if (currentLine) {
          lines.push(currentLine)
        }

        return lines.length > 0 ? lines : ['']
      }

      // Simple table headers
      const drawHeaders = (y: number) => {
        const headerHeight = 10
        
        // Header background
        doc.setFillColor(240, 240, 240)
        doc.rect(marginLeft, y, tableWidth, headerHeight, 'F')
        
        // Header border
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.rect(marginLeft, y, tableWidth, headerHeight)
        
        // Header text
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        
        // Column headers
        doc.text('School Name', marginLeft + 2, y + 7)
        doc.text('Region', marginLeft + colWidths.school + 2, y + 7)
        doc.text('Period', marginLeft + colWidths.school + colWidths.region + 2, y + 7)
        doc.text('Students', marginLeft + colWidths.school + colWidths.region + colWidths.period + 2, y + 7)
        doc.text('Activities', marginLeft + colWidths.school + colWidths.region + colWidths.period + colWidths.students + 2, y + 7)
        doc.text('Challenges', marginLeft + colWidths.school + colWidths.region + colWidths.period + colWidths.students + colWidths.activities + 2, y + 7)
        
        return y + headerHeight + 2
      }

      // Simple table layout
      let yPosition = 80
      const pageHeight = doc.internal.pageSize.getHeight()
      const lineHeight = 5
      const marginLeft = 20
      const tableWidth = 170
      const colWidths = {
        school: 35,
        region: 22,
        period: 20,
        students: 18,
        activities: 38,
        challenges: 37
      }
      
      // Draw professional table headers
      yPosition = drawHeaders(yPosition)

      // Table rows with enhanced formatting
      filteredReports.forEach((report, index) => {
        const activities = formatActivitiesText(report.activities)
        const challenges = formatChallengesText(report.challenges)
        
        // Wrap text for each column with appropriate font sizes
        doc.setFont('helvetica', 'normal')
        const schoolLines = wrapText(report.school_name, colWidths.school - 4, 9)
        const regionLines = wrapText(report.region_name, colWidths.region - 4, 9)
        const activitiesLines = wrapText(activities, colWidths.activities - 4, 8)
        const challengesLines = wrapText(challenges, colWidths.challenges - 4, 8)
        
        // Calculate row height with better spacing
        const maxLines = Math.max(
          schoolLines.length,
          regionLines.length,
          activitiesLines.length,
          challengesLines.length,
          1
        )
        
        const rowHeight = Math.max(maxLines * lineHeight + 8, 16) // Minimum row height
        
        // Check for new page
        if (yPosition + rowHeight > pageHeight - 40) {
          doc.addPage()
          yPosition = 30
          yPosition = drawHeaders(yPosition)
        }

        // Simple alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
        } else {
          doc.setFillColor(255, 255, 255)
        }
        doc.rect(marginLeft, yPosition, tableWidth, rowHeight, 'F')

        // Simple table borders
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.rect(marginLeft, yPosition, tableWidth, rowHeight)

        // Simple content layout
        const contentY = yPosition + 5
        
        // School name
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        schoolLines.forEach((line, lineIndex) => {
          doc.text(line, marginLeft + 2, contentY + (lineIndex * lineHeight))
        })

        // Region name
        regionLines.forEach((line, lineIndex) => {
          doc.text(line, marginLeft + colWidths.school + 2, contentY + (lineIndex * lineHeight))
        })

        // Period
        const periodText = `${getShortMonthName(report.month)} ${report.year}`
        doc.text(periodText, marginLeft + colWidths.school + colWidths.region + 2, contentY)

        // Students count
        doc.text(report.total_students.toString(), marginLeft + colWidths.school + colWidths.region + colWidths.period + 2, contentY)

        // Activities
        doc.setFontSize(8)
        const activitiesX = marginLeft + colWidths.school + colWidths.region + colWidths.period + colWidths.students
        activitiesLines.forEach((line, lineIndex) => {
          doc.text(line, activitiesX + 2, contentY + (lineIndex * lineHeight))
        })

        // Challenges
        const challengesX = marginLeft + colWidths.school + colWidths.region + colWidths.period + colWidths.students + colWidths.activities
        challengesLines.forEach((line, lineIndex) => {
          doc.text(line, challengesX + 2, contentY + (lineIndex * lineHeight))
        })

        yPosition += rowHeight
      })

      // Simple footer
      const totalPages = doc.internal.pages.length - 1
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum)
        const pageHeight = doc.internal.pageSize.getHeight()
        const pageWidth = doc.internal.pageSize.getWidth()
        
        // Footer line
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)
        
        // Footer content
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text('Ministry of Education - Republic of Guyana', pageWidth / 2, pageHeight - 12, { align: 'center' })
        doc.text('School Headteachers Monthly Reporting Portal', pageWidth / 2, pageHeight - 7, { align: 'center' })
        
        // Page number
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 20, pageHeight - 7, { align: 'right' })
      }

      // Generate filename
      let filename = 'Physical_Education_Reports'
      if (selectedMonth !== "all") {
        filename += `_${monthNames[parseInt(selectedMonth) - 1]}`
      }
      if (selectedYear !== "all") {
        filename += `_${selectedYear}`
      }
      filename += `_${new Date().toISOString().split('T')[0]}.pdf`

      // Save the PDF
      doc.save(filename)

      toast({
        title: "PDF Generated",
        description: `Physical Education report for ${filteredReports.length} schools has been downloaded successfully.`
      })

    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Loading physical education reports...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </CardContent>
      </Card>
    )
  }

  const formatActivitiesText = (activities: string): string => {
    if (!activities) return "No activities recorded"
    return activities.split(',').map(activity => activity.trim()).filter(Boolean).join(', ')
  }

  const formatChallengesText = (challenges: string): string => {
    if (!challenges) return "No challenges recorded"
    return challenges.split(',').map(challenge => challenge.trim()).filter(Boolean).join(', ')
  }

  const getMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return monthNames[month - 1] || "Unknown"
  }

  const getShortMonthName = (month: number) => {
    const shortMonthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    return shortMonthNames[month - 1] || "Unknown"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary-700 flex items-center gap-2">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
              Physical Education Reports
            </h1>
            <p className="text-muted-foreground">View physical education activities and challenges from all schools</p>
          </div>
        </div>

        {/* Filters and Generate Report Button */}
        <Card>
          <CardContent className="p-4">
            {/* All Controls in One Row */}
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
              {/* Filters Label and Icon */}
              <div className="flex items-center gap-2 lg:mb-6">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              {/* Search Input */}
              <div className="space-y-1 w-full lg:w-90">
                <label className="text-xs text-muted-foreground lg:hidden">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by school name, region, activities, or challenges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground lg:hidden">Region</label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground lg:hidden">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground lg:hidden">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="space-y-1">
                  <label className="text-xs text-transparent lg:hidden">Clear</label>
                  <Button 
                    variant="outline" 
                    onClick={clearAllFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Generate Report Button */}
              <div className="space-y-1 lg:ml-auto">
                <label className="text-xs text-transparent lg:hidden">Generate</label>
                <Button 
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Physical Education Reports</h3>
            <p className="text-muted-foreground text-center">
              {reports.length === 0 
                ? "No physical education reports have been submitted yet." 
                : "No reports found for the selected filters. Try adjusting your filter criteria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">School</TableHead>
                    <TableHead className="min-w-[100px]">Region</TableHead>
                    <TableHead className="min-w-[90px]">Period</TableHead>
                    <TableHead className="min-w-[80px]">Students</TableHead>
                    <TableHead className="min-w-[200px]">Activities Performed</TableHead>
                    <TableHead className="min-w-[200px]">Major Challenges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.school_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {report.region_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getShortMonthName(report.month)} {report.year}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {report.total_students}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-blue-900 bg-blue-50 p-2 rounded border">
                          {formatActivitiesText(report.activities)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-red-900 bg-red-50 p-2 rounded border">
                          {formatChallengesText(report.challenges)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {filteredReports.length > 0 && totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredReports.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}
