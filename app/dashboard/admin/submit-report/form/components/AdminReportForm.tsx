"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useState, useEffect, useCallback } from "react"
import { FileTextIcon, ChevronLeft, ChevronRight, Plus, Trash2, Eye, Loader2, Save, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Report } from "@/types"
import { supabase } from "@/lib/supabase-client"
import { useAutoSave } from "@/hooks/use-auto-save"
import { useReportProgress } from "@/hooks/use-report-progress"
import { useToast } from "@/components/ui/use-toast"
import { 
  createHmrReport, 
  saveStudentEnrollment, 
  saveAttendance, 
  saveStaffing
} from "@/app/actions/hmr-reports"

interface SchoolDetails {
  id: string
  name: string
  grade: string
  code: string
  educationDistrict: string
  schoolLevel: string
}

interface AdminReportFormProps {
  schoolId: string
  schoolName: string
  schoolDetails: SchoolDetails | null
  monthYear: string
  onSuccess?: () => void
}

interface FormData {
  // Report tracking
  reportId?: string
  
  // Basic Info
  month: string
  date: string
  educationDistrict: string
  schoolLevel: string
  
  schoolName: string
  schoolGrade: string

  // Section 1: Student Enrolment
  totalStudentsEnrolled: string
  studentsTransferredIn: string
  studentsTransferredOut: string

  // Section 2: Attendance
  studentAttendanceRate: string
  studentPunctualityRate: string
  teacherAttendanceRate: string
  teacherPunctualityRate: string

  // Section 3: Staffing
  totalStaffEntitlement: string
  currentTeachersOnStaff: string
  underStaffedBy: string
  overStaffedBy: string
  secondmentCertificatesPrepared: boolean | null
  teachersWhoLeft: Array<{ name: string; status: string; reason: string }>
  specialLeave: Array<{ name: string; status: string; offence: string }>
  teachersAssumedDuty: Array<{ name: string; status: string }>
  teachersNotReported: Array<{ name: string; status: string; reason: string; daysAbsent: string; actionTaken: string }>
  teachersWithoutSalary: Array<{ name: string; status: string; reason: string }>

  // Section 4: Staff Development
  wholeschoolPDHeld: boolean | null
  teachersAttendedPD: string
  pdTopic: string
  pdTopicReason: string
  pdOutcomes: string

  // Section 5: Supervision
  hmLessonsObserved: string
  hmPositiveFindings: string
  hmNegativeFindings: string
  hmFollowUpActions: string
  dhmLessonsObserved: string
  dhmPositiveFindings: string
  dhmNegativeFindings: string
  dhmFollowUpActions: string
  groupHeadLessonsObserved: string
  groupHeadPositiveFindings: string
  groupHeadNegativeFindings: string
  groupHeadFollowUpActions: string
  hodLessonsObserved: string
  hodPositiveFindings: string
  hodNegativeFindings: string
  hodFollowUpActions: string

  // Section 6: Curriculum
  teachersNoLessonPlans: string
  curriculumActionsTaken: string

  // Section 7: Finance
  openingBalance: string
  totalIncome: string
  totalExpenditure: string
  closingBalance: string

  // Section 8: Income Sources
  incomeSources: Array<{ source: string; amount: string }>

  // Section 9: Safety
  evacuationDrillHeld: boolean | null
  personsInvolved: string
  timeTaken: string
  drillObservations: string
  classroomsHaveFireBuckets: boolean | null
  fireExtinguishersFunctional: boolean | null
  numberOfIncidents: string
  studentsInvolved: string
  teachersInvolvedIncidents: string
  preventionActions: string

  // Section 10: Staff Meetings
  generalStaffMeetingHeld: boolean | null
  keyIssuesDiscussed: string
  decisionsImplemented: string

  // Section 11: Physical Facilities
  repairsNeeded: Array<{ area: string; details: string }>
  teacherToiletsFunctional: string
  teacherSinksFunctional: string
  teacherTapsFunctional: string
  studentToiletsFunctional: string
  studentTapsFunctional: string
  studentSinksFunctional: string
  overcrowdedClassrooms: string

  // Section 12: Resources
  curriculumResources: string
  janitorialSupplies: string
  otherIssues: string
}

const SECTIONS = [
  "Basic Information",
  "Student Enrolment",
  "Attendance",
  "Staffing & Vacancies",
  "Staff Development",
  "Supervision",
  "Curriculum Monitoring",
  "Finance",
  "Income Sources",
  "Accident & Safety",
  "Staff Meetings",
  "Physical Facilities",
  "Resources Needed",
]

export function AdminReportForm({ schoolId, schoolName, schoolDetails, monthYear, onSuccess }: AdminReportFormProps) {
  const [formData, setFormData] = useState<FormData>({
    month: monthYear,
    date: new Date().toLocaleDateString(),
    educationDistrict: "",
    schoolLevel: "",
    schoolName: schoolName,
    schoolGrade: "",
    totalStudentsEnrolled: "",
    studentsTransferredIn: "",
    studentsTransferredOut: "",
    studentAttendanceRate: "",
    studentPunctualityRate: "",
    teacherAttendanceRate: "",
    teacherPunctualityRate: "",
    totalStaffEntitlement: "",
    currentTeachersOnStaff: "",
    underStaffedBy: "",
    overStaffedBy: "",
    secondmentCertificatesPrepared: null,
    teachersWhoLeft: [{ name: "", status: "", reason: "" }],
    specialLeave: [{ name: "", status: "", offence: "" }],
    teachersAssumedDuty: [{ name: "", status: "" }],
    teachersNotReported: [{ name: "", status: "", reason: "", daysAbsent: "", actionTaken: "" }],
    teachersWithoutSalary: [{ name: "", status: "", reason: "" }],
    wholeschoolPDHeld: null,
    teachersAttendedPD: "",
    pdTopic: "",
    pdTopicReason: "",
    pdOutcomes: "",
    hmLessonsObserved: "",
    hmPositiveFindings: "",
    hmNegativeFindings: "",
    hmFollowUpActions: "",
    dhmLessonsObserved: "",
    dhmPositiveFindings: "",
    dhmNegativeFindings: "",
    dhmFollowUpActions: "",
    groupHeadLessonsObserved: "",
    groupHeadPositiveFindings: "",
    groupHeadNegativeFindings: "",
    groupHeadFollowUpActions: "",
    hodLessonsObserved: "",
    hodPositiveFindings: "",
    hodNegativeFindings: "",
    hodFollowUpActions: "",
    teachersNoLessonPlans: "",
    curriculumActionsTaken: "",
    openingBalance: "",
    totalIncome: "",
    totalExpenditure: "",
    closingBalance: "",
    incomeSources: [{ source: "", amount: "" }],
    evacuationDrillHeld: null,
    personsInvolved: "",
    timeTaken: "",
    drillObservations: "",
    classroomsHaveFireBuckets: null,
    fireExtinguishersFunctional: null,
    numberOfIncidents: "",
    studentsInvolved: "",
    teachersInvolvedIncidents: "",
    preventionActions: "",
    generalStaffMeetingHeld: null,
    keyIssuesDiscussed: "",
    decisionsImplemented: "",
    repairsNeeded: [{ area: "", details: "" }],
    teacherToiletsFunctional: "",
    teacherSinksFunctional: "",
    teacherTapsFunctional: "",
    studentToiletsFunctional: "",
    studentTapsFunctional: "",
    studentSinksFunctional: "",
    overcrowdedClassrooms: "",
    curriculumResources: "",
    janitorialSupplies: "",
    otherIssues: "",
  })

  const [currentSection, setCurrentSection] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teacherStatusOptions, setTeacherStatusOptions] = useState<string[]>([])
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savedSections, setSavedSections] = useState<Set<number>>(new Set())
  
  const router = useRouter()
  const { toast } = useToast()

  // Get teacher status options
  useEffect(() => {
    const fetchTeacherStatuses = async () => {
      try {
        const statuses = await getTeacherStatusOptions()
        setTeacherStatusOptions(statuses)
      } catch (error) {
        console.error('Error fetching teacher statuses:', error)
        // Fallback options
        setTeacherStatusOptions(['Active', 'On Leave', 'Transferred', 'Retired', 'Dismissed'])
      }
    }
    
    fetchTeacherStatuses()
  }, [])

  // Auto-fill school details when available
  useEffect(() => {
    if (schoolDetails) {
      setFormData(prev => ({
        ...prev,
        educationDistrict: schoolDetails.educationDistrict,
        schoolLevel: schoolDetails.schoolLevel,
        schoolGrade: schoolDetails.grade,
      }))
    }
  }, [schoolDetails])

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addArrayItem = <T extends Record<string, any>>(field: keyof FormData, newItem: T) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as unknown as T[]), newItem]
    }))
  }

  const removeArrayItem = (field: keyof FormData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index)
    }))
  }

  const updateArrayItem = <T extends Record<string, any>>(
    field: keyof FormData, 
    index: number, 
    itemField: keyof T, 
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as unknown as T[]).map((item, i) => 
        i === index ? { ...item, [itemField]: value } : item
      )
    }))
  }

  // Helper functions for array management
  const addToArray = (field: keyof FormData, newItem: any) => {
    addArrayItem(field, newItem)
  }

  const removeFromArray = (field: keyof FormData, index: number) => {
    removeArrayItem(field, index)
  }

  const handleSubmit = async () => {
    if (currentSection === 0) {
      // Validate required fields
      if (!formData.schoolLevel || !formData.schoolGrade) {
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields (School Level and School Grade)",
          variant: "destructive",
        })
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("schoolName", formData.schoolName)
      formDataToSubmit.append("educationDistrict", formData.educationDistrict)
      formDataToSubmit.append("schoolLevel", formData.schoolLevel)
      formDataToSubmit.append("schoolGrade", formData.schoolGrade)
      
      // Parse month and year from monthYear (e.g., "June 2025")
      const [monthName, yearStr] = monthYear.split(' ')
      const monthMap: Record<string, number> = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
      }
      const month = monthMap[monthName]
      const year = parseInt(yearStr)
      
      formDataToSubmit.append("month", month.toString())
      formDataToSubmit.append("year", year.toString())

      const result = await createHmrReport(formDataToSubmit)

      if (result.error) {
        toast({
          title: "Error creating report",
          description: result.error,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (result.success && result.reportId) {
        setFormData((prev) => ({ ...prev, reportId: result.reportId }))
        setSavedSections((prev) => new Set(prev).add(0))
        toast({
          title: "Basic Information saved",
          description: "Moving to next section...",
        })
        nextSection()
      } else {
        toast({
          title: "Error",
          description: "Failed to create report - no report ID returned",
          variant: "destructive",
        })
      }

      setIsSubmitting(false)
    } else if (currentSection === 1) {
      // Save student enrollment data
      if (!formData.reportId) {
        toast({
          title: "Error",
          description: "Please complete the Basic Information section first.",
          variant: "destructive",
        })
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", formData.reportId)
      formDataToSubmit.append("totalStudents", formData.totalStudentsEnrolled || "0")
      formDataToSubmit.append("totalTransferredIn", formData.studentsTransferredIn || "0")
      formDataToSubmit.append("totalTransferredOut", formData.studentsTransferredOut || "0")

      const result = await saveStudentEnrollment(formDataToSubmit)

      if (result.error) {
        toast({
          title: "Error saving student enrollment",
          description: result.error,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        setSavedSections((prev) => new Set(prev).add(1))
        toast({
          title: "Student Enrollment saved",
          description: "Moving to next section...",
        })
        nextSection()
      }

      setIsSubmitting(false)
    } else if (currentSection === 2) {
      // Save attendance data
      if (!formData.reportId) {
        toast({
          title: "Error",
          description: "Please complete the Basic Information section first.",
          variant: "destructive",
        })
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", formData.reportId)
      formDataToSubmit.append("studentAttendanceRate", formData.studentAttendanceRate || "0")
      formDataToSubmit.append("studentPunctualityRate", formData.studentPunctualityRate || "0")
      formDataToSubmit.append("teacherAttendanceRate", formData.teacherAttendanceRate || "0")
      formDataToSubmit.append("teacherPunctualityRate", formData.teacherPunctualityRate || "0")

      const result = await saveAttendance(formDataToSubmit)

      if (result.error) {
        toast({
          title: "Error saving attendance",
          description: result.error,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        setSavedSections((prev) => new Set(prev).add(2))
        toast({
          title: "Attendance saved",
          description: "Moving to next section...",
        })
        nextSection()
      }

      setIsSubmitting(false)
    } else if (currentSection === 3) {
      // Save staffing data
      if (!formData.reportId) {
        toast({
          title: "Error",
          description: "Please complete the Basic Information section first.",
          variant: "destructive",
        })
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", formData.reportId)
      formDataToSubmit.append("totalStaffEntitlement", formData.totalStaffEntitlement || "0")
      formDataToSubmit.append("currentTeachersOnStaff", formData.currentTeachersOnStaff || "0")
      formDataToSubmit.append("underStaffedBy", formData.underStaffedBy || "0")
      formDataToSubmit.append("overStaffedBy", formData.overStaffedBy || "0")
      formDataToSubmit.append("secondmentCertificatesPrepared", formData.secondmentCertificatesPrepared ? "true" : "false")

      const result = await saveStaffing(formDataToSubmit)

      if (result.error) {
        toast({
          title: "Error saving staffing",
          description: result.error,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        setSavedSections((prev) => new Set(prev).add(3))
        toast({
          title: "Staffing saved",
          description: "Moving to next section...",
        })
        nextSection()
      }

      setIsSubmitting(false)
    } else {
      // For now, just move to next section for other sections
      nextSection()
    }
  }

  const nextSection = () => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const previousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const renderSectionContent = () => {
    switch (currentSection) {
      case 0: // Basic Information
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month">Report Month</Label>
                <Input 
                  id="month" 
                  value={formData.month}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="date">Report Date</Label>
                <Input 
                  id="date" 
                  value={formData.date}
                  onChange={(e) => updateFormData('date', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input 
                  id="schoolName" 
                  value={formData.schoolName}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="schoolGrade">School Grade</Label>
                <Select value={formData.schoolGrade} onValueChange={(value) => updateFormData('schoolGrade', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select school grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                    <SelectItem value="E">Grade E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="educationDistrict">Education District</Label>
                <Input 
                  id="educationDistrict" 
                  value={formData.educationDistrict}
                  onChange={(e) => updateFormData('educationDistrict', e.target.value)}
                  placeholder="Enter education district"
                />
              </div>
              <div>
                <Label htmlFor="schoolLevel">School Level</Label>
                <Input 
                  id="schoolLevel" 
                  value={formData.schoolLevel}
                  onChange={(e) => updateFormData('schoolLevel', e.target.value)}
                  placeholder="Enter school level"
                />
              </div>
            </div>
          </div>
        )
      
      case 1: // Student Enrollment
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700 flex items-center gap-2">
              Section 1: Student Enrolment
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Total number of students enrolled this month
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.totalStudentsEnrolled}
                  onChange={(e) => updateFormData("totalStudentsEnrolled", e.target.value)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Total number of Students transferred in
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.studentsTransferredIn}
                  onChange={(e) => updateFormData("studentsTransferredIn", e.target.value)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Total number of Students transferred out
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.studentsTransferredOut}
                  onChange={(e) => updateFormData("studentsTransferredOut", e.target.value)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-primary-600 mb-2">Summary</h4>
              <div className="text-sm text-gray-700">
                <p><strong>Total Enrolled:</strong> {formData.totalStudentsEnrolled || 0}</p>
                <p><strong>Net Transfer:</strong> {(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0))}</p>
              </div>
            </div>
          </div>
        )

      case 2: // Attendance
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 2: Attendance</h3>

            <div className="space-y-4">
              <h4 className="font-medium text-primary-600">Students</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    What percentage of students were present this month?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.studentAttendanceRate}
                    onChange={(e) => updateFormData("studentAttendanceRate", e.target.value)}
                    placeholder="85"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    What percentage arrived on time?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.studentPunctualityRate}
                    onChange={(e) => updateFormData("studentPunctualityRate", e.target.value)}
                    placeholder="90"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-primary-600">Teachers</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    What percentage of teachers were present this month?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.teacherAttendanceRate}
                    onChange={(e) => updateFormData("teacherAttendanceRate", e.target.value)}
                    placeholder="95"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    What percentage arrived on time?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.teacherPunctualityRate}
                    onChange={(e) => updateFormData("teacherPunctualityRate", e.target.value)}
                    placeholder="98"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-primary-600 mb-2">Summary</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Student Attendance:</strong> {formData.studentAttendanceRate || 0}% | <strong>Punctuality:</strong> {formData.studentPunctualityRate || 0}%</p>
                <p><strong>Teacher Attendance:</strong> {formData.teacherAttendanceRate || 0}% | <strong>Punctuality:</strong> {formData.teacherPunctualityRate || 0}%</p>
              </div>
            </div>
          </div>
        )

      case 3: // Staffing & Vacancies
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 3: Staffing and Vacancies</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Total number of staff entitlement
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.totalStaffEntitlement}
                  onChange={(e) => updateFormData("totalStaffEntitlement", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Current Number of Teachers
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.currentTeachersOnStaff}
                  onChange={(e) => updateFormData("currentTeachersOnStaff", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Under-staffed by (Number of Teachers)
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.underStaffedBy}
                  onChange={(e) => updateFormData("underStaffedBy", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  Over-staffed by (Number of Teachers)
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.overStaffedBy}
                  onChange={(e) => updateFormData("overStaffedBy", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-primary-700 font-medium">
                Were secondment attendance certificates prepared? *
              </Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="secondment-yes"
                    checked={formData.secondmentCertificatesPrepared === true}
                    onChange={(e) => {
                      updateFormData("secondmentCertificatesPrepared", e.target.checked ? true : null)
                    }}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <Label htmlFor="secondment-yes" className="text-sm font-normal cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="secondment-no"
                    checked={formData.secondmentCertificatesPrepared === false}
                    onChange={(e) => {
                      updateFormData("secondmentCertificatesPrepared", e.target.checked ? false : null)
                    }}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <Label htmlFor="secondment-no" className="text-sm font-normal cursor-pointer">
                    No
                  </Label>
                </div>
              </div>
            </div>

            {/* Teachers who left the school */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary-700 border-b border-primary-200 pb-2 mb-4">
                  Teacher Status Reports
                </h3>
                <p className="text-sm text-gray-600">
                  Please report any changes in teacher status for the current month
                </p>
              </div>

              {/* Teachers who left the school */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary-600 flex items-center">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Teachers who left the school
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray("teachersWhoLeft", { name: "", status: "", reason: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
                {formData.teachersWhoLeft.map((teacher, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Name"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...formData.teachersWhoLeft]
                      updated[index].name = e.target.value
                      updateFormData("teachersWhoLeft", updated)
                    }}
                  />
                  <Select
                    value={teacher.status}
                    onValueChange={(value) => {
                      const updated = [...formData.teachersWhoLeft]
                      updated[index].status = value
                      updateFormData("teachersWhoLeft", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={teacher.reason}
                    onValueChange={(value) => {
                      const updated = [...formData.teachersWhoLeft]
                      updated[index].reason = value
                      updateFormData("teachersWhoLeft", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="resignation">Resignation</SelectItem>
                      <SelectItem value="dismissal">Dismissal</SelectItem>
                      <SelectItem value="death">Death</SelectItem>
                      <SelectItem value="secondment">Secondment</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeFromArray("teachersWhoLeft", index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              </div>

              {/* Special Leave (Disciplinary) – With Pay */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary-600 flex items-center">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    Teachers on Special Leave (Disciplinary) With Pay
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray("specialLeave", { name: "", status: "", offence: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
              {formData.specialLeave.map((teacher, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Name"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...formData.specialLeave]
                      updated[index].name = e.target.value
                      updateFormData("specialLeave", updated)
                    }}
                  />
                  <Select
                    value={teacher.status}
                    onValueChange={(value) => {
                      const updated = [...formData.specialLeave]
                      updated[index].status = value
                      updateFormData("specialLeave", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Offence"
                    value={teacher.offence}
                    onChange={(e) => {
                      const updated = [...formData.specialLeave]
                      updated[index].offence = e.target.value
                      updateFormData("specialLeave", updated)
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeFromArray("specialLeave", index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>                ))}
              </div>

              {/* Teachers Assumed Duty */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary-600 flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Teachers who Assumed Duty
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray("teachersAssumedDuty", { name: "", status: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
              {formData.teachersAssumedDuty.map((teacher, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                  <Input
                    placeholder="Name"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...formData.teachersAssumedDuty]
                      updated[index].name = e.target.value
                      updateFormData("teachersAssumedDuty", updated)
                    }}
                  />
                  <Select
                    value={teacher.status}
                    onValueChange={(value) => {
                      const updated = [...formData.teachersAssumedDuty]
                      updated[index].status = value
                      updateFormData("teachersAssumedDuty", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromArray("teachersAssumedDuty", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>                ))}
              </div>

              {/* Teachers Not Reported for Duty */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary-600 flex items-center">
                    <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                    Teachers Not Reported for Duty
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addToArray("teachersNotReported", { name: "", status: "", reason: "", daysAbsent: "", actionTaken: "" })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
              {formData.teachersNotReported.map((teacher, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                  <Input
                    placeholder="Name"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...formData.teachersNotReported]
                      updated[index].name = e.target.value
                      updateFormData("teachersNotReported", updated)
                    }}
                  />
                  <Select
                    value={teacher.status}
                    onValueChange={(value) => {
                      const updated = [...formData.teachersNotReported]
                      updated[index].status = value
                      updateFormData("teachersNotReported", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={teacher.reason}
                    onValueChange={(value) => {
                      const updated = [...formData.teachersNotReported]
                      updated[index].reason = value
                      updateFormData("teachersNotReported", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ncr">NCR</SelectItem>
                      <SelectItem value="maternity-leave">Maternity Leave</SelectItem>
                      <SelectItem value="medical-leave">Medical Leave</SelectItem>
                      <SelectItem value="study-leave">Study Leave</SelectItem>
                      <SelectItem value="personal-leave">Personal Leave</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Days Absent"
                    type="number"
                    value={teacher.daysAbsent}
                    onChange={(e) => {
                      const updated = [...formData.teachersNotReported]
                      updated[index].daysAbsent = e.target.value
                      updateFormData("teachersNotReported", updated)
                    }}
                  />
                  <Textarea
                    placeholder="Action Taken"
                    value={teacher.actionTaken}
                    onChange={(e) => {
                      const updated = [...formData.teachersNotReported]
                      updated[index].actionTaken = e.target.value
                      updateFormData("teachersNotReported", updated)
                    }}
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromArray("teachersNotReported", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>                ))}
              </div>

              {/* Teachers Without Salary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary-600 flex items-center">
                    <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Teachers who did not receieve salary for current month
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray("teachersWithoutSalary", { name: "", status: "", reason: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
              {formData.teachersWithoutSalary.map((teacher, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg">
                  <Input
                    placeholder="Name"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...formData.teachersWithoutSalary]
                      updated[index].name = e.target.value
                      updateFormData("teachersWithoutSalary", updated)
                    }}
                  />
                  <Select
                    value={teacher.status}
                    onValueChange={(value) => {
                      const updated = [...formData.teachersWithoutSalary]
                      updated[index].status = value
                      updateFormData("teachersWithoutSalary", updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Reason"
                    value={teacher.reason}
                    onChange={(e) => {
                      const updated = [...formData.teachersWithoutSalary]
                      updated[index].reason = e.target.value
                      updateFormData("teachersWithoutSalary", updated)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromArray("teachersWithoutSalary", index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              </div>
            </div>
          </div>
        )

      case 4: // Staff Development
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 4: Staff Development</h3>

            <div className="space-y-4">
              <Label className="text-primary-700 font-medium">
                Was a whole school PD session held?
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pd-yes"
                    checked={formData.wholeschoolPDHeld === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData("wholeschoolPDHeld", true);
                      } else {
                        updateFormData("wholeschoolPDHeld", null);
                        updateFormData("teachersAttendedPD", "");
                        updateFormData("pdTopic", "");
                        updateFormData("pdTopicReason", "");
                        updateFormData("pdOutcomes", "");
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="pd-yes" className="text-primary-700 font-medium cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pd-no"
                    checked={formData.wholeschoolPDHeld === false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData("wholeschoolPDHeld", false);
                        updateFormData("teachersAttendedPD", "");
                        updateFormData("pdTopic", "");
                        updateFormData("pdTopicReason", "");
                        updateFormData("pdOutcomes", "");
                      } else {
                        updateFormData("wholeschoolPDHeld", null);
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="pd-no" className="text-primary-700 font-medium cursor-pointer">
                    No
                  </Label>
                </div>
              </div>
            </div>

            {formData.wholeschoolPDHeld === true && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    What percentage of teachers attended this session?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.teachersAttendedPD}
                    onChange={(e) => updateFormData("teachersAttendedPD", e.target.value)}
                    placeholder="85"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    Topic of PD session
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    value={formData.pdTopic}
                    onChange={(e) => updateFormData("pdTopic", e.target.value)}
                    placeholder="Enter PD topic"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    Reason for choosing the topic
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    value={formData.pdTopicReason}
                    onChange={(e) => updateFormData("pdTopicReason", e.target.value)}
                    placeholder="Explain why this topic was chosen"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-primary-700 font-medium">
                    What were the outcomes achieved?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    value={formData.pdOutcomes}
                    onChange={(e) => updateFormData("pdOutcomes", e.target.value)}
                    placeholder="Describe the outcomes and impact"
                    rows={3}
                    required
                  />
                </div>
              </div>
            )}
          </div>
        )

      case 5: // Supervision
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 5: Supervision</h3>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary-700 border-b border-primary-200 pb-2 mb-4">
                  Supervision Reports
                </h3>
                <p className="text-sm text-gray-600">
                  Report on lesson observations conducted by different supervisory personnel
                </p>
              </div>

              {/* Head Master (HM) */}
              <div className="space-y-4 mb-8">
                <h4 className="font-medium text-primary-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  Head Master (HM)
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Number of lessons observed
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.hmLessonsObserved}
                      onChange={(e) => updateFormData("hmLessonsObserved", e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Positive findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.hmPositiveFindings}
                      onChange={(e) => updateFormData("hmPositiveFindings", e.target.value)}
                      placeholder="Describe positive observations"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Negative findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.hmNegativeFindings}
                      onChange={(e) => updateFormData("hmNegativeFindings", e.target.value)}
                      placeholder="Describe areas for improvement"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Follow-up actions
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.hmFollowUpActions}
                      onChange={(e) => updateFormData("hmFollowUpActions", e.target.value)}
                      placeholder="Describe follow-up actions taken"
                      rows={2}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Deputy HM (DHM) */}
              <div className="space-y-4 mb-8">
                <div className="border-t border-gray-300 my-6"></div>
                <h4 className="font-medium text-primary-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  Deputy Head Master (DHM)
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Number of lessons observed
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.dhmLessonsObserved}
                      onChange={(e) => updateFormData("dhmLessonsObserved", e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Positive findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.dhmPositiveFindings}
                      onChange={(e) => updateFormData("dhmPositiveFindings", e.target.value)}
                      placeholder="Describe positive observations"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Negative findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.dhmNegativeFindings}
                      onChange={(e) => updateFormData("dhmNegativeFindings", e.target.value)}
                      placeholder="Describe areas for improvement"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Follow-up actions
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.dhmFollowUpActions}
                      onChange={(e) => updateFormData("dhmFollowUpActions", e.target.value)}
                      placeholder="Describe follow-up actions taken"
                      rows={2}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Year Group Head */}
              <div className="space-y-4 mb-8">
                <div className="border-t border-gray-300 my-6"></div>
                <h4 className="font-medium text-primary-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-orange-600 rounded-full mr-2"></span>
                  Year Group Head / Senior Master / Divisional Head
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Number of lessons observed
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.groupHeadLessonsObserved}
                      onChange={(e) => updateFormData("groupHeadLessonsObserved", e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Positive findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.groupHeadPositiveFindings}
                      onChange={(e) => updateFormData("groupHeadPositiveFindings", e.target.value)}
                      placeholder="Describe positive observations"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Negative findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.groupHeadNegativeFindings}
                      onChange={(e) => updateFormData("groupHeadNegativeFindings", e.target.value)}
                      placeholder="Describe areas for improvement"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Follow-up actions
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.groupHeadFollowUpActions}
                      onChange={(e) => updateFormData("groupHeadFollowUpActions", e.target.value)}
                      placeholder="Describe follow-up actions taken"
                      rows={2}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Head of Department */}
              <div className="space-y-4">
                <div className="border-t border-gray-300 my-6"></div>
                <h4 className="font-medium text-primary-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                  Head of Department (HOD)
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Number of lessons observed
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.hodLessonsObserved}
                      onChange={(e) => updateFormData("hodLessonsObserved", e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Positive findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.hodPositiveFindings}
                      onChange={(e) => updateFormData("hodPositiveFindings", e.target.value)}
                      placeholder="Describe positive observations"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Negative findings
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.hodNegativeFindings}
                      onChange={(e) => updateFormData("hodNegativeFindings", e.target.value)}
                      placeholder="Describe areas for improvement"
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Follow-up actions
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Textarea
                      value={formData.hodFollowUpActions}
                      onChange={(e) => updateFormData("hodFollowUpActions", e.target.value)}
                      placeholder="Describe follow-up actions taken"
                      rows={2}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 6: // Curriculum Monitoring
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 6: Curriculum Monitoring</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Number of teachers who did not submit lesson plans <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.teachersNoLessonPlans}
                  onChange={(e) => updateFormData("teachersNoLessonPlans", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">What actions were taken? <span className="text-red-500">*</span></Label>
                <Textarea
                  value={formData.curriculumActionsTaken}
                  onChange={(e) => updateFormData("curriculumActionsTaken", e.target.value)}
                  placeholder="Describe actions taken"
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>
        )

      case 7: // Finance
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 7: Finance</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Opening Balance (GYD) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.openingBalance}
                  onChange={(e) => updateFormData("openingBalance", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Total Income (GYD) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.totalIncome}
                  onChange={(e) => updateFormData("totalIncome", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Total Expenditure (GYD) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.totalExpenditure}
                  onChange={(e) => updateFormData("totalExpenditure", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Closing Balance (GYD) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.closingBalance}
                  onChange={(e) => updateFormData("closingBalance", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-primary-600 mb-2">Financial Summary</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Opening Balance:</strong> GYD {formData.openingBalance || "0.00"}</p>
                <p><strong>Total Income:</strong> GYD {formData.totalIncome || "0.00"}</p>
                <p><strong>Total Expenditure:</strong> GYD {formData.totalExpenditure || "0.00"}</p>
                <p><strong>Closing Balance:</strong> GYD {formData.closingBalance || "0.00"}</p>
                <p className="border-t pt-1 mt-2"><strong>Net Change:</strong> GYD {((Number(formData.openingBalance || 0) + Number(formData.totalIncome || 0)) - Number(formData.totalExpenditure || 0) - Number(formData.closingBalance || 0)) || "0.00"}</p>
              </div>
            </div>
          </div>
        )

      case 8: // Income Sources
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 8: Income Sources</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-primary-600">Income Sources</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addToArray("incomeSources", { source: "", amount: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More
                </Button>
              </div>
              {formData.incomeSources.map((income, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                  <Input
                    placeholder="Source"
                    value={income.source}
                    onChange={(e) => {
                      const updated = [...formData.incomeSources]
                      updated[index].source = e.target.value
                      updateFormData("incomeSources", updated)
                    }}
                  />
                  <Input
                    placeholder="Amount (GYD)"
                    type="number"
                    value={income.amount}
                    onChange={(e) => {
                      const updated = [...formData.incomeSources]
                      updated[index].amount = e.target.value
                      updateFormData("incomeSources", updated)
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeFromArray("incomeSources", index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )

      case 9: // Accident & Safety
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 9: Accident & Safety</h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-primary-700 font-medium">Was an evacuation drill conducted this month? <span className="text-red-500">*</span></Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="evacuation-yes"
                      checked={formData.evacuationDrillHeld === true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFormData("evacuationDrillHeld", true);
                        } else {
                          updateFormData("evacuationDrillHeld", null);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      required
                    />
                    <Label htmlFor="evacuation-yes" className="text-primary-700 font-medium cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="evacuation-no"
                      checked={formData.evacuationDrillHeld === false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFormData("evacuationDrillHeld", false);
                          updateFormData("personsInvolved", "");
                          updateFormData("timeTaken", "");
                          updateFormData("drillObservations", "");
                        } else {
                          updateFormData("evacuationDrillHeld", null);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="evacuation-no" className="text-primary-700 font-medium cursor-pointer">
                      No
                    </Label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Persons involved
                      {formData.evacuationDrillHeld === true && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      type="number"
                      value={formData.personsInvolved}
                      onChange={(e) => updateFormData("personsInvolved", e.target.value)}
                      placeholder="Enter number of persons"
                      disabled={formData.evacuationDrillHeld !== true}
                      required={formData.evacuationDrillHeld === true}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      Time taken (minutes)
                      {formData.evacuationDrillHeld === true && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      type="number"
                      value={formData.timeTaken}
                      onChange={(e) => updateFormData("timeTaken", e.target.value)}
                      placeholder="Enter time in minutes"
                      disabled={formData.evacuationDrillHeld !== true}
                      required={formData.evacuationDrillHeld === true}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-primary-700 font-medium">
                      Observations from drill
                      {formData.evacuationDrillHeld === true && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Textarea
                      value={formData.drillObservations}
                      onChange={(e) => updateFormData("drillObservations", e.target.value)}
                      placeholder="Describe observations from the evacuation drill"
                      rows={3}
                      disabled={formData.evacuationDrillHeld !== true}
                      required={formData.evacuationDrillHeld === true}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-primary-700 font-medium">Are fire buckets available in classrooms? <span className="text-red-500">*</span></Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="firebuckets-yes"
                      checked={formData.classroomsHaveFireBuckets === true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFormData("classroomsHaveFireBuckets", true);
                        } else {
                          updateFormData("classroomsHaveFireBuckets", null);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      required
                    />
                    <Label htmlFor="firebuckets-yes" className="text-primary-700 font-medium cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="firebuckets-no"
                      checked={formData.classroomsHaveFireBuckets === false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFormData("classroomsHaveFireBuckets", false);
                        } else {
                          updateFormData("classroomsHaveFireBuckets", null);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="firebuckets-no" className="text-primary-700 font-medium cursor-pointer">
                      No
                    </Label>
                  </div>
                </div>

                <Label className="text-primary-700 font-medium"> Are fire extinguishers in working condition and sufficient? <span className="text-red-500">*</span></Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extinguishers-yes"
                      checked={formData.fireExtinguishersFunctional === true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFormData("fireExtinguishersFunctional", true);
                        } else {
                          updateFormData("fireExtinguishersFunctional", null);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      required
                    />
                    <Label htmlFor="extinguishers-yes" className="text-primary-700 font-medium cursor-pointer">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="extinguishers-no"
                      checked={formData.fireExtinguishersFunctional === false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFormData("fireExtinguishersFunctional", false);
                        } else {
                          updateFormData("fireExtinguishersFunctional", null);
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="extinguishers-no" className="text-primary-700 font-medium cursor-pointer">
                      No
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary-600"> Incident Report Summary</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium"> Total number of reported incidents <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={formData.numberOfIncidents}
                      onChange={(e) => updateFormData("numberOfIncidents", e.target.value)}
                      placeholder="Enter number of incidents"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">Number of students involved in incidents <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={formData.studentsInvolved}
                      onChange={(e) => updateFormData("studentsInvolved", e.target.value)}
                      placeholder="Enter number of students"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">Number of teachers involved in incidents <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={formData.teachersInvolvedIncidents}
                      onChange={(e) => updateFormData("teachersInvolvedIncidents", e.target.value)}
                      placeholder="Enter number of teachers"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">Describe actions taken to prevent future incidents <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={formData.preventionActions}
                      onChange={(e) => updateFormData("preventionActions", e.target.value)}
                      placeholder="Describe actions taken to prevent incidents"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 10: // Staff Meetings
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 10: Staff Meetings</h3>

            <div className="space-y-4">
              <Label className="text-primary-700 font-medium">Was a general staff meeting held this month? <span className="text-red-500">*</span></Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="meeting-yes"
                    checked={formData.generalStaffMeetingHeld === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData("generalStaffMeetingHeld", true);
                      } else {
                        updateFormData("generalStaffMeetingHeld", null);
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    required
                  />
                  <Label htmlFor="meeting-yes" className="text-primary-700 font-medium cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="meeting-no"
                    checked={formData.generalStaffMeetingHeld === false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData("generalStaffMeetingHeld", false);
                        updateFormData("keyIssuesDiscussed", "");
                        updateFormData("decisionsImplemented", "");
                      } else {
                        updateFormData("generalStaffMeetingHeld", null);
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="meeting-no" className="text-primary-700 font-medium cursor-pointer">
                    No
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  What were the key issues discussed
                  {formData.generalStaffMeetingHeld === true && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Textarea
                  value={formData.keyIssuesDiscussed}
                  onChange={(e) => updateFormData("keyIssuesDiscussed", e.target.value)}
                  placeholder="Describe the key issues discussed in the meeting"
                  rows={4}
                  disabled={formData.generalStaffMeetingHeld !== true}
                  required={formData.generalStaffMeetingHeld === true}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">
                  What Percentage of decisions were implemented
                  {formData.generalStaffMeetingHeld === true && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.decisionsImplemented}
                  onChange={(e) => updateFormData("decisionsImplemented", e.target.value)}
                  placeholder="Enter percentage (0-100)"
                  disabled={formData.generalStaffMeetingHeld !== true}
                  required={formData.generalStaffMeetingHeld === true}
                />
              </div>
            </div>
          </div>
        )

      case 11: // Physical Facilities
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 11: Physical Facilities</h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary-600">In Need of Repairs</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray("repairsNeeded", { area: "", details: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
                {formData.repairsNeeded.map((repair, index) => (
                  <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                    <Select
                      value={repair.area}
                      onValueChange={(value) => {
                        const updated = [...formData.repairsNeeded]
                        updated[index].area = value
                        updateFormData("repairsNeeded", updated)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Repair Area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school-walls">School Walls</SelectItem>
                        <SelectItem value="roof">Roof</SelectItem>
                        <SelectItem value="stairs">Stairs</SelectItem>
                        <SelectItem value="windows-doors">Windows/Doors</SelectItem>
                        <SelectItem value="electrical">Electrical System</SelectItem>
                        <SelectItem value="water">Water System</SelectItem>
                        <SelectItem value="plumbing">Plumbing/Gutters</SelectItem>
                        <SelectItem value="compound">School Compound</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Details of repairs needed"
                      value={repair.details}
                      onChange={(e) => {
                        const updated = [...formData.repairsNeeded]
                        updated[index].details = e.target.value
                        updateFormData("repairsNeeded", updated)
                      }}
                      rows={2}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeFromArray("repairsNeeded", index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary-600">Facilities Status: Teachers</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of functional toilets *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.teacherToiletsFunctional}
                      onChange={(e) => updateFormData("teacherToiletsFunctional", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of working sinks *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.teacherSinksFunctional}
                      onChange={(e) => updateFormData("teacherSinksFunctional", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of working taps *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.teacherTapsFunctional}
                      onChange={(e) => updateFormData("teacherTapsFunctional", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary-600">Facilities Status: Students</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of functional toilets *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.studentToiletsFunctional}
                      onChange={(e) => updateFormData("studentToiletsFunctional", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of working taps *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.studentTapsFunctional}
                      onChange={(e) => updateFormData("studentTapsFunctional", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of working sinks *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.studentSinksFunctional}
                      onChange={(e) => updateFormData("studentSinksFunctional", e.target.value)}
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary-600">Facilities Status: Classrooms</h4>
                <div className="grid gap-4 md:grid-cols-1">
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">What is the percentage of overcrowded classrooms *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.overcrowdedClassrooms || ""}
                      onChange={(e) => updateFormData("overcrowdedClassrooms", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 12: // Resources Needed
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-primary-700">Section 12: Resources Needed</h3>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Curriculum resources needed</Label>
                <Textarea
                  value={formData.curriculumResources}
                  onChange={(e) => updateFormData("curriculumResources", e.target.value)}
                  placeholder="List textbooks, teaching aids, or subject-specific materials required."
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Janitorial supplies needed</Label>
                <Textarea
                  value={formData.janitorialSupplies}
                  onChange={(e) => updateFormData("janitorialSupplies", e.target.value)}
                  placeholder="Specify cleaning products, equipment, or hygiene materials required."
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-primary-700 font-medium">Additional Issues Affecting the School</Label>
                <Textarea
                  value={formData.otherIssues}
                  onChange={(e) => updateFormData("otherIssues", e.target.value)}
                  placeholder="Mention any other challenges impacting school operations."
                  rows={4}
                />
              </div>
            </div>
          </div>
        )

      default:
        return <div>Section {currentSection + 1} content not found</div>
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <FileTextIcon className="h-5 w-5" />
            <div>
              <CardTitle>Monthly HMR Report - Admin Submission</CardTitle>
              <CardDescription>
                Submitting report for {schoolName} - {monthYear}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(((currentSection + 1) / SECTIONS.length) * 100)}%</span>
            </div>
            <Progress value={((currentSection + 1) / SECTIONS.length) * 100} className="h-2" />
          </div>

          {/* Section Navigation */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Section {currentSection + 1}: {SECTIONS[currentSection]}
            </h3>
            <div className="text-sm text-gray-500">
              {currentSection + 1} of {SECTIONS.length}
            </div>
          </div>

          {/* Section Content */}
          <div className="min-h-[400px]">
            {renderSectionContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              onClick={previousSection}
              disabled={currentSection === 0}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-2">
              {currentSection === SECTIONS.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextSection}
                  disabled={currentSection === SECTIONS.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Placeholder function - you'll need to implement this in your admin-reports action
async function getTeacherStatusOptions(): Promise<string[]> {
  // This should call your actual admin action
  return ['Active', 'On Leave', 'Transferred', 'Retired', 'Dismissed']
}
