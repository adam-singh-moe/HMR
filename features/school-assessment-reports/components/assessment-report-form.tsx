"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send, 
  Loader2, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  ClipboardList,
  HeartPulse,
  Handshake,
  Shield,
  Target,
  Sparkles,
  Info
} from "lucide-react"
import { createAssessmentReport, saveSectionData, submitReport, getReport, calculateImprovementMetrics } from "../actions/reports"
import { getActiveTermWindow, isSubmissionWindowOpen } from "../actions/assessment-periods"
import { calculateAllCategoryScores, calculateAllTAPSCategoryScores, calculateTAPSTotalScore, assignTAPSRatingGrade, getTAPSRatingLabel } from "../actions/scoring"
import { getSchoolTypeFromEmail, getSchoolTypeFromSchoolLevel, type SchoolType, SCHOOL_TYPE_LABELS } from "@/lib/school-type"
import { 
  type FormFieldConfig,
  getFieldsForSchoolType,
  getImportanceIndicatorClass,
  getImportanceTooltip,
  usesTAPSMetrics,
  getAllCategoriesForSchoolType,
  getGradeMatrixConfig,
  ACADEMIC_FIELDS,
  ATTENDANCE_FIELDS,
  INFRASTRUCTURE_FIELDS,
  TEACHING_QUALITY_FIELDS,
  MANAGEMENT_FIELDS,
  STUDENT_WELFARE_FIELDS,
  COMMUNITY_FIELDS,
  // TAPS fields
  TAPS_SCHOOL_INPUTS_FIELDS,
  TAPS_LEADERSHIP_FIELDS,
  TAPS_ACADEMICS_FIELDS,
  TAPS_TEACHER_DEVELOPMENT_FIELDS,
  TAPS_HEALTH_SAFETY_FIELDS,
  TAPS_SCHOOL_CULTURE_FIELDS,
  TAPS_CATEGORY_CONFIGS,
} from "../config/form-fields"
import type { CategoryName, CurrentTermWindow, TAPSCategoryName } from "../types"
import { TAPS_TOTAL_MAX_SCORE, TAPS_AUTO_CALC_REQUIRED_TERMS } from "../types"

// ============================================================================
// SIMPLIFIED FORM DATA TYPES
// These are simplified interfaces for the form that map to the more detailed
// types when saving to the database
// ============================================================================

// Primary/Nursery form data types
interface FormAcademicData {
  ngsePassRate?: number
  csecPassRate?: number
  termlyAssessmentCompletion?: number
  assessmentQuality?: number
  literacyProgramImplementation?: number
  numeracyProgramImplementation?: number
}

interface FormAttendanceData {
  studentAttendanceRate?: number
  teacherAttendanceRate?: number
  studentPunctualityRate?: number
  teacherPunctualityRate?: number
}

interface FormInfrastructureData {
  classroomCondition?: number
  washroomCondition?: number
  waterSupplyAdequacy?: number
  libraryCondition?: number
  computerLabExists?: boolean
  internetAccess?: boolean
  fireExtinguishers?: number
  firstAidKitAvailable?: boolean
}

interface FormTeachingQualityData {
  percentageQualifiedTeachers?: number
  pdSessionsAttended?: number
  lessonPlanQuality?: number
  differentiatedInstruction?: number
  technologyIntegration?: number
}

interface FormManagementData {
  sbaMeetingsHeld?: number
  ptaMeetingsHeld?: number
  parentAttendanceRate?: number
  budgetUtilizationRate?: number
  studentRecordsComplete?: number
}

interface FormStudentWelfareData {
  guidanceCounselorAvailable?: boolean
  counselingSessionsProvided?: number
  clubsAndSocieties?: number
  sportsTeams?: number
  disciplinePolicyImplemented?: boolean
  specialNeedsSupportProvided?: boolean
}

interface FormCommunityData {
  communityEventsHosted?: number
  communityVolunteers?: number
  businessPartnerships?: number
  governmentProgramsParticipation?: number
}

// TAPS form data types (Secondary schools)
interface TAPSSchoolInputsData {
  trainedTeachersRate?: number
  teacherLearnerRatio?: number
  teacherAttendanceRate?: number
  teacherAttendanceIncrease?: number
  teachersLatePercentage?: number
  sweeperCleanerAttendance?: number
  learnersAttendanceRate?: number
  learnersAttendanceIncrease?: number
}

interface TAPSLeadershipData {
  projectPlanProgress?: string
  hmAttendanceRate?: number
  leadershipTeamAttendance?: number
}

interface TAPSAcademicsData {
  // Grade 7
  grade7OverallPassRate?: number
  grade7EnglishPassRate?: number
  grade7MathPassRate?: number
  grade7StemPassRate?: number
  grade7Above70Percent?: number
  // Grade 8
  grade8OverallPassRate?: number
  grade8EnglishPassRate?: number
  grade8MathPassRate?: number
  grade8StemPassRate?: number
  grade8Above70Percent?: number
  // Grade 9
  grade9OverallPassRate?: number
  grade9EnglishPassRate?: number
  grade9MathPassRate?: number
  grade9StemPassRate?: number
  grade9Above70Percent?: number
  // Grade 10
  grade10OverallPassRate?: number
  grade10EnglishPassRate?: number
  grade10MathPassRate?: number
  grade10StemPassRate?: number
  grade10Above70Percent?: number
  // Grade 11
  grade11OverallPassRate?: number
  grade11EnglishPassRate?: number
  grade11MathPassRate?: number
  grade11StemPassRate?: number
  grade11Above70Percent?: number
}

interface TAPSTeacherDevelopmentData {
  pdTrainingSessions?: number
  classroomSupervisoryVisits?: number
}

interface TAPSHealthSafetyData {
  studentIncidenceRate?: number
  teacherDisciplinaryRate?: number
  fireSafetyLevel?: string
  evacuationDrillFrequency?: string
  potableWaterAccess?: string
}

interface TAPSSchoolCultureData {
  extracurricularClubs?: number
  learnersInClubsPercentage?: number
  remediationLevel?: string
  ptaParticipationRate?: number
  ptaInitiatedActivities?: number
  ptaGeneralMeetings?: number
  parentsCollectingReportCards?: number
}

// ============================================================================
// TYPES
// ============================================================================

interface AssessmentReportFormProps {
  schoolId: string
  schoolName: string
  regionName: string
  schoolLevel?: string | null
  userId: string
  userEmail?: string
  existingReportId?: string
  onSuccess?: () => void
}

interface FormSection {
  id: CategoryName | 'review'
  title: string
  icon: React.ReactNode
  maxPoints: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORM_SECTIONS: FormSection[] = [
  { id: 'academic', title: 'Academic Performance', icon: <BookOpen className="h-5 w-5" />, maxPoints: 300 },
  { id: 'attendance', title: 'Attendance', icon: <Users className="h-5 w-5" />, maxPoints: 150 },
  { id: 'infrastructure', title: 'Infrastructure', icon: <Building2 className="h-5 w-5" />, maxPoints: 150 },
  { id: 'teaching_quality', title: 'Teaching Quality', icon: <GraduationCap className="h-5 w-5" />, maxPoints: 150 },
  { id: 'management', title: 'Management', icon: <ClipboardList className="h-5 w-5" />, maxPoints: 100 },
  { id: 'student_welfare', title: 'Student Welfare', icon: <HeartPulse className="h-5 w-5" />, maxPoints: 100 },
  { id: 'community', title: 'Community Engagement', icon: <Handshake className="h-5 w-5" />, maxPoints: 50 },
  { id: 'review', title: 'Review & Submit', icon: <CheckCircle2 className="h-5 w-5" />, maxPoints: 0 },
]

// TAPS Form Sections for Secondary Schools
interface TAPSFormSection {
  id: TAPSCategoryName | 'review'
  title: string
  icon: React.ReactNode
  maxPoints: number
}

const TAPS_FORM_SECTIONS: TAPSFormSection[] = [
  { id: 'school_inputs_operations', title: 'School Inputs & Operations', icon: <Building2 className="h-5 w-5" />, maxPoints: 80 },
  { id: 'leadership', title: 'Leadership', icon: <Target className="h-5 w-5" />, maxPoints: 30 },
  { id: 'academics', title: 'Academics', icon: <BookOpen className="h-5 w-5" />, maxPoints: 200 },
  { id: 'teacher_development', title: 'Teacher Development', icon: <GraduationCap className="h-5 w-5" />, maxPoints: 20 },
  { id: 'health_safety', title: 'Health & Safety', icon: <Shield className="h-5 w-5" />, maxPoints: 50 },
  { id: 'school_culture', title: 'School Culture', icon: <Sparkles className="h-5 w-5" />, maxPoints: 70 },
  { id: 'review', title: 'Review & Submit', icon: <CheckCircle2 className="h-5 w-5" />, maxPoints: 0 },
]

const RATING_OPTIONS = [
  { value: 5, label: 'Outstanding', description: '90-100% performance' },
  { value: 4, label: 'Very Good', description: '75-89% performance' },
  { value: 3, label: 'Good', description: '60-74% performance' },
  { value: 2, label: 'Satisfactory', description: '40-59% performance' },
  { value: 1, label: 'Needs Improvement', description: 'Below 40% performance' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function AssessmentReportForm({
  schoolId,
  schoolName,
  regionName,
  schoolLevel,
  userId,
  userEmail,
  existingReportId,
  onSuccess,
}: AssessmentReportFormProps) {
  const { toast } = useToast()
  const [currentSection, setCurrentSection] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [reportId, setReportId] = useState<string | null>(existingReportId || null)
  const [activeTermWindow, setActiveTermWindow] = useState<CurrentTermWindow | null>(null)
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Detect school type from school level first (DB), then fall back to email.
  const schoolTypeFromLevel = getSchoolTypeFromSchoolLevel(schoolLevel)
  const schoolTypeFromName = getSchoolTypeFromSchoolLevel(schoolName)
  const schoolTypeFromEmail = getSchoolTypeFromEmail(userEmail)?.type
  const schoolType: SchoolType = schoolTypeFromLevel || schoolTypeFromName || schoolTypeFromEmail || "primary"

  // Info used for the header badge
  const schoolTypeInfo = {
    type: schoolType,
    label: SCHOOL_TYPE_LABELS[schoolType],
  }
  
  // Form data for all sections (Primary/Nursery - Demo metrics)
  const [academicData, setAcademicData] = useState<FormAcademicData>({})
  const [attendanceData, setAttendanceData] = useState<FormAttendanceData>({})
  const [infrastructureData, setInfrastructureData] = useState<FormInfrastructureData>({})
  const [teachingQualityData, setTeachingQualityData] = useState<FormTeachingQualityData>({})
  const [managementData, setManagementData] = useState<FormManagementData>({})
  const [studentWelfareData, setStudentWelfareData] = useState<FormStudentWelfareData>({})
  const [communityData, setCommunityData] = useState<FormCommunityData>({})
  
  // Form data for TAPS sections (Secondary schools)
  const [schoolInputsData, setSchoolInputsData] = useState<TAPSSchoolInputsData>({})
  const [leadershipData, setLeadershipData] = useState<TAPSLeadershipData>({})
  const [tapsAcademicsData, setTapsAcademicsData] = useState<TAPSAcademicsData>({})
  const [teacherDevelopmentData, setTeacherDevelopmentData] = useState<TAPSTeacherDevelopmentData>({})
  const [healthSafetyData, setHealthSafetyData] = useState<TAPSHealthSafetyData>({})
  const [schoolCultureData, setSchoolCultureData] = useState<TAPSSchoolCultureData>({})
  
  // Auto-calculated improvement metrics
  const [improvementMetrics, setImprovementMetrics] = useState<{ teacherAttendanceIncrease?: number, learnersAttendanceIncrease?: number } | null>(null)
  const [hasEnoughHistoricalData, setHasEnoughHistoricalData] = useState(false)
  
  // Check if using TAPS metrics
  const isTAPS = usesTAPSMetrics(schoolType)

  type MissingField = {
    sectionId: CategoryName | TAPSCategoryName
    sectionTitle: string
    fieldId: string
    fieldLabel: string
  }
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // Check if submission is open using new term window system
      const windowResult = await getActiveTermWindow()
      if (windowResult.window) {
        setActiveTermWindow(windowResult.window)
        setSubmissionOpen(windowResult.window.isOpen)
      } else {
        // Fallback check
        const submissionResult = await isSubmissionWindowOpen()
        setSubmissionOpen(submissionResult.isOpen)
        if (submissionResult.window) {
          setActiveTermWindow(submissionResult.window)
        }
      }
      
      // Load existing report if provided
      if (existingReportId) {
        const reportResult = await getReport(existingReportId)
        if (reportResult.report) {
          loadExistingReport(reportResult.report)
        }
      }
      
      // For TAPS schools, calculate improvement metrics from historical data
      if (isTAPS) {
        const metrics = await calculateImprovementMetrics(schoolId)
        if (metrics) {
          setImprovementMetrics(metrics)
          setHasEnoughHistoricalData(true)
          // Pre-populate the auto-calculated fields
          setSchoolInputsData(prev => ({
            ...prev,
            teacherAttendanceIncrease: metrics.teacherAttendanceIncrease,
            learnersAttendanceIncrease: metrics.learnersAttendanceIncrease,
          }))
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load form data. Please refresh the page.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const loadExistingReport = (report: any) => {
    setReportId(report.id)
    
    if (isTAPS) {
      // Load TAPS data - property names match the mapDbRowToReport function
      if (report.tapsSchoolInputsScores) setSchoolInputsData(report.tapsSchoolInputsScores)
      if (report.tapsLeadershipScores) setLeadershipData(report.tapsLeadershipScores)
      if (report.tapsAcademicsScores) setTapsAcademicsData(report.tapsAcademicsScores)
      if (report.tapsTeacherDevelopmentScores) setTeacherDevelopmentData(report.tapsTeacherDevelopmentScores)
      if (report.tapsHealthSafetyScores) setHealthSafetyData(report.tapsHealthSafetyScores)
      if (report.tapsSchoolCultureScores) setSchoolCultureData(report.tapsSchoolCultureScores)
    } else {
      // Load demo data
      if (report.academicScores) setAcademicData(report.academicScores)
      if (report.attendanceScores) setAttendanceData(report.attendanceScores)
      if (report.infrastructureScores) setInfrastructureData(report.infrastructureScores)
      if (report.teachingQualityScores) setTeachingQualityData(report.teachingQualityScores)
      if (report.managementScores) setManagementData(report.managementScores)
      if (report.studentWelfareScores) setStudentWelfareData(report.studentWelfareScores)
      if (report.communityScores) setCommunityData(report.communityScores)
    }
  }
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  // Get current form sections based on school type
  const currentFormSections = isTAPS ? TAPS_FORM_SECTIONS : FORM_SECTIONS

  // Only show "incomplete" error markers after a user action (Review/Submit).
  useEffect(() => {
    const meta = currentFormSections[currentSection]
    if (meta?.id === 'review') {
      setShowValidationErrors(true)
    }
  }, [currentFormSections, currentSection])
  
  const handleSaveSection = async () => {
    setIsSaving(true)
    try {
      // Create report if it doesn't exist
      if (!reportId && activeTermWindow) {
        const createResult = await createAssessmentReport()
        if (createResult.error) {
          toast({ title: 'Error', description: createResult.error, variant: 'destructive' })
          setIsSaving(false)
          return
        }
        if (createResult.reportId) {
          setReportId(createResult.reportId)
        }
      }
      
      const currentReportId = reportId || (await getOrCreateReport())
      if (!currentReportId) {
        toast({ title: 'Error', description: 'Failed to create report.', variant: 'destructive' })
        setIsSaving(false)
        return
      }
      
      // Get current section data based on school type
      const sectionId = currentFormSections[currentSection].id
      const sectionData = isTAPS ? getTAPSSectionData(sectionId as TAPSCategoryName | 'review') : getSectionData(sectionId as CategoryName | 'review')
      
      if (sectionId !== 'review') {
        const saveResult = await saveSectionData(
          currentReportId,
          sectionId as any, // CategoryName or TAPSCategoryName
          sectionData
        )
        
        if (saveResult.error) {
          toast({ title: 'Error', description: saveResult.error, variant: 'destructive' })
        } else {
          setLastSaved(new Date())
          toast({ title: 'Saved', description: 'Your progress has been saved.' })
        }
      }
    } catch (error) {
      console.error('Error saving section:', error)
      toast({ title: 'Error', description: 'Failed to save. Please try again.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }
  
  const getOrCreateReport = async (): Promise<string | null> => {
    if (reportId) return reportId
    
    if (!activeTermWindow) {
      return null
    }
    
    const createResult = await createAssessmentReport()
    if (createResult.reportId) {
      setReportId(createResult.reportId)
      return createResult.reportId
    }
    return null
  }
  
  const getSectionData = (sectionId: CategoryName | 'review') => {
    switch (sectionId) {
      case 'academic': return academicData
      case 'attendance': return attendanceData
      case 'infrastructure': return infrastructureData
      case 'teaching_quality': return teachingQualityData
      case 'management': return managementData
      case 'student_welfare': return studentWelfareData
      case 'community': return communityData
      default: return {}
    }
  }
  
  const getTAPSSectionData = (sectionId: TAPSCategoryName | 'review') => {
    switch (sectionId) {
      case 'school_inputs_operations': return schoolInputsData
      case 'leadership': return leadershipData
      case 'academics': return tapsAcademicsData
      case 'teacher_development': return teacherDevelopmentData
      case 'health_safety': return healthSafetyData
      case 'school_culture': return schoolCultureData
      default: return {}
    }
  }

  const isFieldCompleted = (field: FormFieldConfig, value: any) => {
    if (value === undefined || value === null) return false
    if (field.type === 'boolean') return typeof value === 'boolean'
    if (field.type === 'select') return value !== ''
    if (field.type === 'number') return value !== '' && Number.isFinite(Number(value))
    if (field.type === 'rating') return value !== '' && Number.isFinite(Number(value))
    return value !== ''
  }

  const incompleteSectionIds = useMemo(() => {
    const set = new Set<string>()

    if (isTAPS) {
      const sections: { id: TAPSCategoryName; data: any; fields: FormFieldConfig[] }[] = [
        { id: 'school_inputs_operations', data: schoolInputsData, fields: TAPS_SCHOOL_INPUTS_FIELDS },
        { id: 'leadership', data: leadershipData, fields: TAPS_LEADERSHIP_FIELDS },
        { id: 'academics', data: tapsAcademicsData, fields: TAPS_ACADEMICS_FIELDS },
        { id: 'teacher_development', data: teacherDevelopmentData, fields: TAPS_TEACHER_DEVELOPMENT_FIELDS },
        { id: 'health_safety', data: healthSafetyData, fields: TAPS_HEALTH_SAFETY_FIELDS },
        { id: 'school_culture', data: schoolCultureData, fields: TAPS_SCHOOL_CULTURE_FIELDS },
      ]

      for (const section of sections) {
        for (const field of section.fields) {
          const isAuto = Boolean((field as any).autoCalculated || (field as any).autoCalculable)
          if (isAuto) continue

          const value = (section.data as any)[field.id]
          if (!isFieldCompleted(field, value)) {
            set.add(section.id)
            break
          }
        }
      }

      return set
    }

    const sections: { id: CategoryName; data: any; fields: FormFieldConfig[] }[] = [
      { id: 'academic', data: academicData, fields: getFieldsForSchoolType(ACADEMIC_FIELDS, schoolType) },
      { id: 'attendance', data: attendanceData, fields: getFieldsForSchoolType(ATTENDANCE_FIELDS, schoolType) },
      { id: 'infrastructure', data: infrastructureData, fields: getFieldsForSchoolType(INFRASTRUCTURE_FIELDS, schoolType) },
      { id: 'teaching_quality', data: teachingQualityData, fields: getFieldsForSchoolType(TEACHING_QUALITY_FIELDS, schoolType) },
      { id: 'management', data: managementData, fields: getFieldsForSchoolType(MANAGEMENT_FIELDS, schoolType) },
      { id: 'student_welfare', data: studentWelfareData, fields: getFieldsForSchoolType(STUDENT_WELFARE_FIELDS, schoolType) },
      { id: 'community', data: communityData, fields: getFieldsForSchoolType(COMMUNITY_FIELDS, schoolType) },
    ]

    for (const section of sections) {
      for (const field of section.fields) {
        const value = (section.data as any)[field.id]
        if (!isFieldCompleted(field, value)) {
          set.add(section.id)
          break
        }
      }
    }

    return set
  }, [
    isTAPS,
    schoolType,
    academicData,
    attendanceData,
    infrastructureData,
    teachingQualityData,
    managementData,
    studentWelfareData,
    communityData,
    schoolInputsData,
    leadershipData,
    tapsAcademicsData,
    teacherDevelopmentData,
    healthSafetyData,
    schoolCultureData,
  ])

  const findFirstIncompleteField = (): MissingField | null => {
    if (isTAPS) {
      const sections: { id: TAPSCategoryName; title: string; data: any; fields: FormFieldConfig[] }[] = [
        { id: 'school_inputs_operations', title: 'School Inputs & Operations', data: schoolInputsData, fields: TAPS_SCHOOL_INPUTS_FIELDS },
        { id: 'leadership', title: 'Leadership', data: leadershipData, fields: TAPS_LEADERSHIP_FIELDS },
        { id: 'academics', title: 'Academics', data: tapsAcademicsData, fields: TAPS_ACADEMICS_FIELDS },
        { id: 'teacher_development', title: 'Teacher Development', data: teacherDevelopmentData, fields: TAPS_TEACHER_DEVELOPMENT_FIELDS },
        { id: 'health_safety', title: 'Health & Safety', data: healthSafetyData, fields: TAPS_HEALTH_SAFETY_FIELDS },
        { id: 'school_culture', title: 'School Culture', data: schoolCultureData, fields: TAPS_SCHOOL_CULTURE_FIELDS },
      ]

      for (const section of sections) {
        for (const field of section.fields) {
          const isAuto = Boolean((field as any).autoCalculated || (field as any).autoCalculable)
          // Auto-calculated fields are never user-required (either skipped until enough history,
          // or disabled when auto-calculated).
          if (isAuto) continue

          const value = (section.data as any)[field.id]
          if (!isFieldCompleted(field, value)) {
            return {
              sectionId: section.id,
              sectionTitle: section.title,
              fieldId: field.id,
              fieldLabel: field.label,
            }
          }
        }
      }

      return null
    }

    const sections: { id: CategoryName; title: string; data: any; fields: FormFieldConfig[] }[] = [
      { id: 'academic', title: 'Academic Performance', data: academicData, fields: getFieldsForSchoolType(ACADEMIC_FIELDS, schoolType) },
      { id: 'attendance', title: 'Attendance', data: attendanceData, fields: getFieldsForSchoolType(ATTENDANCE_FIELDS, schoolType) },
      { id: 'infrastructure', title: 'Infrastructure', data: infrastructureData, fields: getFieldsForSchoolType(INFRASTRUCTURE_FIELDS, schoolType) },
      { id: 'teaching_quality', title: 'Teaching Quality', data: teachingQualityData, fields: getFieldsForSchoolType(TEACHING_QUALITY_FIELDS, schoolType) },
      { id: 'management', title: 'Management', data: managementData, fields: getFieldsForSchoolType(MANAGEMENT_FIELDS, schoolType) },
      { id: 'student_welfare', title: 'Student Welfare', data: studentWelfareData, fields: getFieldsForSchoolType(STUDENT_WELFARE_FIELDS, schoolType) },
      { id: 'community', title: 'Community Engagement', data: communityData, fields: getFieldsForSchoolType(COMMUNITY_FIELDS, schoolType) },
    ]

    for (const section of sections) {
      for (const field of section.fields) {
        const value = (section.data as any)[field.id]
        if (!isFieldCompleted(field, value)) {
          return {
            sectionId: section.id,
            sectionTitle: section.title,
            fieldId: field.id,
            fieldLabel: field.label,
          }
        }
      }
    }

    return null
  }
  
  const handleNext = async () => {
    await handleSaveSection()
    if (currentSection < currentFormSections.length - 1) {
      setCurrentSection(prev => prev + 1)
    }
  }
  
  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1)
    }
  }
  
  const handleSubmit = async () => {
    if (!reportId) {
      toast({ title: 'Error', description: 'No report to submit.', variant: 'destructive' })
      return
    }
    
    if (!submissionOpen) {
      toast({ title: 'Error', description: 'Submission window is closed.', variant: 'destructive' })
      return
    }

    // From this point on, we should surface missing-field indicators in the UI.
    setShowValidationErrors(true)

    const firstMissing = findFirstIncompleteField()
    if (firstMissing) {
      toast({
        title: 'Form incomplete',
            description: `${firstMissing.sectionTitle} – ${firstMissing.fieldLabel}`,
        variant: 'destructive',
      })

      const idx = currentFormSections.findIndex((s) => s.id === (firstMissing.sectionId as any))
      if (idx >= 0) setCurrentSection(idx)

      // Scroll/focus the missing field (best-effort)
      setTimeout(() => {
        const container = document.getElementById(`field-${firstMissing.fieldId}`)
        container?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const focusable = container?.querySelector('input, textarea, [role="radiogroup"], button, [tabindex]') as
          | HTMLElement
          | null
        focusable?.focus?.()
      }, 50)

      return
    }
    
    setIsSubmitting(true)
    try {
      const result = await submitReport(reportId)
      
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Your assessment report has been submitted!' })
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error submitting report:', error)

      // Fallback: Server Actions can intermittently fail in dev (stale action manifest / middleware redirects).
      // Use an API route submission path so users can still submit.
      try {
        const res = await fetch('/api/school-assessment/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ reportId }),
        })

        const apiResult = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast({
            title: 'Error',
            description: apiResult?.error || 'Failed to submit. Please try again.',
            variant: 'destructive',
          })
          return
        }

        if (apiResult?.error) {
          toast({ title: 'Error', description: apiResult.error, variant: 'destructive' })
          return
        }

        toast({ title: 'Success', description: 'Your assessment report has been submitted!' })
        onSuccess?.()
      } catch (fallbackError) {
        console.error('Fallback submit error:', fallbackError)
        toast({ title: 'Error', description: 'Failed to submit. Please try again.', variant: 'destructive' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // ============================================================================
  // CALCULATE PROGRESS
  // ============================================================================
  
  const calculateProgress = () => {
    if (isTAPS) {
      return calculateTAPSProgress()
    }
    
    // Demo metrics: Use actual form field configurations filtered by school type
    // This ensures we only count fields that are actually visible in the form
    const sections = [
      { data: academicData, fields: getFieldsForSchoolType(ACADEMIC_FIELDS, schoolType) },
      { data: attendanceData, fields: getFieldsForSchoolType(ATTENDANCE_FIELDS, schoolType) },
      { data: infrastructureData, fields: getFieldsForSchoolType(INFRASTRUCTURE_FIELDS, schoolType) },
      { data: teachingQualityData, fields: getFieldsForSchoolType(TEACHING_QUALITY_FIELDS, schoolType) },
      { data: managementData, fields: getFieldsForSchoolType(MANAGEMENT_FIELDS, schoolType) },
      { data: studentWelfareData, fields: getFieldsForSchoolType(STUDENT_WELFARE_FIELDS, schoolType) },
      { data: communityData, fields: getFieldsForSchoolType(COMMUNITY_FIELDS, schoolType) },
    ]
    
    let totalFields = 0
    let completedFields = 0
    
    sections.forEach(section => {
      section.fields.forEach(field => {
        totalFields++
        // Use the field.id from the config to check if the field has a value
        if ((section.data as any)[field.id] !== undefined && (section.data as any)[field.id] !== null) {
          completedFields++
        }
      })
    })
    
    return Math.round((completedFields / totalFields) * 100)
  }
  
  const calculateTAPSProgress = () => {
    // TAPS metrics: Count fields across all TAPS categories
    const sections = [
      { data: schoolInputsData, fields: TAPS_SCHOOL_INPUTS_FIELDS },
      { data: leadershipData, fields: TAPS_LEADERSHIP_FIELDS },
      { data: tapsAcademicsData, fields: TAPS_ACADEMICS_FIELDS },
      { data: teacherDevelopmentData, fields: TAPS_TEACHER_DEVELOPMENT_FIELDS },
      { data: healthSafetyData, fields: TAPS_HEALTH_SAFETY_FIELDS },
      { data: schoolCultureData, fields: TAPS_SCHOOL_CULTURE_FIELDS },
    ]
    
    let totalFields = 0
    let completedFields = 0
    
    sections.forEach(section => {
      section.fields.forEach(field => {
        // Skip auto-calculated fields if we don't have historical data
        if (field.autoCalculated && !hasEnoughHistoricalData) {
          return
        }
        totalFields++
        if ((section.data as any)[field.id] !== undefined && (section.data as any)[field.id] !== null && (section.data as any)[field.id] !== '') {
          completedFields++
        }
      })
    })
    
    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
  }
  
  const calculateSectionScore = (sectionId: CategoryName) => {
    const scores = calculateAllCategoryScores({
      academic: academicData as any,
      attendance: attendanceData as any,
      infrastructure: infrastructureData as any,
      teachingQuality: teachingQualityData as any,
      management: managementData as any,
      studentWelfare: studentWelfareData as any,
      community: communityData as any,
    })
    
    return scores[sectionId] || 0
  }
  
  const calculateTAPSSectionScore = (sectionId: TAPSCategoryName) => {
    const scores = calculateAllTAPSCategoryScores({
      schoolInputs: schoolInputsData as any,
      leadership: leadershipData as any,
      academics: tapsAcademicsData as any,
      teacherDevelopment: teacherDevelopmentData as any,
      healthSafety: healthSafetyData as any,
      schoolCulture: schoolCultureData as any,
    })
    
    return scores[sectionId] || 0
  }
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderRatingField = (
    label: string,
    description: string,
    value: number | undefined,
    onChange: (value: number) => void
  ) => (
    <div className="space-y-3 p-4 border rounded-lg">
      <div>
        <Label className="text-base font-semibold">{label}</Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <RadioGroup
        value={value?.toString() || ''}
        onValueChange={(v: string) => onChange(parseInt(v))}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2"
      >
        {RATING_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value.toString()} id={`${label}-${option.value}`} />
            <Label
              htmlFor={`${label}-${option.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              <span className="font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
  
  const renderNumberField = (
    label: string,
    description: string,
    value: number | undefined,
    onChange: (value: number | undefined) => void,
    suffix?: string,
    min?: number,
    max?: number
  ) => (
    <div className="space-y-2 p-4 border rounded-lg">
      <div>
        <Label className="text-base font-semibold">{label}</Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(undefined)
              return
            }
            const n = Number(raw)
            onChange(Number.isFinite(n) ? n : undefined)
          }}
          min={min || 0}
          max={max || 100}
          className="max-w-[150px]"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
  
  // ============================================================================
  // DYNAMIC FIELD RENDERER
  // Renders fields based on configuration and filters by school type
  // ============================================================================
  
  const renderDynamicField = (
    field: FormFieldConfig,
    value: any,
    onChange: (value: any) => void
  ) => {
    if (field.type === 'rating') {
      return renderRatingField(field.label, field.description, value, onChange)
    }
    if (field.type === 'number') {
      return renderNumberField(field.label, field.description, value, onChange, field.suffix, field.min, field.max)
    }
    return null
  }
  
  const getFilteredFields = (fields: FormFieldConfig[]) => {
    return getFieldsForSchoolType(fields, schoolType)
  }
  
  // ============================================================================
  // TAPS FIELD RENDERERS
  // ============================================================================
  
  // Importance indicator component
  const renderImportanceIndicator = (importance?: 1 | 2 | 3) => {
    if (!importance) return null
    
    const colorClass = getImportanceIndicatorClass(importance)
    const tooltip = getImportanceTooltip(importance)
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-block w-3 h-3 rounded-full ${colorClass} ml-2 cursor-help`} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  // Select field renderer for TAPS
  const renderSelectField = (
    field: TAPSFormFieldConfig,
    value: string | undefined,
    onChange: (value: string) => void,
    disabled?: boolean
  ) => {
    const options = field.options || []
    
    return (
      <div className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-center">
          <Label className="text-base font-semibold">{field.label}</Label>
          {renderImportanceIndicator(field.importance)}
        </div>
        <p className="text-sm text-muted-foreground">{field.description}</p>
        <Select
          value={value || ''}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger className="max-w-[300px]">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
  
  // Number field renderer for TAPS (with importance indicator)
  const renderTAPSNumberField = (
    field: TAPSFormFieldConfig,
    value: number | undefined,
    onChange: (value: number | undefined) => void,
    disabled?: boolean
  ) => {
    const isAutoCalc = field.autoCalculated && hasEnoughHistoricalData
    
    return (
      <div className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-center">
          <Label className="text-base font-semibold">{field.label}</Label>
          {renderImportanceIndicator(field.importance)}
          {isAutoCalc && (
            <Badge variant="outline" className="ml-2 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Auto-calculated
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{field.description}</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            id={field.id}
            name={field.id}
            value={value ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                onChange(undefined)
                return
              }
              const n = Number(raw)
              onChange(Number.isFinite(n) ? n : undefined)
            }}
            min={field.min || 0}
            max={field.max || 100}
            step={field.step || 1}
            className="max-w-[150px]"
            disabled={disabled || isAutoCalc}
          />
          {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
        </div>
        {field.autoCalculated && !hasEnoughHistoricalData && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Info className="h-3 w-3" />
            This field will be auto-calculated after {TAPS_AUTO_CALC_REQUIRED_TERMS} previous term reports are submitted.
          </p>
        )}
      </div>
    )
  }
  
  // Dynamic TAPS field renderer
  const renderTAPSField = (
    field: TAPSFormFieldConfig,
    value: any,
    onChange: (value: any) => void
  ) => {
    const disabled = field.autoCalculated && hasEnoughHistoricalData
    
    switch (field.type) {
      case 'number':
        return renderTAPSNumberField(field, value, onChange, disabled)
      case 'select':
        return renderSelectField(field, value, onChange, disabled)
      default:
        return renderTAPSNumberField(field, value, onChange, disabled)
    }
  }
  
  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================
  
  const renderAcademicSection = () => {
    const filteredFields = getFilteredFields(ACADEMIC_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No academic fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (academicData as any)[field.id],
                  (v) => setAcademicData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderAttendanceSection = () => {
    const filteredFields = getFilteredFields(ATTENDANCE_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No attendance fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (attendanceData as any)[field.id],
                  (v) => setAttendanceData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderInfrastructureSection = () => {
    const filteredFields = getFilteredFields(INFRASTRUCTURE_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No infrastructure fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (infrastructureData as any)[field.id],
                  (v) => setInfrastructureData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderTeachingQualitySection = () => {
    const filteredFields = getFilteredFields(TEACHING_QUALITY_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No teaching quality fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (teachingQualityData as any)[field.id],
                  (v) => setTeachingQualityData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderManagementSection = () => {
    const filteredFields = getFilteredFields(MANAGEMENT_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No management fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (managementData as any)[field.id],
                  (v) => setManagementData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderStudentWelfareSection = () => {
    const filteredFields = getFilteredFields(STUDENT_WELFARE_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No student welfare fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (studentWelfareData as any)[field.id],
                  (v) => setStudentWelfareData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const renderCommunitySection = () => {
    const filteredFields = getFilteredFields(COMMUNITY_FIELDS)
    
    return (
      <div className="space-y-6">
        {filteredFields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No community fields applicable for {SCHOOL_TYPE_LABELS[schoolType]}
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredFields.map(field => (
              <div key={field.id} id={`field-${field.id}`}>
                {renderDynamicField(
                  field,
                  (communityData as any)[field.id],
                  (v) => setCommunityData(prev => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // ============================================================================
  // TAPS SECTION RENDERERS (Secondary Schools)
  // ============================================================================
  
  const renderTAPSSchoolInputsSection = () => {
    // Sort fields by importance (3 first, then 2, then 1)
    const sortedFields = [...TAPS_SCHOOL_INPUTS_FIELDS].sort((a, b) => (b.importance || 0) - (a.importance || 0))
    
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>TAPS Metrics</AlertTitle>
          <AlertDescription>
            Fields are ordered by importance. Red dot = Critical, Amber dot = Important, Yellow dot = Standard.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4">
          {sortedFields.map(field => (
            <div key={field.id} id={`field-${field.id}`}>
              {renderTAPSField(
                field,
                (schoolInputsData as any)[field.id],
                (v) => setSchoolInputsData(prev => ({ ...prev, [field.id]: v }))
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const renderTAPSLeadershipSection = () => {
    const sortedFields = [...TAPS_LEADERSHIP_FIELDS].sort((a, b) => (b.importance || 0) - (a.importance || 0))
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {sortedFields.map(field => (
            <div key={field.id} id={`field-${field.id}`}>
              {renderTAPSField(
                field,
                (leadershipData as any)[field.id],
                (v) => setLeadershipData(prev => ({ ...prev, [field.id]: v }))
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const renderTAPSAcademicsSection = () => {
    // Get grade matrix configuration
    const gradeConfig = getGradeMatrixConfig()
    
    // Create a map of field IDs to their configs for quick lookup
    const fieldConfigMap: Record<string, TAPSFormFieldConfig> = {}
    TAPS_ACADEMICS_FIELDS.forEach(field => {
      fieldConfigMap[field.id] = field
    })
    
    // Define field labels for the metrics within each grade
    const metricLabels: Record<string, string> = {
      overall: 'Overall Pass Rate',
      english: 'English A Pass Rate',
      math: 'Mathematics Pass Rate',
      stem: 'STEM Pass Rate',
      above70: 'Learners Achieving 70%+',
    }
    
    return (
      <div className="space-y-6">
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertTitle>Academic Metrics by Grade</AlertTitle>
          <AlertDescription>
            Enter pass rates and performance data for each grade level (7-11). Each metric is scored separately.
          </AlertDescription>
        </Alert>
        
        {gradeConfig.grades.map(gradeInfo => {
          const { grade, label, fields } = gradeInfo
          
          // Get the field configs for this grade
          const gradeFieldEntries = Object.entries(fields).map(([metricKey, fieldId]) => {
            const fieldConfig = fieldConfigMap[fieldId]
            return { metricKey, fieldId, fieldConfig }
          }).filter(entry => entry.fieldConfig) // Filter out any missing configs
          
          if (gradeFieldEntries.length === 0) return null
          
          return (
            <Card key={grade} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                    {label}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {gradeFieldEntries.map(({ metricKey, fieldId, fieldConfig }) => (
                    <div key={fieldId} id={`field-${fieldId}`}>
                      {renderTAPSField(
                        {
                          ...fieldConfig,
                          label: metricLabels[metricKey] || fieldConfig.label,
                        },
                        (tapsAcademicsData as any)[fieldId],
                        (v) => setTapsAcademicsData(prev => ({ ...prev, [fieldId]: v }))
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }
  
  const renderTAPSTeacherDevelopmentSection = () => {
    const sortedFields = [...TAPS_TEACHER_DEVELOPMENT_FIELDS].sort((a, b) => (b.importance || 0) - (a.importance || 0))
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {sortedFields.map(field => (
            <div key={field.id} id={`field-${field.id}`}>
              {renderTAPSField(
                field,
                (teacherDevelopmentData as any)[field.id],
                (v) => setTeacherDevelopmentData(prev => ({ ...prev, [field.id]: v }))
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const renderTAPSHealthSafetySection = () => {
    const sortedFields = [...TAPS_HEALTH_SAFETY_FIELDS].sort((a, b) => (b.importance || 0) - (a.importance || 0))
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {sortedFields.map(field => (
            <div key={field.id} id={`field-${field.id}`}>
              {renderTAPSField(
                field,
                (healthSafetyData as any)[field.id],
                (v) => setHealthSafetyData(prev => ({ ...prev, [field.id]: v }))
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const renderTAPSSchoolCultureSection = () => {
    const sortedFields = [...TAPS_SCHOOL_CULTURE_FIELDS].sort((a, b) => (b.importance || 0) - (a.importance || 0))
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {sortedFields.map(field => (
            <div key={field.id} id={`field-${field.id}`}>
              {renderTAPSField(
                field,
                (schoolCultureData as any)[field.id],
                (v) => setSchoolCultureData(prev => ({ ...prev, [field.id]: v }))
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // TAPS REVIEW SECTION
  // ============================================================================
  
  const renderTAPSReviewSection = () => {
    const scores = calculateAllTAPSCategoryScores({
      schoolInputs: schoolInputsData as any,
      leadership: leadershipData as any,
      academics: tapsAcademicsData as any,
      teacherDevelopment: teacherDevelopmentData as any,
      healthSafety: healthSafetyData as any,
      schoolCulture: schoolCultureData as any,
    })
    
    const totalScore = calculateTAPSTotalScore(scores)
    const ratingGrade = assignTAPSRatingGrade(totalScore)
    const ratingLabel = getTAPSRatingLabel(ratingGrade)
    const progress = calculateProgress()
    
    // Rating grade colors
    const gradeColors: Record<string, string> = {
      'A': 'text-green-600 bg-green-100',
      'B': 'text-blue-600 bg-blue-100',
      'C': 'text-amber-600 bg-amber-100',
      'D': 'text-orange-600 bg-orange-100',
      'E': 'text-red-600 bg-red-100',
    }
    
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Review Your TAPS Assessment</AlertTitle>
          <AlertDescription>
            Please review all sections before submitting. Once submitted, the report cannot be edited.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>TAPS Score Summary</span>
              <span className={`text-2xl font-bold px-4 py-2 rounded-lg ${gradeColors[ratingGrade] || 'bg-gray-100'}`}>
                Grade {ratingGrade}
              </span>
            </CardTitle>
            <CardDescription>
              Total Score: <span className="text-2xl font-bold text-primary">{totalScore}</span> / {TAPS_TOTAL_MAX_SCORE} points
              <br />
              <span className="text-sm font-medium">{ratingLabel}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {TAPS_FORM_SECTIONS.slice(0, -1).map((section) => {
                const sectionScore = scores[section.id as TAPSCategoryName] || 0
                const percentage = section.maxPoints > 0 ? Math.round((sectionScore / section.maxPoints) * 100) : 0
                const isIncomplete = showValidationErrors && incompleteSectionIds.has(section.id)
                return (
                  <div key={section.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {section.icon}
                        <span className={isIncomplete ? 'text-destructive' : undefined}>{section.title}</span>
                        {isIncomplete && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </span>
                      <span className="font-medium">{sectionScore} / {section.maxPoints}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Form Completion</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {progress < 100 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Please complete all fields before submitting.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* TAPS Grade Scale Reference */}
        <Card>
          <CardHeader>
            <CardTitle>TAPS Rating Scale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="p-2 rounded bg-green-100 text-center">
                <span className="font-bold text-green-700">A (357-419)</span>
                <p className="text-xs text-green-600">Outstanding</p>
              </div>
              <div className="p-2 rounded bg-blue-100 text-center">
                <span className="font-bold text-blue-700">B (294-356)</span>
                <p className="text-xs text-blue-600">High Achieving</p>
              </div>
              <div className="p-2 rounded bg-amber-100 text-center">
                <span className="font-bold text-amber-700">C (210-293)</span>
                <p className="text-xs text-amber-600">Standard</p>
              </div>
              <div className="p-2 rounded bg-orange-100 text-center">
                <span className="font-bold text-orange-700">D (84-209)</span>
                <p className="text-xs text-orange-600">Struggling</p>
              </div>
              <div className="p-2 rounded bg-red-100 text-center">
                <span className="font-bold text-red-700">E (0-83)</span>
                <p className="text-xs text-red-600">Critical Support</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {!submissionOpen && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Submission Window Closed</AlertTitle>
            <AlertDescription>
              The submission window for this assessment period has closed. You can still save your progress as a draft.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  const renderReviewSection = () => {
    const scores = calculateAllCategoryScores({
      academic: academicData as any,
      attendance: attendanceData as any,
      infrastructure: infrastructureData as any,
      teachingQuality: teachingQualityData as any,
      management: managementData as any,
      studentWelfare: studentWelfareData as any,
      community: communityData as any,
    })
    
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
    const progress = calculateProgress()
    
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Review Your Assessment</AlertTitle>
          <AlertDescription>
            Please review all sections before submitting. Once submitted, the report cannot be edited.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Score Summary</CardTitle>
            <CardDescription>
              Total Score: <span className="text-2xl font-bold text-primary">{totalScore}</span> / 1000 points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {FORM_SECTIONS.slice(0, -1).map((section) => {
                const sectionScore = scores[section.id as CategoryName] || 0
                const percentage = Math.round((sectionScore / section.maxPoints) * 100)
                const isIncomplete = showValidationErrors && incompleteSectionIds.has(section.id)
                return (
                  <div key={section.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {section.icon}
                        <span className={isIncomplete ? 'text-destructive' : undefined}>{section.title}</span>
                        {isIncomplete && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </span>
                      <span className="font-medium">{sectionScore} / {section.maxPoints}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Form Completion</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {progress < 100 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Please complete all fields before submitting.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {!submissionOpen && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Submission Window Closed</AlertTitle>
            <AlertDescription>
              The submission window for this assessment period has closed. You can still save your progress as a draft.
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }
  
  const renderCurrentSection = () => {
    if (isTAPS) {
      // TAPS sections for secondary schools
      const sectionId = TAPS_FORM_SECTIONS[currentSection].id
      switch (sectionId) {
        case 'school_inputs_operations': return renderTAPSSchoolInputsSection()
        case 'leadership': return renderTAPSLeadershipSection()
        case 'academics': return renderTAPSAcademicsSection()
        case 'teacher_development': return renderTAPSTeacherDevelopmentSection()
        case 'health_safety': return renderTAPSHealthSafetySection()
        case 'school_culture': return renderTAPSSchoolCultureSection()
        case 'review': return renderTAPSReviewSection()
        default: return null
      }
    } else {
      // Demo sections for primary/nursery schools
      const sectionId = FORM_SECTIONS[currentSection].id
      switch (sectionId) {
        case 'academic': return renderAcademicSection()
        case 'attendance': return renderAttendanceSection()
        case 'infrastructure': return renderInfrastructureSection()
        case 'teaching_quality': return renderTeachingQualitySection()
        case 'management': return renderManagementSection()
        case 'student_welfare': return renderStudentWelfareSection()
        case 'community': return renderCommunitySection()
        case 'review': return renderReviewSection()
        default: return null
      }
    }
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentSectionMeta = currentFormSections[currentSection]
  const isCurrentSectionIncomplete =
    showValidationErrors && currentSectionMeta?.id !== 'review' && incompleteSectionIds.has(currentSectionMeta.id)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">
                {isTAPS ? 'TAPS Assessment Report' : 'School Assessment Report'}
              </CardTitle>
              <CardDescription>
                {schoolName} • {regionName}
              </CardDescription>
              {activeTermWindow && (
                <CardDescription className="mt-1">
                  {activeTermWindow.academicYear} - {activeTermWindow.termNumber === 1 ? 'First' : activeTermWindow.termNumber === 2 ? 'Second' : 'Third'} Term
                </CardDescription>
              )}
              <div className="flex items-center gap-2 mt-2">
                {schoolTypeInfo && (
                  <Badge variant="outline">
                    {schoolTypeInfo.label}
                  </Badge>
                )}
                {isTAPS && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    TAPS Metrics
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Badge variant={submissionOpen ? "default" : "secondary"}>
                {submissionOpen ? "Submission Open" : "Submission Closed"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {currentFormSections.map((section, index) => {
              const isIncomplete = incompleteSectionIds.has(section.id)
              const isCurrent = index === currentSection
              const showCaution = showValidationErrors && isIncomplete
              const cautionClassName = isCurrent
                ? 'h-4 w-4 text-primary-foreground'
                : 'h-4 w-4 text-destructive'
              const titleClassName = showCaution && !isCurrent ? 'text-destructive' : ''

              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    index === currentSection
                      ? 'bg-primary text-primary-foreground'
                      : index < currentSection
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {section.icon}
                  <span className={`hidden sm:inline ${titleClassName}`.trim()}>{section.title}</span>
                  {showCaution && <AlertTriangle className={cautionClassName} />}
                  <span className="sm:hidden">{index + 1}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Current Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentFormSections[currentSection].icon}
            <span className={isCurrentSectionIncomplete ? 'text-destructive' : undefined}>
              {currentFormSections[currentSection].title}
            </span>
            {isCurrentSectionIncomplete && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </CardTitle>
          {currentFormSections[currentSection].id !== 'review' && (
            <CardDescription>
              Maximum Points: {currentFormSections[currentSection].maxPoints}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {renderCurrentSection()}
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSection === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveSection}
            disabled={isSaving || currentFormSections[currentSection].id === 'review'}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          
          {currentSection === currentFormSections.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !submissionOpen || calculateProgress() < 100}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Report
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
