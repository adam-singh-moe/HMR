"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"
import { revalidatePath } from "next/cache"
import { isSubmissionOpen, isSubmissionWindowOpen, getActiveTermWindow } from "./assessment-periods"
import { 
  calculateTotalScore, 
  assignRatingLevel, 
  calculateAllCategoryScores,
  calculateAcademicScore,
  calculateAttendanceScore,
  calculateInfrastructureScore,
  calculateTeachingQualityScore,
  calculateManagementScore,
  calculateStudentWelfareScore,
  calculateCommunityScore,
  // TAPS scoring functions
  calculateAllTAPSCategoryScores,
  calculateTAPSTotalScore,
  assignTAPSRatingGrade,
} from "./scoring"
import { generateRecommendations } from "./recommendations"
import { createAuditEntry } from "./audit"
import { getSchoolTypeFromEmail, getSchoolTypeFromSchoolLevel } from "@/lib/school-type"
import type { 
  SchoolAssessmentReport,
  SchoolAssessmentReportWithDetails,
  ReportSummary,
  ReportStatus,
  CategoryName,
  TAPSCategoryName,
  ReportFilters,
  AcademicScores,
  AttendanceScores,
  InfrastructureScores,
  TeachingQualityScores,
  ManagementScores,
  StudentWelfareScores,
  CommunityScores,
  TAPSSchoolInputsScores,
  TAPSLeadershipScores,
  TAPSAcademicsScores,
  TAPSTeacherDevelopmentScores,
  TAPSHealthSafetyScores,
  TAPSSchoolCultureScores,
} from "../types"
import { TAPS_AUTO_CALC_REQUIRED_TERMS } from "../types"
import {
  calculateTAPSSchoolInputsScore,
  calculateTAPSLeadershipScore,
  calculateTAPSAcademicsScore,
  calculateTAPSTeacherDevelopmentScore,
  calculateTAPSHealthSafetyScore,
  calculateTAPSSchoolCultureScore,
} from "./scoring"

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

export async function deleteAssessmentReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    if (!reportId) {
      return { success: false, error: 'Report ID is required' }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase
      .from('school_assessment_reports')
      .delete()
      .eq('id', reportId)

    if (error) {
      console.error('Error deleting assessment report:', error)
      return { success: false, error: 'Failed to delete report' }
    }

    revalidatePath('/dashboard/school-assessment/admin')
    revalidatePath('/dashboard/school-assessment')
    revalidatePath('/dashboard/school-assessment/regional')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteAssessmentReport:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts database row to SchoolAssessmentReport type
 */
function mapDbRowToReport(row: any): SchoolAssessmentReport {
  return {
    id: row.id,
    schoolId: row.school_id,
    headteacherId: row.headteacher_id,
    periodId: row.period_id,
    status: row.status as ReportStatus,
    submittedAt: row.submitted_at,
    lockedAt: row.locked_at,
    // Primary/Nursery scores
    academicScores: row.academic_scores || {},
    attendanceScores: row.attendance_scores || {},
    infrastructureScores: row.infrastructure_scores || {},
    teachingQualityScores: row.teaching_quality_scores || {},
    managementScores: row.management_scores || {},
    studentWelfareScores: row.student_welfare_scores || {},
    communityScores: row.community_scores || {},
    // TAPS scores (Secondary)
    tapsSchoolInputsScores: row.taps_school_inputs_scores || undefined,
    tapsLeadershipScores: row.taps_leadership_scores || undefined,
    tapsAcademicsScores: row.taps_academics_scores || undefined,
    tapsTeacherDevelopmentScores: row.taps_teacher_development_scores || undefined,
    tapsHealthSafetyScores: row.taps_health_safety_scores || undefined,
    tapsSchoolCultureScores: row.taps_school_culture_scores || undefined,
    // Calculated fields
    totalScore: row.total_score,
    ratingLevel: row.rating_level,
    tapsRatingGrade: row.taps_rating_grade || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Gets previous term reports for a school to enable auto-calculation of improvement metrics
 * Returns the most recent N submitted reports for the school
 */
export async function getPreviousTermReports(
  schoolId: string,
  currentAcademicYear: string,
  currentTermName: string,
  count: number = TAPS_AUTO_CALC_REQUIRED_TERMS
): Promise<{ success: boolean; reports?: SchoolAssessmentReport[]; error?: string }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get submitted reports for this school, ordered by academic year and term
    // Exclude the current term
    const { data: reports, error } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'submitted')
      .not('academic_year', 'eq', currentAcademicYear)
      .or(`term_name.neq.${currentTermName},academic_year.neq.${currentAcademicYear}`)
      .order('academic_year', { ascending: false })
      .order('term_name', { ascending: false })
      .limit(count)
    
    if (error) {
      console.error('Error fetching previous reports:', error)
      return { success: false, error: 'Failed to fetch previous reports' }
    }
    
    return {
      success: true,
      reports: reports?.map(mapDbRowToReport) || [],
    }
  } catch (error) {
    console.error('Error in getPreviousTermReports:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Calculate improvement metrics from historical data
 * Returns the calculated increase percentages for teacher and learner attendance
 */
export async function calculateImprovementMetrics(
  schoolId: string,
  currentAcademicYear: string,
  currentTermName: string,
  currentTeacherAttendance?: number,
  currentLearnersAttendance?: number
): Promise<{
  canAutoCalculate: boolean
  teacherAttendanceIncrease?: number
  learnersAttendanceIncrease?: number
  previousTermCount: number
}> {
  const result = await getPreviousTermReports(schoolId, currentAcademicYear, currentTermName)
  
  if (!result.success || !result.reports || result.reports.length < TAPS_AUTO_CALC_REQUIRED_TERMS) {
    return {
      canAutoCalculate: false,
      previousTermCount: result.reports?.length || 0,
    }
  }
  
  // Calculate average attendance from previous terms
  const previousReports = result.reports
  
  let totalTeacherAttendance = 0
  let totalLearnersAttendance = 0
  let teacherCount = 0
  let learnersCount = 0
  
  for (const report of previousReports) {
    // Check both TAPS and legacy attendance scores
    const tapsInputs = report.tapsSchoolInputsScores as Partial<TAPSSchoolInputsScores> | undefined
    const legacyAttendance = report.attendanceScores as Partial<AttendanceScores> | undefined
    
    if (tapsInputs?.teacherAttendanceRate !== undefined) {
      totalTeacherAttendance += tapsInputs.teacherAttendanceRate
      teacherCount++
    } else if (legacyAttendance?.teacherAttendanceRate !== undefined) {
      totalTeacherAttendance += legacyAttendance.teacherAttendanceRate
      teacherCount++
    }
    
    if (tapsInputs?.learnersAttendanceRate !== undefined) {
      totalLearnersAttendance += tapsInputs.learnersAttendanceRate
      learnersCount++
    } else if (legacyAttendance?.studentAttendanceRate !== undefined) {
      totalLearnersAttendance += legacyAttendance.studentAttendanceRate
      learnersCount++
    }
  }
  
  const avgTeacherAttendance = teacherCount > 0 ? totalTeacherAttendance / teacherCount : undefined
  const avgLearnersAttendance = learnersCount > 0 ? totalLearnersAttendance / learnersCount : undefined
  
  // Calculate increase percentages
  let teacherAttendanceIncrease: number | undefined
  let learnersAttendanceIncrease: number | undefined
  
  if (avgTeacherAttendance !== undefined && currentTeacherAttendance !== undefined) {
    teacherAttendanceIncrease = Math.round((currentTeacherAttendance - avgTeacherAttendance) * 10) / 10
  }
  
  if (avgLearnersAttendance !== undefined && currentLearnersAttendance !== undefined) {
    learnersAttendanceIncrease = Math.round((currentLearnersAttendance - avgLearnersAttendance) * 10) / 10
  }
  
  return {
    canAutoCalculate: true,
    teacherAttendanceIncrease,
    learnersAttendanceIncrease,
    previousTermCount: previousReports.length,
  }
}

/**
 * Maps database row to report with full details
 */
function mapDbRowToReportWithDetails(row: any): SchoolAssessmentReportWithDetails {
  return {
    ...mapDbRowToReport(row),
    school: {
      id: row.sms_schools?.id || row.school_id,
      name: row.sms_schools?.name || '',
      regionId: row.sms_schools?.region_id || '',
      regionName: row.sms_schools?.sms_regions?.name || '',
    },
    headteacher: {
      id: row.hmr_users?.id || row.headteacher_id,
      name: row.hmr_users?.name || '',
      email: row.hmr_users?.email || '',
    },
    period: {
      id: row.school_assessment_periods?.id || row.period_id,
      academicYear: row.school_assessment_periods?.academic_year || '',
      termName: row.school_assessment_periods?.term_name || '',
      startDate: row.school_assessment_periods?.start_date || '',
      endDate: row.school_assessment_periods?.end_date || '',
      sequenceOrder: row.school_assessment_periods?.sequence_order || 1,
      isActive: row.school_assessment_periods?.is_active || false,
      createdAt: row.school_assessment_periods?.created_at || '',
      updatedAt: row.school_assessment_periods?.updated_at || '',
      createdBy: row.school_assessment_periods?.created_by || null,
    },
  }
}

/**
 * Maps database row to report summary
 * Includes TAPS fields for secondary schools
 */
function mapDbRowToReportSummary(row: any): ReportSummary {
  // Check if this is a TAPS report (secondary school)
  // A report uses TAPS if it has a taps_rating_grade OR taps category scores
  const hasTAPSData = Boolean(
    row.taps_rating_grade ||
    row.taps_school_inputs_scores ||
    row.taps_leadership_scores ||
    row.taps_academics_scores
  )
  
  const demoTotals = !hasTAPSData
    ? calculateAllCategoryScores({
        academic: row.academic_scores || {},
        attendance: row.attendance_scores || {},
        infrastructure: row.infrastructure_scores || {},
        teachingQuality: row.teaching_quality_scores || {},
        management: row.management_scores || {},
        studentWelfare: row.student_welfare_scores || {},
        community: row.community_scores || {},
      })
    : null

  return {
    id: row.id,
    schoolId: row.school_id,
    schoolName: row.sms_schools?.name || '',
    regionName: row.sms_schools?.sms_regions?.name || '',
    periodId: row.period_id,
    // Use direct row fields first (new term window system), fallback to period relation
    academicYear: row.academic_year || row.school_assessment_periods?.academic_year || '',
    termName: row.term_name || row.school_assessment_periods?.term_name || '',
    status: row.status as ReportStatus,
    totalScore: row.total_score,
    ratingLevel: row.rating_level,
    submittedAt: row.submitted_at,
    // TAPS fields
    isTAPS: hasTAPSData,
    tapsRatingGrade: row.taps_rating_grade || null,
    tapsCategoryScores: hasTAPSData ? {
      // Derive totals from the stored JSON to avoid stale/mismatched `total` values.
      school_inputs: calculateTAPSSchoolInputsScore(row.taps_school_inputs_scores || {}),
      leadership: calculateTAPSLeadershipScore(row.taps_leadership_scores || {}),
      academics: calculateTAPSAcademicsScore(row.taps_academics_scores || {}),
      teacher_development: calculateTAPSTeacherDevelopmentScore(row.taps_teacher_development_scores || {}),
      health_safety: calculateTAPSHealthSafetyScore(row.taps_health_safety_scores || {}),
      school_culture: calculateTAPSSchoolCultureScore(row.taps_school_culture_scores || {}),
    } : null,
    // Demo category scores
    categoryScores: !hasTAPSData ? {
      academic: row.academic_scores?.total ?? demoTotals?.academic ?? 0,
      attendance: row.attendance_scores?.total ?? demoTotals?.attendance ?? 0,
      infrastructure: row.infrastructure_scores?.total ?? demoTotals?.infrastructure ?? 0,
      teaching_quality: row.teaching_quality_scores?.total ?? demoTotals?.teaching_quality ?? 0,
      management: row.management_scores?.total ?? demoTotals?.management ?? 0,
      student_welfare: row.student_welfare_scores?.total ?? demoTotals?.student_welfare ?? 0,
      community: row.community_scores?.total ?? demoTotals?.community ?? 0,
    } : null,
  }
}

// ============================================================================
// REPORT CRUD ACTIONS
// ============================================================================

/**
 * Creates a new assessment report (draft)
 * Uses the new term window system - no period ID required
 * Enforces submission window check - hard block if window is closed
 */
export async function createAssessmentReport(periodId?: string) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Head Teacher') {
      return { error: 'Only Head Teachers can create assessment reports.' }
    }
    
    // Check if submission window is open using new term window system
    const windowResult = await isSubmissionWindowOpen()
    
    if (!windowResult.isOpen) {
      return { error: 'Submission window is closed. You cannot create new reports at this time.' }
    }
    
    const activeWindow = windowResult.window
    if (!activeWindow) {
      return { error: 'No active submission window found.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the user's school - prefer school_id from session, fall back to school_name lookup
    let schoolId = user.school_id
    
    if (!schoolId && user.school_name) {
      // Fallback: look up by school name if school_id not in session
      const { data: schoolData, error: schoolError } = await supabase
        .from('sms_schools')
        .select('id')
        .eq('name', user.school_name)
        .single()
      
      if (schoolError || !schoolData) {
        return { error: 'Could not find your associated school. Please contact an administrator to assign your school.' }
      }
      schoolId = schoolData.id
    }
    
    if (!schoolId) {
      return { error: 'No school is assigned to your account. Please contact an administrator to assign your school.' }
    }
    
    // Verify the school exists (and fetch school level name for robust type detection)
    const { data: userSchool, error: verifyError } = await supabase
      .from('sms_schools')
      .select(`
        id,
        name,
        sms_school_levels(
          id,
          name
        )
      `)
      .eq('id', schoolId)
      .single()
    
    if (verifyError || !userSchool) {
      return { error: 'Could not verify your school. Please contact an administrator.' }
    }
    
    // Derive term name from term number
    const termName = activeWindow.termNumber === 1 ? 'First Term' 
      : activeWindow.termNumber === 2 ? 'Second Term' 
      : 'Third Term'
    
    // Check if a report already exists for this school, academic year, and term
    const { data: existingReport } = await supabase
      .from('school_assessment_reports')
      .select('id, status')
      .eq('school_id', userSchool.id)
      .eq('academic_year', activeWindow.academicYear)
      .eq('term_name', termName)
      .single()
    
    if (existingReport) {
      if (existingReport.status === 'submitted') {
        return { error: 'A report has already been submitted for this term.', reportId: existingReport.id }
      }
      if (existingReport.status === 'expired_draft') {
        return { error: 'The previous draft for this term has expired and cannot be edited.' }
      }
      // Return existing draft
      return { success: true, reportId: existingReport.id, isExistingDraft: true }
    }
    
    const schoolLevelName = Array.isArray((userSchool as any)?.sms_school_levels)
      ? (userSchool as any).sms_school_levels?.[0]?.name
      : (userSchool as any)?.sms_school_levels?.name

    // Detect school type primarily from school level/name; fall back to email for legacy HM accounts.
    const schoolTypeFromLevel = getSchoolTypeFromSchoolLevel(schoolLevelName)
    const schoolTypeFromName = getSchoolTypeFromSchoolLevel(userSchool.name)
    const schoolTypeFromEmail = getSchoolTypeFromEmail(user.email)?.type
    const schoolType = (schoolTypeFromLevel || schoolTypeFromName || schoolTypeFromEmail || null) as any
    
    // Create new draft report with academic_year and term_name instead of period_id
    const { data: newReport, error: insertError } = await supabase
      .from('school_assessment_reports')
      .insert({
        school_id: userSchool.id,
        headteacher_id: user.id,
        period_id: periodId || null, // Optional for backwards compatibility
        academic_year: activeWindow.academicYear,
        term_name: termName,
        school_type: schoolType,
        status: 'draft',
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating report:', insertError)
      return { error: 'Failed to create report.' }
    }
    
    revalidatePath('/dashboard/school-assessment')
    return { success: true, reportId: newReport.id }
  } catch (error) {
    console.error('Error in createAssessmentReport:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Saves data for a specific section/category of the report
 * Supports both Demo categories (primary schools) and TAPS categories (secondary schools)
 */
export async function saveSectionData(
  reportId: string,
  section: CategoryName | TAPSCategoryName,
  data: Record<string, any>
) {
  try {
    // Backwards-compat: earlier client builds used 'school_inputs'
    const normalizedSection =
      (section as unknown as string) === 'school_inputs'
        ? ('school_inputs_operations' as TAPSCategoryName)
        : section

    const user = await getUser()
    
    if (!user) {
      return { error: 'You must be logged in to save report data.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('school_assessment_reports')
      .select('*, school_assessment_periods(is_active, start_date, end_date)')
      .eq('id', reportId)
      .single()
    
    if (reportError || !report) {
      return { error: 'Report not found.' }
    }
    
    // Check if report is editable
    if (report.status !== 'draft') {
      return { error: 'This report cannot be edited. It has been submitted or expired.' }
    }
    
    // Check if user has permission (Head Teacher for their school or Admin)
    if (user.role === 'Head Teacher' && report.headteacher_id !== user.id) {
      return { error: 'You do not have permission to edit this report.' }
    }
    
    // Check if submission window is still open using the new term window system
    const windowResult = await isSubmissionWindowOpen()
    const isWindowOpen = windowResult.isOpen
    
    if (!isWindowOpen && user.role !== 'Admin') {
      return { error: 'Submission window has closed. This report can no longer be edited.' }
    }
    
    // Map section name to database column - Demo categories (primary schools)
    const demoColumnMap: Record<CategoryName, string> = {
      academic: 'academic_scores',
      attendance: 'attendance_scores',
      infrastructure: 'infrastructure_scores',
      teaching_quality: 'teaching_quality_scores',
      management: 'management_scores',
      student_welfare: 'student_welfare_scores',
      community: 'community_scores',
    }
    
    // Map section name to database column - TAPS categories (secondary schools)
    const tapsColumnMap: Record<TAPSCategoryName, string> = {
      school_inputs_operations: 'taps_school_inputs_scores',
      leadership: 'taps_leadership_scores',
      academics: 'taps_academics_scores',
      teacher_development: 'taps_teacher_development_scores',
      health_safety: 'taps_health_safety_scores',
      school_culture: 'taps_school_culture_scores',
    }
    
    // Check if this is a TAPS category
    const isTAPSCategory = Object.keys(tapsColumnMap).includes(normalizedSection as string)
    const isDemoCategory = Object.keys(demoColumnMap).includes(normalizedSection as string)
    
    console.log('saveSectionData - section:', normalizedSection, 'isTAPS:', isTAPSCategory, 'isDemo:', isDemoCategory)
    
    let column: string | undefined
    if (isTAPSCategory) {
      column = tapsColumnMap[normalizedSection as TAPSCategoryName]
    } else if (isDemoCategory) {
      column = demoColumnMap[normalizedSection as CategoryName]
    }
    
    if (!column) {
      console.error('Invalid section name:', normalizedSection, 'Available TAPS:', Object.keys(tapsColumnMap), 'Available Demo:', Object.keys(demoColumnMap))
      return { error: 'Invalid section name.' }
    }
    
    // Calculate the section score and include it with the data
    // Demo scoring functions (primary schools)
    const demoScoreFunctionMap: Record<CategoryName, (data: any) => number> = {
      academic: calculateAcademicScore,
      attendance: calculateAttendanceScore,
      infrastructure: calculateInfrastructureScore,
      teaching_quality: calculateTeachingQualityScore,
      management: calculateManagementScore,
      student_welfare: calculateStudentWelfareScore,
      community: calculateCommunityScore,
    }
    
    // TAPS scoring functions (secondary schools)
    const tapsScoreFunctionMap: Record<TAPSCategoryName, (data: any) => number> = {
      school_inputs_operations: calculateTAPSSchoolInputsScore,
      leadership: calculateTAPSLeadershipScore,
      academics: calculateTAPSAcademicsScore,
      teacher_development: calculateTAPSTeacherDevelopmentScore,
      health_safety: calculateTAPSHealthSafetyScore,
      school_culture: calculateTAPSSchoolCultureScore,
    }
    
    const sectionScore = isTAPSCategory
      ? tapsScoreFunctionMap[normalizedSection as TAPSCategoryName](data)
      : demoScoreFunctionMap[normalizedSection as CategoryName](data)
    const dataWithTotal = { ...data, total: sectionScore }
    
    // Update the section data with calculated total
    const { error: updateError } = await supabase
      .from('school_assessment_reports')
      .update({ [column]: dataWithTotal })
      .eq('id', reportId)
    
    if (updateError) {
      console.error('Error saving section data:', updateError)
      return { error: 'Failed to save section data.' }
    }
    
    // Recalculate running total
    const { data: updatedReport } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('id', reportId)
      .single()
    
    if (updatedReport) {
      if (isTAPSCategory) {
        // Calculate TAPS total (419 max)
        const tapsScores = {
          // Derive from the stored JSON to avoid stale/mismatched `total` values.
          school_inputs_operations: calculateTAPSSchoolInputsScore(updatedReport.taps_school_inputs_scores || {}),
          leadership: calculateTAPSLeadershipScore(updatedReport.taps_leadership_scores || {}),
          academics: calculateTAPSAcademicsScore(updatedReport.taps_academics_scores || {}),
          teacher_development: calculateTAPSTeacherDevelopmentScore(updatedReport.taps_teacher_development_scores || {}),
          health_safety: calculateTAPSHealthSafetyScore(updatedReport.taps_health_safety_scores || {}),
          school_culture: calculateTAPSSchoolCultureScore(updatedReport.taps_school_culture_scores || {}),
        }
        
        const totalScore = Object.values(tapsScores).reduce((sum, score) => sum + score, 0)
        
        // Assign TAPS rating grade
        let tapsRatingGrade: string
        if (totalScore >= 357) tapsRatingGrade = 'A'
        else if (totalScore >= 294) tapsRatingGrade = 'B'
        else if (totalScore >= 210) tapsRatingGrade = 'C'
        else if (totalScore >= 84) tapsRatingGrade = 'D'
        else tapsRatingGrade = 'E'
        
        await supabase
          .from('school_assessment_reports')
          .update({ 
            total_score: totalScore,
            taps_rating_grade: tapsRatingGrade,
          })
          .eq('id', reportId)
      } else {
        // Calculate demo total (100 max)
        const scores = calculateAllCategoryScores({
          academic: updatedReport.academic_scores,
          attendance: updatedReport.attendance_scores,
          infrastructure: updatedReport.infrastructure_scores,
          teachingQuality: updatedReport.teaching_quality_scores,
          management: updatedReport.management_scores,
          studentWelfare: updatedReport.student_welfare_scores,
          community: updatedReport.community_scores,
        })
        
        const totalScore = calculateTotalScore(scores)
        
        await supabase
          .from('school_assessment_reports')
          .update({ total_score: totalScore })
          .eq('id', reportId)
      }
    }
    
    revalidatePath('/dashboard/head-teacher/school-assessment')
    return { success: true }
  } catch (error) {
    console.error('Error in saveSectionData:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Submits a report (finalizes and locks it)
 * Hard blocks if submission window is closed
 * Supports both Demo reports (primary schools) and TAPS reports (secondary schools)
 */
export async function submitReport(reportId: string) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Head Teacher') {
      return { error: 'Only Head Teachers can submit reports.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the report with period info
    const { data: report, error: reportError } = await supabase
      .from('school_assessment_reports')
      .select('*, school_assessment_periods(*)')
      .eq('id', reportId)
      .single()
    
    if (reportError || !report) {
      return { error: 'Report not found.' }
    }
    
    // Check if user owns this report
    if (report.headteacher_id !== user.id) {
      return { error: 'You do not have permission to submit this report.' }
    }
    
    // Check if report is in draft status
    if (report.status !== 'draft') {
      return { error: 'This report has already been submitted or has expired.' }
    }
    
    // HARD BLOCK: Check if submission window is still open using new term window system
    const windowResult = await isSubmissionWindowOpen()
    
    if (!windowResult.isOpen) {
      return { error: 'Submission window has closed. Reports can no longer be submitted for this period.' }
    }
    
    const hasTapsObject = (value: unknown): boolean => {
      if (!value || typeof value !== 'object') return false
      return Object.keys(value as Record<string, unknown>).length > 0
    }

    const hasTAPSData = Boolean(
      report.taps_rating_grade ||
      hasTapsObject(report.taps_school_inputs_scores) ||
      hasTapsObject(report.taps_leadership_scores) ||
      hasTapsObject(report.taps_academics_scores) ||
      hasTapsObject(report.taps_teacher_development_scores) ||
      hasTapsObject(report.taps_health_safety_scores) ||
      hasTapsObject(report.taps_school_culture_scores)
    )

    // Check if this is a TAPS report (prefer persisted school_type; fall back to data presence)
    const isTAPSReport = report.school_type === 'secondary' || (!report.school_type && hasTAPSData)
    
    if (isTAPSReport) {
      // Calculate TAPS final scores (419 max)
      const tapsScores = {
        school_inputs_operations: report.taps_school_inputs_scores?.total || 
          calculateTAPSSchoolInputsScore(report.taps_school_inputs_scores || {}),
        leadership: report.taps_leadership_scores?.total || 
          calculateTAPSLeadershipScore(report.taps_leadership_scores || {}),
        academics: report.taps_academics_scores?.total || 
          calculateTAPSAcademicsScore(report.taps_academics_scores || {}),
        teacher_development: report.taps_teacher_development_scores?.total || 
          calculateTAPSTeacherDevelopmentScore(report.taps_teacher_development_scores || {}),
        health_safety: report.taps_health_safety_scores?.total || 
          calculateTAPSHealthSafetyScore(report.taps_health_safety_scores || {}),
        school_culture: report.taps_school_culture_scores?.total || 
          calculateTAPSSchoolCultureScore(report.taps_school_culture_scores || {}),
      }
      
      const totalScore = Object.values(tapsScores).reduce((sum, score) => sum + score, 0)
      
      // Assign TAPS rating grade (A-E)
      let tapsRatingGrade: string
      if (totalScore >= 357) tapsRatingGrade = 'A'
      else if (totalScore >= 294) tapsRatingGrade = 'B'
      else if (totalScore >= 210) tapsRatingGrade = 'C'
      else if (totalScore >= 84) tapsRatingGrade = 'D'
      else tapsRatingGrade = 'E'
      
      // Merge calculated totals into the TAPS score objects
      const tapsSchoolInputsWithTotal = { ...report.taps_school_inputs_scores, total: tapsScores.school_inputs_operations }
      const tapsLeadershipWithTotal = { ...report.taps_leadership_scores, total: tapsScores.leadership }
      const tapsAcademicsWithTotal = { ...report.taps_academics_scores, total: tapsScores.academics }
      const tapsTeacherDevWithTotal = { ...report.taps_teacher_development_scores, total: tapsScores.teacher_development }
      const tapsHealthSafetyWithTotal = { ...report.taps_health_safety_scores, total: tapsScores.health_safety }
      const tapsSchoolCultureWithTotal = { ...report.taps_school_culture_scores, total: tapsScores.school_culture }
      
      // Update TAPS report status
      const { error: updateError } = await supabase
        .from('school_assessment_reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          locked_at: new Date().toISOString(),
          total_score: totalScore,
          taps_rating_grade: tapsRatingGrade,
          school_type: 'secondary',
          taps_school_inputs_scores: tapsSchoolInputsWithTotal,
          taps_leadership_scores: tapsLeadershipWithTotal,
          taps_academics_scores: tapsAcademicsWithTotal,
          taps_teacher_development_scores: tapsTeacherDevWithTotal,
          taps_health_safety_scores: tapsHealthSafetyWithTotal,
          taps_school_culture_scores: tapsSchoolCultureWithTotal,
        })
        .eq('id', reportId)
      
      if (updateError) {
        console.error('Error submitting TAPS report:', updateError)
        return { error: 'Failed to submit report.' }
      }

      // Generate + persist recommendations now so they render immediately on first view.
      // This avoids “Recommendations in progress” on initial access by any role.
      try {
        const recResult = await generateRecommendations(reportId)
        if (recResult?.error) {
          console.error('Recommendation generation returned error:', recResult.error)
        }
      } catch (err) {
        console.error('Error generating recommendations:', err)
      }
      
      revalidatePath('/dashboard/head-teacher/school-assessment')
      return { 
        success: true, 
        totalScore, 
        tapsRatingGrade,
        message: 'TAPS Report submitted successfully!'
      }
    } else {
      // Demo report (primary school) - original logic
      const scores = calculateAllCategoryScores({
        academic: report.academic_scores,
        attendance: report.attendance_scores,
        infrastructure: report.infrastructure_scores,
        teachingQuality: report.teaching_quality_scores,
        management: report.management_scores,
        studentWelfare: report.student_welfare_scores,
        community: report.community_scores,
      })
      
      const totalScore = calculateTotalScore(scores)
      const ratingLevel = assignRatingLevel(totalScore)
      
      // Merge calculated totals into the score objects for display
      const academicScoresWithTotal = { ...report.academic_scores, total: scores.academic }
      const attendanceScoresWithTotal = { ...report.attendance_scores, total: scores.attendance }
      const infrastructureScoresWithTotal = { ...report.infrastructure_scores, total: scores.infrastructure }
      const teachingQualityScoresWithTotal = { ...report.teaching_quality_scores, total: scores.teaching_quality }
      const managementScoresWithTotal = { ...report.management_scores, total: scores.management }
      const studentWelfareScoresWithTotal = { ...report.student_welfare_scores, total: scores.student_welfare }
      const communityScoresWithTotal = { ...report.community_scores, total: scores.community }
      
      // Update report status and save calculated totals back to the category columns
      const { error: updateError } = await supabase
        .from('school_assessment_reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          locked_at: new Date().toISOString(),
          total_score: totalScore,
          rating_level: ratingLevel,
          academic_scores: academicScoresWithTotal,
          attendance_scores: attendanceScoresWithTotal,
          infrastructure_scores: infrastructureScoresWithTotal,
          teaching_quality_scores: teachingQualityScoresWithTotal,
          management_scores: managementScoresWithTotal,
          student_welfare_scores: studentWelfareScoresWithTotal,
          community_scores: communityScoresWithTotal,
        })
        .eq('id', reportId)
      
      if (updateError) {
        console.error('Error submitting report:', updateError)
        return { error: 'Failed to submit report.' }
      }

      // Generate + persist recommendations now so they render immediately on first view.
      try {
        const recResult = await generateRecommendations(reportId)
        if (recResult?.error) {
          console.error('Recommendation generation returned error:', recResult.error)
        }
      } catch (err) {
        console.error('Error generating recommendations:', err)
      }
      
      revalidatePath('/dashboard/head-teacher/school-assessment')
      return { 
        success: true, 
        totalScore, 
        ratingLevel,
        message: 'Report submitted successfully!'
      }
    }
  } catch (error) {
    console.error('Error in submitReport:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets a single report by ID
 */
export async function getReport(reportId: string) {
  try {
    const user = await getUser()
    
    if (!user) {
      return { report: null, error: 'You must be logged in.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools(id, name, region_id, sms_regions(name)),
        hmr_users(id, name, email),
        school_assessment_periods(*)
      `)
      .eq('id', reportId)
      .single()
    
    if (error) {
      console.error('Error fetching report:', error)
      return { report: null, error: 'Failed to fetch report.' }
    }
    
    // Check permissions based on role
    if (user.role === 'Head Teacher') {
      if (data.headteacher_id !== user.id) {
        return { report: null, error: 'You do not have permission to view this report.' }
      }
    } else if (user.role === 'Regional Officer') {
      // user.region is the region ID, compare with school's region_id
      const schoolRegionId = data.sms_schools?.region_id
      if (schoolRegionId !== user.region) {
        return { report: null, error: 'You do not have permission to view this report.' }
      }
    }
    // Education Officials and Admins can view all reports
    
    return { report: mapDbRowToReportWithDetails(data), error: null }
  } catch (error) {
    console.error('Error in getReport:', error)
    return { report: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all reports for a specific school
 */
export async function getSchoolReports(schoolId: string) {
  try {
    const user = await getUser()
    
    if (!user) {
      return { reports: [], error: 'You must be logged in.' }
    }

    if (!schoolId) {
      return { reports: [], error: 'School ID is required.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()

    // Permission checks
    if (user.role === 'Head Teacher') {
      // Prefer school_id from session
      if (user.school_id && user.school_id !== schoolId) {
        return { reports: [], error: 'You do not have permission to view these reports.' }
      }

      // Fallback: resolve by school name
      if (!user.school_id && user.school_name) {
        const { data: school, error: schoolError } = await supabase
          .from('sms_schools')
          .select('id')
          .eq('name', user.school_name)
          .single()

        if (schoolError || !school || school.id !== schoolId) {
          return { reports: [], error: 'You do not have permission to view these reports.' }
        }
      }
    } else if (user.role === 'Regional Officer') {
      // Ensure the school belongs to the officer's region
      const { data: school, error: schoolError } = await supabase
        .from('sms_schools')
        .select('region_id')
        .eq('id', schoolId)
        .single()

      if (schoolError || !school) {
        return { reports: [], error: 'School not found.' }
      }

      if (school.region_id !== user.region) {
        return { reports: [], error: 'You do not have permission to view these reports.' }
      }
    } else if (user.role !== 'Education Official' && user.role !== 'Admin') {
      return { reports: [], error: 'You do not have permission to view these reports.' }
    }
    
    const { data, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools(id, name, region_id, sms_regions(name)),
        school_assessment_periods(*)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching school reports:', error)
      return { reports: [], error: 'Failed to fetch reports.' }
    }
    
    return { reports: data.map(mapDbRowToReportSummary), error: null }
  } catch (error) {
    console.error('Error in getSchoolReports:', error)
    return { reports: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets the current user's school report for a period
 */
export async function getMySchoolReport(periodId: string) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Head Teacher') {
      return { report: null, error: 'Only Head Teachers can access their school report.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get user's school - prefer school_id from session
    let schoolId = user.school_id
    
    if (!schoolId && user.school_name) {
      // Fallback: look up by school name
      const { data: school } = await supabase
        .from('sms_schools')
        .select('id')
        .eq('name', user.school_name)
        .single()
      
      if (!school) {
        return { report: null, error: 'Could not find your associated school.' }
      }
      schoolId = school.id
    }
    
    if (!schoolId) {
      return { report: null, error: 'No school is assigned to your account.' }
    }
    
    const { data, error } = await supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools(id, name, region_id, sms_regions(name)),
        hmr_users(id, name, email),
        school_assessment_periods(*)
      `)
      .eq('school_id', schoolId)
      .eq('period_id', periodId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { report: null, error: null } // No report exists yet
      }
      console.error('Error fetching school report:', error)
      return { report: null, error: 'Failed to fetch report.' }
    }
    
    return { report: mapDbRowToReportWithDetails(data), error: null }
  } catch (error) {
    console.error('Error in getMySchoolReport:', error)
    return { report: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets reports for a region (for Regional Officers)
 */
export async function getRegionalReports(regionId?: string, periodId?: string) {
  try {
    const user = await getUser()
    
    if (!user) {
      return { reports: [], error: 'You must be logged in.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // For Regional Officers, use their assigned region
    let targetRegionId = regionId
    if (user.role === 'Regional Officer' && !regionId) {
      // user.region is already the region ID
      targetRegionId = user.region
    }
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools!inner(id, name, region_id, sms_regions(name)),
        school_assessment_periods(*)
      `)
      .order('submitted_at', { ascending: false, nullsFirst: false })
    
    if (targetRegionId) {
      query = query.eq('sms_schools.region_id', targetRegionId)
    }
    
    if (periodId) {
      query = query.eq('period_id', periodId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching regional reports:', error)
      return { reports: [], error: 'Failed to fetch reports.' }
    }
    
    return { reports: data.map(mapDbRowToReportSummary), error: null }
  } catch (error) {
    console.error('Error in getRegionalReports:', error)
    return { reports: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all reports (for Education Officials and Admins)
 */
export async function getNationalReports(filters?: ReportFilters) {
  try {
    const user = await getUser()
    
    if (!user || (user.role !== 'Education Official' && user.role !== 'Admin')) {
      return { reports: [], error: 'You do not have permission to view national reports.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_reports')
      .select(`
        *,
        sms_schools(id, name, region_id, sms_regions(name)),
        school_assessment_periods(*)
      `)
      .order('submitted_at', { ascending: false, nullsFirst: false })
    
    // Apply filters
    if (filters?.periodId) {
      // Check if this is a synthetic period ID from term window system
      if (filters.periodId.startsWith('term-window-')) {
        // Parse academic year and term from the synthetic ID
        // Format: term-window-{academicYear}-{termNumber}
        const parts = filters.periodId.replace('term-window-', '').split('-')
        if (parts.length >= 2) {
          const academicYear = parts.slice(0, -1).join('-') // Handle academic years like "2025-2026"
          const termNumber = parseInt(parts[parts.length - 1])
          const termName = termNumber === 1 ? 'First Term' : termNumber === 2 ? 'Second Term' : 'Third Term'
          
          query = query
            .eq('academic_year', academicYear)
            .eq('term_name', termName)
        }
      } else {
        // For real period IDs, we need to support both:
        // 1. Reports with period_id set (old system)
        // 2. Reports with academic_year and term_name set (new term window system)
        // First, get the period details to know what academic_year and term_name to filter by
        const { data: period } = await supabase
          .from('school_assessment_periods')
          .select('academic_year, term_name')
          .eq('id', filters.periodId)
          .single()
        
        if (period) {
          // Filter by academic_year and term_name (works for both old and new reports)
          query = query
            .eq('academic_year', period.academic_year)
            .eq('term_name', period.term_name)
        } else {
          // Fallback: only filter by period_id (old system)
          query = query.eq('period_id', filters.periodId)
        }
      }
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.ratingLevel) {
      query = query.eq('rating_level', filters.ratingLevel)
    }
    if (filters?.minScore !== undefined) {
      query = query.gte('total_score', filters.minScore)
    }
    if (filters?.maxScore !== undefined) {
      query = query.lte('total_score', filters.maxScore)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching national reports:', error)
      return { reports: [], error: 'Failed to fetch reports.' }
    }
    
    let reports = data.map(mapDbRowToReportSummary)
    
    // Apply text search filter (client-side)
    if (filters?.searchQuery) {
      const search = filters.searchQuery.toLowerCase()
      reports = reports.filter(r => 
        r.schoolName.toLowerCase().includes(search) ||
        r.regionName.toLowerCase().includes(search)
      )
    }
    
    // Apply region filter (client-side since we already have the data)
    if (filters?.regionId) {
      // We'd need to map regionId to name - for now this requires another query
      // TODO: Optimize this
    }
    
    return { reports, error: null }
  } catch (error) {
    console.error('Error in getNationalReports:', error)
    return { reports: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Admin: Update a report with audit logging
 */
export async function adminUpdateReport(
  reportId: string,
  updates: Partial<{
    academicScores: Partial<AcademicScores>
    attendanceScores: Partial<AttendanceScores>
    infrastructureScores: Partial<InfrastructureScores>
    teachingQualityScores: Partial<TeachingQualityScores>
    managementScores: Partial<ManagementScores>
    studentWelfareScores: Partial<StudentWelfareScores>
    communityScores: Partial<CommunityScores>
  }>,
  reason: string
) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only Admins can edit submitted reports.' }
    }
    
    if (!reason || reason.trim().length < 10) {
      return { error: 'Please provide a reason for this edit (minimum 10 characters).' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get current report
    const { data: currentReport, error: fetchError } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('id', reportId)
      .single()
    
    if (fetchError || !currentReport) {
      return { error: 'Report not found.' }
    }
    
    // Prepare update object
    const updateObj: Record<string, any> = {}
    const auditEntries: { field: string; oldValue: any; newValue: any }[] = []
    
    // Map updates and track changes for audit
    const fieldMap: Record<string, string> = {
      academicScores: 'academic_scores',
      attendanceScores: 'attendance_scores',
      infrastructureScores: 'infrastructure_scores',
      teachingQualityScores: 'teaching_quality_scores',
      managementScores: 'management_scores',
      studentWelfareScores: 'student_welfare_scores',
      communityScores: 'community_scores',
    }
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && fieldMap[key]) {
        const dbField = fieldMap[key]
        updateObj[dbField] = value
        auditEntries.push({
          field: key,
          oldValue: currentReport[dbField],
          newValue: value,
        })
      }
    }
    
    if (Object.keys(updateObj).length === 0) {
      return { error: 'No valid updates provided.' }
    }
    
    // Update the report
    const { error: updateError } = await supabase
      .from('school_assessment_reports')
      .update(updateObj)
      .eq('id', reportId)
    
    if (updateError) {
      console.error('Error updating report:', updateError)
      return { error: 'Failed to update report.' }
    }
    
    // Recalculate scores
    const { data: updatedReport } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('id', reportId)
      .single()
    
    if (updatedReport) {
      const scores = calculateAllCategoryScores({
        academic: updatedReport.academic_scores,
        attendance: updatedReport.attendance_scores,
        infrastructure: updatedReport.infrastructure_scores,
        teachingQuality: updatedReport.teaching_quality_scores,
        management: updatedReport.management_scores,
        studentWelfare: updatedReport.student_welfare_scores,
        community: updatedReport.community_scores,
      })
      
      const totalScore = calculateTotalScore(scores)
      const ratingLevel = assignRatingLevel(totalScore)
      
      // Check if score/rating changed
      const scoreChanged = totalScore !== currentReport.total_score
      const ratingChanged = ratingLevel !== currentReport.rating_level
      
      await supabase
        .from('school_assessment_reports')
        .update({ 
          total_score: totalScore,
          rating_level: ratingLevel 
        })
        .eq('id', reportId)
      
      // Create audit entries for score changes
      if (scoreChanged) {
        auditEntries.push({
          field: 'total_score',
          oldValue: currentReport.total_score,
          newValue: totalScore,
        })
      }
      if (ratingChanged) {
        auditEntries.push({
          field: 'rating_level',
          oldValue: currentReport.rating_level,
          newValue: ratingLevel,
        })
      }
    }
    
    // Create audit log entries
    for (const entry of auditEntries) {
      await createAuditEntry(
        reportId,
        user.id,
        'edit',
        entry.field,
        entry.oldValue,
        entry.newValue,
        reason
      )
    }
    
    revalidatePath('/dashboard/admin/school-assessment')
    return { success: true, message: 'Report updated successfully.' }
  } catch (error) {
    console.error('Error in adminUpdateReport:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Get schools that have not submitted for a period
 */
export async function getNotSubmittedSchools(periodId: string, regionId?: string) {
  try {
    const user = await getUser()
    
    if (!user) {
      return { schools: [], error: 'You must be logged in.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get all schools (optionally filtered by region)
    let schoolsQuery = supabase
      .from('sms_schools')
      .select('id, name, region_id, sms_regions(name)')
    
    if (regionId) {
      schoolsQuery = schoolsQuery.eq('region_id', regionId)
    } else if (user.role === 'Regional Officer') {
      // user.region is already the region ID
      schoolsQuery = schoolsQuery.eq('region_id', user.region)
    }
    
    const { data: allSchools, error: schoolsError } = await schoolsQuery
    
    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError)
      return { schools: [], error: 'Failed to fetch schools.' }
    }
    
    // Get schools that have submitted for this period
    const { data: submittedReports } = await supabase
      .from('school_assessment_reports')
      .select('school_id')
      .eq('period_id', periodId)
      .eq('status', 'submitted')
    
    const submittedSchoolIds = new Set(submittedReports?.map(r => r.school_id) || [])
    
    // Filter to schools that have not submitted
    const notSubmittedSchools = allSchools
      .filter(school => !submittedSchoolIds.has(school.id))
      .map(school => ({
        id: school.id,
        name: school.name,
        regionId: school.region_id,
        regionName: (school as any).sms_regions?.name || '',
      }))
    
    
    return { schools: notSubmittedSchools, error: null }
  } catch (error) {
    console.error('Error in getNotSubmittedSchools:', error)
    return { schools: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Recalculates and stores category totals for an existing report
 * This is a utility function to fix reports that were submitted before
 * category totals were being saved
 */
export async function recalculateReportCategoryTotals(reportId: string) {
  try {
    const user = await getUser()
    
    if (!user || !['Admin', 'Education Official'].includes(user.role)) {
      return { error: 'Only administrators can recalculate report scores.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: report, error: reportError } = await supabase
      .from('school_assessment_reports')
      .select('*')
      .eq('id', reportId)
      .single()
    
    if (reportError || !report) {
      return { error: 'Report not found.' }
    }
    
    // Calculate scores for each category
    const scores = calculateAllCategoryScores({
      academic: report.academic_scores || {},
      attendance: report.attendance_scores || {},
      infrastructure: report.infrastructure_scores || {},
      teachingQuality: report.teaching_quality_scores || {},
      management: report.management_scores || {},
      studentWelfare: report.student_welfare_scores || {},
      community: report.community_scores || {},
    })
    
    // Merge totals back into the score objects
    const updatedScores = {
      academic_scores: { ...(report.academic_scores || {}), total: scores.academic },
      attendance_scores: { ...(report.attendance_scores || {}), total: scores.attendance },
      infrastructure_scores: { ...(report.infrastructure_scores || {}), total: scores.infrastructure },
      teaching_quality_scores: { ...(report.teaching_quality_scores || {}), total: scores.teaching_quality },
      management_scores: { ...(report.management_scores || {}), total: scores.management },
      student_welfare_scores: { ...(report.student_welfare_scores || {}), total: scores.student_welfare },
      community_scores: { ...(report.community_scores || {}), total: scores.community },
    }
    
    const { error: updateError } = await supabase
      .from('school_assessment_reports')
      .update(updatedScores)
      .eq('id', reportId)
    
    if (updateError) {
      console.error('Error updating report totals:', updateError)
      return { error: 'Failed to update report totals.' }
    }
    
    return { success: true, scores }
  } catch (error) {
    console.error('Error in recalculateReportCategoryTotals:', error)
    return { error: 'An unexpected error occurred.' }
  }
}
