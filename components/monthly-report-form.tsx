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
import { createHmrReport, saveStudentEnrollment, getStudentEnrollment, saveAttendance, getAttendance, saveStaffing, getStaffing, saveStaffDevelopment, getStaffDevelopment, saveSupervision, getSupervision, saveCurriculum, getCurriculum, saveFinance, getFinance, saveIncome, getIncome, saveAccidentSafety, getAccidentSafety, saveStaffMeetings, getStaffMeetings, savePhysicalFacilities, getPhysicalFacilities, saveResourcesNeeded, getResourcesNeeded, savePhysicalEducation, getPhysicalEducation, submitReport, getReportStatus, getCurrentMonthReport, getReportProgress, getTeacherStatusOptions } from "@/app/actions/hmr-reports"
import { useToast } from "@/components/ui/use-toast"

interface MonthlyReportFormProps {
  report?: Report
  onSuccess?: () => void
  previousReportData?: {
    month: number
    year: number
    displayName: string
  }
  reportId?: string
  // Caching props to prevent refetching on tab switch
  cachedReportStatus?: {
    reportId: string | null
    isSubmitted: boolean
    status: string
    hasExistingReport: boolean
  }
  onReportStatusLoaded?: (status: {
    reportId: string | null
    isSubmitted: boolean
    status: string
    hasExistingReport: boolean
  }) => void
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

  // Section 13: Physical Education
  physicalEducationActivities: Array<{ activity: string }>
  physicalEducationChallenges: Array<{ challenge: string }>
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
  "Physical Education",
]

export function MonthlyReportForm({ 
  report, 
  onSuccess, 
  previousReportData, 
  reportId: initialReportId,
  cachedReportStatus,
  onReportStatusLoaded
}: MonthlyReportFormProps) {
  // Calculate previous month for report submission
  const getPreviousMonth = () => {
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return previousMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }
  
  const [formData, setFormData] = useState<FormData>({
    month: previousReportData?.displayName || getPreviousMonth(),
    date: new Date().toLocaleDateString(),
    educationDistrict: "",
    schoolLevel: "",
    schoolName: "",
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
    physicalEducationActivities: [],
    physicalEducationChallenges: [],
  })

  const [schools, setSchools] = useState<Array<{ id: string; name: string; region_id: string }>>([])
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([])
  const [reportId, setReportId] = useState<string | null>(initialReportId || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userSchool, setUserSchool] = useState<any>(null)
  const [savedSections, setSavedSections] = useState<Set<number>>(new Set())
  const [isExistingReport, setIsExistingReport] = useState(false)
  const [reportStatus, setReportStatus] = useState<string>('draft')
  const [isCurrentMonthSubmitted, setIsCurrentMonthSubmitted] = useState(false)
  const [justSubmittedReport, setJustSubmittedReport] = useState(false)
  const [teacherStatusOptions, setTeacherStatusOptions] = useState<string[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  // Track changes for section-by-section saving
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalSectionData, setOriginalSectionData] = useState<Record<number, any>>({})
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [isSavingSection, setIsSavingSection] = useState(false)
  const [isLoadingSection, setIsLoadingSection] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  // Track current section without caching
  const [currentSection, setCurrentSection] = useState(0)

  // Load all existing data when continuing a draft report
  const loadAllExistingData = async (reportId: string) => {
    try {
      // Get report progress to determine where user left off
      const progressResult = await getReportProgress(reportId)
      
      // Load all sections data in parallel
      const [
        studentEnrollmentResult,
        attendanceResult,
        staffingResult,
        staffDevelopmentResult,
        supervisionResult,
        curriculumResult,
        financeResult,
        incomeResult,
        accidentSafetyResult,
        staffMeetingsResult,
        facilitiesResult,
        resourcesResult,
        physicalEducationResult
      ] = await Promise.all([
        getStudentEnrollment(reportId),
        getAttendance(reportId),
        getStaffing(reportId),
        getStaffDevelopment(reportId),
        getSupervision(reportId),
        getCurriculum(reportId),
        getFinance(reportId),
        getIncome(reportId),
        getAccidentSafety(reportId),
        getStaffMeetings(reportId),
        getPhysicalFacilities(reportId),
        getResourcesNeeded(reportId),
        getPhysicalEducation(reportId)
      ])

      // Update form data with all loaded data
      setFormData((prev) => {
        const updatedData = { ...prev } as any

        // Student Enrollment data
        if ((studentEnrollmentResult as any).success && (studentEnrollmentResult as any).data) {
          const data = (studentEnrollmentResult as any).data
          updatedData.totalStudentsEnrolled = data.total_students?.toString() || ""
          updatedData.studentsTransferredIn = data.total_transferred_in?.toString() || ""
          updatedData.studentsTransferredOut = data.total_transferred_out?.toString() || ""
        }

        // Attendance data
        if ((attendanceResult as any).success && (attendanceResult as any).data) {
          const data = (attendanceResult as any).data
          updatedData.totalDaysInMonth = data.total_days_in_month?.toString() || ""
          updatedData.totalDaysSchoolOpened = data.total_days_school_opened?.toString() || ""
          updatedData.averageDailyAttendance = data.average_daily_attendance?.toString() || ""
        }

        // Staffing data
        if ((staffingResult as any).success && (staffingResult as any).data) {
          const data = (staffingResult as any).data
          updatedData.totalTeachers = data.total_teachers?.toString() || ""
          updatedData.totalNonTeachingStaff = data.total_non_teaching_staff?.toString() || ""
          updatedData.teachersPresent = data.teachers_present?.toString() || ""
          updatedData.teachersAbsent = data.teachers_absent?.toString() || ""
          updatedData.nonTeachingStaffPresent = data.non_teaching_staff_present?.toString() || ""
          updatedData.nonTeachingStaffAbsent = data.non_teaching_staff_absent?.toString() || ""
          updatedData.reasonsForAbsence = data.reasons_for_absence || ""
        }

        // Staff Development data
        if ((staffDevelopmentResult as any).success && (staffDevelopmentResult as any).data) {
          const data = (staffDevelopmentResult as any).data
          updatedData.professionalDevelopmentActivities = data.professional_development_activities || ""
          updatedData.teacherTrainingPrograms = data.teacher_training_programs || ""
          updatedData.skillDevelopmentInitiatives = data.skill_development_initiatives || ""
        }

        // Supervision data
        if ((supervisionResult as any).success && (supervisionResult as any).data) {
          const data = (supervisionResult as any).data
          updatedData.principalSupervisionActivities = data.principal_supervision_activities || ""
          updatedData.classroomObservations = data.classroom_observations || ""
          updatedData.teacherFeedbackSessions = data.teacher_feedback_sessions || ""
        }

        // Curriculum data
        if ((curriculumResult as any).success && (curriculumResult as any).data) {
          const data = (curriculumResult as any).data
          updatedData.curriculumImplementationProgress = data.curriculum_implementation_progress || ""
          updatedData.subjectSpecificUpdates = data.subject_specific_updates || ""
          updatedData.assessmentAndEvaluationActivities = data.assessment_and_evaluation_activities || ""
        }

        // Finance data
        if ((financeResult as any).success && (financeResult as any).data) {
          const data = (financeResult as any).data
          updatedData.schoolBudgetStatus = data.school_budget_status || ""
          updatedData.expenditureDetails = data.expenditure_details || ""
          updatedData.fundingChallenges = data.funding_challenges || ""
        }

        // Income data
        if ((incomeResult as any).success && (incomeResult as any).data) {
          const data = (incomeResult as any).data
          updatedData.governmentFunding = data.government_funding?.toString() || ""
          updatedData.donationsAndGrants = data.donations_and_grants?.toString() || ""
          updatedData.fundraisingActivities = data.fundraising_activities?.toString() || ""
          updatedData.otherIncomeSources = data.other_income_sources?.toString() || ""
        }

        // Accident & Safety data
        if ((accidentSafetyResult as any).success && (accidentSafetyResult as any).data) {
          const data = (accidentSafetyResult as any).data
          updatedData.accidentsReported = data.accidents_reported?.toString() || ""
          updatedData.safetyMeasuresImplemented = data.safety_measures_implemented || ""
          updatedData.emergencyProcedures = data.emergency_procedures || ""
          updatedData.evacuationDrill = data.evacuation_drill ? "yes" : "no"
          updatedData.classroomFirebuckets = data.classroom_firebuckets ? "yes" : "no"
          updatedData.functionalFireExtinguishers = data.functional_fire_extinguishers ? "yes" : "no"
        }

        // Staff Meetings data
        if ((staffMeetingsResult as any).success && (staffMeetingsResult as any).data) {
          const data = (staffMeetingsResult as any).data
          updatedData.generalStaffMeetingHeld = data.generalMeetingHeld
          updatedData.keyIssuesDiscussed = data.keyIssuesDiscussed || ""
          updatedData.decisionsImplemented = data.decisionsImplemented || ""
        }

        // Physical Facilities data
        if ((facilitiesResult as any).success && (facilitiesResult as any).data) {
          const data = (facilitiesResult as any).data
          updatedData.buildingCondition = data.building_condition || ""
          updatedData.maintenanceIssues = data.maintenance_issues || ""
          updatedData.facilitiesUpgrades = data.facilities_upgrades || ""
        }

        // Resources Needed data
        if ((resourcesResult as any).success && (resourcesResult as any).data) {
          const data = (resourcesResult as any).data
          updatedData.curriculumResources = data.curriculumResources || ""
          updatedData.janitorialSupplies = data.janitorialSupplies || ""
          updatedData.otherIssues = data.otherIssues || ""
        }

        // Physical Education data
        if ((physicalEducationResult as any).success && (physicalEducationResult as any).data) {
          const data = (physicalEducationResult as any).data
          // Convert comma-separated strings back to arrays
          const activitiesArray = data.physicalEducationActivities 
            ? data.physicalEducationActivities.split(',').map((activity: string) => ({ activity: activity.trim() })).filter((item: any) => item.activity)
            : []
          const challengesArray = data.physicalEducationChallenges
            ? data.physicalEducationChallenges.split(',').map((challenge: string) => ({ challenge: challenge.trim() })).filter((item: any) => item.challenge)
            : []
          
          updatedData.physicalEducationActivities = activitiesArray
          updatedData.physicalEducationChallenges = challengesArray
        }

        return updatedData
      })

      // Start at section 0 since we removed progress tracking
      setCurrentSection(0)

      // Mark completed sections as saved
      if (progressResult.success && progressResult.completedSections) {
        const completedSectionsSet = new Set(progressResult.completedSections)
        setSavedSections(completedSectionsSet)
      }

    } catch (error) {
      console.error("Error loading existing data:", error)
    }
  }

  // Function to handle viewing the submitted report
  const handleViewSubmittedReport = () => {
    if (reportId && userSchool?.id) {
      // Extract month and year from formData
      const monthYear = formData.month.split(" ")
      const monthName = monthYear[0]
      const year = monthYear[1]
      const monthNumber = new Date(`${monthName} 1, 2024`).getMonth() + 1
      const monthParam = `${monthNumber}-${year}`
      
      // Build back URL to return to the Head Teacher dashboard with the correct tab
      const backUrl = encodeURIComponent(`/dashboard/head-teacher?tab=current-report`)
      const navigationUrl = `/dashboard/reports/view/${userSchool.id}/${monthParam}?back=${backUrl}`
      
      router.push(navigationUrl)
    }
  }

  // Load all existing data when continuing a draft report
  useEffect(() => {
    if (initialReportId) {
      loadAllExistingData(initialReportId)
    }
  }, [initialReportId])

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user from our auth system (not Supabase auth)
        const response = await fetch("/api/user")
        if (response.ok) {
          const userData = await response.json()

          if (userData && userData.school_id && supabase) {
            // Get school details including school level and grade
            const { data: schoolData, error: schoolError } = await supabase
              .from("sms_schools")
              .select(`
                id,
                name,
                region_id,
                school_level_id,
                grade,
                sms_regions!region_id (
                  id,
                  name
                ),
                sms_school_levels!school_level_id (
                  id,
                  name
                )
              `)
              .eq("id", userData.school_id)
              .single()

            if (schoolData && !schoolError) {
              setUserSchool(schoolData)
              setCurrentUser(userData)

              // Auto-populate form data including school level and grade
              setFormData((prev) => ({
                ...prev,
                schoolName: schoolData.name,
                educationDistrict: (schoolData.sms_regions as any)?.name || "",
                schoolLevel: (schoolData.sms_school_levels as any)?.name || "",
                schoolGrade: schoolData.grade || "",
              }))
            }
          }
        }

        // Fetch all schools and regions for reference
        if (supabase) {
          const { data: schoolsData } = await supabase.from("sms_schools").select("id, name, region_id, grade").order("name")
          const { data: regionsData } = await supabase.from("sms_regions").select("id, name").order("name")

          setSchools(schoolsData || [])
          setRegions(regionsData || [])
        }

        // Load teacher status options
        try {
          const statusResult = await getTeacherStatusOptions()
          if (statusResult.statusOptions) {
            setTeacherStatusOptions(statusResult.statusOptions)
          }
        } catch (error) {
          console.error("Error loading teacher status options:", error)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [])

  // Check for existing report for the previous month (head teachers submit reports for the previous month)
  // Only run this check when NOT creating a previous report
  useEffect(() => {
    async function checkExistingReport() {
      if (currentUser?.school_id && !previousReportData) {
        // Use cached status if available to prevent refetching on tab switch
        if (cachedReportStatus) {
          if (cachedReportStatus.hasExistingReport) {
            setReportId(cachedReportStatus.reportId)
            setIsExistingReport(true)
            setReportStatus(cachedReportStatus.status)
            setIsCurrentMonthSubmitted(cachedReportStatus.isSubmitted)
          }
          setIsInitialLoading(false)
          return
        }
        
        try {
          setIsInitialLoading(true)
          const result = await getCurrentMonthReport()
          if (result.success && result.hasExistingReport) {
            // Notify parent to cache this status
            if (onReportStatusLoaded) {
              onReportStatusLoaded({
                reportId: result.report.id,
                isSubmitted: result.isSubmitted,
                status: result.isSubmitted ? 'submitted' : result.status,
                hasExistingReport: true
              })
            }
            
            if (result.isSubmitted) {
              // Report is already submitted - show read-only view
              setReportId(result.report.id)
              setIsExistingReport(true)
              setReportStatus('submitted')
              setIsCurrentMonthSubmitted(true)
              
              // Get report progress to show completed sections
              const progressResult = await getReportProgress(result.report.id)
              if (progressResult.success) {
                setSavedSections(new Set(progressResult.completedSections))
                // Set to the last section or section 0 for viewing
                setCurrentSection(0)
              }
              
              // Update form data with basic info from existing report
              setFormData((prev) => ({
                ...prev,
                reportId: result.report.id,
                schoolLevel: result.report.school_level || prev.schoolLevel,
                schoolGrade: result.report.school_grade || prev.schoolGrade,
              }))
            } else {
              // Found existing draft report, load it for editing
              setReportId(result.report.id)
              setIsExistingReport(true)
              setReportStatus(result.status)
              
              // Update form data with basic info from existing report
              setFormData((prev) => ({
                ...prev,
                reportId: result.report.id,
                schoolLevel: result.report.school_level || prev.schoolLevel,
                schoolGrade: result.report.school_grade || prev.schoolGrade,
              }))
            }
          } else {
            // No existing report - notify parent to cache this
            if (onReportStatusLoaded) {
              onReportStatusLoaded({
                reportId: null,
                isSubmitted: false,
                status: 'none',
                hasExistingReport: false
              })
            }
          }
        } catch (error) {
          console.error("Error checking for existing report:", error)
        } finally {
          setIsInitialLoading(false)
        }
      } else if (previousReportData) {
        // If we're showing a previous report, no need to check current month
        setIsInitialLoading(false)
      } else if (currentUser && !currentUser.school_id) {
        // User loaded but has no school_id, stop loading
        setIsInitialLoading(false)
      }
    }
    
    // Only check after we have user data or if we have previous report data
    if (currentUser || previousReportData) {
      checkExistingReport()
    }
    
    // Fallback: Stop loading after 5 seconds regardless
    const loadingTimeout = setTimeout(() => {
      setIsInitialLoading(false)
    }, 5000)
    
    return () => clearTimeout(loadingTimeout)
  }, [currentUser, previousReportData])

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && reportStatus !== 'submitted') {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, reportStatus])

  // Clear unsaved changes flag when report is submitted
  useEffect(() => {
    if (reportStatus === 'submitted') {
      setHasUnsavedChanges(false)
    }
  }, [reportStatus])

  // Removed keyboard shortcut for manual save to disable caching

  // Load existing student enrollment data when reportId is available
  useEffect(() => {
    async function loadStudentEnrollmentData() {
      if (reportId && currentSection === 1) {
        try {
          const result = await getStudentEnrollment(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              totalStudentsEnrolled: result.data.total_students?.toString() || "",
              studentsTransferredIn: result.data.total_transferred_in?.toString() || "",
              studentsTransferredOut: result.data.total_transferred_out?.toString() || "",
            }))
          }
        } catch (error) {
          console.error("Error loading student enrollment data:", error)
        }
      }
    }
    loadStudentEnrollmentData()
  }, [reportId, currentSection])

  // Load existing attendance data when reportId is available
  useEffect(() => {
    async function loadAttendanceData() {
      if (reportId && currentSection === 2) {
        try {
          const result = await getAttendance(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              studentAttendanceRate: result.data.student?.attendance_rate?.toString() || "",
              studentPunctualityRate: result.data.student?.punctuality_rate?.toString() || "",
              teacherAttendanceRate: result.data.teacher?.attendance_rate?.toString() || "",
              teacherPunctualityRate: result.data.teacher?.punctuality_rate?.toString() || "",
            }))
          }
        } catch (error) {
          console.error("Error loading attendance data:", error)
        }
      }
    }
    loadAttendanceData()
  }, [reportId, currentSection])



  // Load existing staff development data when reportId is available
  useEffect(() => {
    async function loadStaffDevelopmentData() {
      if (reportId && currentSection === 4) {
        try {
          const result = await getStaffDevelopment(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              wholeschoolPDHeld: result.data.PD_session_held ? 
                (result.data.PD_session_held === 'yes' || result.data.PD_session_held === true || result.data.PD_session_held === 'true' ? true : false) : null,
              teachersAttendedPD: result.data.percentage_attended?.toString() || "",
              pdTopic: result.data.PD_topic || "",
              pdOutcomes: result.data.Outcomes || "",
              pdTopicReason: result.data.Reason || "",
            }))
          }
        } catch (error) {
          console.error("Error loading staff development data:", error)
        }
      }
    }
    loadStaffDevelopmentData()
  }, [reportId, currentSection])

  // Load existing supervision data when reportId is available
  useEffect(() => {
    async function loadSupervisionData() {
      if (reportId && currentSection === 5) {
        try {
          const result = await getSupervision(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              hmLessonsObserved: result.data.hmLessonsObserved || "",
              hmPositiveFindings: result.data.hmPositiveFindings || "",
              hmNegativeFindings: result.data.hmNegativeFindings || "",
              hmFollowUpActions: result.data.hmFollowUpActions || "",
              dhmLessonsObserved: result.data.dhmLessonsObserved || "",
              dhmPositiveFindings: result.data.dhmPositiveFindings || "",
              dhmNegativeFindings: result.data.dhmNegativeFindings || "",
              dhmFollowUpActions: result.data.dhmFollowUpActions || "",
              groupHeadLessonsObserved: result.data.groupHeadLessonsObserved || "",
              groupHeadPositiveFindings: result.data.groupHeadPositiveFindings || "",
              groupHeadNegativeFindings: result.data.groupHeadNegativeFindings || "",
              groupHeadFollowUpActions: result.data.groupHeadFollowUpActions || "",
              hodLessonsObserved: result.data.hodLessonsObserved || "",
              hodPositiveFindings: result.data.hodPositiveFindings || "",
              hodNegativeFindings: result.data.hodNegativeFindings || "",
              hodFollowUpActions: result.data.hodFollowUpActions || "",
            }))
          }
        } catch (error) {
          console.error("Error loading supervision data:", error)
        }
      }
    }
    loadSupervisionData()
  }, [reportId, currentSection])

  // Load existing curriculum data when reportId is available
  useEffect(() => {
    async function loadCurriculumData() {
      if (reportId && currentSection === 6) {
        try {
          const result = await getCurriculum(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              teachersNoLessonPlans: result.data.teachersNoLessonPlans || "",
              curriculumActionsTaken: result.data.curriculumActionsTaken || "",
            }))
          }
        } catch (error) {
          console.error("Error loading curriculum data:", error)
        }
      }
    }
    loadCurriculumData()
  }, [reportId, currentSection])

  // Load existing finance data when reportId is available
  useEffect(() => {
    async function loadFinanceData() {
      if (reportId && currentSection === 7) {
        try {
          const result = await getFinance(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              openingBalance: result.data.openingBalance || "",
              totalIncome: result.data.totalIncome || "",
              totalExpenditure: result.data.totalExpenditure || "",
              closingBalance: result.data.closingBalance || "",
            }))
          }
        } catch (error) {
          console.error("Error loading finance data:", error)
        }
      }
    }
    loadFinanceData()
  }, [reportId, currentSection])

  // Load existing income data when reportId is available
  useEffect(() => {
    async function loadIncomeData() {
      if (reportId && currentSection === 8) {
        try {
          const result = await getIncome(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              incomeSources: result.data.length > 0 ? result.data : [{ source: "", amount: "" }],
            }))
          }
        } catch (error) {
          console.error("Error loading income data:", error)
        }
      }
    }
    loadIncomeData()
  }, [reportId, currentSection])

  // Load existing accident safety data when reportId is available
  useEffect(() => {
    async function loadAccidentSafetyData() {
      if (reportId && currentSection === 9) {
        try {
          const result = await getAccidentSafety(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              evacuationDrillHeld: result.data.evacuationDrill && result.data.evacuationDrill !== "" ? 
                (result.data.evacuationDrill === "yes" || result.data.evacuationDrill === true || result.data.evacuationDrill === 'true' ? true : false) : null,
              personsInvolved: result.data.personsInvolvedDrill || "0",
              timeTaken: result.data.timeTakenDrill || "0",
              drillObservations: result.data.observationsDrill || "",
              classroomsHaveFireBuckets: result.data.classroomFirebuckets && result.data.classroomFirebuckets !== "" ? 
                (result.data.classroomFirebuckets === "yes" || result.data.classroomFirebuckets === true || result.data.classroomFirebuckets === 'true' ? true : false) : null,
              fireExtinguishersFunctional: result.data.functionalFireExtinguishers && result.data.functionalFireExtinguishers !== "" ? 
                (result.data.functionalFireExtinguishers === "yes" || result.data.functionalFireExtinguishers === true || result.data.functionalFireExtinguishers === 'true' ? true : false) : null,
              numberOfIncidents: result.data.totalAccidents || "0",
              studentsInvolved: result.data.totalStudentsInvolved || "0",
              teachersInvolvedIncidents: result.data.totalTeachersInvolved || "0",
              preventionActions: result.data.actions || "",
            }))
          }
        } catch (error) {
          console.error("Error loading accident safety data:", error)
        }
      }
    }
    loadAccidentSafetyData()
  }, [reportId, currentSection])



  // Load existing physical facilities data when reportId is available
  useEffect(() => {
    async function loadPhysicalFacilitiesData() {
      if (reportId && currentSection === 11) {
        try {
          const result = await getPhysicalFacilities(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              repairsNeeded: result.data.repairsNeeded,
              teacherToiletsFunctional: result.data.teacherToiletsFunctional,
              teacherSinksFunctional: result.data.teacherSinksFunctional,
              teacherTapsFunctional: result.data.teacherTapsFunctional,
              studentToiletsFunctional: result.data.studentToiletsFunctional,
              studentSinksFunctional: result.data.studentSinksFunctional,
              studentTapsFunctional: result.data.studentTapsFunctional,
              overcrowdedClassrooms: result.data.overcrowdedClassrooms || "",
            }))
          }
        } catch (error) {
          console.error("Error loading physical facilities data:", error)
        }
      }
    }
    loadPhysicalFacilitiesData()
  }, [reportId, currentSection])

  // Load existing resources needed data when reportId is available
  useEffect(() => {
    async function loadResourcesNeededData() {
      if (reportId && currentSection === 12) {
        try {
         // console.log("Loading resources needed data for reportId:", reportId)
          const result = await getResourcesNeeded(reportId)
         // console.log("getResourcesNeeded result:", result)
          if ((result as any).success && (result as any).data) {
            //console.log("Setting resources data to form:", result.data)
            setFormData((prev) => ({
              ...prev,
              curriculumResources: (result as any).data.curriculumResources,
              janitorialSupplies: (result as any).data.janitorialSupplies,
              otherIssues: (result as any).data.otherIssues,
            }))
          }
        } catch (error) {
          console.error("Error loading resources needed data:", error)
        }
      }
    }
    loadResourcesNeededData()
  }, [reportId, currentSection])

  // Load existing physical education data when reportId is available
  useEffect(() => {
    async function loadPhysicalEducationData() {
      if (reportId && currentSection === 13) {
        try {
          const result = await getPhysicalEducation(reportId)
          if (result.success && result.data) {
            // Convert comma-separated strings back to arrays, filtering out empty strings
            const activitiesArray = result.data.physicalEducationActivities 
              ? result.data.physicalEducationActivities.split(',')
                  .map((activity: string) => activity.trim())
                  .filter((activity: string) => activity.length > 0)
                  .map((activity: string) => ({ activity }))
              : []
            const challengesArray = result.data.physicalEducationChallenges
              ? result.data.physicalEducationChallenges.split(',')
                  .map((challenge: string) => challenge.trim())
                  .filter((challenge: string) => challenge.length > 0)
                  .map((challenge: string) => ({ challenge }))
              : []
            
            setFormData((prev) => ({
              ...prev,
              physicalEducationActivities: activitiesArray,
              physicalEducationChallenges: challengesArray,
            }))
          }
        } catch (error) {
          console.error("Error loading physical education data:", error)
        }
      }
    }
    loadPhysicalEducationData()
  }, [reportId, currentSection])

  // Check report status when reportId changes
  useEffect(() => {
    async function checkReportStatus() {
      if (reportId) {
        try {
          const result = await getReportStatus(reportId)
          if (result && result.success) {
            // For previous reports, start with draft status to allow editing
            if (previousReportData) {
              setReportStatus('draft')
            } else {
              setReportStatus(result.status)
            }
          } else if (result && result.error) {
            console.error("Error from getReportStatus:", result.error)
          }
        } catch (error) {
          console.error("Error checking report status:", error)
        }
      }
    }
    checkReportStatus()
  }, [reportId, previousReportData])

  // Load section data when current section changes
  useEffect(() => {
    if (reportId && currentSection > 0) {
      loadSectionData(currentSection)
    }
  }, [reportId, currentSection])

  const updateFormData = (field: string, value: any) => {
    // Prevent updates if report is submitted
    if (reportStatus === 'submitted') {
      return
    }
    
    // Use our change tracking function
    handleFieldChange(field, value)
  }

  const addToArray = (field: string, item: any) => {
    // Prevent updates if report is submitted
    if (reportStatus === 'submitted') {
      return
    }
    
    const currentArray = formData[field as keyof FormData] as any[]
    const newArray = [...currentArray, item]
    handleFieldChange(field, newArray)
  }

  const removeFromArray = (field: string, index: number) => {
    // Prevent updates if report is submitted
    if (reportStatus === 'submitted') {
      return
    }
    
    const currentArray = formData[field as keyof FormData] as any[]
    const newArray = currentArray.filter((_, i) => i !== index)
    handleFieldChange(field, newArray)
  }

  // Enhanced section save handler
  const handleSectionSave = async (sectionIndex: number, data: any, markComplete = true) => {
    if (!reportId || reportStatus === 'submitted') return

    try {
      let result: any = { success: false }

      // Ensure data is a plain object, not FormData
      const formDataObj = data instanceof FormData ? Object.fromEntries(data.entries()) : data

      // Helper function to safely get values
      const safeGet = (key: string, defaultValue = "") => {
        return formDataObj[key] !== undefined && formDataObj[key] !== null ? formDataObj[key].toString() : defaultValue
      }

      // Helper function to safely get array values
      const safeGetArray = (key: string) => {
        return Array.isArray(formDataObj[key]) ? formDataObj[key] : []
      }

      switch (sectionIndex) {
        case 0: // Basic Information - handled in main form submission
          result = { success: true }
          break
        case 1: // Student Enrollment
          const studentEnrollmentFormData = new FormData()
          studentEnrollmentFormData.append("reportId", reportId)
          studentEnrollmentFormData.append("totalStudents", safeGet("totalStudentsEnrolled", "0"))
          studentEnrollmentFormData.append("totalTransferredIn", safeGet("studentsTransferredIn", "0"))
          studentEnrollmentFormData.append("totalTransferredOut", safeGet("studentsTransferredOut", "0"))
          result = await saveStudentEnrollment(studentEnrollmentFormData)
          break
        case 2: // Attendance
          const attendanceFormData = new FormData()
          attendanceFormData.append("reportId", reportId)
          attendanceFormData.append("studentAttendanceRate", safeGet("studentAttendanceRate", "0"))
          attendanceFormData.append("studentPunctualityRate", safeGet("studentPunctualityRate", "0"))
          attendanceFormData.append("teacherAttendanceRate", safeGet("teacherAttendanceRate", "0"))
          attendanceFormData.append("teacherPunctualityRate", safeGet("teacherPunctualityRate", "0"))
          result = await saveAttendance(attendanceFormData)
          break
        case 3: // Staffing
          const staffingFormData = new FormData()
          staffingFormData.append("reportId", reportId)
          staffingFormData.append("totalStaffEntitlement", safeGet("totalStaffEntitlement", "0"))
          staffingFormData.append("totalCurrentTeachers", safeGet("currentTeachersOnStaff", "0"))
          staffingFormData.append("underStaffedBy", safeGet("underStaffedBy", "0"))
          staffingFormData.append("overStaffedBy", safeGet("overStaffedBy", "0"))
          staffingFormData.append("secondmentAttendanceCert", formDataObj.secondmentCertificatesPrepared ? "true" : "false")
          
          // Prepare teacher status updates as JSON for the database
          const teacherStatusUpdates: any[] = []

          // Teachers who left the school
          const teachersWhoLeft = safeGetArray("teachersWhoLeft")
          teachersWhoLeft.forEach((teacher: any) => {
            if (teacher && teacher.name && teacher.name.trim()) {
              teacherStatusUpdates.push({
                report_id: reportId,
                category: "left_school",
                name: teacher.name,
                status: teacher.status || "",
                reason: teacher.reason || "",
                offence: null,
                days_absent: null,
                action_taken: null
              })
            }
          })

          // Teachers on special leave
          const specialLeave = safeGetArray("specialLeave")
          specialLeave.forEach((teacher: any) => {
            if (teacher && teacher.name && teacher.name.trim()) {
              teacherStatusUpdates.push({
                report_id: reportId,
                category: "special_leave",
                name: teacher.name,
                status: teacher.status || "",
                reason: null,
                offence: teacher.offence || "",
                days_absent: null,
                action_taken: null
              })
            }
          })

          // Teachers who assumed duty
          const teachersAssumedDuty = safeGetArray("teachersAssumedDuty")
          teachersAssumedDuty.forEach((teacher: any) => {
            if (teacher && teacher.name && teacher.name.trim()) {
              teacherStatusUpdates.push({
                report_id: reportId,
                category: "assumed_duty",
                name: teacher.name,
                status: teacher.status || "",
                reason: null,
                offence: null,
                days_absent: null,
                action_taken: null
              })
            }
          })

          // Teachers not reported for duty
          const teachersNotReported = safeGetArray("teachersNotReported")
          teachersNotReported.forEach((teacher: any) => {
            if (teacher && teacher.name && teacher.name.trim()) {
              teacherStatusUpdates.push({
                report_id: reportId,
                category: "not_reported",
                name: teacher.name,
                status: teacher.status || "",
                reason: teacher.reason || "",
                offence: null,
                days_absent: teacher.daysAbsent ? parseInt(teacher.daysAbsent) : null,
                action_taken: teacher.actionTaken || ""
              })
            }
          })

          // Teachers without salary
          const teachersWithoutSalary = safeGetArray("teachersWithoutSalary")
          teachersWithoutSalary.forEach((teacher: any) => {
            if (teacher && teacher.name && teacher.name.trim()) {
              teacherStatusUpdates.push({
                report_id: reportId,
                category: "without_salary",
                name: teacher.name,
                status: teacher.status || "",
                reason: teacher.reason || "",
                offence: null,
                days_absent: null,
                action_taken: null
              })
            }
          })

          // Check if we have any meaningful teacher status data
          const hasTeacherStatusData = teacherStatusUpdates.length > 0
          const allArraysEmpty = !hasTeacherStatusData && 
            (!safeGetArray("teachersWhoLeft").some((t: any) => t?.name?.trim()) &&
             !safeGetArray("specialLeave").some((t: any) => t?.name?.trim()) &&
             !safeGetArray("teachersAssumedDuty").some((t: any) => t?.name?.trim()) &&
             !safeGetArray("teachersNotReported").some((t: any) => t?.name?.trim()) &&
             !safeGetArray("teachersWithoutSalary").some((t: any) => t?.name?.trim()))

          // Only save if we have actual data or if this is not just from auto-loading
          if (allArraysEmpty && changedFields.size === 0) {
         //   console.log("Skipping save of empty teacher status data")
            return { success: true, message: "No teacher status changes to save" }
          }

          // Add the teacher status data as JSON string
          staffingFormData.append("teacherStatusData", JSON.stringify(teacherStatusUpdates))
          
          result = await saveStaffing(staffingFormData)
          break
        case 4: // Staff Development
          const staffDevFormData = new FormData()
          staffDevFormData.append("reportId", reportId)
          staffDevFormData.append("pdSessionHeld", formData.wholeschoolPDHeld !== null ? formData.wholeschoolPDHeld.toString() : "")
          staffDevFormData.append("percentageAttended", formData.teachersAttendedPD)
          staffDevFormData.append("pdTopic", formData.pdTopic)
          staffDevFormData.append("outcomes", formData.pdOutcomes)
          staffDevFormData.append("reason", formData.pdTopicReason)
          result = await saveStaffDevelopment(staffDevFormData)
          break
        case 5: // Supervision
          const supervisionFormData = new FormData()
          supervisionFormData.append("reportId", reportId)
          supervisionFormData.append("hmLessonsObserved", safeGet("hmLessonsObserved", "0"))
          supervisionFormData.append("hmPositiveFindings", safeGet("hmPositiveFindings", ""))
          supervisionFormData.append("hmNegativeFindings", safeGet("hmNegativeFindings", ""))
          supervisionFormData.append("hmFollowUpActions", safeGet("hmFollowUpActions", ""))
          supervisionFormData.append("dhmLessonsObserved", safeGet("dhmLessonsObserved", "0"))
          supervisionFormData.append("dhmPositiveFindings", safeGet("dhmPositiveFindings", ""))
          supervisionFormData.append("dhmNegativeFindings", safeGet("dhmNegativeFindings", ""))
          supervisionFormData.append("dhmFollowUpActions", safeGet("dhmFollowUpActions", ""))
          supervisionFormData.append("groupHeadLessonsObserved", safeGet("groupHeadLessonsObserved", "0"))
          supervisionFormData.append("groupHeadPositiveFindings", safeGet("groupHeadPositiveFindings", ""))
          supervisionFormData.append("groupHeadNegativeFindings", safeGet("groupHeadNegativeFindings", ""))
          supervisionFormData.append("groupHeadFollowUpActions", safeGet("groupHeadFollowUpActions", ""))
          supervisionFormData.append("hodLessonsObserved", safeGet("hodLessonsObserved", "0"))
          supervisionFormData.append("hodPositiveFindings", safeGet("hodPositiveFindings", ""))
          supervisionFormData.append("hodNegativeFindings", safeGet("hodNegativeFindings", ""))
          supervisionFormData.append("hodFollowUpActions", safeGet("hodFollowUpActions", ""))
          result = await saveSupervision(supervisionFormData)
          break
        case 6: // Curriculum Monitoring
          const curriculumFormData = new FormData()
          curriculumFormData.append("reportId", reportId)
          curriculumFormData.append("teachersNoLessonPlans", safeGet("teachersNoLessonPlans", "0"))
          curriculumFormData.append("curriculumActionsTaken", safeGet("curriculumActionsTaken", ""))
          result = await saveCurriculum(curriculumFormData)
          break
        case 7: // Finance
          const financeFormData = new FormData()
          financeFormData.append("reportId", reportId)
          financeFormData.append("openingBalance", safeGet("openingBalance", "0"))
          financeFormData.append("totalIncome", safeGet("totalIncome", "0"))
          financeFormData.append("totalExpenditure", safeGet("totalExpenditure", "0"))
          financeFormData.append("closingBalance", safeGet("closingBalance", "0"))
          const expenditureDetails = safeGetArray("expenditureDetails")
          expenditureDetails.forEach((expense: any, index: number) => {
            if (expense && expense.description && expense.description.trim()) {
              financeFormData.append(`expense_${index}_description`, expense.description)
              financeFormData.append(`expense_${index}_amount`, expense.amount || "0")
              financeFormData.append(`expense_${index}_date`, expense.date || "")
            }
          })
          result = await saveFinance(financeFormData)
          break
        case 8: // Income Sources
          const incomeFormData = new FormData()
          incomeFormData.append("reportId", reportId)
          const incomeSources = safeGetArray("incomeSources")
          
          // Prepare income sources as JSON for the database
          const incomeSourcesData: any[] = []
          incomeSources.forEach((income: any) => {
            if (income && income.source && income.source.trim()) {
              incomeSourcesData.push({
                source: income.source.trim(),
                amount: income.amount || "0"
              })
            }
          })
          
          incomeFormData.append("incomeSourcesData", JSON.stringify(incomeSourcesData))
          result = await saveIncome(incomeFormData)
          break
        case 9: // Accident & Safety
          const accidentFormData = new FormData()
          accidentFormData.append("reportId", reportId)
          
          // Main safety fields
          accidentFormData.append("evacuationDrill", formData.evacuationDrillHeld !== null ? (formData.evacuationDrillHeld ? "yes" : "no") : "")
          accidentFormData.append("personsInvolvedDrill", formData.personsInvolved || "0")
          accidentFormData.append("timeTakenDrill", formData.timeTaken || "0")
          accidentFormData.append("observationsDrill", formData.drillObservations || "")
          accidentFormData.append("classroomFirebuckets", formData.classroomsHaveFireBuckets !== null ? (formData.classroomsHaveFireBuckets ? "yes" : "no") : "")
          accidentFormData.append("functionalFireExtinguishers", formData.fireExtinguishersFunctional !== null ? (formData.fireExtinguishersFunctional ? "yes" : "no") : "")
          accidentFormData.append("totalAccidents", formData.numberOfIncidents || "0")
          accidentFormData.append("totalStudentsInvolved", formData.studentsInvolved || "0")
          accidentFormData.append("totalTeachersInvolved", formData.teachersInvolvedIncidents || "0")
          accidentFormData.append("actions", formData.preventionActions || "")
          
          result = await saveAccidentSafety(accidentFormData)
          break
        case 10: // Staff Meetings
          const staffMeetingsData = {
            generalMeetingHeld: formData.generalStaffMeetingHeld,
            keyIssuesDiscussed: formData.keyIssuesDiscussed,
            decisionsImplemented: formData.decisionsImplemented
          }
          result = await saveStaffMeetings(reportId, staffMeetingsData)
          break
        case 11: // Physical Facilities
          const facilitiesData = {
            repairsNeeded: formData.repairsNeeded,
            teacherToiletsFunctional: formData.teacherToiletsFunctional,
            teacherSinksFunctional: formData.teacherSinksFunctional,
            teacherTapsFunctional: formData.teacherTapsFunctional,
            studentToiletsFunctional: formData.studentToiletsFunctional,
            studentSinksFunctional: formData.studentSinksFunctional,
            studentTapsFunctional: formData.studentTapsFunctional,
            overcrowdedClassrooms: formData.overcrowdedClassrooms
          }
          result = await savePhysicalFacilities(reportId, facilitiesData)
          break
        case 12: // Resources Needed
          const resourcesData = {
            curriculumResources: formData.curriculumResources,
            janitorialSupplies: formData.janitorialSupplies,
            otherIssues: formData.otherIssues
          }
          result = await saveResourcesNeeded(reportId, resourcesData)
          break
        case 13: // Physical Education
          const physicalEducationFormData = new FormData()
          physicalEducationFormData.append("reportId", reportId)
          // Convert arrays to comma-separated strings with type safety
          const activitiesArray = Array.isArray(formDataObj.physicalEducationActivities) 
            ? formDataObj.physicalEducationActivities 
            : []
          const challengesArray = Array.isArray(formDataObj.physicalEducationChallenges) 
            ? formDataObj.physicalEducationChallenges 
            : []
          
          const activitiesString = activitiesArray
            .map((item: any) => item.activity)
            .filter((activity: any) => activity && activity.trim())
            .join(', ')
          const challengesString = challengesArray
            .map((item: any) => item.challenge)
            .filter((challenge: any) => challenge && challenge.trim())
            .join(', ')
          physicalEducationFormData.append("activities", activitiesString)
          physicalEducationFormData.append("challenges", challengesString)
          result = await savePhysicalEducation(physicalEducationFormData)
          break
        default:
          // For unknown sections, just mark as successful to avoid errors
          result = { success: true }
          break
      }

      if (result.success && markComplete) {
        setSavedSections((prev) => new Set(prev).add(sectionIndex))
      }

      return result.success
    } catch (error) {
      console.error(`Error saving section ${sectionIndex}:`, error)
      return false
    }
  }

  // Helper function to handle form field changes and track modifications
  const handleFieldChange = (fieldName: string, value: any) => {
    // Get original data for current section
    const originalData = originalSectionData[currentSection] || {}
    const originalValue = originalData[fieldName]
    
    // Normalize values for comparison (handle empty strings, null, undefined)
    const normalizedValue = value === null || value === undefined ? "" : String(value)
    const normalizedOriginal = originalValue === null || originalValue === undefined ? "" : String(originalValue)
    
    // Check if the value has actually changed from the original
    const hasChanged = normalizedValue !== normalizedOriginal
    
    // Update form data first
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))

    // Update change tracking
    if (hasChanged) {
      setChangedFields(prev => new Set(prev).add(fieldName))
      setHasUnsavedChanges(true)
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(fieldName)
        // Check if any other fields are still changed
        setHasUnsavedChanges(newSet.size > 0)
        return newSet
      })
    }
  }

  // Save current section data if changes were made before navigating
  const saveCurrentSectionIfChanged = async (): Promise<boolean> => {
    if (changedFields.size === 0) {
      // No changes made, don't save
      return true
    }

    if (!reportId) {
      toast({
        title: "Error",
        description: "Report ID is required to save data.",
        variant: "destructive",
      })
      return false
    }

    setIsSavingSection(true)
    try {
      const success = await handleSectionSave(currentSection, formData, true)
      if (success) {
        // Clear changed fields and mark section as saved
        setChangedFields(new Set())
        setSavedSections(prev => new Set(prev).add(currentSection))
        setHasUnsavedChanges(false)
        
        toast({
          title: "Section saved",
          description: `Section ${currentSection + 1} data has been saved.`,
          duration: 2000,
        })
        return true
      } else {
        toast({
          title: "Save failed",
          description: "Failed to save section data. Please try again.",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error saving section:', error)
      toast({
        title: "Save failed",
        description: "An error occurred while saving. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSavingSection(false)
    }
  }

  // Load section data from database
  const loadSectionData = async (sectionIndex: number) => {
    if (!reportId) return

    setIsLoadingSection(true)
    try {
      let result: any
      switch (sectionIndex) {
        case 1:
          result = await getStudentEnrollment(reportId)
          break
        case 2:
          result = await getAttendance(reportId)
          break
        case 3:
          result = await getStaffing(reportId)
          break
        case 4:
          result = await getStaffDevelopment(reportId)
          break
        case 5:
          result = await getSupervision(reportId)
          break
        case 6:
          result = await getCurriculum(reportId)
          break
        case 7:
          result = await getFinance(reportId)
          break
        case 8:
          result = await getIncome(reportId)
          break
        case 9:
          result = await getAccidentSafety(reportId)
          break
        case 10:
          result = await getStaffMeetings(reportId)
          break
        case 11:
          result = await getPhysicalFacilities(reportId)
          break
        case 12:
          result = await getResourcesNeeded(reportId)
          break
        case 13:
          result = await getPhysicalEducation(reportId)
          break
        default:
          return
      }

      if ((result as any)?.success && (result as any).data) {
       // console.log(`Loading data for section ${sectionIndex}:`, result.data)
        
        // Store original data for this section
        setOriginalSectionData(prev => ({
          ...prev,
          [sectionIndex]: (result as any).data
        }))

        // Update form data with loaded data (without triggering change detection)
        if (sectionIndex === 3) {
          // Special handling for Teacher Status section (case 3)
         // console.log("Loading Teacher Status data:", result.data)
          const { staffing, teacherStatusUpdates } = (result as any).data
          
          // Only update if we have valid teacherStatusUpdates
          if (teacherStatusUpdates) {
            setFormData(prev => ({
              ...prev,
              totalStaffEntitlement: staffing?.total_staff_entitlement?.toString() || "",
              currentTeachersOnStaff: staffing?.total_current_teachers?.toString() || "",
              underStaffedBy: staffing?.under_staffed_by?.toString() || "",
              overStaffedBy: staffing?.over_staffed_by?.toString() || "",
              secondmentCertificatesPrepared: staffing?.secondment_attendance_cert || false,
              teachersWhoLeft: teacherStatusUpdates.leftSchool?.length > 0 
                ? teacherStatusUpdates.leftSchool.map((t: any) => ({ name: t.name, status: t.status, reason: t.reason }))
                : (prev.teachersWhoLeft?.length > 0 ? prev.teachersWhoLeft : [{ name: "", status: "", reason: "" }]),
              specialLeave: teacherStatusUpdates.specialLeave?.length > 0 
                ? teacherStatusUpdates.specialLeave.map((t: any) => ({ name: t.name, status: t.status, offence: t.offence }))
                : (prev.specialLeave?.length > 0 ? prev.specialLeave : [{ name: "", status: "", offence: "" }]),
              teachersAssumedDuty: teacherStatusUpdates.assumedDuty?.length > 0 
                ? teacherStatusUpdates.assumedDuty.map((t: any) => ({ name: t.name, status: t.status }))
                : (prev.teachersAssumedDuty?.length > 0 ? prev.teachersAssumedDuty : [{ name: "", status: "" }]),
              teachersNotReported: teacherStatusUpdates.notReported?.length > 0 
                ? teacherStatusUpdates.notReported.map((t: any) => ({ 
                    name: t.name, 
                    status: t.status, 
                    reason: t.reason, 
                    daysAbsent: t.days_absent?.toString() || "", 
                    actionTaken: t.action_taken 
                  }))
                : (prev.teachersNotReported?.length > 0 ? prev.teachersNotReported : [{ name: "", status: "", reason: "", daysAbsent: "", actionTaken: "" }]),
              teachersWithoutSalary: teacherStatusUpdates.didNotReceiveSalary?.length > 0 
                ? teacherStatusUpdates.didNotReceiveSalary.map((t: any) => ({ name: t.name, status: t.status, reason: t.reason }))
                : (prev.teachersWithoutSalary?.length > 0 ? prev.teachersWithoutSalary : [{ name: "", status: "", reason: "" }]),
            }))
          } else {
           // console.log("No teacherStatusUpdates found, keeping existing form data")
            // Just update staffing data, keep existing teacher status arrays
            setFormData(prev => ({
              ...prev,
              totalStaffEntitlement: staffing?.total_staff_entitlement?.toString() || prev.totalStaffEntitlement,
              currentTeachersOnStaff: staffing?.total_current_teachers?.toString() || prev.currentTeachersOnStaff,
              underStaffedBy: staffing?.under_staffed_by?.toString() || prev.underStaffedBy,
              overStaffedBy: staffing?.over_staffed_by?.toString() || prev.overStaffedBy,
              secondmentCertificatesPrepared: staffing?.secondment_attendance_cert ?? prev.secondmentCertificatesPrepared,
            }))
          }
        } else if (sectionIndex === 10) {
          // Special handling for Staff Meetings section (case 10)
        //  console.log("Loading Staff Meetings data:", result.data)
          // console.log("Setting form fields:", {
          //   generalStaffMeetingHeld: result.data.generalMeetingHeld,
          //   keyIssuesDiscussed: result.data.keyIssuesDiscussed || "",
          //   decisionsImplemented: result.data.decisionsImplemented || "0",
          // })
          
          setFormData(prev => {
            const newData = {
              ...prev,
              generalStaffMeetingHeld: (result as any).data.generalMeetingHeld,
              keyIssuesDiscussed: (result as any).data.keyIssuesDiscussed || "",
              decisionsImplemented: (result as any).data.decisionsImplemented || "0",
            }
          //  console.log("Updated form data:", newData)
            return newData
          })
        } else if (sectionIndex === 13) {
          // Special handling for Physical Education section (case 13)
        //  console.log("Loading Physical Education data:", result.data)
          
          // Convert comma-separated strings back to arrays
          const activitiesString = (result as any).data.physicalEducationActivities || ""
          const challengesString = (result as any).data.physicalEducationChallenges || ""
          
          // console.log("Raw Physical Education strings:", {
          //   activitiesString,
          //   challengesString
          // })
          
          const activitiesArray = activitiesString.length > 0 
            ? activitiesString.split(',')
                .map((activity: string) => activity.trim())
                .filter((activity: string) => activity.length > 0)
                .map((activity: string) => ({ activity }))
            : []
            
          const challengesArray = challengesString.length > 0
            ? challengesString.split(',')
                .map((challenge: string) => challenge.trim())
                .filter((challenge: string) => challenge.length > 0)
                .map((challenge: string) => ({ challenge }))
            : []
          
          // console.log("Converted Physical Education arrays:", {
          //   activitiesArray,
          //   challengesArray
          // })
          
          setFormData(prev => ({
            ...prev,
            physicalEducationActivities: activitiesArray,
            physicalEducationChallenges: challengesArray,
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            ...(result as any).data
          }))
        }

        // Clear changed fields since we just loaded fresh data from database
        setChangedFields(new Set())
        setHasUnsavedChanges(false)

        // Mark this section as saved since we just loaded existing data
        // For Teacher Status section, only mark as saved if we actually have data
        if (sectionIndex === 3) {
          const { teacherStatusUpdates } = (result as any).data
          if (teacherStatusUpdates && (
            teacherStatusUpdates.leftSchool?.length > 0 ||
            teacherStatusUpdates.specialLeave?.length > 0 ||
            teacherStatusUpdates.assumedDuty?.length > 0 ||
            teacherStatusUpdates.notReported?.length > 0 ||
            teacherStatusUpdates.didNotReceiveSalary?.length > 0
          )) {
            setSavedSections(prev => new Set(prev).add(sectionIndex))
          }
        } else if (sectionIndex === 10) {
          // Staff Meetings section - only mark as saved if we have data
          if ((result as any).data.generalMeetingHeld !== null || 
              (result as any).data.keyIssuesDiscussed || 
              (result as any).data.decisionsImplemented !== "0") {
            setSavedSections(prev => new Set(prev).add(sectionIndex))
          }
        } else {
          setSavedSections(prev => new Set(prev).add(sectionIndex))
        }
      } else {
     //   console.log(`No existing data found for section ${sectionIndex}`)
        
        // No existing data for this section, clear original data
        setOriginalSectionData(prev => ({
          ...prev,
          [sectionIndex]: {}
        }))
        
        // Clear changed fields for empty section
        setChangedFields(new Set())
        setHasUnsavedChanges(false)
        
        // Remove from saved sections since there's no data
        setSavedSections(prev => {
          const newSet = new Set(prev)
          newSet.delete(sectionIndex)
          return newSet
        })
      }
    } catch (error) {
      console.error(`Error loading section ${sectionIndex} data:`, error)
    } finally {
      setIsLoadingSection(false)
    }
  }

  const nextSection = async () => {
    if (currentSection < SECTIONS.length - 1) {
      // Save current section if there are changes
      const saved = await saveCurrentSectionIfChanged()
      if (saved) {
        const newSection = currentSection + 1
        setCurrentSection(newSection)
        // Load data for the new section
        await loadSectionData(newSection)
      }
    }
  }

  const prevSection = async () => {
    if (currentSection > 0) {
      // Save current section if there are changes
      const saved = await saveCurrentSectionIfChanged()
      if (saved) {
        const newSection = currentSection - 1
        setCurrentSection(newSection)
        // Load data for the previous section
        await loadSectionData(newSection)
      }
    }
  }

  const handleSubmit = async () => {
    if (currentSection === 0) {
      // Validate required fields
      if (!formData.schoolLevel || !formData.schoolGrade) {
        alert("Please fill in all required fields (School Level and School Grade)")
        return
      }

      // Check if user has a school assigned
      if (!currentUser?.school_id) {
        alert("No school is assigned to your profile. Please contact your administrator.")
        return
      }

      // Save basic information to hmr_report table
      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("schoolName", formData.schoolName)
      formDataToSubmit.append("educationDistrict", formData.educationDistrict) // This gets stored as region_id in the database
      formDataToSubmit.append("schoolLevel", formData.schoolLevel) // School level name
      formDataToSubmit.append("schoolGrade", formData.schoolGrade) // School grade

      // Extract month and year from the month field (e.g., "January 2024")
      let monthNumber, year

      if (previousReportData) {
        // Use the previous report data
        monthNumber = previousReportData.month
        year = previousReportData.year.toString()
      } else {
        // Use current month logic
        const monthYear = formData.month.split(" ")
        const monthName = monthYear[0]
        year = monthYear[1]
        // Convert month name to number using the correct year
        monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1
      }

      formDataToSubmit.append("month", monthNumber.toString())
      formDataToSubmit.append("year", year)

      const result = await createHmrReport(formDataToSubmit)

      if (result.error) {
        if (result.isSubmitted) {
          // Report already submitted for this month
          setIsCurrentMonthSubmitted(true)
          alert("A report has already been submitted for this month. You cannot create or edit reports for months that have already been submitted.")
        } else {
          alert(`Error: ${result.error}`)
        }
        setIsSubmitting(false)
        return
      }

      if (result.success && result.reportId) {
        setReportId(result.reportId)
        // Update form data to include the saved report ID
        setFormData((prev) => ({ ...prev, reportId: result.reportId }))
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(0))
        // Show success message with better UX
       
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 1) {
      // Save student enrollment data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("totalStudents", formData.totalStudentsEnrolled)
      formDataToSubmit.append("totalTransferredIn", formData.studentsTransferredIn)
      formDataToSubmit.append("totalTransferredOut", formData.studentsTransferredOut)

      const result = await saveStudentEnrollment(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(1))
 
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 2) {
      // Save attendance data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("studentAttendanceRate", formData.studentAttendanceRate)
      formDataToSubmit.append("studentPunctualityRate", formData.studentPunctualityRate)
      formDataToSubmit.append("teacherAttendanceRate", formData.teacherAttendanceRate)
      formDataToSubmit.append("teacherPunctualityRate", formData.teacherPunctualityRate)

      const result = await saveAttendance(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(2))
        
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 3) {
      // Save staffing data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      // Prepare teacher status data
      const teacherStatusRecords: Array<{
        report_id: string
        category: string
        name: string
        status: string
        reason: string | null
        offence: string | null
        days_absent: number | null
        action_taken: string | null
      }> = []

      // Teachers who left the school
      formData.teachersWhoLeft.forEach(teacher => {
        if (teacher.name.trim()) {
          teacherStatusRecords.push({
            report_id: reportId,
            category: 'Left School',
            name: teacher.name,
            status: teacher.status,
            reason: teacher.reason,
            offence: null,
            days_absent: null,
            action_taken: null
          })
        }
      })

      // Special leave
      formData.specialLeave.forEach(teacher => {
        if (teacher.name.trim()) {
          teacherStatusRecords.push({
            report_id: reportId,
            category: 'Special Leave',
            name: teacher.name,
            status: teacher.status,
            reason: null,
            offence: teacher.offence,
            days_absent: null,
            action_taken: null
          })
        }
      })

      // Assumed duty
      formData.teachersAssumedDuty.forEach(teacher => {
        if (teacher.name.trim()) {
          teacherStatusRecords.push({
            report_id: reportId,
            category: 'Assumed Duty',
            name: teacher.name,
            status: teacher.status,
            reason: null,
            offence: null,
            days_absent: null,
            action_taken: null
          })
        }
      })

      // Not reported
      formData.teachersNotReported.forEach(teacher => {
        if (teacher.name.trim()) {
          teacherStatusRecords.push({
            report_id: reportId,
            category: 'Not Reported',
            name: teacher.name,
            status: teacher.status,
            reason: teacher.reason,
            offence: null,
            days_absent: teacher.daysAbsent ? Number.parseInt(teacher.daysAbsent) : null,
            action_taken: teacher.actionTaken
          })
        }
      })

      // Did not receive salary
      formData.teachersWithoutSalary.forEach(teacher => {
        if (teacher.name.trim()) {
          teacherStatusRecords.push({
            report_id: reportId,
            category: 'Did Not Receive Salary',
            name: teacher.name,
            status: teacher.status,
            reason: teacher.reason,
            offence: null,
            days_absent: null,
            action_taken: null
          })
        }
      })

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("totalStaffEntitlement", formData.totalStaffEntitlement)
      formDataToSubmit.append("totalCurrentTeachers", formData.currentTeachersOnStaff)
      formDataToSubmit.append("underStaffedBy", formData.underStaffedBy)
      formDataToSubmit.append("overStaffedBy", formData.overStaffedBy)
      formDataToSubmit.append("secondmentAttendanceCert", (formData.secondmentCertificatesPrepared ?? false).toString())
      formDataToSubmit.append("teacherStatusData", JSON.stringify(teacherStatusRecords))

      const result = await saveStaffing(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(3))

        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 4) {
      // Save staff development data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("pdSessionHeld", formData.wholeschoolPDHeld !== null ? formData.wholeschoolPDHeld.toString() : "")
      formDataToSubmit.append("percentageAttended", formData.teachersAttendedPD)
      formDataToSubmit.append("pdTopic", formData.pdTopic)
      formDataToSubmit.append("outcomes", formData.pdOutcomes)
      formDataToSubmit.append("reason", formData.pdTopicReason)

      const result = await saveStaffDevelopment(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(4))
        
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 5) {
      // Save supervision data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("hmLessonsObserved", formData.hmLessonsObserved)
      formDataToSubmit.append("hmPositiveFindings", formData.hmPositiveFindings)
      formDataToSubmit.append("hmNegativeFindings", formData.hmNegativeFindings)
      formDataToSubmit.append("hmFollowUpActions", formData.hmFollowUpActions)
      formDataToSubmit.append("dhmLessonsObserved", formData.dhmLessonsObserved)
      formDataToSubmit.append("dhmPositiveFindings", formData.dhmPositiveFindings)
      formDataToSubmit.append("dhmNegativeFindings", formData.dhmNegativeFindings)
      formDataToSubmit.append("dhmFollowUpActions", formData.dhmFollowUpActions)
      formDataToSubmit.append("groupHeadLessonsObserved", formData.groupHeadLessonsObserved)
      formDataToSubmit.append("groupHeadPositiveFindings", formData.groupHeadPositiveFindings)
      formDataToSubmit.append("groupHeadNegativeFindings", formData.groupHeadNegativeFindings)
      formDataToSubmit.append("groupHeadFollowUpActions", formData.groupHeadFollowUpActions)
      formDataToSubmit.append("hodLessonsObserved", formData.hodLessonsObserved)
      formDataToSubmit.append("hodPositiveFindings", formData.hodPositiveFindings)
      formDataToSubmit.append("hodNegativeFindings", formData.hodNegativeFindings)
      formDataToSubmit.append("hodFollowUpActions", formData.hodFollowUpActions)

      const result = await saveSupervision(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(5))
      
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 6) {
      // Save curriculum data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("teachersNoLessonPlans", formData.teachersNoLessonPlans)
      formDataToSubmit.append("curriculumActionsTaken", formData.curriculumActionsTaken)

      const result = await saveCurriculum(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(6))
       
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 7) {
      // Save finance data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("openingBalance", formData.openingBalance)
      formDataToSubmit.append("totalIncome", formData.totalIncome)
      formDataToSubmit.append("totalExpenditure", formData.totalExpenditure)
      formDataToSubmit.append("closingBalance", formData.closingBalance)

      const result = await saveFinance(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(7))
       
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 8) {
      // Save income sources data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("incomeSourcesData", JSON.stringify(formData.incomeSources))

      const result = await saveIncome(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(8))
       
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 9) {
      // Save accident safety data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("reportId", reportId)
      formDataToSubmit.append("evacuationDrill", formData.evacuationDrillHeld !== null ? (formData.evacuationDrillHeld ? "yes" : "no") : "")
      formDataToSubmit.append("personsInvolvedDrill", formData.personsInvolved)
      formDataToSubmit.append("timeTakenDrill", formData.timeTaken)
      formDataToSubmit.append("observationsDrill", formData.drillObservations)
      formDataToSubmit.append("classroomFirebuckets", formData.classroomsHaveFireBuckets !== null ? (formData.classroomsHaveFireBuckets ? "yes" : "no") : "")
      formDataToSubmit.append("functionalFireExtinguishers", formData.fireExtinguishersFunctional !== null ? (formData.fireExtinguishersFunctional ? "yes" : "no") : "")
      formDataToSubmit.append("totalAccidents", formData.numberOfIncidents)
      formDataToSubmit.append("totalStudentsInvolved", formData.studentsInvolved)
      formDataToSubmit.append("totalTeachersInvolved", formData.teachersInvolvedIncidents)
      formDataToSubmit.append("actions", formData.preventionActions)

      const result = await saveAccidentSafety(formDataToSubmit)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(9))
  
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 10) {
      // Save staff meetings data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const staffMeetingsData = {
        generalMeetingHeld: formData.generalStaffMeetingHeld,
        keyIssuesDiscussed: formData.keyIssuesDiscussed,
        decisionsImplemented: formData.decisionsImplemented
      }

      const result = await saveStaffMeetings(reportId, staffMeetingsData)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(10))
       
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 11) {
      // Save physical facilities data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const facilitiesData = {
        repairsNeeded: formData.repairsNeeded,
        teacherToiletsFunctional: formData.teacherToiletsFunctional,
        teacherSinksFunctional: formData.teacherSinksFunctional,
        teacherTapsFunctional: formData.teacherTapsFunctional,
        studentToiletsFunctional: formData.studentToiletsFunctional,
        studentSinksFunctional: formData.studentSinksFunctional,
        studentTapsFunctional: formData.studentTapsFunctional,
        overcrowdedClassrooms: formData.overcrowdedClassrooms
      }

      const result = await savePhysicalFacilities(reportId, facilitiesData)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(11))
        
        nextSection() // Automatically move to next section
      }

      setIsSubmitting(false)
    } else if (currentSection === 12) {
      // Save resources needed data
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      const resourcesData = {
        curriculumResources: formData.curriculumResources,
        janitorialSupplies: formData.janitorialSupplies,
        otherIssues: formData.otherIssues
      }

      const result = await saveResourcesNeeded(reportId, resourcesData)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(12))

        // Move to next section (Physical Education)
        setCurrentSection(13)
      }

      setIsSubmitting(false)
    } else if (currentSection === 13) {
      // Save physical education data and submit report
      if (!reportId) {
        alert("Please complete the Basic Information section first.")
        return
      }

      setIsSubmitting(true)

      // First save the Physical Education data
      const physicalEducationFormData = new FormData()
      physicalEducationFormData.append("reportId", reportId)
      // Convert arrays to comma-separated strings with type safety
      const activitiesArray = Array.isArray(formData.physicalEducationActivities) 
        ? formData.physicalEducationActivities 
        : []
      const challengesArray = Array.isArray(formData.physicalEducationChallenges) 
        ? formData.physicalEducationChallenges 
        : []
      
      const activitiesString = activitiesArray
        .map(item => item.activity)
        .filter(activity => activity && activity.trim())
        .join(', ')
      const challengesString = challengesArray
        .map(item => item.challenge)
        .filter(challenge => challenge && challenge.trim())
        .join(', ')
      physicalEducationFormData.append("activities", activitiesString)
      physicalEducationFormData.append("challenges", challengesString)

      const result = await savePhysicalEducation(physicalEducationFormData)

      if (result.error) {
        alert(`Error: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        // Mark section as saved
        setSavedSections((prev) => new Set(prev).add(13))

        // Submit the entire report
        const submitResult = await submitReport(reportId)
        if (submitResult.success) {
          setReportStatus('submitted')
          setJustSubmittedReport(true)
          
          // Clear unsaved changes flag
          setHasUnsavedChanges(false)
          
          // Show success toast
          toast({
            title: "Report submitted successfully!",
            description: "Your monthly report has been submitted and can no longer be edited.",
            duration: 5000,
          })
          
          onSuccess?.()
        } else {
          alert(`Report data saved but submission failed: ${submitResult.error}`)
        }
      }

      setIsSubmitting(false)
    } else {
      // Final submission - show all data
    
      onSuccess?.()
    }
  }

  // Calculate progress based on current section
  const calculateProgress = () => {
    return ((currentSection + 1) / SECTIONS.length) * 100
  }

  // Calculate section completion percentage based on filled fields
  const calculateSectionProgress = (sectionIndex: number): number => {
    switch (sectionIndex) {
      case 0: // Basic Information
        const basicFields = [formData.schoolName, formData.educationDistrict, formData.schoolLevel, formData.schoolGrade]
        const basicCompleted = basicFields.filter(field => field && field.trim()).length
        return Math.round((basicCompleted / basicFields.length) * 100)
        
      case 1: // Student Enrollment
        const enrollmentFields = [formData.totalStudentsEnrolled, formData.studentsTransferredIn, formData.studentsTransferredOut]
        const enrollmentCompleted = enrollmentFields.filter(field => field && field.trim()).length
        return Math.round((enrollmentCompleted / enrollmentFields.length) * 100)
        
      case 2: // Attendance
        const attendanceFields = [formData.studentAttendanceRate, formData.studentPunctualityRate, formData.teacherAttendanceRate, formData.teacherPunctualityRate]
        const attendanceCompleted = attendanceFields.filter(field => field && field.trim()).length
        return Math.round((attendanceCompleted / attendanceFields.length) * 100)
        
      default:
        return 0
    }
  }

  // Update section progress when form data changes (throttled to prevent infinite loops)
  // Removed section progress tracking to disable caching

  const renderBasicInfo = () => (
    <div className="space-y-6">

      {/* Report Period Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Report Period</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Month</Label>
            <Input
              value={formData.month}
              disabled
              className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</Label>
            <Input
              value={formData.date}
              disabled
              className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* School Information Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">School Information</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Education District</Label>
            <Input
              value={formData.educationDistrict}
              disabled
              className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
              placeholder="Auto-populated"
            />
            <p className="text-xs text-slate-400">Based on your school's region</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">School Level</Label>
            <Input
              value={formData.schoolLevel}
              disabled
              className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
              placeholder="Auto-populated"
            />
            <p className="text-xs text-slate-400">Based on your school's level</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">School Name</Label>
            <Input
              value={formData.schoolName}
              disabled
              className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
              placeholder="Auto-populated"
            />
            <p className="text-xs text-slate-400">Based on your assigned school</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              School Grade {!userSchool?.grade && <span className="text-rose-500">*</span>}
            </Label>
            {userSchool?.grade ? (
              <>
                <Input
                  value={`Grade ${formData.schoolGrade}`}
                  disabled
                  className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
                />
                <p className="text-xs text-slate-400">From your school's profile</p>
              </>
            ) : (
              <>
                <Select value={formData.schoolGrade} onValueChange={(value) => updateFormData("schoolGrade", value)}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                    <SelectItem value="D">Grade D</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Please select your school's grade</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      {!userSchool && currentUser && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No School Assigned</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please contact your administrator to assign a school before submitting reports.</p>
          </div>
        </div>
      )}

      {/* User Info Card */}
      {currentUser && userSchool && (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <p className="text-slate-700 dark:text-slate-300 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Logged in as</span>{" "}
            <strong className="text-slate-900 dark:text-white">{currentUser.name}</strong>{" "}
            <span className="text-slate-500 dark:text-slate-400">from</span>{" "}
            <strong className="text-slate-900 dark:text-white">{userSchool.name}</strong>{" "}
            <span className="text-slate-500 dark:text-slate-400">in</span>{" "}
            <strong className="text-slate-900 dark:text-white">{(userSchool.sms_regions as any)?.name}</strong>
          </p>
          {reportId && (
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2 flex items-center gap-1">
              <Save className="h-3 w-3" />
              Report in progress - ID: {reportId}
            </p>
          )}
        </div>
      )}
    </div>
  )

  const renderStudentEnrolment = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving enrollment data.</p>
          </div>
        </div>
      )}

      {/* Form Fields Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Enrollment Numbers</h4>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Students Enrolled <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.totalStudentsEnrolled}
              onChange={(e) => updateFormData("totalStudentsEnrolled", e.target.value)}
              placeholder="0"
              min="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Transferred In <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.studentsTransferredIn}
              onChange={(e) => updateFormData("studentsTransferredIn", e.target.value)}
              placeholder="0"
              min="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Transferred Out <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.studentsTransferredOut}
              onChange={(e) => updateFormData("studentsTransferredOut", e.target.value)}
              placeholder="0"
              min="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg"
              required
            />
          </div>
        </div>

        {/* Inline Validation */}
        {currentSection === 1 && (
          (!formData.totalStudentsEnrolled.trim() ||
           !formData.studentsTransferredIn.trim() ||
           !formData.studentsTransferredOut.trim()) && (
            <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Please fill in all enrollment fields to continue</span>
            </div>
          )
        )}
      </div>

      {/* Summary Card */}
      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <FileTextIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Summary</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/60 dark:bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Enrolled</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formData.totalStudentsEnrolled || 0}</p>
          </div>
          <div className="p-3 bg-white/60 dark:bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Net Transfer</p>
            <p className={`text-xl font-bold ${(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0)) >= 0 ? '+' : ''}{(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAttendance = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving attendance data.</p>
          </div>
        </div>
      )}

      {/* Student Attendance Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Student Attendance
        </h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Attendance Rate <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.studentAttendanceRate}
                onChange={(e) => updateFormData("studentAttendanceRate", e.target.value)}
                placeholder="85"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-xs text-slate-400">Percentage of students present this month</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Punctuality Rate <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.studentPunctualityRate}
                onChange={(e) => updateFormData("studentPunctualityRate", e.target.value)}
                placeholder="90"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-xs text-slate-400">Percentage who arrived on time</p>
          </div>
        </div>
      </div>

      {/* Teacher Attendance Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          Teacher Attendance
        </h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Attendance Rate <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teacherAttendanceRate}
                onChange={(e) => updateFormData("teacherAttendanceRate", e.target.value)}
                placeholder="95"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-xs text-slate-400">Percentage of teachers present this month</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Punctuality Rate <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teacherPunctualityRate}
                onChange={(e) => updateFormData("teacherPunctualityRate", e.target.value)}
                placeholder="98"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-xs text-slate-400">Percentage who arrived on time</p>
          </div>
        </div>
      </div>

      {/* Inline Validation */}
      {currentSection === 2 && (
        (!formData.studentAttendanceRate.trim() ||
         !formData.studentPunctualityRate.trim() ||
         !formData.teacherAttendanceRate.trim() ||
         !formData.teacherPunctualityRate.trim()) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">All four attendance fields are required to continue</span>
          </div>
        )
      )}

      {/* Summary Card */}
      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Attendance Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Students</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formData.studentAttendanceRate || 0}%</span>
              <span className="text-xs text-slate-400">attendance</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{formData.studentPunctualityRate || 0}% punctuality</p>
          </div>
          <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Teachers</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formData.teacherAttendanceRate || 0}%</span>
              <span className="text-xs text-slate-400">attendance</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{formData.teacherPunctualityRate || 0}% punctuality</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStaffing = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving staffing data.</p>
          </div>
        </div>
      )}

      {/* Staffing Numbers Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Staffing Numbers</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Staff Entitlement <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.totalStaffEntitlement}
              onChange={(e) => updateFormData("totalStaffEntitlement", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
              required
            />
            <p className="text-xs text-slate-400">Total number of staff positions</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Current Teachers <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.currentTeachersOnStaff}
              onChange={(e) => updateFormData("currentTeachersOnStaff", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
              required
            />
            <p className="text-xs text-slate-400">Number of teachers currently on staff</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Under-Staffed By <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.underStaffedBy}
              onChange={(e) => updateFormData("underStaffedBy", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
              required
            />
            <p className="text-xs text-slate-400">Number of teachers needed</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Over-Staffed By <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.overStaffedBy}
              onChange={(e) => updateFormData("overStaffedBy", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
              required
            />
            <p className="text-xs text-slate-400">Excess number of teachers</p>
          </div>
        </div>
      </div>

      {/* Secondment Certificates Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <Label className="text-slate-700 dark:text-slate-200 text-base font-medium block mb-4">
          Were secondment attendance certificates prepared?
          <span className="text-rose-500 ml-1">*</span>
        </Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateFormData("secondmentCertificatesPrepared", true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              formData.secondmentCertificatesPrepared === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.secondmentCertificatesPrepared === true
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.secondmentCertificatesPrepared === true && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">Yes</span>
          </button>
          <button
            type="button"
            onClick={() => updateFormData("secondmentCertificatesPrepared", false)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              formData.secondmentCertificatesPrepared === false
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.secondmentCertificatesPrepared === false
                ? 'border-slate-500 bg-slate-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.secondmentCertificatesPrepared === false && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">No</span>
          </button>
        </div>
      </div>

      {/* Inline Validation */}
      {currentSection === 3 && (
        (!formData.totalStaffEntitlement.trim() ||
         !formData.currentTeachersOnStaff.trim() ||
         !formData.underStaffedBy.trim() ||
         !formData.overStaffedBy.trim() ||
         formData.secondmentCertificatesPrepared === null) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">All staffing fields are required to continue</span>
          </div>
        )
      )}

      {/* Teacher Status Reports Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Teacher Status Reports
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Report any changes in teacher status for the current month
          </p>
        </div>

        {/* Teachers who left the school */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Teachers who left the school
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersWhoLeft", { name: "", status: "", reason: "" })}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          {formData.teachersWhoLeft.map((teacher, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-4 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                placeholder="Name"
                value={teacher.name}
                onChange={(e) => {
                  const updated = [...formData.teachersWhoLeft]
                  updated[index].name = e.target.value
                  updateFormData("teachersWhoLeft", updated)
                }}
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Select
                value={teacher.status}
                onValueChange={(value) => {
                  const updated = [...formData.teachersWhoLeft]
                  updated[index].status = value
                  updateFormData("teachersWhoLeft", updated)
                }}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {teacherStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
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
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
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
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("teachersWhoLeft", index)} className="h-10 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Special Leave (Disciplinary) – With Pay */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              Teachers on Special Leave (Disciplinary) With Pay
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("specialLeave", { name: "", status: "", offence: "" })}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          {formData.specialLeave.map((teacher, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-4 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                placeholder="Name"
                value={teacher.name}
                onChange={(e) => {
                  const updated = [...formData.specialLeave]
                  updated[index].name = e.target.value
                  updateFormData("specialLeave", updated)
                }}
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Select
                value={teacher.status}
                onValueChange={(value) => {
                  const updated = [...formData.specialLeave]
                  updated[index].status = value
                  updateFormData("specialLeave", updated)
                }}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {teacherStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
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
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("specialLeave", index)} className="h-10 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Teachers Assumed Duty */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Teachers who Assumed Duty
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersAssumedDuty", { name: "", status: "" })}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          {formData.teachersAssumedDuty.map((teacher, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                placeholder="Name"
                value={teacher.name}
                onChange={(e) => {
                  const updated = [...formData.teachersAssumedDuty]
                  updated[index].name = e.target.value
                  updateFormData("teachersAssumedDuty", updated)
                }}
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Select
                value={teacher.status}
                onValueChange={(value) => {
                  const updated = [...formData.teachersAssumedDuty]
                  updated[index].status = value
                  updateFormData("teachersAssumedDuty", updated)
                }}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {teacherStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("teachersAssumedDuty", index)} className="h-10 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Teachers Not Reported for Duty */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              Teachers Not Reported for Duty
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersNotReported", { name: "", status: "", reason: "", daysAbsent: "", actionTaken: "" })}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          {formData.teachersNotReported.map((teacher, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                placeholder="Name"
                value={teacher.name}
                onChange={(e) => {
                  const updated = [...formData.teachersNotReported]
                  updated[index].name = e.target.value
                  updateFormData("teachersNotReported", updated)
                }}
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Select
                value={teacher.status}
                onValueChange={(value) => {
                  const updated = [...formData.teachersNotReported]
                  updated[index].status = value
                  updateFormData("teachersNotReported", updated)
                }}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {teacherStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
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
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
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
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
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
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("teachersNotReported", index)} className="h-10 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Teachers Without Salary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              Teachers who did not receive salary
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersWithoutSalary", { name: "", status: "", reason: "" })}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
          {formData.teachersWithoutSalary.map((teacher, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-4 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                placeholder="Name"
                value={teacher.name}
                onChange={(e) => {
                  const updated = [...formData.teachersWithoutSalary]
                  updated[index].name = e.target.value
                  updateFormData("teachersWithoutSalary", updated)
                }}
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Select
                value={teacher.status}
                onValueChange={(value) => {
                  const updated = [...formData.teachersWithoutSalary]
                  updated[index].status = value
                  updateFormData("teachersWithoutSalary", updated)
                }}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {teacherStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
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
                className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("teachersWithoutSalary", index)} className="h-10 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStaffDevelopment = () => (
    <div className="space-y-6">
      {/* Question Card */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <Label className="text-slate-700 dark:text-slate-200 text-base font-medium block mb-4">
          Was a whole school PD session held?
          <span className="text-rose-500 ml-1">*</span>
        </Label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              updateFormData("wholeschoolPDHeld", true);
            }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
              ${formData.wholeschoolPDHeld === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
              }
            `}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.wholeschoolPDHeld === true
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.wholeschoolPDHeld === true && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">Yes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              updateFormData("wholeschoolPDHeld", false);
              updateFormData("teachersAttendedPD", "");
              updateFormData("pdTopic", "");
              updateFormData("pdTopicReason", "");
              updateFormData("pdOutcomes", "");
            }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
              ${formData.wholeschoolPDHeld === false
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
              }
            `}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.wholeschoolPDHeld === false
                ? 'border-slate-500 bg-slate-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.wholeschoolPDHeld === false && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">No</span>
          </button>
        </div>

        {/* Inline validation hint */}
        {currentSection === 4 && formData.wholeschoolPDHeld === null && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Please select an option to continue</span>
          </div>
        )}
      </div>

      {/* PD Session Details Card - Show only when Yes is selected */}
      {formData.wholeschoolPDHeld === true && (
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">PD Session Details</h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                What percentage of teachers attended this session?
                <span className="text-rose-500 ml-1">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teachersAttendedPD}
                onChange={(e) => updateFormData("teachersAttendedPD", e.target.value)}
                placeholder="85"
                required
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Topic of PD session
                <span className="text-rose-500 ml-1">*</span>
              </Label>
              <Input
                value={formData.pdTopic}
                onChange={(e) => updateFormData("pdTopic", e.target.value)}
                placeholder="Enter PD topic"
                required
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Reason for choosing the topic
                <span className="text-rose-500 ml-1">*</span>
              </Label>
              <Textarea
                value={formData.pdTopicReason}
                onChange={(e) => updateFormData("pdTopicReason", e.target.value)}
                placeholder="Explain why this topic was chosen"
                rows={3}
                required
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                What were the outcomes achieved?
                <span className="text-rose-500 ml-1">*</span>
              </Label>
              <Textarea
                value={formData.pdOutcomes}
                onChange={(e) => updateFormData("pdOutcomes", e.target.value)}
                placeholder="Describe the outcomes and impact"
                rows={3}
                required
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Inline validation hint */}
            {currentSection === 4 && (!formData.teachersAttendedPD.trim() ||
              !formData.pdTopic.trim() ||
              !formData.pdTopicReason.trim() ||
              !formData.pdOutcomes.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 pt-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">All PD session fields must be filled to continue</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderSupervision = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving supervision data.</p>
          </div>
        </div>
      )}

      {/* Supervision Reports Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Supervision Reports
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Report on lesson observations conducted by different supervisory personnel
          </p>
        </div>

        {/* Head Master (HM) */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            Head Master (HM)
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Lessons Observed <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.hmLessonsObserved}
                onChange={(e) => updateFormData("hmLessonsObserved", e.target.value)}
                placeholder="0"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Positive Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.hmPositiveFindings}
                onChange={(e) => updateFormData("hmPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Negative Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.hmNegativeFindings}
                onChange={(e) => updateFormData("hmNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Follow-up Actions <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.hmFollowUpActions}
                onChange={(e) => updateFormData("hmFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          {currentSection === 5 && (
            (!formData.hmLessonsObserved.trim() || !formData.hmPositiveFindings.trim() || !formData.hmNegativeFindings.trim() || !formData.hmFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">All Head Master fields are required</span>
              </div>
            )
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Deputy HM (DHM) */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Deputy Head Master (DHM)
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Lessons Observed <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.dhmLessonsObserved}
                onChange={(e) => updateFormData("dhmLessonsObserved", e.target.value)}
                placeholder="0"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Positive Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.dhmPositiveFindings}
                onChange={(e) => updateFormData("dhmPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Negative Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.dhmNegativeFindings}
                onChange={(e) => updateFormData("dhmNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Follow-up Actions <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.dhmFollowUpActions}
                onChange={(e) => updateFormData("dhmFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          {currentSection === 5 && (
            (!formData.dhmLessonsObserved.trim() || !formData.dhmPositiveFindings.trim() || !formData.dhmNegativeFindings.trim() || !formData.dhmFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">All Deputy Head Master fields are required</span>
              </div>
            )
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Year Group Head / SM / Divisional Head */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            Year Group Head / Senior Master / Divisional Head
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Lessons Observed <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.groupHeadLessonsObserved}
                onChange={(e) => updateFormData("groupHeadLessonsObserved", e.target.value)}
                placeholder="0"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Positive Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.groupHeadPositiveFindings}
                onChange={(e) => updateFormData("groupHeadPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Negative Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.groupHeadNegativeFindings}
                onChange={(e) => updateFormData("groupHeadNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Follow-up Actions <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.groupHeadFollowUpActions}
                onChange={(e) => updateFormData("groupHeadFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          {currentSection === 5 && (
            (!formData.groupHeadLessonsObserved.trim() || !formData.groupHeadPositiveFindings.trim() || !formData.groupHeadNegativeFindings.trim() || !formData.groupHeadFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">All Year Group Head fields are required</span>
              </div>
            )
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 my-5"></div>

        {/* Head of Department (HOD) */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            Head of Department (HOD)
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Lessons Observed <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.hodLessonsObserved}
                onChange={(e) => updateFormData("hodLessonsObserved", e.target.value)}
                placeholder="0"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Positive Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.hodPositiveFindings}
                onChange={(e) => updateFormData("hodPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Negative Findings <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.hodNegativeFindings}
                onChange={(e) => updateFormData("hodNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Follow-up Actions <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.hodFollowUpActions}
                onChange={(e) => updateFormData("hodFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          {currentSection === 5 && (
            (!formData.hodLessonsObserved.trim() || !formData.hodPositiveFindings.trim() || !formData.hodNegativeFindings.trim() || !formData.hodFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">All Head of Department fields are required</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )

  const renderCurriculum = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving curriculum data.</p>
          </div>
        </div>
      )}

      {/* Curriculum Monitoring Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Lesson Plan Monitoring</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Teachers Without Lesson Plans <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.teachersNoLessonPlans}
              onChange={(e) => updateFormData("teachersNoLessonPlans", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
              required
            />
            <p className="text-xs text-slate-400">Number of teachers who did not submit</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Actions Taken <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={formData.curriculumActionsTaken}
              onChange={(e) => updateFormData("curriculumActionsTaken", e.target.value)}
              placeholder="Describe actions taken"
              rows={3}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
              required
            />
          </div>
        </div>
      </div>

      {/* Inline Validation */}
      {currentSection === 6 && (
        (!formData.teachersNoLessonPlans.trim() || !formData.curriculumActionsTaken.trim()) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">All curriculum monitoring fields are required to continue</span>
          </div>
        )
      )}
    </div>
  )

  const renderFinance = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving finance data.</p>
          </div>
        </div>
      )}

      {/* Finance Fields Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Financial Details</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Opening Balance <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">GYD</span>
              <Input
                type="number"
                value={formData.openingBalance}
                onChange={(e) => updateFormData("openingBalance", e.target.value)}
                placeholder="0.00"
                className="h-11 pl-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total Income <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">GYD</span>
              <Input
                type="number"
                value={formData.totalIncome}
                onChange={(e) => updateFormData("totalIncome", e.target.value)}
                placeholder="0.00"
                className="h-11 pl-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total Expenditure <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">GYD</span>
              <Input
                type="number"
                value={formData.totalExpenditure}
                onChange={(e) => updateFormData("totalExpenditure", e.target.value)}
                placeholder="0.00"
                className="h-11 pl-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Closing Balance <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">GYD</span>
              <Input
                type="number"
                value={formData.closingBalance}
                onChange={(e) => updateFormData("closingBalance", e.target.value)}
                placeholder="0.00"
                className="h-11 pl-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inline Validation */}
      {currentSection === 7 && (
        (!formData.openingBalance.trim() || !formData.totalIncome.trim() || !formData.totalExpenditure.trim() || !formData.closingBalance.trim()) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">All finance fields are required to continue</span>
          </div>
        )
      )}

      {/* Financial Summary Card */}
      <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Financial Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Opening</p>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">GYD {Number(formData.openingBalance || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Income</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+GYD {Number(formData.totalIncome || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Expenditure</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">-GYD {Number(formData.totalExpenditure || 0).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Closing</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">GYD {Number(formData.closingBalance || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderIncome = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving income data.</p>
          </div>
        </div>
      )}

      {/* Income Sources Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Income Sources</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add all income sources for this month</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addToArray("incomeSources", { source: "", amount: "" })}
            className="h-8 text-xs rounded-lg"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Source
          </Button>
        </div>
        <div className="space-y-3">
          {formData.incomeSources.map((income, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Source</Label>
                <Input
                  placeholder="e.g., Government Grant"
                  value={income.source}
                  onChange={(e) => {
                    const updated = [...formData.incomeSources]
                    updated[index].source = e.target.value
                    updateFormData("incomeSources", updated)
                  }}
                  className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount (GYD)</Label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={income.amount}
                  onChange={(e) => {
                    const updated = [...formData.incomeSources]
                    updated[index].amount = e.target.value
                    updateFormData("incomeSources", updated)
                  }}
                  className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("incomeSources", index)} className="h-10 text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Total Income Display */}
        {formData.incomeSources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Income</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                GYD {formData.incomeSources.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderSafety = () => (
    <div className="space-y-6">

      {!reportId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Complete Basic Information First</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please complete the Basic Information section to enable saving safety data.</p>
          </div>
        </div>
      )}

      {/* Evacuation Drill Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <Label className="text-slate-700 dark:text-slate-200 text-base font-medium block mb-4">
          Was an evacuation drill conducted this month?
          <span className="text-rose-500 ml-1">*</span>
        </Label>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => updateFormData("evacuationDrillHeld", true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              formData.evacuationDrillHeld === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.evacuationDrillHeld === true ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.evacuationDrillHeld === true && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">Yes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              updateFormData("evacuationDrillHeld", false);
              updateFormData("personsInvolved", "");
              updateFormData("timeTaken", "");
              updateFormData("drillObservations", "");
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              formData.evacuationDrillHeld === false
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.evacuationDrillHeld === false ? 'border-slate-500 bg-slate-500' : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.evacuationDrillHeld === false && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">No</span>
          </button>
        </div>

        {formData.evacuationDrillHeld === true && (
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Persons Involved <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.personsInvolved}
                onChange={(e) => updateFormData("personsInvolved", e.target.value)}
                placeholder="Enter number"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Time Taken (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.timeTaken}
                onChange={(e) => updateFormData("timeTaken", e.target.value)}
                placeholder="Enter time"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Observations <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                value={formData.drillObservations}
                onChange={(e) => updateFormData("drillObservations", e.target.value)}
                placeholder="Describe observations from the evacuation drill"
                rows={3}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fire Safety Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Fire Safety Equipment</h4>

        <div className="space-y-5">
          <div>
            <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium block mb-3">
              Are fire buckets available in classrooms? <span className="text-rose-500">*</span>
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateFormData("classroomsHaveFireBuckets", true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  formData.classroomsHaveFireBuckets === true
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="font-medium text-sm">Yes</span>
              </button>
              <button
                type="button"
                onClick={() => updateFormData("classroomsHaveFireBuckets", false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  formData.classroomsHaveFireBuckets === false
                    ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="font-medium text-sm">No</span>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium block mb-3">
              Are fire extinguishers in working condition? <span className="text-rose-500">*</span>
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateFormData("fireExtinguishersFunctional", true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  formData.fireExtinguishersFunctional === true
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="font-medium text-sm">Yes</span>
              </button>
              <button
                type="button"
                onClick={() => updateFormData("fireExtinguishersFunctional", false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  formData.fireExtinguishersFunctional === false
                    ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="font-medium text-sm">No</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Report Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Incident Report Summary</h4>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total Incidents <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.numberOfIncidents}
              onChange={(e) => updateFormData("numberOfIncidents", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Students Involved <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.studentsInvolved}
              onChange={(e) => updateFormData("studentsInvolved", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Teachers Involved <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.teachersInvolvedIncidents}
              onChange={(e) => updateFormData("teachersInvolvedIncidents", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Prevention Actions <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={formData.preventionActions}
              onChange={(e) => updateFormData("preventionActions", e.target.value)}
              placeholder="Describe actions taken to prevent future incidents"
              rows={3}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Inline Validation */}
      {currentSection === 9 && (
        (formData.evacuationDrillHeld === null ||
         formData.classroomsHaveFireBuckets === null ||
         formData.fireExtinguishersFunctional === null ||
         !formData.numberOfIncidents.trim() ||
         !formData.studentsInvolved.trim() ||
         !formData.teachersInvolvedIncidents.trim() ||
         !formData.preventionActions.trim() ||
         (formData.evacuationDrillHeld === true && (
           !formData.personsInvolved.trim() || !formData.timeTaken.trim() || !formData.drillObservations.trim()
         ))) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">All safety fields are required to continue</span>
          </div>
        )
      )}
    </div>
  )

  const renderMeetings = () => (
    <div className="space-y-6">
      {/* Question Card */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <Label className="text-slate-700 dark:text-slate-200 text-base font-medium block mb-4">
          Was a general staff meeting held this month?
          <span className="text-rose-500 ml-1">*</span>
        </Label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateFormData("generalStaffMeetingHeld", true)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
              ${formData.generalStaffMeetingHeld === true
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
              }
            `}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.generalStaffMeetingHeld === true
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.generalStaffMeetingHeld === true && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">Yes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              updateFormData("generalStaffMeetingHeld", false);
              updateFormData("keyIssuesDiscussed", "");
              updateFormData("decisionsImplemented", "");
            }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200
              ${formData.generalStaffMeetingHeld === false
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
              }
            `}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.generalStaffMeetingHeld === false
                ? 'border-slate-500 bg-slate-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {formData.generalStaffMeetingHeld === false && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="font-medium">No</span>
          </button>
        </div>

        {currentSection === 10 && formData.generalStaffMeetingHeld === null && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Please select an option to continue</span>
          </div>
        )}
      </div>


      {/* Meeting Details Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Meeting Details</h4>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              What were the key issues discussed
              {formData.generalStaffMeetingHeld === true && <span className="text-rose-500 ml-1">*</span>}
            </Label>
            <Textarea
              value={formData.keyIssuesDiscussed}
              onChange={(e) => updateFormData("keyIssuesDiscussed", e.target.value)}
              placeholder="Describe the key issues discussed in the meeting"
              rows={4}
              disabled={formData.generalStaffMeetingHeld !== true}
              required={formData.generalStaffMeetingHeld === true}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              What Percentage of decisions were implemented
              {formData.generalStaffMeetingHeld === true && <span className="text-rose-500 ml-1">*</span>}
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.decisionsImplemented}
              onChange={(e) => updateFormData("decisionsImplemented", e.target.value)}
              placeholder="Enter percentage (0-100)"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={formData.generalStaffMeetingHeld !== true}
              required={formData.generalStaffMeetingHeld === true}
            />
          </div>

          {currentSection === 10 && formData.generalStaffMeetingHeld === true && (
            !formData.keyIssuesDiscussed.trim() || !formData.decisionsImplemented.trim()
          ) && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 pt-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">All meeting details must be filled when a meeting was held</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderFacilities = () => (
    <div className="space-y-6">

      {/* Repairs Needed Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Items In Need of Repairs</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">List any areas requiring maintenance</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addToArray("repairsNeeded", { area: "", details: "" })}
            className="h-8 text-xs rounded-lg"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-3">
          {formData.repairsNeeded.map((repair, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Select
                value={repair.area}
                onValueChange={(value) => {
                  const updated = [...formData.repairsNeeded]
                  updated[index].area = value
                  updateFormData("repairsNeeded", updated)
                }}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <SelectValue placeholder="Select Area" />
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
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFromArray("repairsNeeded", index)} className="h-10 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Facilities Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Teacher Facilities Status
        </h4>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Functional Toilets <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teacherToiletsFunctional}
                onChange={(e) => updateFormData("teacherToiletsFunctional", e.target.value)}
                placeholder="100"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Working Sinks <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teacherSinksFunctional}
                onChange={(e) => updateFormData("teacherSinksFunctional", e.target.value)}
                placeholder="100"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Working Taps <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teacherTapsFunctional}
                onChange={(e) => updateFormData("teacherTapsFunctional", e.target.value)}
                placeholder="100"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Facilities Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          Student Facilities Status
        </h4>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Functional Toilets <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.studentToiletsFunctional}
                onChange={(e) => updateFormData("studentToiletsFunctional", e.target.value)}
                placeholder="100"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Working Taps <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.studentTapsFunctional}
                onChange={(e) => updateFormData("studentTapsFunctional", e.target.value)}
                placeholder="100"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Working Sinks <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.studentSinksFunctional}
                onChange={(e) => updateFormData("studentSinksFunctional", e.target.value)}
                placeholder="100"
                className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Classroom Status Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          Classroom Status
        </h4>
        <div className="space-y-2 max-w-xs">
          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Overcrowded Classrooms <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.overcrowdedClassrooms || ""}
              onChange={(e) => updateFormData("overcrowdedClassrooms", e.target.value)}
              placeholder="0"
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
          </div>
        </div>
      </div>

      {/* Inline Validation */}
      {(!formData.teacherToiletsFunctional.trim() ||
        !formData.teacherSinksFunctional.trim() ||
        !formData.teacherTapsFunctional.trim() ||
        !formData.studentToiletsFunctional.trim() ||
        !formData.studentTapsFunctional.trim() ||
        !formData.studentSinksFunctional.trim() ||
        !formData.overcrowdedClassrooms.trim()) && (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">All facility percentage fields are required to continue</span>
        </div>
      )}
    </div>
  )

  const renderResources = () => (
    <div className="space-y-6">

      {/* Resources Needed Card */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Resources Needed</h4>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Curriculum Resources
            </Label>
            <Textarea
              value={formData.curriculumResources}
              onChange={(e) => updateFormData("curriculumResources", e.target.value)}
              placeholder="List textbooks, teaching aids, or subject-specific materials required."
              rows={3}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
            <p className="text-xs text-slate-400">Textbooks, teaching aids, subject materials</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Janitorial Supplies
            </Label>
            <Textarea
              value={formData.janitorialSupplies}
              onChange={(e) => updateFormData("janitorialSupplies", e.target.value)}
              placeholder="Specify cleaning products, equipment, or hygiene materials required."
              rows={3}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
            <p className="text-xs text-slate-400">Cleaning products, equipment, hygiene materials</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Additional Issues
            </Label>
            <Textarea
              value={formData.otherIssues}
              onChange={(e) => updateFormData("otherIssues", e.target.value)}
              placeholder="Mention any other challenges impacting school operations."
              rows={3}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg"
            />
            <p className="text-xs text-slate-400">Other challenges affecting school operations</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPhysicalEducation = () => {
    // Ensure Physical Education data is always arrays
    const activities = Array.isArray(formData.physicalEducationActivities) 
      ? formData.physicalEducationActivities 
      : []
    
    const challenges = Array.isArray(formData.physicalEducationChallenges) 
      ? formData.physicalEducationChallenges 
      : []

    // Helper functions for managing dynamic lists
    const addPhysicalEducationActivity = () => {
      setFormData((prev) => ({
        ...prev,
        physicalEducationActivities: [...activities, { activity: "" }]
      }))
    }

    const removePhysicalEducationActivity = (index: number) => {
      setFormData((prev) => ({
        ...prev,
        physicalEducationActivities: activities.filter((_, i) => i !== index)
      }))
    }

    const updatePhysicalEducationActivity = (index: number, activity: string) => {
      setFormData((prev) => ({
        ...prev,
        physicalEducationActivities: activities.map((item, i) => 
          i === index ? { activity } : item
        )
      }))
    }

    const addPhysicalEducationChallenge = () => {
      setFormData((prev) => ({
        ...prev,
        physicalEducationChallenges: [...challenges, { challenge: "" }]
      }))
    }

    const removePhysicalEducationChallenge = (index: number) => {
      setFormData((prev) => ({
        ...prev,
        physicalEducationChallenges: challenges.filter((_, i) => i !== index)
      }))
    }

    const updatePhysicalEducationChallenge = (index: number, challenge: string) => {
      setFormData((prev) => ({
        ...prev,
        physicalEducationChallenges: challenges.map((item, i) => 
          i === index ? { challenge } : item
        )
      }))
    }

    return (
      <div className="space-y-6">

        {/* Physical Education Activities Card */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Physical Education Activities
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">List activities performed this month</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhysicalEducationActivity}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Activity
            </Button>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="text-sm">No activities added yet</p>
              <p className="text-xs mt-1">Click "Add Activity" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((item, index) => (
                <div key={index} className="flex gap-3 items-center p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Input
                    value={item.activity}
                    onChange={(e) => updatePhysicalEducationActivity(index, e.target.value)}
                    placeholder={`Activity ${index + 1} (e.g., Soccer, Running, Gymnastics)`}
                    className="h-10 flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhysicalEducationActivity(index)}
                    className="h-10 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Physical Education Challenges Card */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                Major Challenges
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">List challenges faced this month</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhysicalEducationChallenge}
              className="h-8 text-xs rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Challenge
            </Button>
          </div>

          {challenges.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="text-sm">No challenges added yet</p>
              <p className="text-xs mt-1">Click "Add Challenge" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((item, index) => (
                <div key={index} className="flex gap-3 items-center p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Input
                    value={item.challenge}
                    onChange={(e) => updatePhysicalEducationChallenge(index, e.target.value)}
                    placeholder={`Challenge ${index + 1} (e.g., Lack of equipment, Weather, Limited space)`}
                    className="h-10 flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhysicalEducationChallenge(index)}
                    className="h-10 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderBasicInfo()
      case 1:
        return renderStudentEnrolment()
      case 2:
        return renderAttendance()
      case 3:
        return renderStaffing()
      case 4:
        return renderStaffDevelopment()
      case 5:
        return renderSupervision()
      case 6:
        return renderCurriculum()
      case 7:
        return renderFinance()
      case 8:
        return renderIncome()
      case 9:
        return renderSafety()
      case 10:
        return renderMeetings()
      case 11:
        return renderFacilities()
      case 12:
        return renderResources()
      case 13:
        return renderPhysicalEducation()
      default:
        return renderBasicInfo()
    }
  }

  // Show loading screen while checking for existing reports to prevent glitches
  if (isInitialLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-8 md:p-12">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative z-10 text-center space-y-6">
          {/* Animated loader */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute w-20 h-20 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute w-20 h-20 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
            <FileTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Checking Report Status
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Please wait while we check if you have already submitted a report for this month...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If the current month report is already submitted AND we're not submitting a previous report, show a simple message
  if (isCurrentMonthSubmitted && !previousReportData) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl" />
        </div>
        
        <div className="relative z-10 p-8 md:p-12">
          {/* Success Icon with Animation */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute w-24 h-24 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Report Successfully Submitted
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-lg">
              Your monthly report for this period has been received and processed.
            </p>
          </div>
          
          {/* Status Card */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <FileTextIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Current Period</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {(() => {
                      const now = new Date();
                      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      return prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    })()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-3 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse" />
                  Submitted
                </span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Submissions Allowed</span>
                <span className="text-slate-900 dark:text-white font-medium">1 per month</span>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="text-center">
            <Button 
              onClick={handleViewSubmittedReport}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 text-base font-medium"
            >
              <Eye className="h-5 w-5 mr-2" />
              View Submitted Report
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-row gap-4 h-[calc(100vh-180px)] min-h-[600px]">
      {/* Sidebar Navigation - Hidden on mobile */}
      <div className="hidden lg:block lg:w-64 flex-shrink-0 h-full">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4 h-full flex flex-col">
          {/* Header */}
          <div className="mb-4 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {previousReportData ? "Previous Report" : "Monthly Report"}
            </h2>
            {previousReportData && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {previousReportData.displayName}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {Math.round(calculateProgress())}%
              </span>
            </div>
          </div>

          {/* Section List */}
          <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
            {SECTIONS.map((section, index) => {
              const isCompleted = savedSections.has(index)
              const isCurrent = index === currentSection

              return (
                <div
                  key={index}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                    ${isCurrent
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : ''
                    }
                    ${reportStatus === 'submitted' ? 'opacity-60' : ''}
                  `}
                >
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                    ${isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }
                  `}>
                    {isCompleted ? '✓' : index + 1}
                  </span>
                  <span className={`text-sm truncate ${
                    isCurrent
                      ? 'font-medium text-blue-700 dark:text-blue-300'
                      : isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {section}
                  </span>
                </div>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-xl overflow-hidden flex-1 flex flex-col">
          {/* Section Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
            {/* Mobile Progress Bar - Only visible on mobile */}
            <div className="lg:hidden mb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Step {currentSection + 1} of {SECTIONS.length}</span>
                <span>{Math.round(((currentSection + 1) / SECTIONS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentSection + 1) / SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {currentSection + 1}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                    {SECTIONS[currentSection]}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {reportStatus === 'submitted' ? 'View only mode' : 'Complete all required fields'}
                  </p>
                </div>
              </div>
              {savedSections.has(currentSection) && !hasUnsavedChanges && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Saved</span>
                </div>
              )}
              {hasUnsavedChanges && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-full">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Unsaved</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div
              className={`${reportStatus === 'submitted' ? 'pointer-events-none opacity-75' : ''}`}
              style={reportStatus === 'submitted' ? { filter: 'none' } : {}}
            >
              {renderCurrentSection()}
            </div>
          </div>

          {/* Navigation Footer - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 order-2 sm:order-1">
              <Button
                type="button"
                variant="outline"
                onClick={prevSection}
                disabled={currentSection === 0 || reportStatus === 'submitted' || isSavingSection || isLoadingSection}
                className="flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {isLoadingSection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                <span>Previous</span>
              </Button>

              {/* Continue Later Button */}
              {reportStatus !== 'submitted' && reportId && currentSection > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    toast({
                      title: "Progress saved",
                      description: "You can continue this report later from the Head Teacher dashboard.",
                      duration: 3000,
                    })
                    router.push('/dashboard/head-teacher?tab=current-report')
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Save & Exit
                </Button>
              )}
            </div>

            <div className="text-center order-1 sm:order-2 sm:hidden">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Step {currentSection + 1} of {SECTIONS.length}
              </span>
            </div>

          {reportStatus === 'submitted' ? (
            <div className="text-sm text-green-600 font-medium order-3 text-center sm:text-right">
              Report Submitted
            </div>
          ) : currentSection === SECTIONS.length - 1 ? (
            <div className="flex flex-col sm:flex-row gap-3 order-3">
              <Button
                type="button"
                onClick={async () => {
                  // Save the current section first
                  const success = await handleSectionSave(currentSection, formData, false)
                  if (success) {
                    toast({
                      title: "Section saved",
                      description: "You can review your report or submit it now.",
                      duration: 3000,
                    })
                  }
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto border border-primary-600 text-blue-600 dark:text-blue-400 hover:bg-primary-50 transition-all duration-200 flex items-center gap-2"
                variant="outline"
              >
                <Save className="h-4 w-4" />
                Save & Preview
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          ) : currentSection === 0 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !formData.schoolName || 
                !formData.educationDistrict || 
                !userSchool
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 1 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                !formData.totalStudentsEnrolled.trim() ||
                !formData.studentsTransferredIn.trim() ||
                !formData.studentsTransferredOut.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 2 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                !formData.studentAttendanceRate.trim() ||
                !formData.studentPunctualityRate.trim() ||
                !formData.teacherAttendanceRate.trim() ||
                !formData.teacherPunctualityRate.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 3 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                !formData.totalStaffEntitlement.trim() ||
                !formData.currentTeachersOnStaff.trim() ||
                !formData.underStaffedBy.trim() ||
                !formData.overStaffedBy.trim() ||
                formData.secondmentCertificatesPrepared === null
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 4 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                formData.wholeschoolPDHeld === null ||
                (formData.wholeschoolPDHeld === true && (
                  !formData.teachersAttendedPD.trim() ||
                  !formData.pdTopic.trim() ||
                  !formData.pdTopicReason.trim() ||
                  !formData.pdOutcomes.trim()
                ))
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 5 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                !formData.hmLessonsObserved.trim() ||
                !formData.hmPositiveFindings.trim() ||
                !formData.hmNegativeFindings.trim() ||
                !formData.hmFollowUpActions.trim() ||
                !formData.dhmLessonsObserved.trim() ||
                !formData.dhmPositiveFindings.trim() ||
                !formData.dhmNegativeFindings.trim() ||
                !formData.dhmFollowUpActions.trim() ||
                !formData.groupHeadLessonsObserved.trim() ||
                !formData.groupHeadPositiveFindings.trim() ||
                !formData.groupHeadNegativeFindings.trim() ||
                !formData.groupHeadFollowUpActions.trim() ||
                !formData.hodLessonsObserved.trim() ||
                !formData.hodPositiveFindings.trim() ||
                !formData.hodNegativeFindings.trim() ||
                !formData.hodFollowUpActions.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 6 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId || 
                !formData.teachersNoLessonPlans.trim() || 
                !formData.curriculumActionsTaken.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 7 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId || 
                !formData.openingBalance.trim() || 
                !formData.totalIncome.trim() || 
                !formData.totalExpenditure.trim() || 
                !formData.closingBalance.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 8 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !reportId}
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 9 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId || 
                formData.evacuationDrillHeld === null ||
                formData.classroomsHaveFireBuckets === null ||
                formData.fireExtinguishersFunctional === null ||
                !formData.numberOfIncidents.trim() ||
                !formData.studentsInvolved.trim() ||
                !formData.teachersInvolvedIncidents.trim() ||
                !formData.preventionActions.trim() ||
                (formData.evacuationDrillHeld === true && (
                  !formData.personsInvolved.trim() || 
                  !formData.timeTaken.trim() || 
                  !formData.drillObservations.trim()
                ))
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 10 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId || 
                formData.generalStaffMeetingHeld === null ||
                (formData.generalStaffMeetingHeld === true && (
                  !formData.keyIssuesDiscussed.trim() || 
                  !formData.decisionsImplemented.trim()
                ))
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 11 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                !formData.teacherToiletsFunctional.trim() ||
                !formData.teacherSinksFunctional.trim() ||
                !formData.teacherTapsFunctional.trim() ||
                !formData.studentToiletsFunctional.trim() ||
                !formData.studentTapsFunctional.trim() ||
                !formData.studentSinksFunctional.trim() ||
                !formData.overcrowdedClassrooms.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 12 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !reportId ||
                !formData.curriculumResources.trim() ||
                !formData.janitorialSupplies.trim() ||
                !formData.otherIssues.trim()
              }
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 13 ? (
            justSubmittedReport ? (
              // Show View Report button after successful submission
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  type="button"
                  onClick={handleViewSubmittedReport}
                  className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Report
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    // Refresh the form to start a new report (next month)
                    window.location.reload()
                  }}
                  variant="outline"
                  className="border-primary-300 text-blue-700 dark:text-blue-400 hover:bg-primary-50"
                >
                  Create New Report
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !reportId}
                className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                {isSubmitting ? "Saving..." : "Complete Report"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )
          ) : (
            <Button
              type="button"
              onClick={nextSection}
              disabled={isSavingSection || isLoadingSection}
              className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSavingSection ? "Saving..." : isLoadingSection ? "Loading..." : "Next"}
              {isSavingSection || isLoadingSection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
  )
}
