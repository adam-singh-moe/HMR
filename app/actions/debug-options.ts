import { createServiceRoleSupabaseClient } from "@/lib/supabase"

// Debug function to get all available option IDs
export async function getAllAvailableOptions() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment_questions_options')
      .select('id, options, section')
      .eq('section', 'Autobiographical Knowledge')
    
    if (error) {
      return { options: [], error: error.message }
    }
    
    //console.log('All available options:', data)
    return { options: data || [], error: null }
  } catch (err) {
    return { options: [], error: "An unexpected error occurred" }
  }
}