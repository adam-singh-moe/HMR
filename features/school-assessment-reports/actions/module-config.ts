"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "@/app/actions/auth"
import { revalidatePath } from "next/cache"
import type { AssessmentModuleConfig } from "../types"

// ============================================================================
// COMPONENT HELPERS
// ============================================================================

/**
 * Converts database row to AssessmentModuleConfig type
 */
function mapDbRowToModuleConfig(row: any): AssessmentModuleConfig {
  return {
    id: row.id,
    schoolType: row.school_type,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

// ============================================================================
// MODULE CONFIGURATION ACTIONS
// ============================================================================

/**
 * Gets the assessment module configuration for all school types
 */
export async function getAssessmentModuleConfigs(): Promise<{ 
  configs: AssessmentModuleConfig[], 
  error: string | null 
}> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_assessment_module_config')
      .select('*')
      .order('school_type', { ascending: true })
    
    if (error) throw error
    
    return { 
      configs: (data || []).map(mapDbRowToModuleConfig), 
      error: null 
    }
  } catch (error: any) {
    console.error('Error fetching assessment module configs:', error)
    return { configs: [], error: error.message }
  }
}

/**
 * Updates the enabled status for a specific school type's assessment module
 */
export async function updateAssessmentModuleStatus(
  schoolType: 'nursery' | 'primary' | 'secondary',
  isEnabled: boolean
) {
  try {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')
    
    // Check if user is admin
    if (user.role?.toLowerCase() !== 'admin') {
      throw new Error('Only administrators can update module configurations')
    }
    
    const supabase = createServiceRoleSupabaseClient()
    
    const { error } = await supabase
      .from('hmr_assessment_module_config')
      .update({ 
        is_enabled: isEnabled,
        updated_by: user.id
      })
      .eq('school_type', schoolType)
    
    if (error) throw error
    
    // Revalidate paths that use these configs
    revalidatePath('/dashboard/school-assessment/admin')
    revalidatePath('/dashboard/school-assessment')
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error(`Error updating assessment module status for ${schoolType}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Checks if the assessment module is enabled for a specific school type
 */
export async function isAssessmentModuleEnabled(
  schoolType: 'nursery' | 'primary' | 'secondary'
): Promise<boolean> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_assessment_module_config')
      .select('is_enabled')
      .eq('school_type', schoolType)
      .single()
    
    if (error) {
      // Default to true if config doesn't exist yet
      if (error.code === 'PGRST116') return true
      throw error
    }
    
    return data?.is_enabled ?? true
  } catch (error) {
    console.error(`Error checking assessment module status for ${schoolType}:`, error)
    return true // Fallback to enabled if error occurs
  }
}
