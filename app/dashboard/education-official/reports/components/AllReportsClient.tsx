"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { generateReportsPDF } from "@/app/actions/export-reports"
import { ClickableReportRow } from "@/components/clickable-report-row"

interface Report {
  id: any
  school_id: any
  month: any
  year: any
  status: any
  updated_at: any
  created_at: any
  headteacher_id: any
  sms_schools?: { 
    id: any
    name: any
    region_id: any
    sms_regions?: any
  } | null
  hmr_users?: {
    id: any
    name: any
    email: any
  } | null
}

interface AllReportsClientProps {
  initialReports: Report[]
  initialError?: string | null
}

export default function AllReportsClient({ initialReports, initialError }: AllReportsClientProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      
      const result = await generateReportsPDF()
      
      if (result.success && result.htmlContent) {
        // Create a new window/tab with the HTML content
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(result.htmlContent)
          printWindow.document.close()
          
          // Wait for content to load then trigger print
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print()
              printWindow.close()
            }, 500)
          }
        }
      } else {
        alert(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export reports. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (initialError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-600">
              <p>Error loading reports: {initialError}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card className="gradient-card border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl text-primary-700">All Reports</CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage all submitted reports across the system ({initialReports.length} reports)
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100 w-full sm:w-auto" 
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || initialReports.length === 0}
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
              ) : (
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {isExporting ? 'Generating...' : 'Export Reports'}
              </span>
              <span className="sm:hidden">
                {isExporting ? 'Generating...' : 'Export'}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {initialReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No submitted reports found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead className="hidden sm:table-cell">Head Teacher</TableHead>
                    <TableHead className="hidden lg:table-cell">Region</TableHead>
                    <TableHead>Month & Year</TableHead>
                    <TableHead className="hidden md:table-cell">Date Submitted</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialReports.map((report) => {
                    const reportLink = `/dashboard/reports/view/${report.sms_schools?.id || report.school_id}/${report.month}-${report.year}?back=${encodeURIComponent('/dashboard/education-official/reports')}`
                    
                    return (
                      <ClickableReportRow key={report.id} report={report}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm">{report.sms_schools?.name || "Unknown School"}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {report.hmr_users?.name || "Head Teacher"}
                            </div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {(() => {
                                const regions = report.sms_schools?.sms_regions as any
                                // Handle both single object and array cases
                                if (Array.isArray(regions)) {
                                  return regions[0]?.name || "Unknown Region"
                                } else {
                                  return regions?.name || "Unknown Region"
                                }
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              Submitted: {new Date(report.updated_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="lg:hidden mt-1">
                              <Badge variant="default" className="text-xs">
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{report.hmr_users?.name || "Head Teacher"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {(() => {
                            const regions = report.sms_schools?.sms_regions as any
                            // Handle both single object and array cases
                            if (Array.isArray(regions)) {
                              return regions[0]?.name || "Unknown Region"
                            } else {
                              return regions?.name || "Unknown Region"
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })} {report.year}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {new Date(report.updated_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="default" className="text-xs">
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="border-primary-200 text-primary-700 hover:bg-primary-50 bg-transparent">
                            <Link href={reportLink}>
                              <span className="hidden sm:inline">View Report</span>
                              <span className="sm:hidden">View</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </ClickableReportRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
