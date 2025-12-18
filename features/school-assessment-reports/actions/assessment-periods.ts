"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"
import { revalidatePath } from "next/cache"
import type { 
  AssessmentPeriod, 
  AssessmentPeriodWithStatus,
  TermSubmissionConfig,
  CurrentTermWindow,
  TermName,
  TERM_NAMES 
} from "../types"

// ============================================================================
// CONSTANTS
// ============================================================================

const TERM_SEQUENCE: { name: TermName; order: 1 | 2 | 3 }[] = [
  { name: 'First Term', order: 1 },
  { name: 'Second Term', order: 2 },
  { name: 'Third Term', order: 3 },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts database row to TermSubmissionConfig type
 */
function mapDbRowToTermConfig(row: any): TermSubmissionConfig {
  return {
    id: row.id,
    termNumber: row.term_number,
    termName: row.term_name as TermName,
    startMonth: row.start_month,
    startDay: row.start_day,
    endMonth: row.end_month,
    endDay: row.end_day,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

/**
 * Converts database row to AssessmentPeriod type
 */
function mapDbRowToPeriod(row: any): AssessmentPeriod {
  return {
    id: row.id,
    academicYear: row.academic_year,
    termName: row.term_name as TermName,
    startDate: row.start_date,
    endDate: row.end_date,
    sequenceOrder: row.sequence_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }
}

/**
 * Validates academic year format (e.g., "2024-2025")
 */
function isValidAcademicYear(year: string): boolean {
  const pattern = /^\d{4}-\d{4}$/
  if (!pattern.test(year)) return false
  
  const [startYear, endYear] = year.split('-').map(Number)
  return endYear === startYear + 1
}

/**
 * Gets the next academic year string
 */
function getNextAcademicYear(currentYear: string): string {
  const [, endYear] = currentYear.split('-').map(Number)
  return `${endYear}-${endYear + 1}`
}

// ============================================================================
// TERM SUBMISSION CONFIGURATION ACTIONS (NEW - Recurring System)
// ============================================================================

/**
 * Gets all term submission configurations
 */
export async function getTermConfigs() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('term_submission_config')
      .select('*')
      .order('term_number', { ascending: true })
    
    if (error) {
      console.error('Error fetching term configs:', error)
      return { configs: [], error: 'Failed to fetch term configurations.' }
    }
    
    return { 
      configs: data.map(mapDbRowToTermConfig), 
      error: null 
    }
  } catch (error) {
    console.error('Error in getTermConfigs:', error)
    return { configs: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Updates a term submission configuration
 * Only admins can update term configs
 */
export async function updateTermConfig(
  termNumber: 1 | 2 | 3,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only admins can update term configurations.' }
    }
    
    // Validate month/day ranges
    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return { error: 'Month must be between 1 and 12.' }
    }
    
    if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
      return { error: 'Day must be between 1 and 31.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('term_submission_config')
      .update({
        start_month: startMonth,
        start_day: startDay,
        end_month: endMonth,
        end_day: endDay,
        updated_by: user.id,
      })
      .eq('term_number', termNumber)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating term config:', error)
      return { error: 'Failed to update term configuration.' }
    }
    
    revalidatePath('/dashboard/school-assessment/admin')
    return { success: true, config: mapDbRowToTermConfig(data) }
  } catch (error) {
    console.error('Error in updateTermConfig:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Toggles whether a term is enabled
 */
export async function toggleTermEnabled(termNumber: 1 | 2 | 3, isEnabled: boolean) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only admins can update term configurations.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('term_submission_config')
      .update({
        is_enabled: isEnabled,
        updated_by: user.id,
      })
      .eq('term_number', termNumber)
      .select()
      .single()
    
    if (error) {
      console.error('Error toggling term enabled:', error)
      return { error: 'Failed to update term configuration.' }
    }
    
    revalidatePath('/dashboard/school-assessment/admin')
    return { success: true, config: mapDbRowToTermConfig(data) }
  } catch (error) {
    console.error('Error in toggleTermEnabled:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets the current term windows for the active academic year
 * Uses the database function to calculate current windows
 */
export async function getCurrentTermWindows(): Promise<{
  windows: CurrentTermWindow[]
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_current_submission_term')
    
    if (error) {
      console.error('Error fetching current term windows:', error)
      return { windows: [], error: 'Failed to fetch current term windows.' }
    }
    
    const windows: CurrentTermWindow[] = (data || []).map((row: any) => ({
      termNumber: row.term_number,
      termName: row.term_name as TermName,
      submissionStart: row.submission_start,
      submissionEnd: row.submission_end,
      isOpen: row.is_open,
      academicYear: row.academic_year,
    }))
    
    return { windows, error: null }
  } catch (error) {
    console.error('Error in getCurrentTermWindows:', error)
    return { windows: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets the currently active/open term (if any)
 * This is the main function to check if submissions are open
 */
export async function getActiveTermWindow(): Promise<{
  window: CurrentTermWindow | null
  error: string | null
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_active_submission_term')
    
    if (error) {
      console.error('Error fetching active term window:', error)
      return { window: null, error: 'Failed to fetch active term window.' }
    }
    
    if (!data || data.length === 0) {
      return { window: null, error: null }
    }
    
    const row = data[0]
    const window: CurrentTermWindow = {
      termNumber: row.term_number,
      termName: row.term_name as TermName,
      submissionStart: row.submission_start,
      submissionEnd: row.submission_end,
      isOpen: true,
      academicYear: row.academic_year,
      daysRemaining: row.days_remaining,
    }
    
    return { window, error: null }
  } catch (error) {
    console.error('Error in getActiveTermWindow:', error)
    return { window: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Checks if submission is currently open using the new recurring system
 * This replaces the old isSubmissionOpen function for the new system
 */
export async function isSubmissionWindowOpen(): Promise<{
  isOpen: boolean
  window: CurrentTermWindow | null
  error: string | null
}> {
  const { window, error } = await getActiveTermWindow()
  
  if (error) {
    return { isOpen: false, window: null, error }
  }
  
  return { isOpen: window !== null, window, error: null }
}

// ============================================================================
// LEGACY PERIOD MANAGEMENT ACTIONS (For backward compatibility)
// ============================================================================
// PERIOD MANAGEMENT ACTIONS
// ============================================================================

/**
 * Creates all 3 terms for an academic year
 * Only admins can create academic years
 */
export async function createAcademicYear(academicYear: string) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only admins can create academic years.' }
    }
    
    if (!isValidAcademicYear(academicYear)) {
      return { error: 'Invalid academic year format. Use format like "2024-2025".' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Check if academic year already exists
    const { data: existing } = await supabase
      .from('school_assessment_periods')
      .select('id')
      .eq('academic_year', academicYear)
      .limit(1)
    
    if (existing && existing.length > 0) {
      return { error: `Academic year ${academicYear} already exists.` }
    }
    
    // Create all 3 terms
    const periods = TERM_SEQUENCE.map(term => ({
      academic_year: academicYear,
      term_name: term.name,
      sequence_order: term.order,
      // Default dates - admin will set actual submission windows
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      is_active: false,
      created_by: user.id,
    }))
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .insert(periods)
      .select()
    
    if (error) {
      console.error('Error creating academic year:', error)
      return { error: 'Failed to create academic year.' }
    }
    
    revalidatePath('/dashboard/admin/school-assessment')
    return { 
      success: true, 
      periods: data.map(mapDbRowToPeriod),
      message: `Created ${academicYear} academic year with 3 terms.`
    }
  } catch (error) {
    console.error('Error in createAcademicYear:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Sets the submission window dates for a specific period
 * Only admins can set submission windows
 */
export async function setSubmissionWindow(
  periodId: string, 
  startDate: string, 
  endDate: string
) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only admins can set submission windows.' }
    }
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (end <= start) {
      return { error: 'End date must be after start date.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .update({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      })
      .eq('id', periodId)
      .select()
      .single()
    
    if (error) {
      console.error('Error setting submission window:', error)
      return { error: 'Failed to set submission window.' }
    }
    
    revalidatePath('/dashboard/admin/school-assessment')
    return { success: true, period: mapDbRowToPeriod(data) }
  } catch (error) {
    console.error('Error in setSubmissionWindow:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Activates a specific period for submissions
 * Automatically deactivates any other active period (handled by DB trigger)
 */
export async function activatePeriod(periodId: string) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only admins can activate periods.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the period to verify it exists and has valid dates
    const { data: period, error: fetchError } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('id', periodId)
      .single()
    
    if (fetchError || !period) {
      return { error: 'Period not found.' }
    }
    
    const now = new Date()
    const endDate = new Date(period.end_date)
    
    if (endDate < now) {
      return { error: 'Cannot activate a period that has already ended.' }
    }
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .update({ is_active: true })
      .eq('id', periodId)
      .select()
      .single()
    
    if (error) {
      console.error('Error activating period:', error)
      return { error: 'Failed to activate period.' }
    }
    
    revalidatePath('/dashboard/admin/school-assessment')
    return { success: true, period: mapDbRowToPeriod(data) }
  } catch (error) {
    console.error('Error in activatePeriod:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Deactivates a period (closes submissions)
 */
export async function deactivatePeriod(periodId: string) {
  try {
    const user = await getUser()
    
    if (!user || user.role !== 'Admin') {
      return { error: 'Only admins can deactivate periods.' }
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .update({ is_active: false })
      .eq('id', periodId)
      .select()
      .single()
    
    if (error) {
      console.error('Error deactivating period:', error)
      return { error: 'Failed to deactivate period.' }
    }
    
    revalidatePath('/dashboard/admin/school-assessment')
    return { success: true, period: mapDbRowToPeriod(data) }
  } catch (error) {
    console.error('Error in deactivatePeriod:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets the currently active period (if any)
 */
export async function getActivePeriod() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('is_active', true)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No active period found
        return { period: null, error: null }
      }
      console.error('Error fetching active period:', error)
      return { period: null, error: 'Failed to fetch active period.' }
    }
    
    return { period: mapDbRowToPeriod(data), error: null }
  } catch (error) {
    console.error('Error in getActivePeriod:', error)
    return { period: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Checks if submission is currently open
 * Returns true only if there's an active period AND current time is within the window
 */
export async function isSubmissionOpen(periodId?: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('school_assessment_periods')
      .select('*')
    
    if (periodId) {
      query = query.eq('id', periodId)
    } else {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query.single()
    
    if (error || !data) {
      return { isOpen: false, period: null, error: null }
    }
    
    const now = new Date()
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)
    
    const isOpen = data.is_active && now >= startDate && now <= endDate
    
    return { 
      isOpen, 
      period: mapDbRowToPeriod(data),
      daysRemaining: isOpen ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      error: null 
    }
  } catch (error) {
    console.error('Error in isSubmissionOpen:', error)
    return { isOpen: false, period: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all periods for an academic year
 */
export async function getAcademicYearPeriods(academicYear: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('academic_year', academicYear)
      .order('sequence_order', { ascending: true })
    
    if (error) {
      console.error('Error fetching academic year periods:', error)
      return { periods: [], error: 'Failed to fetch periods.' }
    }
    
    return { 
      periods: data.map(mapDbRowToPeriod), 
      error: null 
    }
  } catch (error) {
    console.error('Error in getAcademicYearPeriods:', error)
    return { periods: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all academic years with their periods
 */
export async function getAllAcademicYears() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('sequence_order', { ascending: true })
    
    if (error) {
      console.error('Error fetching all academic years:', error)
      return { periods: [], error: 'Failed to fetch academic years.' }
    }
    
    return { 
      periods: data.map(mapDbRowToPeriod), 
      error: null 
    }
  } catch (error) {
    console.error('Error in getAllAcademicYears:', error)
    return { periods: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets a specific period by ID
 */
export async function getPeriodById(periodId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('id', periodId)
      .single()
    
    if (error) {
      console.error('Error fetching period:', error)
      return { period: null, error: 'Failed to fetch period.' }
    }
    
    return { period: mapDbRowToPeriod(data), error: null }
  } catch (error) {
    console.error('Error in getPeriodById:', error)
    return { period: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets all assessment periods, ordered by academic year and sequence
 */
export async function getAllPeriods() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('sequence_order', { ascending: true })
    
    if (error) {
      console.error('Error fetching all periods:', error)
      return { periods: [], error: 'Failed to fetch periods.' }
    }
    
    return { 
      periods: data.map(mapDbRowToPeriod), 
      error: null 
    }
  } catch (error) {
    console.error('Error in getAllPeriods:', error)
    return { periods: [], error: 'An unexpected error occurred.' }
  }
}

/**
 * Advances to the next period in sequence
 * If current period is Term 3, creates next academic year and activates Term 1
 * Called by the scheduled edge function when a period closes
 */
export async function advanceToNextPeriod() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get current active period
    const { data: currentPeriod, error: fetchError } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('is_active', true)
      .single()
    
    if (fetchError || !currentPeriod) {
      return { error: 'No active period to advance from.' }
    }
    
    const currentSequence = currentPeriod.sequence_order as 1 | 2 | 3
    const currentYear = currentPeriod.academic_year
    
    let nextPeriodId: string | null = null
    
    if (currentSequence < 3) {
      // Move to next term in same academic year
      const nextSequence = currentSequence + 1
      
      const { data: nextPeriod, error: nextError } = await supabase
        .from('school_assessment_periods')
        .select('id')
        .eq('academic_year', currentYear)
        .eq('sequence_order', nextSequence)
        .single()
      
      if (nextError || !nextPeriod) {
        return { error: 'Next period not found in current academic year.' }
      }
      
      nextPeriodId = nextPeriod.id
    } else {
      // Current is Term 3, move to Term 1 of next academic year
      const nextYear = getNextAcademicYear(currentYear)
      
      // Check if next year exists
      const { data: nextYearPeriods } = await supabase
        .from('school_assessment_periods')
        .select('id')
        .eq('academic_year', nextYear)
        .eq('sequence_order', 1)
        .single()
      
      if (!nextYearPeriods) {
        // Next academic year doesn't exist - it needs to be created by admin
        return { 
          error: `Next academic year (${nextYear}) has not been created. Please create it first.`,
          requiresNewYear: true,
          nextYear 
        }
      }
      
      nextPeriodId = nextYearPeriods.id
    }
    
    // Deactivate current period
    await supabase
      .from('school_assessment_periods')
      .update({ is_active: false })
      .eq('id', currentPeriod.id)
    
    // Activate next period
    const { data: activatedPeriod, error: activateError } = await supabase
      .from('school_assessment_periods')
      .update({ is_active: true })
      .eq('id', nextPeriodId)
      .select()
      .single()
    
    if (activateError) {
      console.error('Error activating next period:', activateError)
      return { error: 'Failed to activate next period.' }
    }
    
    revalidatePath('/dashboard/admin/school-assessment')
    return { 
      success: true, 
      previousPeriod: mapDbRowToPeriod(currentPeriod),
      nextPeriod: mapDbRowToPeriod(activatedPeriod)
    }
  } catch (error) {
    console.error('Error in advanceToNextPeriod:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Closes an expired period and marks all draft reports as expired_draft
 * Called by the scheduled edge function
 */
export async function closeExpiredPeriod(periodId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the period
    const { data: period, error: fetchError } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('id', periodId)
      .single()
    
    if (fetchError || !period) {
      return { error: 'Period not found.' }
    }
    
    // Mark all draft reports for this period as expired_draft
    const { data: expiredReports, error: updateError } = await supabase
      .from('school_assessment_reports')
      .update({ 
        status: 'expired_draft',
        locked_at: new Date().toISOString()
      })
      .eq('period_id', periodId)
      .eq('status', 'draft')
      .select('id')
    
    if (updateError) {
      console.error('Error expiring draft reports:', updateError)
      return { error: 'Failed to expire draft reports.' }
    }
    
    // Deactivate the period
    await supabase
      .from('school_assessment_periods')
      .update({ is_active: false })
      .eq('id', periodId)
    
    return { 
      success: true, 
      expiredReportsCount: expiredReports?.length || 0 
    }
  } catch (error) {
    console.error('Error in closeExpiredPeriod:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets period with additional status information
 */
export async function getPeriodWithStatus(periodId: string): Promise<{ 
  period: AssessmentPeriodWithStatus | null
  error: string | null 
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: period, error: periodError } = await supabase
      .from('school_assessment_periods')
      .select('*')
      .eq('id', periodId)
      .single()
    
    if (periodError || !period) {
      return { period: null, error: 'Period not found.' }
    }
    
    // Get submission counts
    const { count: submittedCount } = await supabase
      .from('school_assessment_reports')
      .select('id', { count: 'exact', head: true })
      .eq('period_id', periodId)
      .eq('status', 'submitted')
    
    // Get total schools count
    const { count: totalSchools } = await supabase
      .from('sms_schools')
      .select('id', { count: 'exact', head: true })
    
    const now = new Date()
    const startDate = new Date(period.start_date)
    const endDate = new Date(period.end_date)
    
    const isSubmissionOpen = period.is_active && now >= startDate && now <= endDate
    const daysRemaining = isSubmissionOpen 
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    const periodWithStatus: AssessmentPeriodWithStatus = {
      ...mapDbRowToPeriod(period),
      isSubmissionOpen,
      daysRemaining,
      submittedCount: submittedCount || 0,
      totalSchools: totalSchools || 0,
    }
    
    return { period: periodWithStatus, error: null }
  } catch (error) {
    console.error('Error in getPeriodWithStatus:', error)
    return { period: null, error: 'An unexpected error occurred.' }
  }
}
