"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PencilIcon, Trash2Icon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MonthlyReportForm } from "./monthly-report-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { deleteReport } from "@/app/actions/reports"
import { useRouter } from "next/navigation"
import type { Report } from "@/types"

interface ReportListProps {
  reports: Report[]
  userRole: "head_teacher" | "regional_officer"
  onFilterChange?: (filters: { school?: string; teacherName?: string; region?: string }) => void
}

export function ReportList({ reports, userRole, onFilterChange }: ReportListProps) {
  const router = useRouter()
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [filters, setFilters] = useState({ school: "", teacherName: "", region: "" })

  const handleDelete = async (reportId: string) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      const result = await deleteReport(reportId)
      if (result.error) {
        alert(`Error deleting report: ${result.error}`)
      } else {
        router.refresh() // Revalidate data
      }
    }
  }

  const handleFilterChange = () => {
    onFilterChange?.(filters)
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    setEditingReport(null)
    router.refresh() // Revalidate data
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg lg:text-xl">Submitted Reports</CardTitle>
      </CardHeader>
      <CardContent className="p-4 lg:p-6">
        {userRole === "regional_officer" && onFilterChange && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-4 lg:mb-6">
            <Input
              placeholder="Filter by Teacher"
              value={filters.teacherName}
              onChange={(e) => setFilters({ ...filters, teacherName: e.target.value })}
              className="text-sm"
            />
            <Input
              placeholder="Filter by Region"
              value={filters.region}
              onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              className="text-sm"
            />
            <Button onClick={handleFilterChange} className="sm:col-span-2 w-full" size="sm">
              Apply Filters
            </Button>
          </div>
        )}

        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No reports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Title</TableHead>
                  <TableHead className="text-sm hidden sm:table-cell">Attendance</TableHead>
                  {userRole === "regional_officer" && (
                    <>
                      <TableHead className="text-sm">Teacher</TableHead>
                      <TableHead className="text-sm hidden lg:table-cell">Region</TableHead>
                    </>
                  )}
                  <TableHead className="text-sm hidden md:table-cell">Submitted On</TableHead>
                  <TableHead className="text-sm text-right w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-sm">{report.report_data?.title || "Untitled"}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          Attendance: {report.report_data?.attendance || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{report.report_data?.attendance || "N/A"}</TableCell>
                    {userRole === "regional_officer" && (
                      <>
                        <TableCell className="text-sm">
                          <div>
                            <div>{report.hmr_users?.name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              {report.hmr_users?.region || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{report.hmr_users?.region || "N/A"}</TableCell>
                      </>
                    )}
                    <TableCell className="hidden md:table-cell text-sm">{new Date(report.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" size="sm">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog
                            open={isEditDialogOpen && editingReport?.id === report.id}
                            onOpenChange={setIsEditDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setEditingReport(report)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <PencilIcon className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Edit Report</DialogTitle>
                              </DialogHeader>
                              {editingReport && (
                                <MonthlyReportForm report={editingReport} onSuccess={handleEditSuccess} />
                              )}
                            </DialogContent>
                          </Dialog>
                          <DropdownMenuItem onClick={() => handleDelete(report.id)}>
                            <Trash2Icon className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
