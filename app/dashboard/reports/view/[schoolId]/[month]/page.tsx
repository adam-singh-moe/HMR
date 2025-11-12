"use client"

import React, { useState, useEffect, JSX } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { SchoolSearch } from "@/components/school-search"
import { AuthWrapper } from "@/components/auth-wrapper"
import { 
  ArrowLeft, 
  Calendar, 
  School, 
  User, 
  FileText, 
  MapPin,
  Users,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Briefcase,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Shield,
  MessageSquare,
  Building,
  Wrench,
  Package,
  Activity,
  Loader2,
  Check,
  ChevronsUpDown,
  Menu,
  X,
  Printer
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { getReportBySchoolAndMonth, getReportSectionData, getAvailableMonthsForSchool, getStaffing } from "@/app/actions/hmr-reports"
import { getSchoolsWithSubmittedReports } from "@/app/actions/schools-with-reports"
import { generateIndividualReportPDF } from "@/app/actions/export-individual-report"

interface Report {
  id: string
  month: number
  year: number
  status: string
  updated_at: string
  created_at: string
  headteacher_id: string
  school_id: string
  sms_schools?: {
    id: string
    name: string
    region_id: string
    sms_regions: {
      id: string
      name: string
    } | {
      id: string
      name: string
    }[]
  } | null
  hmr_users?: {
    id: string
    name: string
    email: string
  } | null
}

const sectionNames = [
  "Basic Information",
  "Student Enrollment", 
  "Attendance",
  "Staffing and Vacancy",
  "Staff Development",
  "Supervision",
  "Curriculum Monitoring",
  "Finance",
  "Income Sources",
  "Accident and Safety",
  "Staff Meeting",
  "Physical Facilities",
  "Repairs Needed",
  "Resource Needed",
  "Physical Education"
]

const sectionIcons = [
  FileText,
  Users,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Briefcase,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Shield,
  MessageSquare,
  Building,
  Wrench,
  Package,
  Activity
]

const reportSections = sectionNames.map((name, index) => ({
  id: index,
  name,
  icon: sectionIcons[index]
}))

// Component to render section content based on data
function SectionContent({ 
  sectionIndex, 
  data, 
  isLoading, 
  error,
  selectedReport,
  selectedSchoolData 
}: { 
  sectionIndex: number
  data: any
  isLoading: boolean
  error: string | null
  selectedReport: Report
  selectedSchoolData: any
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin mr-2" aria-hidden="true" />
        <span className="text-muted-foreground">Loading section data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8" role="alert" aria-live="assertive">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  // Render different sections based on index
  switch (sectionIndex) {
    case 0: // Basic Information
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">School Name</label>
              <p className="text-lg font-semibold mt-2 leading-7">{selectedSchoolData?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Region</label>
              <p className="text-lg font-semibold mt-2 leading-7">{selectedSchoolData?.region || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Report Period</label>
              <p className="text-lg font-semibold mt-2 leading-7">
                {new Date(2024, selectedReport.month - 1).toLocaleString("default", { month: "long" })} {selectedReport.year}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Head Teacher</label>
              <p className="text-lg font-semibold mt-2 leading-7">{selectedReport.hmr_users?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Report Status</label>
              <p className="text-lg font-semibold mt-2 leading-7">
                {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Date Submitted</label>
              <p className="text-lg font-semibold mt-2 leading-7">
                {new Date(selectedReport.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )

    case 1: // Student Enrollment
      if (!data) {
        return (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No enrollment data available for this report</p>
          </div>
        )
      }

      if (Array.isArray(data)) {
        return (
          <div className="space-y-6">
            {data.map((record, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Total Students</label>
                  <p className="text-xl font-semibold mt-2 leading-7">{record.total_students || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Transferred In</label>
                  <p className="text-xl font-semibold text-emerald-600 mt-2 leading-7">{record.total_transferred_in || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Transferred Out</label>
                  <p className="text-xl font-semibold text-rose-600 mt-2 leading-7">{record.total_transferred_out || 0}</p>
                </div>
              </div>
            ))}
          </div>
        )
      } else {
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Total Students</label>
              <p className="text-xl font-semibold mt-2 leading-7">{data.total_students || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Transferred In</label>
              <p className="text-xl font-semibold text-emerald-600 mt-2 leading-7">{data.total_transferred_in || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Transferred Out</label>
              <p className="text-xl font-semibold text-rose-600 mt-2 leading-7">{data.total_transferred_out || 0}</p>
            </div>
          </div>
        )
      }

    case 2: // Attendance
      if (!data) {
        return (
          <div className="text-center py-8">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No attendance data available for this report</p>
          </div>
        )
      }

      if (Array.isArray(data)) {
        return (
          <div className="space-y-6">
            {data.map((attendance, index) => (
              <div key={index} className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Role</label>
                    <p className="text-lg font-semibold capitalize mt-2 leading-7">{attendance.role || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Attendance Rate</label>
                    <p className="text-xl font-semibold mt-2 leading-7">{attendance.attendance_rate || 0}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Punctuality Rate</label>
                    <p className="text-xl font-semibold mt-2 leading-7">{attendance.punctuality_rate || 0}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      } else {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Attendance Rate</label>
              <p className="text-xl font-semibold mt-2 leading-7">{data.attendance_rate || 0}%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Punctuality Rate</label>
              <p className="text-xl font-semibold mt-2 leading-7">{data.punctuality_rate || 0}%</p>
            </div>
          </div>
        )
      }

    case 3: // Staffing and Vacancy
      if (!data) {
        return (
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No staffing data available for this report</p>
          </div>
        )
      }

      const staffingData = data.staffing ? (Array.isArray(data.staffing) ? data.staffing[0] : data.staffing) : null
      const teacherStatusData = data.teacherStatusUpdates || {}

      return (
        <div className="space-y-8">
          {/* Staffing Information */}
          <div className="space-y-6">

            {staffingData ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Total Staff Entitlement</label>
                    <p className="text-xl font-semibold mt-2 leading-7">{staffingData.total_staff_entitlement || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Current Teachers</label>
                    <p className="text-xl font-semibold mt-2 leading-7">{staffingData.total_current_teachers || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Under Staffed By</label>
                    <p className="text-xl font-semibold text-red-600 mt-2 leading-7">{staffingData.under_staffed_by || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Over Staffed By</label>
                    <p className="text-xl font-semibold text-green-600 mt-2 leading-7">{staffingData.over_staffed_by || 0}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Secondment Attendance Certificate</label>
                  <p className="text-lg font-semibold mt-2 leading-7">{staffingData.secondment_attendance_cert ? "Yes" : "No"}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No staffing information available</p>
              </div>
            )}
          </div>

          {/* Teacher Status Updates */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold leading-7">Teacher Status Updates</h3>
            </div>

            {/* Teachers Who Left School */}
            {teacherStatusData.leftSchool && teacherStatusData.leftSchool.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-red-50/50 shadow-sm">
                <h4 className="text-lg font-semibold text-red-800 mb-4 leading-6">Teachers Who Left School</h4>
                <div className="space-y-3">
                  {teacherStatusData.leftSchool.map((teacher: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white/80 rounded-md border border-red-200">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Name</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Status</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Reason</label>
                        <p className="text-base mt-1 leading-6">{teacher.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers on Special Leave */}
            {teacherStatusData.specialLeave && teacherStatusData.specialLeave.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-orange-50/50 shadow-sm">
                <h4 className="text-lg font-semibold text-orange-800 mb-4 leading-6">Teachers on Special Leave</h4>
                <div className="space-y-3">
                  {teacherStatusData.specialLeave.map((teacher: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white/80 rounded-md border border-orange-200">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Name</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Status</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Offence</label>
                        <p className="text-base mt-1 leading-6">{teacher.offence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers Who Assumed Duty */}
            {teacherStatusData.assumedDuty && teacherStatusData.assumedDuty.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-green-50/50 shadow-sm">
                <h4 className="text-lg font-semibold text-green-800 mb-4 leading-6">Teachers Who Assumed Duty</h4>
                <div className="space-y-3">
                  {teacherStatusData.assumedDuty.map((teacher: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white/80 rounded-md border border-green-200">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Name</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Status</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers Not Reported */}
            {teacherStatusData.notReported && teacherStatusData.notReported.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-yellow-50/50 shadow-sm">
                <h4 className="text-lg font-semibold text-yellow-800 mb-4 leading-6">Teachers Not Reported</h4>
                <div className="space-y-3">
                  {teacherStatusData.notReported.map((teacher: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-3 bg-white/80 rounded-md border border-yellow-200">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Name</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Status</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Reason</label>
                        <p className="text-base mt-1 leading-6">{teacher.reason}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Days Absent</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.daysAbsent}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Action Taken</label>
                        <p className="text-base mt-1 leading-6">{teacher.actionTaken}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers Without Salary */}
            {teacherStatusData.didNotReceiveSalary && teacherStatusData.didNotReceiveSalary.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-purple-50/50 shadow-sm">
                <h4 className="text-lg font-semibold text-purple-800 mb-4 leading-6">Teachers Who Did Not Receive Salary</h4>
                <div className="space-y-3">
                  {teacherStatusData.didNotReceiveSalary.map((teacher: any, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white/80 rounded-md border border-purple-200">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Name</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Status</label>
                        <p className="text-base font-semibold mt-1 leading-6">{teacher.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground leading-5">Reason</label>
                        <p className="text-base mt-1 leading-6">{teacher.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No teacher status data message */}
            {(!teacherStatusData.leftSchool || teacherStatusData.leftSchool.length === 0) &&
             (!teacherStatusData.specialLeave || teacherStatusData.specialLeave.length === 0) &&
             (!teacherStatusData.assumedDuty || teacherStatusData.assumedDuty.length === 0) &&
             (!teacherStatusData.notReported || teacherStatusData.notReported.length === 0) &&
             (!teacherStatusData.didNotReceiveSalary || teacherStatusData.didNotReceiveSalary.length === 0) && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground leading-6">No teacher status updates recorded for this report</p>
              </div>
            )}
          </div>
        </div>
      )

    case 4: // Staff Development
      if (!data) {
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground leading-6">No staff development data available for this report</p>
          </div>
        )
      }

      const developmentData = Array.isArray(data) ? data[0] : data
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">PD Session Held</label>
              <p className="text-lg font-semibold mt-2 leading-7">
                {developmentData.PD_session_held === 'yes' || developmentData.PD_session_held === true ? "Yes" : 
                 developmentData.PD_session_held === 'no' || developmentData.PD_session_held === false ? "No" : "Not specified"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Attendance Percentage</label>
              <p className="text-xl font-semibold mt-2 leading-7">{developmentData.percentage_attended || 0}%</p>
            </div>
          </div>
          
          {developmentData.PD_topic && (
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">PD Topic</label>
              <div className="mt-2 p-4 bg-muted rounded-md">
                <p className="text-base leading-6">{developmentData.PD_topic}</p>
              </div>
            </div>
          )}

          {developmentData.Outcomes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Outcomes</label>
              <div className="mt-2 p-4 bg-muted/50 border border-border rounded-lg shadow-sm">
                <p className="text-base leading-6 whitespace-pre-wrap">{developmentData.Outcomes}</p>
              </div>
            </div>
          )}

          {developmentData.Reason && (
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Reason</label>
              <div className="mt-2 p-4 bg-muted/50 border border-border rounded-lg shadow-sm">
                <p className="text-base leading-6 whitespace-pre-wrap">{developmentData.Reason}</p>
              </div>
            </div>
          )}
        </div>
      )

    case 5: // Supervision
      if (!data) {
        return (
          <div className="text-center py-8">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No supervision data available for this report</p>
          </div>
        )
      }

      if (Array.isArray(data) && data.length > 0) {
        return (
          <div className="space-y-6">
            {data.map((supervision, index) => (
              <div key={index} className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold leading-7">{supervision.role || "Unknown Role"}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground leading-5">Lessons Observed</label>
                    <p className="text-xl font-semibold mt-2 leading-7">{supervision.lesson_observed || 0}</p>
                  </div>
                </div>
                
                {supervision.positive_findings && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground leading-5">Positive Findings</label>
                    <div className="mt-2 p-4 bg-green-50/80 border border-green-200 rounded-lg shadow-sm">
                      <p className="text-base leading-6 whitespace-pre-wrap">{supervision.positive_findings}</p>
                    </div>
                  </div>
                )}

                {supervision.negative_findings && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground leading-5">Negative Findings</label>
                    <div className="mt-2 p-4 bg-red-50/80 border border-red-200 rounded-lg shadow-sm">
                      <p className="text-base leading-6 whitespace-pre-wrap">{supervision.negative_findings}</p>
                    </div>
                  </div>
                )}

                {supervision.follow_up_actions && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground leading-5">Follow-up Actions</label>
                    <div className="mt-2 p-4 bg-blue-50/80 border border-blue-200 rounded-lg shadow-sm">
                      <p className="text-base leading-6 whitespace-pre-wrap">{supervision.follow_up_actions}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      } else {
        return (
          <div className="text-center py-8">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No supervision data recorded for this report</p>
          </div>
        )
      }

    case 6: // Curriculum Monitoring
      if (!data) {
        return (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No curriculum data available for this report</p>
          </div>
        )
      }

      const curriculumData = Array.isArray(data) ? data[0] : data
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Teachers Without Lesson Plans</label>
              <p className="text-xl font-semibold mt-2 leading-7">{curriculumData.teachers_no_lesson_plans || 0}</p>
            </div>
          </div>
          
          {curriculumData.actions_taken && (
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Actions Taken</label>
              <div className="mt-2 p-4 bg-muted/50 border border-border rounded-lg shadow-sm">
                <p className="text-base leading-6 whitespace-pre-wrap">{curriculumData.actions_taken}</p>
              </div>
            </div>
          )}
        </div>
      )

    case 7: // Finance
      if (!data) {
        return (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No finance data available for this report</p>
          </div>
        )
      }

      const financeData = Array.isArray(data) ? data[0] : data
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground leading-5">Opening Balance</label>
            <p className="text-xl font-semibold mt-2 leading-7">${financeData.opening_balance || "0.00"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground leading-5">Total Income</label>
            <p className="text-xl font-semibold text-emerald-600 mt-2 leading-7">${financeData.total_income || "0.00"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground leading-5">Total Expenditure</label>
            <p className="text-xl font-semibold text-rose-600 mt-2 leading-7">${financeData.total_expenditure || "0.00"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground leading-5">Closing Balance</label>
            <p className="text-xl font-semibold mt-2 leading-7">${financeData.closing_balance || "0.00"}</p>
          </div>
        </div>
      )

    case 8: // Income Sources
      if (!data) {
        return (
          <div className="text-center py-8">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No income data available for this report</p>
          </div>
        )
      }

      if (Array.isArray(data) && data.length > 0) {
        return (
          <div className="space-y-6">
           
            <div className="space-y-4">
              {data.map((income, index) => (
                <div key={index} className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground leading-5">Source</label>
                      <p className="text-lg font-semibold mt-1 leading-6">{income.source}</p>
                    </div>
                    <div className="text-right">
                      <label className="text-sm font-medium text-muted-foreground leading-5">Amount</label>
                      <p className="text-xl font-semibold text-emerald-600 mt-1 leading-7">${income.amount}</p>
                    </div>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold leading-7">Total Income</span>
                <span className="text-xl font-semibold text-emerald-600 leading-7">
                  ${data.reduce((sum, income) => sum + (parseFloat(income.amount) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )
      } else {
        return (
          <div className="text-center py-8">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No income sources recorded for this report</p>
          </div>
        )
      }

    case 9: // Accident and Safety
      if (!data) {
        return (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No accident and safety data available for this report</p>
          </div>
        )
      }

      const safetyData = Array.isArray(data) ? data[0] : data
      
      return (
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-sky-50 to-sky-100 shadow-sm">
              <h4 className="text-lg font-semibold text-sky-800 mb-3 leading-6">Evacuation Drill</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Drill Conducted</label>
                  <p className="text-lg font-semibold mt-2 leading-6">
                    {safetyData.evacuation_drill === 'yes' || safetyData.evacuation_drill === true ? "Yes" : "No"}
                  
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Persons Involved</label>
                  <p className="text-xl font-semibold mt-2 leading-7">{safetyData.persons_involved_drill || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Time Taken (minutes)</label>
                  <p className="text-xl font-semibold mt-2 leading-7">{safetyData.time_taken_drill || 0}</p>
                </div>
              </div>
              
              {safetyData.observations_drill && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground leading-5">Observations</label>
                  <div className="mt-2 p-4 bg-white/80 border border-sky-200 rounded-lg shadow-sm">
                    <p className="text-base leading-6 whitespace-pre-wrap">{safetyData.observations_drill}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-rose-50 to-rose-100 shadow-sm">
              <h4 className="text-lg font-semibold text-rose-800 mb-3 leading-6">Fire Safety Equipment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Classroom Fire Buckets</label>
                  <div className="mt-2">
                    <Badge variant={safetyData.classroom_firebuckets === 'yes' || safetyData.classroom_firebuckets === true ? "default" : "destructive"}>
                      {safetyData.classroom_firebuckets === 'yes' || safetyData.classroom_firebuckets === true ? "Available" : "Not Available"}
                      {/* Debug: {JSON.stringify(safetyData.classroom_firebuckets)} */}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Functional Fire Extinguishers</label>
                  <div className="mt-2">
                    <Badge variant={safetyData.functional_fire_extinguishers === 'yes' || safetyData.functional_fire_extinguishers === true ? "default" : "destructive"}>
                      {safetyData.functional_fire_extinguishers === 'yes' || safetyData.functional_fire_extinguishers === true ? "Functional" : "Not Functional"}
                      
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-amber-50 to-amber-100 shadow-sm">
              <h4 className="text-lg font-semibold text-amber-800 mb-3 leading-6">Accident Records</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Total Accidents</label>
                  <p className="text-xl font-semibold mt-2 leading-7">{safetyData.total_accidents || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Students Involved</label>
                  <p className="text-xl font-semibold mt-2 leading-7">{safetyData.total_students_involved || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground leading-5">Teachers Involved</label>
                  <p className="text-xl font-semibold mt-2 leading-7">{safetyData.total_teachers_involved || 0}</p>
                </div>
              </div>
              
              {safetyData.actions && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted-foreground leading-5">Actions Taken</label>
                  <div className="mt-2 p-4 bg-white/80 border border-amber-200 rounded-lg shadow-sm">
                    <p className="text-base leading-6 whitespace-pre-wrap">{safetyData.actions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )

    case 10: // Staff Meeting
      if (!data) {
        return (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No staff meeting data available for this report</p>
          </div>
        )
      }

      const meetingData = Array.isArray(data) ? data[0] : data
      
      return (
        <div className="space-y-6">

          <div className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">General Meeting Held</label>
                <p className="text-lg font-semibold mt-2 leading-7">{meetingData.general_meeting ? "Yes" : "No"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Implementation Percentage</label>
                <p className="text-xl font-semibold mt-2 leading-7">{meetingData.percentage_decisions_implemented || 0}%</p>
              </div>
            </div>

            {meetingData.key_issues && (
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground leading-5">Key Issues Discussed</label>
                <div className="mt-2 p-4 bg-white/80 border border-border rounded-lg shadow-sm">
                  <p className="text-base leading-6 whitespace-pre-wrap">{meetingData.key_issues}</p>
                </div>
              </div>
            )}

            {!meetingData.key_issues && meetingData.general_meeting === 'no' && (
              <div className="mt-4">
                <p className="text-base text-muted-foreground leading-6">No meeting held this month</p>
              </div>
            )}
          </div>
        </div>
      )

    case 11: // Physical Facilities
      
      // Handle both array and single object responses, or create empty array if no data
      const facilitiesData = data ? (Array.isArray(data) ? data : [data]) : []

      // Find existing facilities by role
      const teacherFacilities = facilitiesData.find(f => f.role === 'Teachers')
      const studentFacilities = facilitiesData.find(f => f.role === 'Students')

      return (
        <div className="space-y-6">
          <h4 className="text-lg font-semibold leading-6">Facilities Status</h4>

          {/* Teacher Facilities */}
          <div className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm">
            <h5 className="text-md font-semibold mb-3 leading-6">Teacher Facilities</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Functional Washrooms</label>
                <p className="text-xl font-semibold mt-2 leading-7">{teacherFacilities?.percentage_functional_washroom || 0}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Working Sinks</label>
                <p className="text-xl font-semibold mt-2 leading-7">{teacherFacilities?.percentage_working_sinks || 0}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Working Taps</label>
                <p className="text-xl font-semibold mt-2 leading-7">{teacherFacilities?.percentage_working_taps || 0}%</p>
              </div>
            </div>
          </div>

          {/* Student Facilities */}
          <div className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm">
            <h5 className="text-md font-semibold mb-3 leading-6">Student Facilities</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Functional Washrooms</label>
                <p className="text-xl font-semibold mt-2 leading-7">{studentFacilities?.percentage_functional_washroom || 0}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Working Sinks</label>
                <p className="text-xl font-semibold mt-2 leading-7">{studentFacilities?.percentage_working_sinks || 0}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Working Taps</label>
                <p className="text-xl font-semibold mt-2 leading-7">{studentFacilities?.percentage_working_taps || 0}%</p>
              </div>
            </div>
          </div>

          {/* Classroom Facilities - Always display, getting data from Student role */}
          <div className="border border-border rounded-lg p-4 bg-muted/50 shadow-sm">
            <h5 className="text-md font-semibold mb-3 leading-6">Classroom Facilities</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground leading-5">Overcrowded Classrooms</label>
                <p className="text-xl font-semibold mt-2 leading-7">{studentFacilities?.percentage_overcrowded_classroom || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Percentage of classrooms that are overcrowded</p>
              </div>
            </div>
          </div>

          {/* Remove the separate Classroom Facilities section since it's now part of Student Facilities */}
        </div>
      )

    case 12: // Repairs
      if (!data) {
        return (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No repairs data available for this report</p>
          </div>
        )
      }

      if (Array.isArray(data) && data.length > 0) {
        return (
          <div className="space-y-6">
            
            <div className="grid gap-4">
              {data.map((repair, index) => (
                <div key={index} className="border border-border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-orange-100 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-orange-800 mb-2 leading-6">{repair.repair_area}</h4>
                      <p className="text-base leading-6 text-gray-700 whitespace-pre-wrap">{repair.details}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-orange-200 rounded-full">
                        <Wrench className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      } else {
        return (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No repairs recorded for this report</p>
          </div>
        )
      }

    case 13: // Resource Needed
      if (!data) {
        return (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No resource requirements data available for this report</p>
          </div>
        )
      }

      const resourceData = Array.isArray(data) ? data[0] : data
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            {resourceData.curriculum_resources && (
              <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-sky-50 to-sky-100 shadow-sm">
                <h4 className="text-lg font-semibold text-sky-800 mb-2 leading-6">Curriculum Resources</h4>
                <p className="text-base leading-6 whitespace-pre-wrap">{resourceData.curriculum_resources}</p>
              </div>
            )}
            
            {resourceData.janitorial_supplies && (
              <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 shadow-sm">
                <h4 className="text-lg font-semibold text-emerald-800 mb-2 leading-6">Janitorial Supplies</h4>
                <p className="text-base leading-6 whitespace-pre-wrap">{resourceData.janitorial_supplies}</p>
              </div>
            )}
            
            {resourceData.issues && (
              <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-rose-50 to-rose-100 shadow-sm">
                <h4 className="text-lg font-semibold text-rose-800 mb-2 leading-6">Other Issues</h4>
                <p className="text-base leading-6 whitespace-pre-wrap">{resourceData.issues}</p>
              </div>
            )}
            
            {!resourceData.curriculum_resources && !resourceData.janitorial_supplies && !resourceData.issues && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground leading-6">No resource requirements recorded for this report</p>
              </div>
            )}
          </div>
        </div>
      )

    case 14: // Physical Education
      if (!data) {
        return (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground leading-6">No physical education section found for this report</p>
            <p className="text-sm text-muted-foreground/80 mt-2">This report may not include physical education data or it was not filled out during submission.</p>
          </div>
        )
      }

      const physicalEducationData = Array.isArray(data) ? data[0] : data
      return (
        <div className="space-y-6">
          {physicalEducationData.activities && (
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Physical Education Activities</label>
              <div className="mt-2 space-y-2">
                {physicalEducationData.activities.split(',').map((activity: string, index: number) => (
                  <div key={index} className="flex items-center p-3 bg-blue-50/80 border border-blue-200 rounded-lg shadow-sm">
                    <Activity className="h-4 w-4 text-blue-600 mr-3 flex-shrink-0" />
                    <span className="text-base leading-6">{activity.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {physicalEducationData.challenges && (
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Challenges Faced</label>
              <div className="mt-2 space-y-2">
                {physicalEducationData.challenges.split(',').map((challenge: string, index: number) => (
                  <div key={index} className="flex items-start p-3 bg-red-50/80 border border-red-200 rounded-lg shadow-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-base leading-6">{challenge.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!physicalEducationData.activities && !physicalEducationData.challenges && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground leading-6">No physical education information recorded for this report</p>
              <p className="text-sm text-muted-foreground/80 mt-2">The physical education section was included but no specific activities or challenges were documented.</p>
            </div>
          )}
        </div>
      )

    default:
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground leading-6">
            This section is not yet implemented.
          </p>
        </div>
      )
  }
}

interface PageProps {
  params: Promise<{ schoolId: string; month: string }>
}

export default function ViewFullReportPage({ params }: PageProps) {
  return (
    <AuthWrapper requiredRole={["Head Teacher", "Regional Officer", "Admin", "Education Official"]}>
      <ViewFullReportPageContent params={params} />
    </AuthWrapper>
  )
}

function ViewFullReportPageContent({ params }: PageProps): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [schoolId, setSchoolId] = useState<string>("")
  const [month, setMonth] = useState<string>("")
  const [backUrl, setBackUrl] = useState<string>("/dashboard")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [availableMonths, setAvailableMonths] = useState<Array<{
    month: number
    year: number
    monthParam: string
    displayName: string
    status: string
  }>>([])
  
  // Separate filters for year and month
  const [selectedFilterYear, setSelectedFilterYear] = useState<string>("all")
  
  const [activeSection, setActiveSection] = useState(0)
  const [sectionData, setSectionData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSectionLoading, setIsSectionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  // School search state
  const [schoolSearchValue, setSchoolSearchValue] = useState("")
  const [allSchools, setAllSchools] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hasReports, setHasReports] = useState(true)

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setSchoolId(resolvedParams.schoolId)
      setMonth(resolvedParams.month)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    // Get back URL from search params and decode it
    const back = searchParams.get('back')
    if (back) {
      try {
        const decodedBackUrl = decodeURIComponent(back)
        setBackUrl(decodedBackUrl)
      } catch (error) {
        console.error("Error decoding back URL:", error)
        setBackUrl(back) // fallback to original if decoding fails
      }
    }
  }, [searchParams])

  // Fetch section data when section or report changes
  useEffect(() => {
    if (selectedReport) {
      fetchSectionData()
    }
  }, [selectedReport, activeSection])

  const fetchSectionData = async () => {
    if (!selectedReport) return

    setIsLoading(true)
    setError(null)

    try {
      // For Basic Information section, no additional data needed
      if (activeSection === 0) {
        setSectionData(null)
        return
      }

      // Special handling for staffing section to include teacher status data
      if (activeSection === 3) {
        const result = await getStaffing(selectedReport.id)
        
        if (result.error) {
          setError(result.error)
          setSectionData(null)
        } else {
          setSectionData(result.data)
        }
        return
      }

      // Special handling for Physical Education section
      if (activeSection === 14) {
        const result = await getReportSectionData(selectedReport.id, "physical_education")
        
        if (result.error) {
          // Don't set error state for PE section - just return empty data
          // This allows the component to show "No physical education section found" message
         // console.log("Physical Education section not found for report:", selectedReport.id)
          setSectionData(null)
        } else {
          setSectionData(result.data)
        }
        return
      }

      // Map section indices to section types for the API
      const sectionTypeMap = [
        null, // Basic Information (index 0) - no API needed, uses report data
        "student_enrollment", // Student Enrollment
        "attendance", // Attendance  
        "staffing", // Staffing and Vacancy (handled above)
        "staff_development", // Staff Development
        "supervision", // Supervision
        "curriculum", // Curriculum Monitoring
        "finance", // Finance
        "income", // Income Sources
        "accident_safety", // Accident and Safety
        "staff_meetings", // Staff Meeting
        "facilities", // Physical Facilities
        "repairs", // Repairs
        "resources_needed", // Resource Needed
        "physical_education" // Physical Education
      ]

      const sectionType = sectionTypeMap[activeSection]
      
      if (!sectionType) {
        setSectionData(null)
        return
      }

      // Fetch actual section data from database
      const result = await getReportSectionData(selectedReport.id, sectionType)
      
      if (result.error) {
        // For missing section data, just log it and return empty data rather than showing error
        // This allows each section component to handle missing data gracefully
       // console.log(`Section '${sectionType}' not found for report:`, selectedReport.id, result.error)
        setSectionData(null)
      } else {
        setSectionData(result.data)
      }
    } catch (err) {
      console.error("Error fetching section data:", err)
      setError("Failed to load section data")
      setSectionData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSectionChange = (sectionId: number) => {
    setActiveSection(sectionId)
    setIsMobileSidebarOpen(false) // Close mobile sidebar when section changes
    // Smooth scroll to top when section changes
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  const handleBack = () => {
    router.push(backUrl)
  }

  const handleMonthChange = (newMonthParam: string) => {
    // Update the URL to the new month while preserving the back parameter
    const currentBackUrl = searchParams.get('back')
    const backParam = currentBackUrl ? `?back=${encodeURIComponent(currentBackUrl)}` : ''
    router.push(`/dashboard/reports/view/${schoolId}/${newMonthParam}${backParam}`)
  }

  // Create separate year filter data
  const availableFilterYears = Array.from(new Set(availableMonths.map(m => m.year))).sort((a, b) => b - a)

  // Filter available months based on selected year filter
  const filteredAvailableMonths = availableMonths.filter(m => {
    const yearMatch = selectedFilterYear === "all" || m.year.toString() === selectedFilterYear
    return yearMatch
  })

  // Handle filter changes
  const handleYearFilterChange = (year: string) => {
    setSelectedFilterYear(year)
  }

  // Get selected school data
  const selectedSchoolData = selectedReport?.sms_schools ? {
    name: selectedReport.sms_schools.name,
    region: (() => {
      const regions = selectedReport.sms_schools.sms_regions
      // Handle both single object and array cases
      if (Array.isArray(regions)) {
        return regions[0]?.name || "Unknown Region"
      } else {
        return regions?.name || "Unknown Region"
      }
    })()
  } : null

  // Load available months when schoolId changes
  useEffect(() => {
    if (schoolId) {
      loadAvailableMonths()
    }
  }, [schoolId])

  // Load real report data based on schoolId and month
  useEffect(() => {
    if (schoolId && month) {
      loadReportData()
    }
  }, [schoolId, month])

  // Initialize school search value when report is loaded
  useEffect(() => {
    if (selectedReport && selectedSchoolData) {
      setSchoolSearchValue(selectedReport.school_id)
    }
  }, [selectedReport, selectedSchoolData])

  // Handler for school search selection
  const handleSchoolSearchChange = (newSchoolId: string) => {
    if (newSchoolId && newSchoolId !== schoolId) {
      setSchoolSearchValue(newSchoolId)
      // Navigate to the latest report for the selected school
      // We'll use the current month as default, or first available month
      const currentBackUrl = searchParams.get('back')
      const backParam = currentBackUrl ? `?back=${encodeURIComponent(currentBackUrl)}` : ''
      
      // Navigate to the same month for the new school, fallback to current month format
      router.push(`/dashboard/reports/view/${newSchoolId}/${month}${backParam}`)
    }
  }

  const loadAvailableMonths = async () => {
    if (!schoolId) return

    try {
      const result = await getAvailableMonthsForSchool(schoolId)
      
      if (result.error) {
        console.error("Error loading available months:", result.error)
        setAvailableMonths([])
      } else {
        setAvailableMonths(result.months)
      }
    } catch (error) {
      console.error("Error loading available months:", error)
      setAvailableMonths([])
    }
  }

  const loadReportData = async () => {
    if (!schoolId || !month) return

    setIsLoading(true)
    setError(null)

    try {
      // Parse month parameter (format: "7-2025")
      const [monthNum, year] = month.split('-')
      
      // Fetch actual report data from database
      const result = await getReportBySchoolAndMonth(schoolId, parseInt(monthNum), parseInt(year))
      if (result.error) {
        console.error(`Error from getReportBySchoolAndMonth:`, result.error)
        setError(result.error)
        setSelectedReport(null)
        setReports([])
      } else if (result.report) {
        setSelectedReport(result.report)
        setReports([result.report])
      } else {
        setError("Report not found")
        setSelectedReport(null)
        setReports([])
      }
    } catch (error) {
      console.error("Error loading report data:", error)
      setError("Failed to load report data")
      setSelectedReport(null)
      setReports([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllSchools = async () => {
    try {
      // Get current user for UI display
      let user = null
      try {
        const response = await fetch('/api/user')
        if (response.ok) {
          user = await response.json()
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      }
      setCurrentUser(user)

      const result = await getSchoolsWithSubmittedReports()
      
      if (result.error) {
        console.error("Error loading schools:", result.error)
        setAllSchools([])
        setHasReports(result.hasReports)
        return
      }
      setAllSchools(result.schools)
      setHasReports(result.hasReports)
      
    } catch (error) {
      console.error("Error loading schools:", error)
      setAllSchools([])
      setHasReports(false)
    }
  }

  // Load schools on component mount
  useEffect(() => {
    loadAllSchools()
  }, [])

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when not focused on input elements
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setActiveSection(prev => Math.max(0, prev - 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setActiveSection(prev => Math.min(reportSections.length - 1, prev + 1))
          break
        case 'Home':
          e.preventDefault()
          setActiveSection(0)
          break
        case 'End':
          e.preventDefault()
          setActiveSection(reportSections.length - 1)
          break
        case 'Escape':
          e.preventDefault()
          if (isMobileSidebarOpen) {
            closeMobileSidebar()
          } else {
            handleBack()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack, isMobileSidebarOpen])

  const handleExportPDF = async () => {
    if (!selectedReport) return
    
    try {
      setIsExporting(true)
      
      // Get the report HTML content first
      const result = await generateIndividualReportPDF(schoolId, month)
      
      if (result.success && 'htmlContent' in result && result.htmlContent) {
        // Create a new window for print preview
        const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')
        
        if (printWindow) {
          // Write the HTML content to the new window
          printWindow.document.write((result as any).htmlContent)
          printWindow.document.close()
          
          // Wait for content to load, then trigger print preview
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print()
            }, 500)
          }
          
          // For browsers that don't support onload properly
          setTimeout(() => {
            if (printWindow.document.readyState === 'complete') {
              printWindow.print()
            }
          }, 1000)
        } else {
          alert('Unable to open print preview. Please check your browser\'s popup blocker settings.')
        }
      } else {
        alert(`Export failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to open print preview. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!selectedReport) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="flex-shrink-0 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 flex-shrink-0 min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Go back to previous page"
                tabIndex={0}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold truncate">
                  {selectedSchoolData?.name || 'School Report'}
                </CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                  {selectedSchoolData?.region} • {new Date(2024, selectedReport.month - 1).toLocaleString("default", { month: "long" })} {selectedReport.year}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Export report as PDF"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Printer className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {isExporting ? 'Opening Preview...' : 'Print Preview'}
                </span>
                <span className="sm:hidden">
                  {isExporting ? 'Opening...' : 'Print'}
                </span>
              </Button>
              
              {/* Year Filter and Report Selection */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Select 
                  value={selectedFilterYear}
                  onValueChange={handleYearFilterChange}
                  aria-label="Select year filter"
                >
                  <SelectTrigger className="w-full sm:w-24 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableFilterYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Report Selection Dropdown */}
                <Select 
                  value={`${selectedReport.month}-${selectedReport.year}`}
                  onValueChange={handleMonthChange}
                  aria-label="Select specific report to view"
                >
                  <SelectTrigger className="w-full sm:w-48 md:w-56 lg:w-64 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAvailableMonths.length > 0 ? (
                      filteredAvailableMonths.map((monthData) => (
                        <SelectItem key={monthData.monthParam} value={monthData.monthParam}>
                          {monthData.displayName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={`${selectedReport.month}-${selectedReport.year}`}>
                        {new Date(2024, selectedReport.month - 1).toLocaleString("default", { month: "long" })} {selectedReport.year}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>        <CardContent className="flex-1 flex overflow-hidden p-0 relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
          )}
          
          {/* Responsive Sidebar */}
          <div className={`
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 
            fixed md:static 
            inset-y-0 left-0 
            z-50 md:z-auto
            w-64 md:w-72 lg:w-80 
            flex-shrink-0 
            border-r 
            bg-background md:bg-gradient-to-b md:from-muted/30 md:to-muted/50 
            flex flex-col 
            overflow-hidden
            transition-transform duration-300 ease-in-out
            md:transition-none
          `}>
            <div className="p-3 md:p-3.5 lg:p-4 border-b bg-background flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-foreground">Report Sections</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">Navigate between sections</p>
                </div>
                {/* Close button for mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileSidebar}
                  className="md:hidden flex items-center justify-center min-h-[32px] min-w-[32px] p-1 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent bg-background md:bg-transparent" role="navigation" aria-label="Report sections navigation">
              <div className="space-y-1 p-3 md:p-3.5 lg:p-4">
                {reportSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "default" : "ghost"}
                      className={`w-full justify-start h-auto py-2.5 md:py-3 px-3 md:px-3.5 lg:px-4 text-sm md:text-sm lg:text-base transition-all duration-200 hover:scale-105 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        activeSection === section.id 
                          ? "hover:shadow-md" 
                          : "hover:bg-accent"
                      }`}
                      onClick={() => handleSectionChange(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSectionChange(section.id)
                        }
                      }}
                      disabled={isLoading}
                      aria-label={`Navigate to ${section.name} section`}
                      aria-current={activeSection === section.id ? "page" : undefined}
                      tabIndex={0}
                    >
                      <Icon className="h-4 w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5 mr-2.5 md:mr-3 flex-shrink-0" aria-hidden="true" />
                      <span className="text-left text-sm md:text-sm lg:text-base font-medium break-words hyphens-auto">{section.name}</span>
                      {activeSection === section.id && (
                        <div className="ml-auto w-2 h-2 bg-current rounded-full flex-shrink-0" aria-hidden="true"></div>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="p-3 lg:p-4 border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile menu button in content header for easier access */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileSidebar}
                  className="md:hidden flex items-center justify-center min-h-[36px] min-w-[36px] p-1 mr-1 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
                
                {(() => {
                  const section = reportSections.find(s => s.id === activeSection)
                  const Icon = section?.icon || FileText
                  return (
                    <>
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                      <h2 className="text-lg lg:text-xl font-semibold truncate min-w-0 flex-1">{section?.name}</h2>
                    </>
                  )
                })()}
                <Badge variant="outline" className="ml-auto flex-shrink-0" aria-label={`Report status: ${selectedReport.status}`}>
                  {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div ref={contentRef} className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory p-4 lg:p-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" role="main" aria-live="polite" aria-label="Report content area">
              <SectionContent
                sectionIndex={activeSection}
                data={sectionData}
                isLoading={isLoading}
                error={error}
                selectedReport={selectedReport}
                selectedSchoolData={selectedSchoolData}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
