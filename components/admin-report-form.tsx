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
import { createHmrReport, saveStudentEnrollment, getStudentEnrollment, saveAttendance, getAttendance, saveStaffing, getStaffing, saveStaffDevelopment, getStaffDevelopment, saveSupervision, getSupervision, saveCurriculum, getCurriculum, saveFinance, getFinance, saveIncome, getIncome, saveAccidentSafety, getAccidentSafety, saveStaffMeetings, getStaffMeetings, savePhysicalFacilities, getPhysicalFacilities, saveResourcesNeeded, getResourcesNeeded, savePhysicalEducation, getPhysicalEducation, getReportStatus, getCurrentMonthReport, getReportProgress, getTeacherStatusOptions } from "@/app/actions/hmr-reports"
import { submitReport } from "@/app/actions/hmr-reports"
import { useAutoSave } from "@/hooks/use-auto-save"
import { useReportProgress } from "@/hooks/use-report-progress"
import { useToast } from "@/components/ui/use-toast"

interface AdminReportFormProps {
  schoolId: string
  schoolName: string
  schoolDetails?: {
    id: string
    name: string
    grade: string
    code: string
    educationDistrict: string
    schoolLevel: string
  } | null
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

export function AdminReportForm({ schoolId, schoolName, schoolDetails, monthYear, onSuccess }: AdminReportFormProps) {
  const [formData, setFormData] = useState<FormData>({
    month: monthYear,
    date: new Date().toLocaleDateString(),
    educationDistrict: schoolDetails?.educationDistrict || "",
    schoolLevel: schoolDetails?.schoolLevel || "",
    schoolName: schoolName,
    schoolGrade: schoolDetails?.grade || "",
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
    physicalEducationActivities: [{ activity: "" }],
    physicalEducationChallenges: [{ challenge: "" }],
  })

  const [schools, setSchools] = useState<Array<{ id: string; name: string; region_id: string }>>([])
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([])
  const [reportId, setReportId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Admin form doesn't need user/school state - props provide this data
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
  const autoSaveKey = `hmr-admin-report-${schoolId}-${reportId || 'draft'}`
  
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
    enabled: false, // DISABLED - use save button instead
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
        const updatedData = { ...prev } as any

        // Student Enrollment data
        if (studentEnrollmentResult.success && (studentEnrollmentResult as any).data) {
          const data = (studentEnrollmentResult as any).data
          updatedData.totalStudentsEnrolled = data.total_students?.toString() || ""
          updatedData.studentsTransferredIn = data.total_transferred_in?.toString() || ""
          updatedData.studentsTransferredOut = data.total_transferred_out?.toString() || ""
        }

        // Attendance data
        if (attendanceResult.success && (attendanceResult as any).data) {
          const data = (attendanceResult as any).data
          updatedData.totalDaysInMonth = data.total_days_in_month?.toString() || ""
          updatedData.totalDaysSchoolOpened = data.total_days_school_opened?.toString() || ""
          updatedData.averageDailyAttendance = data.average_daily_attendance?.toString() || ""
        }

        // Staffing data
        if (staffingResult.success && (staffingResult as any).data) {
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
        if (staffDevelopmentResult.success && (staffDevelopmentResult as any).data) {
          const data = (staffDevelopmentResult as any).data
          updatedData.professionalDevelopmentActivities = data.professional_development_activities || ""
          updatedData.teacherTrainingPrograms = data.teacher_training_programs || ""
          updatedData.skillDevelopmentInitiatives = data.skill_development_initiatives || ""
        }

        // Supervision data
        if (supervisionResult.success && (supervisionResult as any).data) {
          const data = (supervisionResult as any).data
          updatedData.principalSupervisionActivities = data.principal_supervision_activities || ""
          updatedData.classroomObservations = data.classroom_observations || ""
          updatedData.teacherFeedbackSessions = data.teacher_feedback_sessions || ""
        }

        // Curriculum data
        if (curriculumResult.success && (curriculumResult as any).data) {
          const data = (curriculumResult as any).data
          updatedData.curriculumImplementationProgress = data.curriculum_implementation_progress || ""
          updatedData.subjectSpecificUpdates = data.subject_specific_updates || ""
          updatedData.assessmentAndEvaluationActivities = data.assessment_and_evaluation_activities || ""
        }

        // Finance data
        if (financeResult.success && (financeResult as any).data) {
          const data = (financeResult as any).data
          updatedData.schoolBudgetStatus = data.school_budget_status || ""
          updatedData.expenditureDetails = data.expenditure_details || ""
          updatedData.fundingChallenges = data.funding_challenges || ""
        }

        // Income data
        if (incomeResult.success && (incomeResult as any).data) {
          const data = (incomeResult as any).data
          updatedData.governmentFunding = data.government_funding?.toString() || ""
          updatedData.donationsAndGrants = data.donations_and_grants?.toString() || ""
          updatedData.fundraisingActivities = data.fundraising_activities?.toString() || ""
          updatedData.otherIncomeSources = data.other_income_sources?.toString() || ""
        }

        // Accident & Safety data
        if (accidentSafetyResult.success && (accidentSafetyResult as any).data) {
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
          updatedData.teachingMaterials = data.teaching_materials || ""
          updatedData.technologyRequirements = data.technology_requirements || ""
          updatedData.infrastructureNeeds = data.infrastructure_needs || ""
          updatedData.janitorialSupplies = data.janitorial_supplies || ""
          updatedData.otherIssues = data.other_issues || ""
        }

        // Physical Education data
        if ((physicalEducationResult as any).success && (physicalEducationResult as any).data) {
          const data = (physicalEducationResult as any).data
          // Parse activities and challenges from JSON strings
          const activitiesStr = data.activities || "[]"
          const challengesStr = data.challenges || "[]"
          
          try {
            const activitiesArray = JSON.parse(activitiesStr)
            const challengesArray = JSON.parse(challengesStr)
            
            updatedData.physicalEducationActivities = Array.isArray(activitiesArray) && activitiesArray.length > 0
              ? activitiesArray.map((activity: string) => ({ activity }))
              : [{ activity: "" }]
              
            updatedData.physicalEducationChallenges = Array.isArray(challengesArray) && challengesArray.length > 0
              ? challengesArray.map((challenge: string) => ({ challenge }))
              : [{ challenge: "" }]
          } catch (parseError) {
            console.error("Error parsing Physical Education data:", parseError)
            updatedData.physicalEducationActivities = [{ activity: "" }]
            updatedData.physicalEducationChallenges = [{ challenge: "" }]
          }
        }

        return updatedData
      })

      // Set current section to where user left off
      if (progressResult.success && typeof progressResult.nextIncompleteSection === 'number') {
        setProgressCurrentSection(progressResult.nextIncompleteSection)
      }

      // Mark completed sections as saved and update progress
      if (progressResult.success && progressResult.completedSections) {
        const completedSectionsSet = new Set(progressResult.completedSections)
        setSavedSections(completedSectionsSet)
        // Also update the progress state to sync with savedSections
        progressResult.completedSections.forEach((sectionIndex: number) => {
          markSectionComplete(sectionIndex)
        })
      }

    } catch (error) {
      console.error("Error loading existing data:", error)
    }
  }

  // Function to handle viewing the submitted report (admin version)
  const handleViewSubmittedReport = () => {
    if (onSuccess) {
      onSuccess()
    }
  }

  // Admin form always starts fresh - no need to load existing data

  useEffect(() => {
    async function loadTeacherStatusOptions() {
      try {
        const statusResult = await getTeacherStatusOptions()
        if (statusResult.statusOptions) {
          setTeacherStatusOptions(statusResult.statusOptions)
        }
      } catch (error) {
        console.error("Error loading teacher status options:", error)
        // Fallback options
        setTeacherStatusOptions(['Active', 'On Leave', 'Transferred', 'Retired', 'Dismissed'])
      }
    }
    loadTeacherStatusOptions()
  }, [])

  // Initialize form with admin-selected school and month data
  useEffect(() => {
    if (schoolDetails) {
      const details = schoolDetails as any
      setFormData(prev => ({
        ...prev,
        schoolName: details.name || schoolName,
        educationDistrict: details.educationDistrict || (prev as any).educationDistrict,
        schoolLevel: details.schoolLevel || (prev as any).schoolLevel,
        schoolGrade: details.grade || (prev as any).schoolGrade,
        region: details.region || (prev as any).region,
        month: monthYear,
        // Pre-populate any available school data
        physicalInfrastructure: details.physical_infrastructure || (prev as any).physicalInfrastructure,
        learningMaterials: details.learning_materials || (prev as any).learningMaterials,
        teachingStaff: details.teaching_staff || (prev as any).teachingStaff,
        communityInvolvement: details.community_involvement || (prev as any).communityInvolvement,
        parentEngagement: details.parent_engagement || (prev as any).parentEngagement,
        nutritionalProgram: details.nutritional_program || (prev as any).nutritionalProgram,
        attendanceAndEnrollment: details.attendance_enrollment || (prev as any).attendanceAndEnrollment,
        externalSupport: details.external_support || (prev as any).externalSupport,
        continuousImprovement: details.continuous_improvement || (prev as any).continuousImprovement,
        inclusiveEducation: details.inclusive_education || (prev as any).inclusiveEducation,
        technologyIntegration: details.technology_integration || (prev as any).technologyIntegration,
        healthAndSafety: details.health_safety || (prev as any).healthAndSafety,
        leadershipAndManagement: details.leadership_management || (prev as any).leadershipAndManagement
      }))
    }
    setIsInitialLoading(false)
  }, [schoolDetails, schoolName, monthYear])

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
          if ((result as any).success && (result as any).data) {
            setFormData((prev) => ({
              ...prev,
              generalStaffMeetingHeld: (result as any).data.generalMeetingHeld,
              keyIssuesDiscussed: (result as any).data.keyIssuesDiscussed || "",
              decisionsImplemented: (result as any).data.decisionsImplemented || "",
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
          if ((result as any).success && (result as any).data) {
            setFormData((prev) => ({
              ...prev,
              repairsNeeded: (result as any).data.repairsNeeded,
              teacherToiletsFunctional: (result as any).data.teacherToiletsFunctional,
              teacherSinksFunctional: (result as any).data.teacherSinksFunctional,
              teacherTapsFunctional: (result as any).data.teacherTapsFunctional,
              studentToiletsFunctional: (result as any).data.studentToiletsFunctional,
              studentSinksFunctional: (result as any).data.studentSinksFunctional,
              studentTapsFunctional: (result as any).data.studentTapsFunctional,
              overcrowdedClassrooms: (result as any).data.overcrowdedClassrooms || "",
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
          if ((result as any).success && (result as any).data) {
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
          if ((result as any).success && (result as any).data) {
            const data = (result as any).data
            // Parse activities and challenges from JSON strings
            const activitiesStr = data.activities || "[]"
            const challengesStr = data.challenges || "[]"
            
            try {
              const activitiesArray = JSON.parse(activitiesStr)
              const challengesArray = JSON.parse(challengesStr)
              
              setFormData((prev) => ({
                ...prev,
                physicalEducationActivities: Array.isArray(activitiesArray) && activitiesArray.length > 0
                  ? activitiesArray.map((activity: string) => ({ activity }))
                  : [{ activity: "" }],
                physicalEducationChallenges: Array.isArray(challengesArray) && challengesArray.length > 0
                  ? challengesArray.map((challenge: string) => ({ challenge }))
                  : [{ challenge: "" }],
              }))
            } catch (parseError) {
              console.error("Error parsing Physical Education data:", parseError)
            }
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
            // Admin reports always start as draft
            setReportStatus('draft')
          }
        } catch (error) {
          console.error("Error checking report status:", error)
        }
      }
    }
    checkReportStatus()
  }, [reportId])

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
          teachersWhoLeft.forEach((teacher: any, index: number) => {
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
          staffDevActivities.forEach((activity: any, index: number) => {
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
          incomeSources.forEach((income: any, index: number) => {
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
          accidents.forEach((accident: any, index: number) => {
            if (accident && accident.description && accident.description.trim()) {
              accidentFormData.append(`accident_${index}_description`, accident.description)
              accidentFormData.append(`accident_${index}_date`, accident.date || "")
              accidentFormData.append(`accident_${index}_severity`, accident.severity || "")
              accidentFormData.append(`accident_${index}_action`, accident.action || "")
            }
          })
          const safetyMeasures = safeGetArray("safetyMeasures")
          safetyMeasures.forEach((measure: any, index: number) => {
            if (measure && measure.description && measure.description.trim()) {
              accidentFormData.append(`safety_${index}_description`, measure.description)
              accidentFormData.append(`safety_${index}_status`, measure.status || "")
            }
          })
          result = await saveAccidentSafety(accidentFormData)
          break
        case 10: // Staff Meetings
          const staffMeetingsData = {
            generalMeetingHeld: (formData as any).generalStaffMeetingHeld,
            keyIssuesDiscussed: (formData as any).keyIssuesDiscussed,
            decisionsImplemented: (formData as any).decisionsImplemented
          }
          result = await saveStaffMeetings(reportId, staffMeetingsData)
          break
        case 11: // Physical Facilities
          const facilitiesData = {
            repairsNeeded: (formData as any).repairsNeeded,
            teacherToiletsFunctional: (formData as any).teacherToiletsFunctional,
            teacherSinksFunctional: (formData as any).teacherSinksFunctional,
            teacherTapsFunctional: (formData as any).teacherTapsFunctional,
            studentToiletsFunctional: (formData as any).studentToiletsFunctional,
            studentSinksFunctional: (formData as any).studentSinksFunctional,
            studentTapsFunctional: (formData as any).studentTapsFunctional,
            overcrowdedClassrooms: (formData as any).overcrowdedClassrooms
          }
          result = await savePhysicalFacilities(reportId, facilitiesData)
          break
        case 12: // Resources Needed
          const resourcesData = {
            curriculumResources: (formData as any).curriculumResources,
            janitorialSupplies: (formData as any).janitorialSupplies,
            otherIssues: (formData as any).otherIssues
          }
          result = await saveResourcesNeeded(reportId, resourcesData)
          break
        case 13: // Physical Education
          const peFormData = new FormData()
          peFormData.append("reportId", reportId)
          
          // Physical Education Activities
          const peActivities = safeGetArray("physicalEducationActivities")
          peActivities.forEach((item: any, index: number) => {
            if (item && item.activity && item.activity.trim()) {
              peFormData.append(`activity_${index}`, item.activity)
            }
          })
          
          // Physical Education Challenges
          const peChallenges = safeGetArray("physicalEducationChallenges")
          peChallenges.forEach((item: any, index: number) => {
            if (item && item.challenge && item.challenge.trim()) {
              peFormData.append(`challenge_${index}`, item.challenge)
            }
          })
          
          result = await savePhysicalEducation(peFormData)
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

      // Admin already has school selected
      if (!schoolId) {
        alert("School ID is required.")
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

      // Parse month and year from formData.month (e.g., "January 2025")
      const monthYearParts = formData.month.split(" ")
      const monthName = monthYearParts[0]
      year = monthYearParts[1]
      // Convert month name to number using the correct year
      monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1

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
        // Mark section as saved and update progress
        markSectionComplete(0)
        setSavedSections((prev) => new Set(prev).add(0))

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
        // Mark section as saved and update progress
        markSectionComplete(1)
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
        // Mark section as saved and update progress
        markSectionComplete(2)
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
        // Mark section as saved and update progress
        markSectionComplete(3)
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
        // Mark section as saved and update progress
        markSectionComplete(4)
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
        // Mark section as saved and update progress
        markSectionComplete(5)
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
        // Mark section as saved and update progress
        markSectionComplete(6)
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
        // Mark section as saved and update progress
        markSectionComplete(7)
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
        // Mark section as saved and update progress
        markSectionComplete(8)
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
        // Mark section as saved and update progress
        markSectionComplete(9)
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
        // Mark section as saved and update progress
        markSectionComplete(10)
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
        // Mark section as saved and update progress
        markSectionComplete(11)
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
        // Mark section as saved and update progress
        markSectionComplete(12)
        setSavedSections((prev) => new Set(prev).add(12))
        
        nextSection() // Move to Physical Education section
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
      const peFormData = new FormData()
      peFormData.append("reportId", reportId)
      
      // Physical Education Activities
      formData.physicalEducationActivities.forEach((item, index) => {
        if (item && item.activity && item.activity.trim()) {
          peFormData.append(`activity_${index}`, item.activity)
        }
      })
      
      // Physical Education Challenges
      formData.physicalEducationChallenges.forEach((item, index) => {
        if (item && item.challenge && item.challenge.trim()) {
          peFormData.append(`challenge_${index}`, item.challenge)
        }
      })
      
      const peResult = await savePhysicalEducation(peFormData)

      if (peResult.error) {
        alert(`Error: ${peResult.error}`)
        setIsSubmitting(false)
        return
      }

      if (peResult.success) {
        // Mark section as saved
        markSectionComplete(12)
        setSavedSections((prev) => new Set(prev).add(12))

        // Submit the entire report (admin version)
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
    const hasValue = (field: string | null | undefined | boolean) => {
      if (typeof field === 'boolean') return true
      if (field === null || field === undefined) return false
      return String(field).trim().length > 0
    }

    switch (sectionIndex) {
      case 0: // Basic Information
        const basicFields = [formData.schoolName, formData.educationDistrict, formData.schoolLevel, formData.schoolGrade]
        const basicCompleted = basicFields.filter(field => hasValue(field)).length
        return Math.round((basicCompleted / basicFields.length) * 100)

      case 1: // Student Enrollment
        const enrollmentFields = [formData.totalStudentsEnrolled, formData.studentsTransferredIn, formData.studentsTransferredOut]
        const enrollmentCompleted = enrollmentFields.filter(field => hasValue(field)).length
        return Math.round((enrollmentCompleted / enrollmentFields.length) * 100)

      case 2: // Attendance
        const attendanceFields = [formData.studentAttendanceRate, formData.studentPunctualityRate, formData.teacherAttendanceRate, formData.teacherPunctualityRate]
        const attendanceCompleted = attendanceFields.filter(field => hasValue(field)).length
        return Math.round((attendanceCompleted / attendanceFields.length) * 100)

      case 3: // Staffing & Vacancies
        const staffingFields = [formData.totalStaffEntitlement, formData.currentTeachersOnStaff]
        const staffingCompleted = staffingFields.filter(field => hasValue(field)).length
        // Also check if secondment question is answered
        const hasSecondment = formData.secondmentCertificatesPrepared !== null ? 1 : 0
        return Math.round(((staffingCompleted + hasSecondment) / 3) * 100)

      case 4: // Staff Development
        const pdHeld = formData.wholeschoolPDHeld !== null ? 1 : 0
        if (formData.wholeschoolPDHeld === true) {
          const pdFields = [formData.teachersAttendedPD, formData.pdTopic, formData.pdOutcomes]
          const pdCompleted = pdFields.filter(field => hasValue(field)).length
          return Math.round(((pdHeld + pdCompleted) / 4) * 100)
        }
        return pdHeld * 100

      case 5: // Supervision
        const supervisionFields = [
          formData.hmLessonsObserved, formData.hmPositiveFindings, formData.hmNegativeFindings, formData.hmFollowUpActions,
          formData.dhmLessonsObserved, formData.dhmPositiveFindings, formData.dhmNegativeFindings, formData.dhmFollowUpActions,
          formData.groupHeadLessonsObserved, formData.groupHeadPositiveFindings, formData.groupHeadNegativeFindings, formData.groupHeadFollowUpActions
        ]
        const supervisionCompleted = supervisionFields.filter(field => hasValue(field)).length
        return Math.round((supervisionCompleted / supervisionFields.length) * 100)

      case 6: // Curriculum Monitoring
        const curriculumFields = [formData.teachersNoLessonPlans, formData.curriculumActionsTaken]
        const curriculumCompleted = curriculumFields.filter(field => hasValue(field)).length
        return Math.round((curriculumCompleted / curriculumFields.length) * 100)

      case 7: // Finance
        const financeFields = [formData.openingBalance, formData.totalIncome, formData.totalExpenditure, formData.closingBalance]
        const financeCompleted = financeFields.filter(field => hasValue(field)).length
        return Math.round((financeCompleted / financeFields.length) * 100)

      case 8: // Income Sources
        const hasIncomeSources = formData.incomeSources.some(s => hasValue(s.source) && hasValue(s.amount))
        return hasIncomeSources ? 100 : 0

      case 9: // Accident & Safety
        const safetyBooleans = [formData.evacuationDrillHeld, formData.classroomsHaveFireBuckets, formData.fireExtinguishersFunctional]
        const safetyBooleansAnswered = safetyBooleans.filter(field => field !== null).length
        const safetyFields = [formData.numberOfIncidents, formData.studentsInvolved, formData.teachersInvolvedIncidents, formData.preventionActions]
        const safetyFieldsCompleted = safetyFields.filter(field => hasValue(field)).length
        return Math.round(((safetyBooleansAnswered + safetyFieldsCompleted) / 7) * 100)

      case 10: // Staff Meetings
        const meetingHeld = formData.generalStaffMeetingHeld !== null ? 1 : 0
        if (formData.generalStaffMeetingHeld === true) {
          const meetingFields = [formData.keyIssuesDiscussed, formData.decisionsImplemented]
          const meetingCompleted = meetingFields.filter(field => hasValue(field)).length
          return Math.round(((meetingHeld + meetingCompleted) / 3) * 100)
        }
        return meetingHeld * 100

      case 11: // Physical Facilities
        const facilityFields = [
          formData.teacherToiletsFunctional, formData.teacherSinksFunctional, formData.teacherTapsFunctional,
          formData.studentToiletsFunctional, formData.studentTapsFunctional, formData.studentSinksFunctional,
          formData.overcrowdedClassrooms
        ]
        const facilityCompleted = facilityFields.filter(field => hasValue(field)).length
        return Math.round((facilityCompleted / facilityFields.length) * 100)

      case 12: // Resources Needed
        const resourceFields = [formData.curriculumResources, formData.janitorialSupplies, formData.otherIssues]
        const resourceCompleted = resourceFields.filter(field => hasValue(field)).length
        return Math.round((resourceCompleted / resourceFields.length) * 100)

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
          <Label className="text-slate-700 dark:text-slate-300 font-medium">Month</Label>
          <Input value={formData.month} disabled className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" />
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">Date</Label>
          <Input value={formData.date} disabled className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">Education District</Label>
          <Input
            value={formData.educationDistrict}
            disabled
            className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="Auto-populated from your profile"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">This is automatically set based on your school's region</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">School Level <span className="text-red-500">*</span></Label>
          <Input
            value={formData.schoolLevel}
            disabled
            className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="Auto-populated from your school"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">This is automatically set based on your school's level</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">School Name</Label>
          <Input
            value={formData.schoolName}
            disabled
            className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            placeholder="Auto-populated from your profile"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">This is automatically set based on your assigned school</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300 font-medium">School Grade <span className="text-red-500">*</span></Label>
          {schoolDetails?.grade ? (
            <>
              <Input
                value={`Grade ${formData.schoolGrade}`}
                disabled
                className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                placeholder="Auto-populated from school data"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Grade automatically set from school data</p>
            </>
          ) : (
            <>
              <Select value={formData.schoolGrade} onValueChange={(value) => updateFormData("schoolGrade", value)}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                  <SelectItem value="D">Grade D</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">Please select your school's grade from the list</p>
            </>
          )}
        </div>
      </div>

      {schoolId && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <p className="text-emerald-800 dark:text-emerald-300 text-sm">
            <strong>Ready to submit:</strong> Admin report for{" "}
            <strong>{schoolName}</strong> - {monthYear}
          </p>
          {reportId && (
            <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
              ✅ Report started - ID: {reportId}
            </p>
          )}
        </div>
      )}
    </div>
  )

  const renderStudentEnrolment = () => (
    <div className="space-y-6">
      {/* Enrollment Numbers Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Enrollment Numbers</h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Students Enrolled <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.totalStudentsEnrolled}
              onChange={(e) => updateFormData("totalStudentsEnrolled", e.target.value)}
              placeholder="0"
              min="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transferred In <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.studentsTransferredIn}
              onChange={(e) => updateFormData("studentsTransferredIn", e.target.value)}
              placeholder="0"
              min="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transferred Out <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.studentsTransferredOut}
              onChange={(e) => updateFormData("studentsTransferredOut", e.target.value)}
              placeholder="0"
              min="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Required Notice */}
        {currentSection === 1 && (
          (!formData.totalStudentsEnrolled.trim() ||
           !formData.studentsTransferredIn.trim() ||
           !formData.studentsTransferredOut.trim()) && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Please fill in all enrollment fields to continue</p>
            </div>
          )
        )}
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <FileTextIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h4 className="font-semibold text-slate-900 dark:text-white">Summary</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formData.totalStudentsEnrolled || 0}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Net Transfer</p>
            <p className={`text-2xl font-bold ${(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0)) >= 0 ? '+' : ''}{(Number(formData.studentsTransferredIn || 0) - Number(formData.studentsTransferredOut || 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAttendance = () => (
    <div className="space-y-6">
      {/* Student Attendance Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Student Attendance</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Rate (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.studentAttendanceRate}
              onChange={(e) => updateFormData("studentAttendanceRate", e.target.value)}
              placeholder="85"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Punctuality Rate (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.studentPunctualityRate}
              onChange={(e) => updateFormData("studentPunctualityRate", e.target.value)}
              placeholder="90"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Teacher Attendance Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Teacher Attendance</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Rate (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.teacherAttendanceRate}
              onChange={(e) => updateFormData("teacherAttendanceRate", e.target.value)}
              placeholder="95"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Punctuality Rate (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.teacherPunctualityRate}
              onChange={(e) => updateFormData("teacherPunctualityRate", e.target.value)}
              placeholder="98"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Required Notice */}
      {currentSection === 2 && (
        (!formData.studentAttendanceRate.trim() ||
         !formData.studentPunctualityRate.trim() ||
         !formData.teacherAttendanceRate.trim() ||
         !formData.teacherPunctualityRate.trim()) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Please fill in all attendance fields to continue</p>
          </div>
        )
      )}

      {/* Summary Card */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <FileTextIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h4 className="font-semibold text-slate-900 dark:text-white">Summary</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Student Attendance</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formData.studentAttendanceRate || 0}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Punctuality: {formData.studentPunctualityRate || 0}%</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Teacher Attendance</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formData.teacherAttendanceRate || 0}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Punctuality: {formData.teacherPunctualityRate || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStaffing = () => (
    <div className="space-y-6">
      {!reportId && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-300 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving staffing data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <p className="text-emerald-800 dark:text-emerald-300 text-sm">
            <strong>Report Started:</strong> Staffing data will be saved to report ID: {reportId}
            {savedSections.has(3) && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

      {/* Staff Numbers Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Staff Numbers</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Staff Entitlement <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.totalStaffEntitlement}
              onChange={(e) => updateFormData("totalStaffEntitlement", e.target.value)}
              placeholder="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current Teachers <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.currentTeachersOnStaff}
              onChange={(e) => updateFormData("currentTeachersOnStaff", e.target.value)}
              placeholder="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Under-staffed By <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.underStaffedBy}
              onChange={(e) => updateFormData("underStaffedBy", e.target.value)}
              placeholder="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Over-staffed By <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.overStaffedBy}
              onChange={(e) => updateFormData("overStaffedBy", e.target.value)}
              placeholder="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Secondment Certificates Prepared? <span className="text-red-500">*</span>
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
              className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
            />
            <Label htmlFor="secondment-yes" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
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
              className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
            />
            <Label htmlFor="secondment-no" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
              No
            </Label>
          </div>
        </div>
      </div>

      {/* Required Notice */}
      {currentSection === 3 && (
        (!formData.totalStaffEntitlement.trim() ||
         !formData.currentTeachersOnStaff.trim() ||
         !formData.underStaffedBy.trim() ||
         !formData.overStaffedBy.trim() ||
         formData.secondmentCertificatesPrepared === null) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Please fill in all staffing fields to continue</p>
          </div>
        )
      )}

      {/* Teachers who left the school */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
            Teacher Status Reports
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please report any changes in teacher status for the current month
          </p>
        </div>

        {/* Teachers who left the school */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Teachers who left the school
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersWhoLeft", { name: "", status: "", reason: "" })}
              className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More
            </Button>
          </div>
          {formData.teachersWhoLeft.map((teacher, index) => (
          <div key={index} className="grid gap-4 md:grid-cols-4 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
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
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Special Leave (Disciplinary) – With Pay */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Teachers on Special Leave (Disciplinary) With Pay
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("specialLeave", { name: "", status: "", offence: "" })}
              className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More
            </Button>
          </div>
        {formData.specialLeave.map((teacher, index) => (
          <div key={index} className="grid gap-4 md:grid-cols-4 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
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
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Teachers Assumed Duty */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Teachers who Assumed Duty
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersAssumedDuty", { name: "", status: "" })}
              className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More
            </Button>
          </div>
        {formData.teachersAssumedDuty.map((teacher, index) => (
          <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
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
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Teachers Not Reported for Duty */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
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
              className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More
            </Button>
          </div>
        {formData.teachersNotReported.map((teacher, index) => (
          <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
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
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Teachers Without Salary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Teachers who did not receieve salary for current month
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addToArray("teachersWithoutSalary", { name: "", status: "", reason: "" })}
              className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More
            </Button>
          </div>
        {formData.teachersWithoutSalary.map((teacher, index) => (
          <div key={index} className="grid gap-4 md:grid-cols-4 p-4 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
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
      <div className="space-y-4">
        <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Whole School PD Session Held? <span className="text-red-500">*</span>
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
              className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
            />
            <Label htmlFor="pd-yes" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
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
              className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
            />
            <Label htmlFor="pd-no" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
              No
            </Label>
          </div>
        </div>
      </div>

      {/* Required Notice */}
      {currentSection === 4 && formData.wholeschoolPDHeld === null && (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">Please answer whether a PD session was held</p>
        </div>
      )}

      {/* Show additional fields only when Yes is selected */}
      {formData.wholeschoolPDHeld === true && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">PD Session Details</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Teachers Attended (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.teachersAttendedPD}
                onChange={(e) => updateFormData("teachersAttendedPD", e.target.value)}
                placeholder="85"
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                PD Topic <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.pdTopic}
                onChange={(e) => updateFormData("pdTopic", e.target.value)}
                placeholder="Enter PD topic"
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reason for Topic <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={formData.pdTopicReason}
              onChange={(e) => updateFormData("pdTopicReason", e.target.value)}
              placeholder="Explain why this topic was chosen"
              rows={3}
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Outcomes Achieved <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={formData.pdOutcomes}
              onChange={(e) => updateFormData("pdOutcomes", e.target.value)}
              placeholder="Describe the outcomes and impact"
              rows={3}
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Required Notice */}
          {(!formData.teachersAttendedPD.trim() ||
            !formData.pdTopic.trim() ||
            !formData.pdTopicReason.trim() ||
            !formData.pdOutcomes.trim()) && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Please fill in all PD session fields to continue</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderSupervision = () => (
    <div className="space-y-6">
      {!reportId && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-300 text-sm">
            <strong>Note:</strong> Please complete the Basic Information section first to enable saving supervision data.
          </p>
        </div>
      )}

      {reportId && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <p className="text-emerald-800 dark:text-emerald-300 text-sm">
            <strong>Report Started:</strong> Supervision data will be saved to report ID: {reportId}
            {savedSections.has(5) && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">✅ Section saved</span>
            )}
          </p>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        {/* Head Master (HM) */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Head Master (HM)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lessons Observed <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.hmLessonsObserved}
                onChange={(e) => updateFormData("hmLessonsObserved", e.target.value)}
                placeholder="0"
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Positive Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.hmPositiveFindings}
                onChange={(e) => updateFormData("hmPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Negative Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.hmNegativeFindings}
                onChange={(e) => updateFormData("hmNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Follow-up Actions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.hmFollowUpActions}
                onChange={(e) => updateFormData("hmFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Required Notice */}
          {currentSection === 5 && (
            (!formData.hmLessonsObserved.trim() ||
             !formData.hmPositiveFindings.trim() ||
             !formData.hmNegativeFindings.trim() ||
             !formData.hmFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Please fill in all Head Master supervision fields</p>
              </div>
            )
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Deputy HM (DHM) */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Deputy Head Master (DHM)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lessons Observed <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.dhmLessonsObserved}
                onChange={(e) => updateFormData("dhmLessonsObserved", e.target.value)}
                placeholder="0"
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Positive Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.dhmPositiveFindings}
                onChange={(e) => updateFormData("dhmPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Negative Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.dhmNegativeFindings}
                onChange={(e) => updateFormData("dhmNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Follow-up Actions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.dhmFollowUpActions}
                onChange={(e) => updateFormData("dhmFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Required Notice */}
          {currentSection === 5 && (
            (!formData.dhmLessonsObserved.trim() ||
             !formData.dhmPositiveFindings.trim() ||
             !formData.dhmNegativeFindings.trim() ||
             !formData.dhmFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Please fill in all Deputy Head Master supervision fields</p>
              </div>
            )
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Year Group Head / SM / Divisional Head */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Year Group Head / Senior Master / Divisional Head</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lessons Observed <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.groupHeadLessonsObserved}
                onChange={(e) => updateFormData("groupHeadLessonsObserved", e.target.value)}
                placeholder="0"
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Positive Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.groupHeadPositiveFindings}
                onChange={(e) => updateFormData("groupHeadPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Negative Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.groupHeadNegativeFindings}
                onChange={(e) => updateFormData("groupHeadNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Follow-up Actions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.groupHeadFollowUpActions}
                onChange={(e) => updateFormData("groupHeadFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                required
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Required Notice */}
          {currentSection === 5 && (
            (!formData.groupHeadLessonsObserved.trim() ||
             !formData.groupHeadPositiveFindings.trim() ||
             !formData.groupHeadNegativeFindings.trim() ||
             !formData.groupHeadFollowUpActions.trim()) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Please fill in all Year Group Head supervision fields</p>
              </div>
            )
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

        {/* Head of Department (HOD) */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Head of Department (HOD)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Number of Lessons Observed <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={formData.hodLessonsObserved}
                onChange={(e) => updateFormData("hodLessonsObserved", e.target.value)}
                placeholder="0"
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Positive Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.hodPositiveFindings}
                onChange={(e) => updateFormData("hodPositiveFindings", e.target.value)}
                placeholder="Describe positive observations"
                rows={2}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Negative Findings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.hodNegativeFindings}
                onChange={(e) => updateFormData("hodNegativeFindings", e.target.value)}
                placeholder="Describe areas for improvement"
                rows={2}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Follow-up Actions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.hodFollowUpActions}
                onChange={(e) => updateFormData("hodFollowUpActions", e.target.value)}
                placeholder="Describe follow-up actions taken"
                rows={2}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">Please fill in all Head of Department supervision fields to continue</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )

  const renderCurriculum = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Lesson Plan Monitoring</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Teachers Without Lesson Plans <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.teachersNoLessonPlans}
              onChange={(e) => updateFormData("teachersNoLessonPlans", e.target.value)}
              placeholder="0"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Actions Taken <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={formData.curriculumActionsTaken}
              onChange={(e) => updateFormData("curriculumActionsTaken", e.target.value)}
              placeholder="Describe actions taken"
              rows={3}
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Required Notice */}
      {currentSection === 6 && (
        (!formData.teachersNoLessonPlans.trim() ||
         !formData.curriculumActionsTaken.trim()) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Please fill in all curriculum monitoring fields to continue</p>
          </div>
        )
      )}
    </div>
  )

  const renderFinance = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Financial Overview</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Opening Balance (GYD) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.openingBalance}
              onChange={(e) => updateFormData("openingBalance", e.target.value)}
              placeholder="0.00"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Income (GYD) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.totalIncome}
              onChange={(e) => updateFormData("totalIncome", e.target.value)}
              placeholder="0.00"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Expenditure (GYD) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.totalExpenditure}
              onChange={(e) => updateFormData("totalExpenditure", e.target.value)}
              placeholder="0.00"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Closing Balance (GYD) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.closingBalance}
              onChange={(e) => updateFormData("closingBalance", e.target.value)}
              placeholder="0.00"
              required
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Required Notice */}
      {currentSection === 7 && (
        (!formData.openingBalance.trim() ||
         !formData.totalIncome.trim() ||
         !formData.totalExpenditure.trim() ||
         !formData.closingBalance.trim()) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Please fill in all finance fields to continue</p>
          </div>
        )
      )}

      {/* Summary Card */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <FileTextIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h4 className="font-semibold text-slate-900 dark:text-white">Financial Summary</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Opening</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">GYD {formData.openingBalance || "0"}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Income</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formData.totalIncome || "0"}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Expenditure</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">-{formData.totalExpenditure || "0"}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Closing</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">GYD {formData.closingBalance || "0"}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderIncome = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Income Sources</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addToArray("incomeSources", { source: "", amount: "" })}
            className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
        {formData.incomeSources.map((income, index) => (
          <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50">
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Source
              </Label>
              <Input
                placeholder="Enter source"
                value={income.source}
                onChange={(e) => {
                  const updated = [...formData.incomeSources]
                  updated[index].source = e.target.value
                  updateFormData("incomeSources", updated)
                }}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Amount (GYD)
              </Label>
              <Input
                placeholder="0.00"
                type="number"
                value={income.amount}
                onChange={(e) => {
                  const updated = [...formData.incomeSources]
                  updated[index].amount = e.target.value
                  updateFormData("incomeSources", updated)
                }}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" size="sm" onClick={() => removeFromArray("incomeSources", index)} className="border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSafety = () => (
    <div className="space-y-6">
      {/* Evacuation Drill Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Evacuation Drill</h3>
        <div className="space-y-4">
          <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Drill Conducted This Month? <span className="text-red-500">*</span>
          </Label>
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
                className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
                required
              />
              <Label htmlFor="evacuation-yes" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
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
                className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
              />
              <Label htmlFor="evacuation-no" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                No
              </Label>
            </div>
          </div>

          {formData.evacuationDrillHeld === true && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Persons Involved <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.personsInvolved}
                  onChange={(e) => updateFormData("personsInvolved", e.target.value)}
                  placeholder="Enter number"
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Time Taken (Minutes) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.timeTaken}
                  onChange={(e) => updateFormData("timeTaken", e.target.value)}
                  placeholder="Enter time"
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Drill Observations <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.drillObservations}
                  onChange={(e) => updateFormData("drillObservations", e.target.value)}
                  placeholder="Describe observations from the evacuation drill"
                  rows={3}
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fire Safety Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Fire Safety</h3>
        <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Fire Buckets Available? <span className="text-red-500">*</span>
        </Label>
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
                className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
                required
              />
              <Label htmlFor="firebuckets-yes" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
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
                className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
              />
              <Label htmlFor="firebuckets-no" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                No
              </Label>
            </div>
          </div>

          <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fire Extinguishers Functional? <span className="text-red-500">*</span>
          </Label>
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
                className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
                required
              />
              <Label htmlFor="extinguishers-yes" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
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
                className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
              />
              <Label htmlFor="extinguishers-no" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                No
              </Label>
            </div>
          </div>
        </div>

      {/* Incident Report Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Incident Report Summary</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Incidents <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.numberOfIncidents}
              onChange={(e) => updateFormData("numberOfIncidents", e.target.value)}
              placeholder="0"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Students Involved <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.studentsInvolved}
              onChange={(e) => updateFormData("studentsInvolved", e.target.value)}
              placeholder="0"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Teachers Involved <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={formData.teachersInvolvedIncidents}
              onChange={(e) => updateFormData("teachersInvolvedIncidents", e.target.value)}
              placeholder="0"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Prevention Actions <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={formData.preventionActions}
              onChange={(e) => updateFormData("preventionActions", e.target.value)}
              placeholder="Describe actions taken"
              rows={3}
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Required Notice */}
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
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Please fill in all safety fields to continue</p>
            </div>
          )
        )}
      </div>
    </div>
  )

  const renderMeetings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Staff Meeting Held? <span className="text-red-500">*</span>
        </Label>
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
              className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
              required
            />
            <Label htmlFor="meeting-yes" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
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
              className="h-4 w-4 text-blue-600 dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-800"
            />
            <Label htmlFor="meeting-no" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
              No
            </Label>
          </div>
        </div>
      </div>

      {formData.generalStaffMeetingHeld === true && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Meeting Details</h3>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Key Issues Discussed <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={formData.keyIssuesDiscussed}
              onChange={(e) => updateFormData("keyIssuesDiscussed", e.target.value)}
              placeholder="Describe the key issues discussed"
              rows={4}
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Decisions Implemented (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.decisionsImplemented}
              onChange={(e) => updateFormData("decisionsImplemented", e.target.value)}
              placeholder="0-100"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>
        </div>
      )}

      {/* Required Notice */}
      {currentSection === 10 && (
        (formData.generalStaffMeetingHeld === null ||
         (formData.generalStaffMeetingHeld === true && (
           !formData.keyIssuesDiscussed.trim() ||
           !formData.decisionsImplemented.trim()
         ))) && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              {formData.generalStaffMeetingHeld === null
                ? "Please select whether a staff meeting was held"
                : "Please fill in all meeting details"}
            </p>
          </div>
        )
      )}
    </div>
  )

  const renderFacilities = () => (
    <div className="space-y-6">
      {/* Repairs Needed Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Repairs Needed</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addToArray("repairsNeeded", { area: "", details: "" })}
            className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Repair
          </Button>
        </div>
        {formData.repairsNeeded.map((repair, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50">
            <div className="grid gap-2 md:w-48 flex-shrink-0">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Area</Label>
              <Select
                value={repair.area}
                onValueChange={(value) => {
                  const updated = [...formData.repairsNeeded]
                  updated[index].area = value
                  updateFormData("repairsNeeded", updated)
                }}
              >
                <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select area" />
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
            </div>
            <div className="grid gap-2 flex-1">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Details</Label>
              <Textarea
                placeholder="Details of repairs"
                value={repair.details}
                onChange={(e) => {
                  const updated = [...formData.repairsNeeded]
                  updated[index].details = e.target.value
                  updateFormData("repairsNeeded", updated)
                }}
                rows={2}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-end flex-shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => removeFromArray("repairsNeeded", index)} className="border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Teacher Facilities Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Teacher Facilities</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Toilets Functional (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.teacherToiletsFunctional}
              onChange={(e) => updateFormData("teacherToiletsFunctional", e.target.value)}
              placeholder="100"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sinks Functional (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.teacherSinksFunctional}
              onChange={(e) => updateFormData("teacherSinksFunctional", e.target.value)}
              placeholder="100"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Taps Functional (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.teacherTapsFunctional}
              onChange={(e) => updateFormData("teacherTapsFunctional", e.target.value)}
              placeholder="100"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Student Facilities Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Student Facilities</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Toilets Functional (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.studentToiletsFunctional}
              onChange={(e) => updateFormData("studentToiletsFunctional", e.target.value)}
              placeholder="100"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Taps Functional (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.studentTapsFunctional}
                onChange={(e) => updateFormData("studentTapsFunctional", e.target.value)}
                placeholder="100"
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sinks Functional (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.studentSinksFunctional}
                onChange={(e) => updateFormData("studentSinksFunctional", e.target.value)}
                placeholder="100"
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

      {/* Classroom Status Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Classroom Status</h3>
        <div className="grid gap-4 md:grid-cols-1">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overcrowded Classrooms (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.overcrowdedClassrooms || ""}
              onChange={(e) => updateFormData("overcrowdedClassrooms", e.target.value)}
              placeholder="0"
              className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Required Notice */}
      {(!formData.teacherToiletsFunctional.trim() ||
        !formData.teacherSinksFunctional.trim() ||
        !formData.teacherTapsFunctional.trim() ||
        !formData.studentToiletsFunctional.trim() ||
        !formData.studentTapsFunctional.trim() ||
        !formData.studentSinksFunctional.trim() ||
        !formData.overcrowdedClassrooms.trim()) && (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">Please fill in all facility percentage fields to continue</p>
        </div>
      )}
    </div>
  )

  const renderResources = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Curriculum Resources Needed
          </Label>
          <Textarea
            value={formData.curriculumResources}
            onChange={(e) => updateFormData("curriculumResources", e.target.value)}
            placeholder="List textbooks, teaching aids, or subject-specific materials required."
            rows={4}
            className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Janitorial Supplies Needed
          </Label>
          <Textarea
            value={formData.janitorialSupplies}
            onChange={(e) => updateFormData("janitorialSupplies", e.target.value)}
            placeholder="Specify cleaning products, equipment, or hygiene materials required."
            rows={4}
            className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Additional Issues Affecting the School
          </Label>
          <Textarea
            value={formData.otherIssues}
            onChange={(e) => updateFormData("otherIssues", e.target.value)}
            placeholder="Mention any other challenges impacting school operations."
            rows={4}
            className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  )

  const renderPhysicalEducation = () => (
    <div className="space-y-6">
      {/* Physical Education Activities */}
      <Card className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg">Physical Education Activities</CardTitle>
          <CardDescription>List the physical education activities conducted this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.physicalEducationActivities.map((item, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={item.activity}
                  onChange={(e) => {
                    const updated = [...formData.physicalEducationActivities]
                    updated[index] = { activity: e.target.value }
                    updateFormData("physicalEducationActivities", updated)
                  }}
                  placeholder="Describe the physical education activity (e.g., Football training, Athletics, Basketball)"
                  rows={2}
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updated = formData.physicalEducationActivities.filter((_, i) => i !== index)
                  updateFormData("physicalEducationActivities", updated.length > 0 ? updated : [{ activity: "" }])
                }}
                disabled={formData.physicalEducationActivities.length === 1}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updateFormData("physicalEducationActivities", [...formData.physicalEducationActivities, { activity: "" }])
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </CardContent>
      </Card>

      {/* Physical Education Challenges */}
      <Card className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg">Physical Education Challenges</CardTitle>
          <CardDescription>Describe any challenges faced in conducting physical education</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.physicalEducationChallenges.map((item, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={item.challenge}
                  onChange={(e) => {
                    const updated = [...formData.physicalEducationChallenges]
                    updated[index] = { challenge: e.target.value }
                    updateFormData("physicalEducationChallenges", updated)
                  }}
                  placeholder="Describe the challenge (e.g., Lack of equipment, Limited space, Weather conditions)"
                  rows={2}
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updated = formData.physicalEducationChallenges.filter((_, i) => i !== index)
                  updateFormData("physicalEducationChallenges", updated.length > 0 ? updated : [{ challenge: "" }])
                }}
                disabled={formData.physicalEducationChallenges.length === 1}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updateFormData("physicalEducationChallenges", [...formData.physicalEducationChallenges, { challenge: "" }])
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Challenge
          </Button>
        </CardContent>
      </Card>
    </div>
  )

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Loading Report
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Please wait while we load the report data...
              </p>
            </div>
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
              Admin Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {schoolName} - {monthYear}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${getOverallProgress()}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {getOverallProgress()}%
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
                <span>{getOverallProgress()}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${getOverallProgress()}%` }}
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
                  disabled={currentSection === 0 || reportStatus === 'submitted'}
                  className="flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
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
                        description: "You can continue this report later from the Admin dashboard.",
                        duration: 3000,
                      })
                      router.push('/dashboard/admin/submit-report')
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
                    className="w-full sm:w-auto border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 flex items-center gap-2"
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
                    !schoolId
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
              ) : currentSection === 13 ? (
                justSubmittedReport ? (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center order-3">
                    <Button
                      type="button"
                      onClick={handleViewSubmittedReport}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Report
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        window.location.reload()
                      }}
                      variant="outline"
                      className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                  className="order-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
