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
import { useAutoSave } from "@/hooks/use-auto-save"
import { useReportProgress } from "@/hooks/use-report-progress"
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

export function MonthlyReportForm({ report, onSuccess, previousReportData, reportId: initialReportId }: MonthlyReportFormProps) {
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
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  // Initialize progress tracking
  const {
    progressState,
    markSectionComplete,
    updateSectionProgress,
    setCurrentSection: setProgressCurrentSection,
    getNextIncompleteSection,
    getOverallProgress,
    clearProgress,
    resumeFromLastPosition,
    loadProgress
  } = useReportProgress(reportId, SECTIONS.length)

  // Track current section changes
  const currentSection = progressState.currentSection

  // Auto-save functionality
  const autoSaveKey = `hmr-report-${reportId || 'draft'}-${currentUser?.id || 'anonymous'}`
  
  const performAutoSave = useCallback(async (data: FormData) => {
    if (!reportId || reportStatus === 'submitted') return
    
    setIsAutoSaving(true)
    try {
      // Ensure data is in the correct format before saving
      const formDataToSave = typeof data === 'object' && !(data instanceof FormData) ? data : data
      
      // Save current section data to server
      const success = await handleSectionSave(currentSection, formDataToSave, false)
      if (success) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        // Silent auto-save - no toast notifications to avoid spam
      } else {
        // Only show error toast for failed saves
        toast({
          title: "Auto-save failed",
          description: "Changes are saved locally but server sync failed.",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
      // Only show error toast for exceptions
      toast({
        title: "Auto-save failed",
        description: "Changes are saved locally but server sync failed.",
        variant: "destructive", 
        duration: 3000,
      })
    } finally {
      setIsAutoSaving(false)
    }
  }, [reportId, reportStatus, currentSection, toast])

  const { loadFromLocalStorage, clearLocalStorage, isSaving: isAutoSavingHook } = useAutoSave({
    key: autoSaveKey,
    data: formData,
    onSave: performAutoSave,
    delay: 5000, // 5 seconds debounce
    enabled: reportStatus !== 'submitted' && !isInitialLoading,
    maxRetries: 3
  })

  // Combined auto-save status
  const isAutoSavingCombined = isAutoSaving || isAutoSavingHook

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
        const updatedData = { ...prev }

        // Student Enrollment data
        if (studentEnrollmentResult.success && studentEnrollmentResult.data) {
          const data = studentEnrollmentResult.data
          updatedData.totalStudentsEnrolled = data.total_students?.toString() || ""
          updatedData.studentsTransferredIn = data.total_transferred_in?.toString() || ""
          updatedData.studentsTransferredOut = data.total_transferred_out?.toString() || ""
        }

        // Attendance data
        if (attendanceResult.success && attendanceResult.data) {
          const data = attendanceResult.data
          updatedData.totalDaysInMonth = data.total_days_in_month?.toString() || ""
          updatedData.totalDaysSchoolOpened = data.total_days_school_opened?.toString() || ""
          updatedData.averageDailyAttendance = data.average_daily_attendance?.toString() || ""
        }

        // Staffing data
        if (staffingResult.success && staffingResult.data) {
          const data = staffingResult.data
          updatedData.totalTeachers = data.total_teachers?.toString() || ""
          updatedData.totalNonTeachingStaff = data.total_non_teaching_staff?.toString() || ""
          updatedData.teachersPresent = data.teachers_present?.toString() || ""
          updatedData.teachersAbsent = data.teachers_absent?.toString() || ""
          updatedData.nonTeachingStaffPresent = data.non_teaching_staff_present?.toString() || ""
          updatedData.nonTeachingStaffAbsent = data.non_teaching_staff_absent?.toString() || ""
          updatedData.reasonsForAbsence = data.reasons_for_absence || ""
        }

        // Staff Development data
        if (staffDevelopmentResult.success && staffDevelopmentResult.data) {
          const data = staffDevelopmentResult.data
          updatedData.professionalDevelopmentActivities = data.professional_development_activities || ""
          updatedData.teacherTrainingPrograms = data.teacher_training_programs || ""
          updatedData.skillDevelopmentInitiatives = data.skill_development_initiatives || ""
        }

        // Supervision data
        if (supervisionResult.success && supervisionResult.data) {
          const data = supervisionResult.data
          updatedData.principalSupervisionActivities = data.principal_supervision_activities || ""
          updatedData.classroomObservations = data.classroom_observations || ""
          updatedData.teacherFeedbackSessions = data.teacher_feedback_sessions || ""
        }

        // Curriculum data
        if (curriculumResult.success && curriculumResult.data) {
          const data = curriculumResult.data
          updatedData.curriculumImplementationProgress = data.curriculum_implementation_progress || ""
          updatedData.subjectSpecificUpdates = data.subject_specific_updates || ""
          updatedData.assessmentAndEvaluationActivities = data.assessment_and_evaluation_activities || ""
        }

        // Finance data
        if (financeResult.success && financeResult.data) {
          const data = financeResult.data
          updatedData.schoolBudgetStatus = data.school_budget_status || ""
          updatedData.expenditureDetails = data.expenditure_details || ""
          updatedData.fundingChallenges = data.funding_challenges || ""
        }

        // Income data
        if (incomeResult.success && incomeResult.data) {
          const data = incomeResult.data
          updatedData.governmentFunding = data.government_funding?.toString() || ""
          updatedData.donationsAndGrants = data.donations_and_grants?.toString() || ""
          updatedData.fundraisingActivities = data.fundraising_activities?.toString() || ""
          updatedData.otherIncomeSources = data.other_income_sources?.toString() || ""
        }

        // Accident & Safety data
        if (accidentSafetyResult.success && accidentSafetyResult.data) {
          const data = accidentSafetyResult.data
          updatedData.accidentsReported = data.accidents_reported?.toString() || ""
          updatedData.safetyMeasuresImplemented = data.safety_measures_implemented || ""
          updatedData.emergencyProcedures = data.emergency_procedures || ""
          updatedData.evacuationDrill = data.evacuation_drill ? "yes" : "no"
          updatedData.classroomFirebuckets = data.classroom_firebuckets ? "yes" : "no"
          updatedData.functionalFireExtinguishers = data.functional_fire_extinguishers ? "yes" : "no"
        }

        // Staff Meetings data
        if (staffMeetingsResult.success && staffMeetingsResult.data) {
          const data = staffMeetingsResult.data
          updatedData.generalStaffMeetingHeld = data.generalMeetingHeld
          updatedData.keyIssuesDiscussed = data.keyIssuesDiscussed || ""
          updatedData.decisionsImplemented = data.decisionsImplemented || ""
        }

        // Physical Facilities data
        if (facilitiesResult.success && facilitiesResult.data) {
          const data = facilitiesResult.data
          updatedData.buildingCondition = data.building_condition || ""
          updatedData.maintenanceIssues = data.maintenance_issues || ""
          updatedData.facilitiesUpgrades = data.facilities_upgrades || ""
        }

        // Resources Needed data
        if (resourcesResult.success && resourcesResult.data) {
          const data = resourcesResult.data
          updatedData.teachingMaterials = data.teaching_materials || ""
          updatedData.technologyRequirements = data.technology_requirements || ""
          updatedData.infrastructureNeeds = data.infrastructure_needs || ""
          updatedData.janitorialSupplies = data.janitorial_supplies || ""
          updatedData.otherIssues = data.other_issues || ""
        }

        // Physical Education data
        if (physicalEducationResult.success && physicalEducationResult.data) {
          const data = physicalEducationResult.data
          // Convert comma-separated strings back to arrays
          const activitiesArray = data.physicalEducationActivities 
            ? data.physicalEducationActivities.split(',').map(activity => ({ activity: activity.trim() })).filter(item => item.activity)
            : []
          const challengesArray = data.physicalEducationChallenges
            ? data.physicalEducationChallenges.split(',').map(challenge => ({ challenge: challenge.trim() })).filter(item => item.challenge)
            : []
          
          updatedData.physicalEducationActivities = activitiesArray
          updatedData.physicalEducationChallenges = challengesArray
        }

        return updatedData
      })

      // Set current section to where user left off
      if (progressResult.success && typeof progressResult.nextIncompleteSection === 'number') {
        setProgressCurrentSection(progressResult.nextIncompleteSection)
      }

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
        try {
          setIsInitialLoading(true)
          const result = await getCurrentMonthReport()
          if (result.success && result.hasExistingReport) {
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
                setProgressCurrentSection(0)
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
              
              // Try to resume from last saved position first
              const resumed = resumeFromLastPosition()
              
              // Get report progress to determine which sections are completed and which to navigate to
              const progressResult = await getReportProgress(result.report.id)
              if (progressResult.success) {
                // Mark completed sections
                setSavedSections(new Set(progressResult.completedSections))
                
                // Navigate to the next incomplete section only if not resumed from saved position
                if (!resumed) {
                  setProgressCurrentSection(progressResult.nextIncompleteSection)
                }
              }
              
              // Update form data with basic info from existing report
              setFormData((prev) => ({
                ...prev,
                reportId: result.report.id,
                schoolLevel: result.report.school_level || prev.schoolLevel,
                schoolGrade: result.report.school_grade || prev.schoolGrade,
              }))
              
              // Load any saved draft data from localStorage
              const savedData = loadFromLocalStorage()
              if (savedData) {
                setFormData((prev) => ({
                  ...prev,
                  ...savedData
                }))
                
                // Show notification about loaded draft data
                toast({
                  title: "Draft data restored",
                  description: "Your unsaved changes have been restored from local storage.",
                  duration: 3000,
                })
              }
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

  // Clear localStorage when report is submitted
  useEffect(() => {
    if (reportStatus === 'submitted') {
      clearLocalStorage()
      clearProgress()
      setHasUnsavedChanges(false)
    }
  }, [reportStatus, clearLocalStorage, clearProgress])

  // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (reportId && reportStatus !== 'submitted' && !isAutoSavingCombined) {
          performAutoSave(formData)
          // Show toast only for manual saves
          toast({
            title: "Manual save",
            description: "Your progress has been saved manually.",
            duration: 2000,
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reportId, reportStatus, isAutoSavingCombined, formData, performAutoSave, toast])

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

  // Load existing staffing data when reportId is available
  useEffect(() => {
    async function loadStaffingData() {
      if (reportId && currentSection === 3) {
        try {
          const result = await getStaffing(reportId)
          if (result.success && result.data) {
            const { staffing, teacherStatusUpdates } = result.data
            
            setFormData((prev) => ({
              ...prev,
              totalStaffEntitlement: staffing?.total_staff_entitlement?.toString() || "",
              currentTeachersOnStaff: staffing?.total_current_teachers?.toString() || "",
              underStaffedBy: staffing?.under_staffed_by?.toString() || "",
              overStaffedBy: staffing?.over_staffed_by?.toString() || "",
              secondmentCertificatesPrepared: staffing?.secondment_attendance_cert || false,
              teachersWhoLeft: teacherStatusUpdates.leftSchool.length > 0 
                ? teacherStatusUpdates.leftSchool.map(t => ({ name: t.name, status: t.status, reason: t.reason }))
                : [{ name: "", status: "", reason: "" }],
              specialLeave: teacherStatusUpdates.specialLeave.length > 0 
                ? teacherStatusUpdates.specialLeave.map(t => ({ name: t.name, status: t.status, offence: t.offence }))
                : [{ name: "", status: "", offence: "" }],
              teachersAssumedDuty: teacherStatusUpdates.assumedDuty.length > 0 
                ? teacherStatusUpdates.assumedDuty.map(t => ({ name: t.name, status: t.status }))
                : [{ name: "", status: "" }],
              teachersNotReported: teacherStatusUpdates.notReported.length > 0 
                ? teacherStatusUpdates.notReported.map(t => ({ 
                    name: t.name, 
                    status: t.status, 
                    reason: t.reason, 
                    daysAbsent: t.days_absent?.toString() || "", 
                    actionTaken: t.action_taken 
                  }))
                : [{ name: "", status: "", reason: "", daysAbsent: "", actionTaken: "" }],
              teachersWithoutSalary: teacherStatusUpdates.didNotReceiveSalary.length > 0 
                ? teacherStatusUpdates.didNotReceiveSalary.map(t => ({ name: t.name, status: t.status, reason: t.reason }))
                : [{ name: "", status: "", reason: "" }],
            }))
          }
        } catch (error) {
          console.error("Error loading staffing data:", error)
        }
      }
    }
    loadStaffingData()
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

  // Load existing staff meetings data when reportId is available
  useEffect(() => {
    async function loadStaffMeetingsData() {
      if (reportId && currentSection === 10) {
        try {
          const result = await getStaffMeetings(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              generalStaffMeetingHeld: result.data.generalMeetingHeld,
              keyIssuesDiscussed: result.data.keyIssuesDiscussed || "",
              decisionsImplemented: result.data.decisionsImplemented || "",
            }))
          }
        } catch (error) {
          console.error("Error loading staff meetings data:", error)
        }
      }
    }
    loadStaffMeetingsData()
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
          const result = await getResourcesNeeded(reportId)
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              curriculumResources: result.data.curriculumResources,
              janitorialSupplies: result.data.janitorialSupplies,
              otherIssues: result.data.otherIssues,
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
            // Convert comma-separated strings back to arrays
            const activitiesArray = result.data.physicalEducationActivities 
              ? result.data.physicalEducationActivities.split(',').map(activity => ({ activity: activity.trim() })).filter(item => item.activity)
              : []
            const challengesArray = result.data.physicalEducationChallenges
              ? result.data.physicalEducationChallenges.split(',').map(challenge => ({ challenge: challenge.trim() })).filter(item => item.challenge)
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
          if (result.success) {
            // For previous reports, start with draft status to allow editing
            if (previousReportData) {
              setReportStatus('draft')
            } else {
              setReportStatus(result.status)
            }
          }
        } catch (error) {
          console.error("Error checking report status:", error)
        }
      }
    }
    checkReportStatus()
  }, [reportId, previousReportData])

  const updateFormData = (field: string, value: any) => {
    // Prevent updates if report is submitted
    if (reportStatus === 'submitted') {
      return
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const addToArray = (field: string, item: any) => {
    // Prevent updates if report is submitted
    if (reportStatus === 'submitted') {
      return
    }
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field as keyof FormData] as any[]), item],
    }))
    setHasUnsavedChanges(true)
  }

  const removeFromArray = (field: string, index: number) => {
    // Prevent updates if report is submitted
    if (reportStatus === 'submitted') {
      return
    }
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field as keyof FormData] as any[]).filter((_, i) => i !== index),
    }))
    setHasUnsavedChanges(true)
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
          staffingFormData.append("currentTeachersOnStaff", safeGet("currentTeachersOnStaff", "0"))
          staffingFormData.append("underStaffedBy", safeGet("underStaffedBy", "0"))
          staffingFormData.append("overStaffedBy", safeGet("overStaffedBy", "0"))
          staffingFormData.append("secondmentCertificatesPrepared", formDataObj.secondmentCertificatesPrepared ? "true" : "false")
          
          // Add teacher status updates
          const teachersWhoLeft = safeGetArray("teachersWhoLeft")
          teachersWhoLeft.forEach((teacher, index) => {
            if (teacher && teacher.name && teacher.name.trim()) {
              staffingFormData.append(`teacherLeft_${index}_name`, teacher.name)
              staffingFormData.append(`teacherLeft_${index}_status`, teacher.status || "")
              staffingFormData.append(`teacherLeft_${index}_reason`, teacher.reason || "")
            }
          })
          
          result = await saveStaffing(staffingFormData)
          break
        case 4: // Staff Development
          const staffDevFormData = new FormData()
          staffDevFormData.append("reportId", reportId)
          const staffDevActivities = safeGetArray("staffDevelopmentActivities")
          staffDevActivities.forEach((activity, index) => {
            if (activity && activity.activity && activity.activity.trim()) {
              staffDevFormData.append(`activity_${index}_name`, activity.activity)
              staffDevFormData.append(`activity_${index}_date`, activity.date || "")
              staffDevFormData.append(`activity_${index}_participants`, activity.participants || "0")
              staffDevFormData.append(`activity_${index}_facilitator`, activity.facilitator || "")
            }
          })
          result = await saveStaffDevelopment(staffDevFormData)
          break
        case 5: // Supervision
          const supervisionFormData = new FormData()
          supervisionFormData.append("reportId", reportId)
          supervisionFormData.append("totalTeachers", safeGet("totalTeachers", "0"))
          supervisionFormData.append("teachersSupervised", safeGet("teachersSupervised", "0"))
          supervisionFormData.append("lessonsObserved", safeGet("lessonsObserved", "0"))
          supervisionFormData.append("supervisionMeetingsHeld", safeGet("supervisionMeetingsHeld", "0"))
          if (formDataObj.supervisionChallenges) {
            supervisionFormData.append("supervisionChallenges", safeGet("supervisionChallenges"))
          }
          result = await saveSupervision(supervisionFormData)
          break
        case 6: // Curriculum Monitoring
          const curriculumFormData = new FormData()
          curriculumFormData.append("reportId", reportId)
          curriculumFormData.append("curriculumCoverage", safeGet("curriculumCoverage", "0"))
          curriculumFormData.append("assessmentActivities", safeGet("assessmentActivities", "0"))
          if (formDataObj.curriculumChallenges) {
            curriculumFormData.append("curriculumChallenges", safeGet("curriculumChallenges"))
          }
          if (formDataObj.curriculumImprovements) {
            curriculumFormData.append("curriculumImprovements", safeGet("curriculumImprovements"))
          }
          result = await saveCurriculum(curriculumFormData)
          break
        case 7: // Finance
          const financeFormData = new FormData()
          financeFormData.append("reportId", reportId)
          financeFormData.append("previousBalance", safeGet("previousBalance", "0"))
          financeFormData.append("currentMonthIncome", safeGet("currentMonthIncome", "0"))
          financeFormData.append("currentMonthExpenditure", safeGet("currentMonthExpenditure", "0"))
          financeFormData.append("currentBalance", safeGet("currentBalance", "0"))
          const expenditureDetails = safeGetArray("expenditureDetails")
          expenditureDetails.forEach((expense, index) => {
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
          incomeSources.forEach((income, index) => {
            if (income && income.source && income.source.trim()) {
              incomeFormData.append(`income_${index}_source`, income.source)
              incomeFormData.append(`income_${index}_amount`, income.amount || "0")
              incomeFormData.append(`income_${index}_date`, income.date || "")
            }
          })
          result = await saveIncome(incomeFormData)
          break
        case 9: // Accident & Safety
          const accidentFormData = new FormData()
          accidentFormData.append("reportId", reportId)
          const accidents = safeGetArray("accidents")
          accidents.forEach((accident, index) => {
            if (accident && accident.description && accident.description.trim()) {
              accidentFormData.append(`accident_${index}_description`, accident.description)
              accidentFormData.append(`accident_${index}_date`, accident.date || "")
              accidentFormData.append(`accident_${index}_severity`, accident.severity || "")
              accidentFormData.append(`accident_${index}_action`, accident.action || "")
            }
          })
          const safetyMeasures = safeGetArray("safetyMeasures")
          safetyMeasures.forEach((measure, index) => {
            if (measure && measure.description && measure.description.trim()) {
              accidentFormData.append(`safety_${index}_description`, measure.description)
              accidentFormData.append(`safety_${index}_status`, measure.status || "")
            }
          })
          result = await saveAccidentSafety(accidentFormData)
          break
        case 10: // Staff Meetings
          const meetingsFormData = new FormData()
          meetingsFormData.append("reportId", reportId)
          const staffMeetings = safeGetArray("staffMeetings")
          staffMeetings.forEach((meeting, index) => {
            if (meeting && meeting.topic && meeting.topic.trim()) {
              meetingsFormData.append(`meeting_${index}_topic`, meeting.topic)
              meetingsFormData.append(`meeting_${index}_date`, meeting.date || "")
              meetingsFormData.append(`meeting_${index}_attendees`, meeting.attendees || "0")
              meetingsFormData.append(`meeting_${index}_outcomes`, meeting.outcomes || "")
            }
          })
          result = await saveStaffMeetings(meetingsFormData)
          break
        case 11: // Physical Facilities
          const facilitiesFormData = new FormData()
          facilitiesFormData.append("reportId", reportId)
          const repairs = safeGetArray("repairs")
          repairs.forEach((repair, index) => {
            if (repair && repair.description && repair.description.trim()) {
              facilitiesFormData.append(`repair_${index}_description`, repair.description)
              facilitiesFormData.append(`repair_${index}_status`, repair.status || "")
              facilitiesFormData.append(`repair_${index}_cost`, repair.cost || "0")
              facilitiesFormData.append(`repair_${index}_date`, repair.date || "")
            }
          })
          const facilityImprovements = safeGetArray("facilityImprovements")
          facilityImprovements.forEach((improvement, index) => {
            if (improvement && improvement.description && improvement.description.trim()) {
              facilitiesFormData.append(`improvement_${index}_description`, improvement.description)
              facilitiesFormData.append(`improvement_${index}_status`, improvement.status || "")
              facilitiesFormData.append(`improvement_${index}_priority`, improvement.priority || "")
            }
          })
          result = await savePhysicalFacilities(facilitiesFormData)
          break
        case 12: // Resources Needed
          const resourcesFormData = new FormData()
          resourcesFormData.append("reportId", reportId)
          const resourcesNeeded = safeGetArray("resourcesNeeded")
          resourcesNeeded.forEach((resource, index) => {
            if (resource && resource.resource && resource.resource.trim()) {
              resourcesFormData.append(`resource_${index}_name`, resource.resource)
              resourcesFormData.append(`resource_${index}_quantity`, resource.quantity || "0")
              resourcesFormData.append(`resource_${index}_priority`, resource.priority || "")
              resourcesFormData.append(`resource_${index}_justification`, resource.justification || "")
            }
          })
          result = await saveResourcesNeeded(resourcesFormData)
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
            .map(item => item.activity)
            .filter(activity => activity && activity.trim())
            .join(', ')
          const challengesString = challengesArray
            .map(item => item.challenge)
            .filter(challenge => challenge && challenge.trim())
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
        markSectionComplete(sectionIndex)
        setSavedSections((prev) => new Set(prev).add(sectionIndex))
      }

      return result.success
    } catch (error) {
      console.error(`Error saving section ${sectionIndex}:`, error)
      return false
    }
  }

  const nextSection = () => {
    if (currentSection < SECTIONS.length - 1) {
      setProgressCurrentSection(currentSection + 1)
    }
  }

  const prevSection = () => {
    if (currentSection > 0) {
      setProgressCurrentSection(currentSection - 1)
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
      formDataToSubmit.append("secondmentAttendanceCert", formData.secondmentCertificatesPrepared.toString())
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
        
        // Show success toast
        toast({
          title: "Resources section saved!",
          description: "Continue to Physical Education section.",
          duration: 3000,
        })
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
          
          // Clear auto-save data and progress tracking
          clearLocalStorage()
          clearProgress()
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

  // Calculate progress based on completed sections and current progress
  const calculateProgress = () => {
    const overallProgress = getOverallProgress()
    if (overallProgress > 0) {
      return overallProgress
    }
    // Fallback to simple calculation if no section progress available
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
  useEffect(() => {
    if (reportStatus !== 'submitted') {
      const timeoutId = setTimeout(() => {
        const progress = calculateSectionProgress(currentSection)
        updateSectionProgress(currentSection, progress)
      }, 2000) // Increased to 2 seconds to reduce frequency

      return () => clearTimeout(timeoutId)
    }
  }, [formData, currentSection, reportStatus])

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-primary-700 font-medium">Month</Label>
          <Input value={formData.month} disabled className="bg-gray-50" />
        </div>
        <div className="grid gap-2">
          <Label className="text-primary-700 font-medium">Date</Label>
          <Input value={formData.date} disabled className="bg-gray-50" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-primary-700 font-medium">Education District</Label>
          <Input
            value={formData.educationDistrict}
            disabled
            className="bg-gray-50"
            placeholder="Auto-populated from your profile"
          />
          <p className="text-xs text-gray-500">This is automatically set based on your school's region</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-primary-700 font-medium">School Level *</Label>
          <Input
            value={formData.schoolLevel}
            disabled
            className="bg-gray-50"
            placeholder="Auto-populated from your school"
          />
          <p className="text-xs text-gray-500">This is automatically set based on your school's level</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-primary-700 font-medium">School Name</Label>
          <Input
            value={formData.schoolName}
            disabled
            className="bg-gray-50"
            placeholder="Auto-populated from your profile"
          />
          <p className="text-xs text-gray-500">This is automatically set based on your assigned school</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-primary-700 font-medium">School Grade *</Label>
          {userSchool?.grade ? (
            // Auto-populated grade from school data
            <>
              <Input
                value={`Grade ${formData.schoolGrade}`}
                disabled
                className="bg-gray-50"
                placeholder="Auto-populated from school data"
              />
              <p className="text-xs text-gray-500">Grade automatically set from your school's profile</p>
            </>
          ) : (
            // Manual grade selection when no grade exists in school data
            <>
              <Select value={formData.schoolGrade} onValueChange={(value) => updateFormData("schoolGrade", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                  <SelectItem value="D">Grade D</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Please select your school's grade from the list</p>
            </>
          )}
        </div>
      </div>

      {!userSchool && currentUser && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Warning:</strong> No school is assigned to your profile. Please contact your administrator to assign a
            school before submitting reports.
          </p>
        </div>
      )}

      {currentUser && userSchool && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Ready to submit:</strong> You are logged in as <strong>{currentUser.name}</strong> from{" "}
            <strong>{userSchool.name}</strong> in the <strong>{(userSchool.sms_regions as any)?.name}</strong> region.
          </p>
          {reportId && (
            <p className="text-green-700 text-xs mt-1">
              ✅ Report started - ID: {reportId}
            </p>
          )}
        </div>
      )}
    </div>
  )

  const renderStudentEnrolment = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700 flex items-center gap-2">
        Section 1: Student Enrolment
        {savedSections.has(1) && (
          <span className="text-green-600 text-sm font-normal">✅ Completed</span>
        )}
        {progressState.sectionProgress[1] && progressState.sectionProgress[1] < 100 && (
          <span className="text-blue-600 text-sm font-normal">📝 In Progress ({progressState.sectionProgress[1]}%)</span>
        )}
      </h3>
      
      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving student enrollment data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Student enrollment data will be saved to report ID: {reportId}
            {savedSections.has(1) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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

      {currentSection === 1 && (
        (!formData.totalStudentsEnrolled.trim() || 
         !formData.studentsTransferredIn.trim() || 
         !formData.studentsTransferredOut.trim()) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">
                <strong>Required:</strong> All three enrollment fields must be filled to continue.
              </p>
            </div>
          </div>
        )
      )}

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-primary-600 mb-2">Summary</h4>
        <div className="text-sm text-gray-700">
          <p><strong>Total Enrolled:</strong> {formData.totalStudentsEnrolled || 0}</p>
          <p><strong>Net Transfer:</strong> {(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0))}</p>
        </div>
      </div>
    </div>
  )

  const renderAttendance = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 2: Attendance</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving attendance data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Attendance data will be saved to report ID: {reportId}
            {savedSections.has(2) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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

      {currentSection === 2 && (
        (!formData.studentAttendanceRate.trim() || 
         !formData.studentPunctualityRate.trim() || 
         !formData.teacherAttendanceRate.trim() || 
         !formData.teacherPunctualityRate.trim()) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">
                <strong>Required:</strong> All four attendance fields must be filled to continue.
              </p>
            </div>
          </div>
        )
      )}

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-primary-600 mb-2">Summary</h4>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Student Attendance:</strong> {formData.studentAttendanceRate || 0}% | <strong>Punctuality:</strong> {formData.studentPunctualityRate || 0}%</p>
          <p><strong>Teacher Attendance:</strong> {formData.teacherAttendanceRate || 0}% | <strong>Punctuality:</strong> {formData.teacherPunctualityRate || 0}%</p>
        </div>
      </div>
    </div>
  )

  const renderStaffing = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 3: Staffing and Vacancies</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving staffing data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Staffing data will be saved to report ID: {reportId}
            {savedSections.has(3) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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

      {currentSection === 3 && (
        (!formData.totalStaffEntitlement.trim() || 
         !formData.currentTeachersOnStaff.trim() || 
         !formData.underStaffedBy.trim() || 
         !formData.overStaffedBy.trim() || 
         formData.secondmentCertificatesPrepared === null) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">
                <strong>Required:</strong> All five staffing fields must be filled to continue.
              </p>
            </div>
          </div>
        )
      )}

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

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

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
          </div>          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

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
          </div>          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

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
          </div>          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

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

  const renderStaffDevelopment = () => (
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
                  // Clear other fields when unchecked
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
                  // Clear other fields when No is selected
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

      {/* Show validation message if first question not answered */}
      {currentSection === 4 && formData.wholeschoolPDHeld === null && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-red-700 text-sm">
              <strong>Required:</strong> Please answer whether a whole school PD session was held.
            </p>
          </div>
        </div>
      )}

      {/* Show additional fields only when Yes is selected */}
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
          
          {/* Show validation message for required fields when Yes is selected */}
          {(!formData.teachersAttendedPD.trim() || 
            !formData.pdTopic.trim() || 
            !formData.pdTopicReason.trim() || 
            !formData.pdOutcomes.trim()) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-red-700 text-sm">
                  <strong>Required:</strong> All PD session fields must be filled to continue.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderSupervision = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 5: Supervision</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving supervision data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Supervision data will be saved to report ID: {reportId}
            {savedSections.has(5) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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
          
          {/* Validation message for HM fields */}
          {currentSection === 5 && (
            (!formData.hmLessonsObserved.trim() || 
             !formData.hmPositiveFindings.trim() || 
             !formData.hmNegativeFindings.trim() || 
             !formData.hmFollowUpActions.trim()) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">
                    <strong>Required:</strong> All Head Master supervision fields must be filled to continue.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Deputy HM (DHM) */}
        <div className="space-y-4 mb-8">
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
          
          {/* Validation message for DHM fields */}
          {currentSection === 5 && (
            (!formData.dhmLessonsObserved.trim() || 
             !formData.dhmPositiveFindings.trim() || 
             !formData.dhmNegativeFindings.trim() || 
             !formData.dhmFollowUpActions.trim()) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">
                    <strong>Required:</strong> All Deputy Head Master supervision fields must be filled to continue.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Year Group Head / SM / Divisional Head */}
        <div className="space-y-4 mb-8">
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
          
          {/* Validation message for Group Head fields */}
          {currentSection === 5 && (
            (!formData.groupHeadLessonsObserved.trim() || 
             !formData.groupHeadPositiveFindings.trim() || 
             !formData.groupHeadNegativeFindings.trim() || 
             !formData.groupHeadFollowUpActions.trim()) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">
                    <strong>Required:</strong> All Year Group Head supervision fields must be filled to continue.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-6"></div>

        {/* Head of Department (HOD) */}
        <div className="space-y-4">
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
          
          {/* Validation message for HOD fields */}
          {currentSection === 5 && (
            (!formData.hodLessonsObserved.trim() || 
             !formData.hodPositiveFindings.trim() || 
             !formData.hodNegativeFindings.trim() || 
             !formData.hodFollowUpActions.trim()) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">
                    <strong>Required:</strong> All Head of Department supervision fields must be filled to continue.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )

  const renderCurriculum = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 6: Curriculum Monitoring</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving curriculum data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Curriculum data will be saved to report ID: {reportId}
            {savedSections.has(6) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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

      {currentSection === 6 && (
        (!formData.teachersNoLessonPlans.trim() || 
         !formData.curriculumActionsTaken.trim()) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">
                <strong>Required:</strong> All curriculum monitoring fields must be filled to continue.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  )

  const renderFinance = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 7: Finance</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving finance data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Finance data will be saved to report ID: {reportId}
            {savedSections.has(7) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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

      {currentSection === 7 && (
        (!formData.openingBalance.trim() || 
         !formData.totalIncome.trim() || 
         !formData.totalExpenditure.trim() || 
         !formData.closingBalance.trim()) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">
                <strong>Required:</strong> All finance fields must be filled to continue.
              </p>
            </div>
          </div>
        )
      )}

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

  const renderIncome = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 8: Income Sources</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving income data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Income sources data will be saved to report ID: {reportId}
            {savedSections.has(8) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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

  const renderSafety = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">Section 9: Accident & Safety</h3>

      {!reportId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving accident & safety data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Report Started:</strong> Accident & Safety data will be saved to report ID: {reportId}
            {savedSections.has(9) && (
              <span className="ml-2 text-green-600">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

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
                    // Clear the other fields when "No" is selected
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

          {currentSection === 9 && (
            (formData.evacuationDrillHeld === null || 
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
             ))) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">
                    <strong>Required:</strong> All accident & safety fields must be completed to continue.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )

  const renderMeetings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">
        Section 10: Staff Meetings
        {savedSections.has(10) && (
          <span className="ml-2 text-green-600">✅ Section saved</span>
        )}
      </h3>

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
                  // Clear the other fields when "No" is selected
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
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={formData.generalStaffMeetingHeld !== true}
            required={formData.generalStaffMeetingHeld === true}
          />
        </div>

        {currentSection === 10 && (
          (formData.generalStaffMeetingHeld === null || 
           (formData.generalStaffMeetingHeld === true && (
             !formData.keyIssuesDiscussed.trim() || 
             !formData.decisionsImplemented.trim()
           ))) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-red-700 text-sm">
                  <strong>Required:</strong> {formData.generalStaffMeetingHeld === null 
                    ? "Please select whether a staff meeting was held." 
                    : "All staff meeting fields must be filled when 'Yes' is selected."}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )

  const renderFacilities = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">
        Section 11: Physical Facilities
        {savedSections.has(11) && (
          <span className="ml-2 text-green-600">✅ Section saved</span>
        )}
      </h3>

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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Validation message for facilities status */}
        {(!formData.teacherToiletsFunctional.trim() ||
          !formData.teacherSinksFunctional.trim() ||
          !formData.teacherTapsFunctional.trim() ||
          !formData.studentToiletsFunctional.trim() ||
          !formData.studentTapsFunctional.trim() ||
          !formData.studentSinksFunctional.trim() ||
          !formData.overcrowdedClassrooms.trim()) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 text-sm">
                <strong>Required:</strong> Please fill in all facility percentage fields to continue.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderResources = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-primary-700">
        Section 12: Resources Needed
        {savedSections.has(12) && (
          <span className="ml-2 text-green-600">✅ Section saved</span>
        )}
      </h3>

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
        <h3 className="text-lg font-semibold text-primary-700">
          Section 13: Physical Education
          {savedSections.has(13) && (
            <span className="ml-2 text-green-600">✅ Section saved</span>
          )}
        </h3>

        <div className="space-y-6">
          {/* Physical Education Activities */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-primary-700 font-medium">Physical Education Activities Performed</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhysicalEducationActivity}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Activity
              </Button>
            </div>
            
            {activities.length === 0 && (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                <p>No activities added yet. Click "Add Activity" to get started.</p>
              </div>
            )}

            {activities.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={item.activity}
                  onChange={(e) => updatePhysicalEducationActivity(index, e.target.value)}
                  placeholder={`Activity ${index + 1} (e.g., Soccer practice, Running, Gymnastics)`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePhysicalEducationActivity(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Physical Education Challenges */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-primary-700 font-medium">Major Challenges in Physical Education</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhysicalEducationChallenge}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Challenge
              </Button>
            </div>
            
            {challenges.length === 0 && (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                <p>No challenges added yet. Click "Add Challenge" to get started.</p>
              </div>
            )}

            {challenges.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={item.challenge}
                  onChange={(e) => updatePhysicalEducationChallenge(index, e.target.value)}
                  placeholder={`Challenge ${index + 1} (e.g., Lack of equipment, Weather conditions, Limited space)`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePhysicalEducationChallenge(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
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
      <Card className="gradient-card border-0 shadow-lg">
        <CardHeader className="gradient-header text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileTextIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Monthly School Report</CardTitle>
              <CardDescription className="text-blue-100">
                Loading report status...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Checking Report Status
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Please wait while we check if you have already submitted a report for this month...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If the current month report is already submitted AND we're not submitting a previous report, show a simple message
  if (isCurrentMonthSubmitted && !previousReportData) {
    return (
      <Card className="gradient-card border-0 shadow-lg">
        <CardHeader className="gradient-header text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileTextIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Monthly School Report</CardTitle>
              <CardDescription className="text-blue-100">
                Current Month Report Status
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Current Month Report Already Submitted
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                You have already submitted your monthly report for this month. 
                Only one report can be submitted per month.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-green-800">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-sm">Report Status: Submitted</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Your report is complete and has been successfully submitted to the system.
              </p>
            </div>
            
            {/* View Report Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleViewSubmittedReport}
                className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gradient-card border-0 shadow-lg">
      <CardHeader className="gradient-header text-white rounded-t-lg p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
            <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl">
              {previousReportData ? "Previous Report" : "Monthly School Report"}
            </CardTitle>
            <CardDescription className="text-blue-100 text-sm sm:text-base">
              {previousReportData 
                ? `Submit report for ${previousReportData.displayName}`
                : `Section ${currentSection + 1} of ${SECTIONS.length}: ${SECTIONS[currentSection]}`
              }
            </CardDescription>
          </div>
          
          {/* Auto-save status indicator */}
          {!previousReportData && reportStatus !== 'submitted' && (
            <div className="flex flex-col items-end text-white/80 text-xs">
              {isAutoSavingCombined && (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {lastSaved && !isAutoSavingCombined && !hasUnsavedChanges && (
                <div className="flex items-center gap-1 text-green-200">
                  <Save className="h-3 w-3" />
                  <span>Saved</span>
                </div>
              )}
              {hasUnsavedChanges && !isAutoSavingCombined && (
                <div className="flex items-center gap-1 text-yellow-200">
                  <AlertCircle className="h-3 w-3" />
                  <span>Editing...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs sm:text-sm text-blue-100">
            <span>Progress</span>
            <div className="flex items-center gap-2">
              <span>{getOverallProgress()}% Complete</span>
              {progressState.completedSections.length > 0 && (
                <span className="text-green-200">
                  ({progressState.completedSections.length}/{SECTIONS.length} sections)
                </span>
              )}
            </div>
          </div>
          <Progress value={getOverallProgress()} className="h-2 bg-white/20" />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div 
          className={`min-h-[400px] sm:min-h-[500px] ${reportStatus === 'submitted' ? 'pointer-events-none opacity-75' : ''}`}
          style={reportStatus === 'submitted' ? { filter: 'none' } : {}}
        >
          {renderCurrentSection()}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevSection}
            disabled={currentSection === 0 || reportStatus === 'submitted'}
            className="order-2 sm:order-1 w-full sm:w-auto flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          <div className="text-center order-1 sm:order-2 flex flex-col items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {currentSection + 1} of {SECTIONS.length}
            </div>
            {reportStatus === 'submitted' && (
              <div className="text-xs text-green-600 font-medium">
                ✅ Report Submitted - Read Only
              </div>
            )}
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
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Continue Later
              </Button>
            )}
          </div>

          {reportStatus === 'submitted' ? (
            <div className="text-sm text-green-600 font-medium order-3 text-center sm:text-right">
              Report Submitted
            </div>
          ) : currentSection === SECTIONS.length - 1 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="order-3 w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
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
              className="order-3 w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="order-3 w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="order-3 w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="order-3 w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="order-3 w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentSection === 8 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !reportId}
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
                  className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
                  className="border-primary-300 text-primary-700 hover:bg-primary-50"
                >
                  Create New Report
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !reportId}
                className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                {isSubmitting ? "Saving..." : "Complete Report"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )
          ) : (
            <Button
              type="button"
              onClick={nextSection}
              className="gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
