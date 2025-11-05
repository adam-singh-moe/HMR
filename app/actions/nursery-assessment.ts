"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"

export async function getNurseryAssessmentQuestions(section: string) {
  try {
    console.log('Fetching questions for section:', section)
    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS
    
    // First, let's try to get all questions to see if table exists
    const { data: allQuestions, error: allError } = await supabase
      .from('hmr_nursery_assessment_questions')
      .select('*')
      .limit(5)
    
    console.log('All questions test:', allQuestions)
    console.log('All questions error:', allError)
    
    const { data: questions, error } = await supabase
      .from('hmr_nursery_assessment_questions')
      .select('*')
      .eq('section', section)
      .order('created_at', { ascending: true })

    console.log('Questions fetched for section "' + section + '":', questions)
    console.log('Error:', error)

    if (error) {
      console.error('Error fetching questions:', error)
      return { questions: [], error: "Failed to fetch questions: " + error.message }
    }

    return { questions: questions || [], error: null }
  } catch (err) {
    console.error('Error in getNurseryAssessmentQuestions:', err)
    return { questions: [], error: "An unexpected error occurred" }
  }
}