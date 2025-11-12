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

// Load saved responses for an assessment
export async function loadNurseryAssessmentResponses(assessment_id: string) {
  try {
    console.log('Loading assessment responses for assessment_id:', assessment_id)
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: responses, error } = await supabase
      .from('hmr_nursery_assessment_answers')
      .select('*')
      .eq('assessment_id', assessment_id)
      .order('created_at', { ascending: true })

    console.log('Assessment responses loaded:', responses)
    console.log('Responses load error:', error)

    if (error) {
      console.error('Error loading assessment responses:', error)
      return { responses: [], error: "Failed to load responses: " + error.message }
    }

    return { responses: responses || [], error: null }
  } catch (err) {
    console.error('Error in loadNurseryAssessmentResponses:', err)
    return { responses: [], error: "An unexpected error occurred while loading responses" }
  }
}

// Load existing nursery assessment for a user/school
export async function loadNurseryAssessment(headteacher_id: string, school_id: string) {
  try {
    console.log('Loading existing assessment for:', { headteacher_id, school_id })
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .eq('headteacher_id', headteacher_id)
      .eq('school_id', school_id)
      .eq('status', 'draft') // Only load draft assessments
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('Existing assessment loaded:', data)
    console.log('Load error:', error)

    if (error) {
      console.error('Error loading assessment:', error)
      return { assessment: null, error: "Failed to load assessment: " + error.message }
    }

    return { assessment: data, error: null }
  } catch (err) {
    console.error('Error in loadNurseryAssessment:', err)
    return { assessment: null, error: "An unexpected error occurred while loading assessment" }
  }
}

// Save new nursery assessment to database
export async function saveNurseryAssessment(assessmentData: {
  school_id: string
  headteacher_id: string
  assessment_type: string
  enrollment: number
}) {
  try {
    console.log('Saving nursery assessment:', assessmentData)
    const supabase = createServiceRoleSupabaseClient()
    
    // Ensure enrollment is a valid number
    const enrollmentValue = Number(assessmentData.enrollment)
    if (isNaN(enrollmentValue)) {
      return { assessment: null, error: "Invalid enrollment value" }
    }
    
    console.log('Validated enrollment value:', enrollmentValue, typeof enrollmentValue)
    
    const insertData = {
      school_id: assessmentData.school_id,
      headteacher_id: assessmentData.headteacher_id,
      assessment_type: assessmentData.assessment_type,
      enrollment: enrollmentValue,
      status: 'draft',
      updated_at: new Date().toISOString().slice(0, 10),
      updated_by: assessmentData.headteacher_id
    }
    
    console.log('Insert data:', insertData)
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .insert(insertData)
      .select()
      .single()

    console.log('Assessment saved:', data)
    console.log('Save error:', error)

    if (error) {
      console.error('Error saving assessment:', error)
      return { assessment: null, error: "Failed to save assessment: " + error.message }
    }

    return { assessment: data, error: null }
  } catch (err) {
    console.error('Error in saveNurseryAssessment:', err)
    return { assessment: null, error: "An unexpected error occurred while saving assessment" }
  }
}

// Update existing nursery assessment
export async function updateNurseryAssessment(
  assessmentId: string, 
  updateData: {
    assessment_type?: string
    enrollment?: number
    status?: string
    updated_by: string
  }
) {
  try {
    console.log('Updating nursery assessment:', assessmentId, updateData)
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .update({
        ...updateData,
        updated_at: new Date().toISOString().slice(0, 10)
      })
      .eq('id', assessmentId)
      .select()
      .single()

    console.log('Assessment updated:', data)
    console.log('Update error:', error)

    if (error) {
      console.error('Error updating assessment:', error)
      return { assessment: null, error: "Failed to update assessment: " + error.message }
    }

    return { assessment: data, error: null }
  } catch (err) {
    console.error('Error in updateNurseryAssessment:', err)
    return { assessment: null, error: "An unexpected error occurred while updating assessment" }
  }
}

// Test function to check table schema
export async function testNurseryAssessmentTable() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .limit(1)
    
    console.log('Table test result:', data, error)
    return { success: !error, error: error?.message }
  } catch (err) {
    console.error('Table test error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Function to inspect table structure
export async function inspectTableStructure() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    console.log('=== INSPECTING HMR_NURSERY_ASSESSMENT TABLE ===')
    
    const { data: existingRecords, error: queryError } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .limit(5)
    
    console.log('Existing records query result:', queryError)
    console.log('Number of records found:', existingRecords?.length || 0)
    
    if (existingRecords && existingRecords.length > 0) {
      console.log('Available columns from existing data:')
      const columns = Object.keys(existingRecords[0])
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col} = ${existingRecords[0][col]}`)
      })
    }
    
    const testColumns = ['id', 'school_id', 'headteacher_id', 'assessment_type', 'status', 'created_at', 'updated_at', 'updated_by', 'enrollment', 'form_data']
    
    console.log('Testing individual columns:')
    for (const column of testColumns) {
      try {
        const { data: colTest, error: colError } = await supabase
          .from('hmr_nursery_assessment')
          .select(column)
          .limit(1)
        
        console.log(`Column '${column}': ${colError ? 'ERROR - ' + colError.message : 'OK'}`)
      } catch (colErr) {
        console.log(`Column '${column}': ERROR - ${colErr instanceof Error ? colErr.message : 'Unknown error'}`)
      }
    }
    
    return {
      success: !queryError,
      existingRecords: existingRecords || [],
      availableColumns: existingRecords && existingRecords.length > 0 ? Object.keys(existingRecords[0]) : [],
      error: queryError?.message
    }
  } catch (err) {
    console.error('Table structure inspection error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      existingRecords: [],
      availableColumns: []
    }
  }
}

// Alternative function using raw SQL to bypass schema cache
export async function saveNurseryAssessmentRaw(assessmentData: {
  school_id: string
  headteacher_id: string
  assessment_type: string
  enrollment: number
}) {
  try {
    console.log('Saving nursery assessment with raw SQL:', assessmentData)
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase.rpc('create_nursery_assessment', {
      p_school_id: assessmentData.school_id,
      p_headteacher_id: assessmentData.headteacher_id,
      p_assessment_type: assessmentData.assessment_type,
      p_enrollment: assessmentData.enrollment
    })

    if (error) {
      console.log('RPC function not available, trying direct SQL...')
      
      // Fallback to direct SQL query
      const { data: sqlData, error: sqlError } = await supabase
        .from('hmr_nursery_assessment')
        .insert({
          school_id: assessmentData.school_id,
          headteacher_id: assessmentData.headteacher_id,
          assessment_type: assessmentData.assessment_type,
          enrollment: assessmentData.enrollment,
          status: 'draft',
          updated_at: new Date().toISOString().slice(0, 10),
          updated_by: assessmentData.headteacher_id
        })
        .select()

      if (sqlError) {
        console.error('SQL insert failed:', sqlError)
        return { assessment: null, error: "Failed to save assessment: " + sqlError.message }
      }

      return { assessment: sqlData?.[0] || null, error: null }
    }

    console.log('Assessment saved via RPC:', data)
    return { assessment: data, error: null }
  } catch (err) {
    console.error('Error in saveNurseryAssessmentRaw:', err)
    return { assessment: null, error: "An unexpected error occurred while saving assessment" }
  }
}

// Auto-save form data for existing assessment
export async function autoSaveNurseryAssessment(
  assessmentId: string,
  formData: any,
  updated_by: string
) {
  try {
    console.log('Auto-saving assessment:', assessmentId)
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .update({
        form_data: formData, // Store all form data as JSON
        updated_at: new Date().toISOString().slice(0, 10),
        updated_by: updated_by
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      console.error('Error auto-saving assessment:', error)
      return { success: false, error: error.message }
    }

    console.log('Auto-save successful')
    return { success: true, error: null }
  } catch (err) {
    console.error('Error in autoSaveNurseryAssessment:', err)
    return { success: false, error: "Auto-save failed" }
  }
}

// Test function specifically for enrollment column
export async function testEnrollmentColumn() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    console.log('=== TESTING ENROLLMENT COLUMN ===')
    
    // Try to insert a test record with enrollment
    const testData = {
      school_id: 'test-school-123',
      headteacher_id: 'test-teacher-123', 
      assessment_type: 'test',
      enrollment: 50,
      status: 'draft',
      updated_at: new Date().toISOString().slice(0, 10),
      updated_by: 'test-teacher-123'
    }
    
    console.log('Attempting to insert test record:', testData)
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .insert(testData)
      .select()
      .single()
    
    console.log('Test insert result:', { data, error })
    
    if (data) {
      // Clean up test record
      await supabase
        .from('hmr_nursery_assessment')
        .delete()
        .eq('id', data.id)
      
      console.log('Test record cleaned up')
    }
    
    return {
      success: !error,
      error: error?.message,
      canInsertEnrollment: !error
    }
  } catch (err) {
    console.error('Test enrollment column error:', err)
    return {
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error',
      canInsertEnrollment: false
    }
  }
}

// Save individual assessment answer
export async function saveAssessmentAnswer(answerData: {
  assessment_id: string
  question_id: string
  option_id: string
  answer: number
}) {
  try {
    console.log('Saving assessment answer:', answerData)
    const supabase = createServiceRoleSupabaseClient()
    
    // Validate that we have required data
    if (!answerData.assessment_id || !answerData.question_id || !answerData.option_id) {
      console.error('Missing required fields:', answerData)
      return { success: false, error: 'Missing required fields' }
    }
    
    // Check if answer already exists
    const { data: existingAnswer, error: checkError } = await supabase
      .from('hmr_nursery_assessment_answers')
      .select('*')
      .eq('assessment_id', answerData.assessment_id)
      .eq('question_id', answerData.question_id)
      .eq('option_id', answerData.option_id)
      .maybeSingle()

    console.log('Existing answer check:', existingAnswer, checkError)

    if (checkError) {
      console.error('Error checking existing answer:', checkError)
      return { success: false, error: checkError.message }
    }

    if (existingAnswer) {
      // Update existing answer
      const { data, error } = await supabase
        .from('hmr_nursery_assessment_answers')
        .update({
          answer: answerData.answer,
          created_at: new Date().toISOString()
        })
        .eq('id', existingAnswer.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating answer:', error)
        return { success: false, error: error.message }
      }

      console.log('Answer updated successfully:', data)
      return { success: true, data, error: null }
    } else {
      // Create new answer
      const insertData = {
        assessment_id: answerData.assessment_id,
        question_id: answerData.question_id,
        option_id: answerData.option_id,
        answer: answerData.answer,
        created_at: new Date().toISOString()
      }
      
      console.log('Inserting new answer:', insertData)
      
      const { data, error } = await supabase
        .from('hmr_nursery_assessment_answers')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating answer:', error)
        return { success: false, error: error.message }
      }

      console.log('Answer created successfully:', data)
      return { success: true, data, error: null }
    }
  } catch (err) {
    console.error('Error in saveAssessmentAnswer:', err)
    return { success: false, error: "An unexpected error occurred while saving answer" }
  }
}

// Get options for questions - use actual database table
export async function getQuestionOptions(questionIds: string[]) {
  try {
    console.log('Fetching options for questions:', questionIds)
    const supabase = createServiceRoleSupabaseClient()
    
    // Use the correct table name from your database
    const { data, error } = await supabase
      .from('hmr_nursery_assessment_questions_options')
      .select('*')
      .eq('section', 'Autobiographical Knowledge')  // Filter by section since your table doesn't link to specific questions
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching options:', error)
      return { options: [], error: error.message }
    }
    
    console.log('All options from database:', data)
    console.log('Options structure sample:', data?.[0])
    return { options: data || [], error: null }
  } catch (err) {
    console.error('Error in getQuestionOptions:', err)
    return { options: [], error: "An unexpected error occurred" }
  }
}

// Simple function to test enrollment saving
export async function saveEnrollmentOnly(assessmentId: string, enrollment: number) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment')
      .update({ enrollment: enrollment })
      .eq('id', assessmentId)
      .select()
      .single()

    console.log('Enrollment update result:', data, error)
    return { success: !error, data, error: error?.message }
  } catch (err) {
    console.error('Error in saveEnrollmentOnly:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Function to load saved responses from the answers table
export async function loadSavedResponses(assessmentId: string) {
  try {
    console.log('Loading saved responses for assessment:', assessmentId)
    const supabase = createServiceRoleSupabaseClient()
    
    const { data, error } = await supabase
      .from('hmr_nursery_assessment_answers')
      .select(`
        *,
        hmr_nursery_assessment_questions_options!inner(
          options,
          section
        )
      `)
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading saved responses:', error)
      return { responses: [], error: error.message }
    }

    console.log('Loaded responses from database:', data)
    return { responses: data || [], error: null }
  } catch (err) {
    console.error('Error in loadSavedResponses:', err)
    return { responses: [], error: 'An unexpected error occurred' }
  }
}

// Function to fetch submitted nursery assessments for a user
export async function getSubmittedNurseryAssessments(userId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // First get assessments without foreign key joins to test basic query
    const { data: assessments, error } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .eq('headteacher_id', userId)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching submitted assessments:', error)
      return { assessments: [], error: error.message }
    }

    // Now fetch school data separately for each assessment
    const assessmentsWithSchools = await Promise.all(
      assessments.map(async (assessment) => {
        const { data: school } = await supabase
          .from('sms_schools')
          .select('name, region_id')
          .eq('id', assessment.school_id)
          .single()

        return {
          ...assessment,
          schools: school ? { name: school.name, region: school.region_id } : null
        }
      })
    )

    console.log('Fetched submitted assessments:', assessmentsWithSchools)
    return { assessments: assessmentsWithSchools || [], error: null }
  } catch (err) {
    console.error('Error in getSubmittedNurseryAssessments:', err)
    return { assessments: [], error: 'An unexpected error occurred' }
  }
}

// Function to get detailed assessment data for viewing/printing
export async function getNurseryAssessmentDetails(assessmentId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get assessment basic info first
    const { data: assessment, error: assessmentError } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .eq('id', assessmentId)
      .single()

    if (assessmentError) {
      console.error('Error fetching assessment:', assessmentError)
      return { assessment: null, responses: [], error: assessmentError.message }
    }

    // Get school data separately
    const { data: school } = await supabase
      .from('sms_schools')
      .select('name, region_id, school_level_id')
      .eq('id', assessment.school_id)
      .single()

    // Attach school data to assessment
    const assessmentWithSchool = {
      ...assessment,
      schools: school ? { name: school.name, region: school.region_id, level: school.school_level_id } : null
    }

    // Get all responses for this assessment - using simple query
    const { data: responses, error: responsesError } = await supabase
      .from('hmr_nursery_assessment_answers')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true })

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return { assessment: assessmentWithSchool, responses: [], error: responsesError.message }
    }

    // Get all questions and options separately
    const { data: allQuestions, error: questionsError } = await supabase
      .from('hmr_nursery_assessment_questions')
      .select('*')
      .order('created_at', { ascending: true })

    const { data: allOptions, error: optionsError } = await supabase
      .from('hmr_nursery_assessment_questions_options')
      .select('*')
      .order('created_at', { ascending: true })

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return { assessment: assessmentWithSchool, responses: [], error: questionsError.message }
    }

    if (optionsError) {
      console.error('Error fetching options:', optionsError)
      return { assessment: assessmentWithSchool, responses: [], error: optionsError.message }
    }

    // Map responses with question and option data
    const enrichedResponses = responses?.map(response => {
      const question = allQuestions?.find(q => q.id === response.question_id)
      const option = allOptions?.find(o => o.id === response.option_id)
      
      return {
        ...response,
        question_text: question?.questions || 'Question not found',
        question_section: question?.section || 'Unknown section',
        option_text: option?.options || 'Option not found',
        option_section: option?.section || 'Unknown section'
      }
    }) || []

    console.log('Fetched assessment details:', { assessment: assessmentWithSchool, responses: enrichedResponses })
    return { assessment: assessmentWithSchool, responses: enrichedResponses, questions: allQuestions || [], options: allOptions || [], error: null }
  } catch (err) {
    console.error('Error in getNurseryAssessmentDetails:', err)
    return { assessment: null, responses: [], questions: [], options: [], error: 'An unexpected error occurred' }
  }
}