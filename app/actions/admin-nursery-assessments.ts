"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"

// Get all nursery assessments for admin management
export async function getAllNurseryAssessments() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // First get all assessments
    const { data: assessments, error: assessmentsError } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .order('created_at', { ascending: false })

    if (assessmentsError) {
      console.error('Error fetching nursery assessments:', assessmentsError)
      return { assessments: [], error: "Failed to fetch assessments: " + assessmentsError.message }
    }

    if (!assessments || assessments.length === 0) {
      return { assessments: [], error: null }
    }

    console.log('Raw assessments:', assessments.slice(0, 2)) // Debug log

    // Get unique school IDs and user IDs, filtering out nulls
    const schoolIds = [...new Set(assessments.map(a => a.school_id).filter(Boolean))]
    const userIds = [...new Set(assessments.map(a => a.headteacher_id).filter(Boolean))]

    console.log('School IDs to fetch:', schoolIds.slice(0, 5)) // Debug log
    console.log('User IDs to fetch:', userIds.slice(0, 5)) // Debug log

    // Fetch schools and users separately if we have IDs
    let schools = []
    let users = []

    if (schoolIds.length > 0) {
      const schoolsResult = await supabase.from('sms_schools').select('id, name, region_id').in('id', schoolIds)
      console.log('Schools query result:', schoolsResult.error ? schoolsResult.error : `Found ${schoolsResult.data?.length || 0} schools`)
      schools = schoolsResult.data || []
    }

    if (userIds.length > 0) {
      const usersResult = await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds)
      console.log('Users query result:', usersResult.error ? usersResult.error : `Found ${usersResult.data?.length || 0} users`)
      users = usersResult.data || []
    }

    // Get unique region IDs and fetch region names
    const regionIds = [...new Set(schools.map(s => s.region_id).filter(Boolean))]
    let regions = []

    if (regionIds.length > 0) {
      const regionsResult = await supabase.from('sms_regions').select('id, name').in('id', regionIds)
      console.log('Regions query result:', regionsResult.error ? regionsResult.error : `Found ${regionsResult.data?.length || 0} regions`)
      regions = regionsResult.data || []
    }

    console.log('Sample school data:', schools.slice(0, 2)) // Debug log
    console.log('Sample user data:', users.slice(0, 2)) // Debug log
    console.log('Sample region data:', regions.slice(0, 2)) // Debug log

    // Create lookup maps
    const schoolsMap = schools.reduce((acc, school) => {
      acc[school.id] = school
      return acc
    }, {} as any)

    const usersMap = users.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as any)

    const regionsMap = regions.reduce((acc, region) => {
      acc[region.id] = region
      return acc
    }, {} as any)

    // Combine data with region names
    const combinedAssessments = assessments.map(assessment => {
      const school = schoolsMap[assessment.school_id] || null
      const region = school ? regionsMap[school.region_id] || null : null
      
      return {
        ...assessment,
        sms_schools: school ? {
          ...school,
          region_name: region?.name || 'Unknown Region'
        } : null,
        users: usersMap[assessment.headteacher_id] || null
      }
    })

    console.log('Sample combined assessment:', combinedAssessments[0]) // Debug log

    return { assessments: combinedAssessments, error: null }
  } catch (err) {
    console.error('Error in getAllNurseryAssessments:', err)
    return { assessments: [], error: "An unexpected error occurred" }
  }
}

// Get nursery assessment statistics
export async function getNurseryAssessmentStats() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get total counts by status
    const { data: statusStats, error: statusError } = await supabase
      .from('hmr_nursery_assessment')
      .select('status')
    
    if (statusError) {
      console.error('Error fetching status stats:', statusError)
      return { stats: null, error: "Failed to fetch statistics" }
    }

    // Calculate statistics
    const totalAssessments = statusStats?.length || 0
    const completedAssessments = statusStats?.filter(a => a.status === 'completed').length || 0
    const submittedAssessments = statusStats?.filter(a => a.status === 'submitted').length || 0
    const draftAssessments = statusStats?.filter(a => a.status === 'draft').length || 0
    const finishedAssessments = completedAssessments + submittedAssessments
    
    // Get assessments by month for trend
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('hmr_nursery_assessment')
      .select('created_at, status')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (monthlyError) {
      console.error('Error fetching monthly data:', monthlyError)
    }

    // Process monthly data
    const monthlyStats: { [key: string]: { completed: number, draft: number, total: number } } = {}
    
    monthlyData?.forEach(assessment => {
      const month = new Date(assessment.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = { completed: 0, submitted: 0, draft: 0, total: 0 }
      }
      
      monthlyStats[month].total++
      if (assessment.status === 'completed') {
        monthlyStats[month].completed++
      } else if (assessment.status === 'submitted') {
        monthlyStats[month].submitted++
      } else if (assessment.status === 'draft') {
        monthlyStats[month].draft++
      }
    })

    return {
      stats: {
        total: totalAssessments,
        completed: completedAssessments,
        submitted: submittedAssessments,
        draft: draftAssessments,
        finished: finishedAssessments,
        completionRate: totalAssessments > 0 ? Math.round((finishedAssessments / totalAssessments) * 100) : 0,
        monthlyTrend: Object.entries(monthlyStats)
          .map(([month, data]) => ({ month, ...data }))
          .slice(0, 6) // Last 6 months
      },
      error: null
    }
  } catch (err) {
    console.error('Error in getNurseryAssessmentStats:', err)
    return { stats: null, error: "An unexpected error occurred" }
  }
}

// Delete a nursery assessment
export async function deleteNurseryAssessment(assessmentId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // First delete all answers for this assessment
    const { error: answersError } = await supabase
      .from('hmr_nursery_assessment_answers')
      .delete()
      .eq('assessment_id', assessmentId)
    
    if (answersError) {
      console.error('Error deleting assessment answers:', answersError)
      return { success: false, error: "Failed to delete assessment answers: " + answersError.message }
    }
    
    // Then delete the assessment
    const { error: assessmentError } = await supabase
      .from('hmr_nursery_assessment')
      .delete()
      .eq('id', assessmentId)
    
    if (assessmentError) {
      console.error('Error deleting assessment:', assessmentError)
      return { success: false, error: "Failed to delete assessment: " + assessmentError.message }
    }
    
    return { success: true, error: null }
  } catch (err) {
    console.error('Error in deleteNurseryAssessment:', err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Get nursery assessment details with answers
export async function getNurseryAssessmentDetails(assessmentId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    // Get the assessment first
    const { data: assessment, error: assessmentError } = await supabase
      .from('hmr_nursery_assessment')
      .select('*')
      .eq('id', assessmentId)
      .single()
    
    if (assessmentError) {
      console.error('Error fetching assessment:', assessmentError)
      return { assessment: null, answers: [], error: "Failed to fetch assessment: " + assessmentError.message }
    }

    // Get school and user data separately
    const [schoolResult, userResult] = await Promise.all([
      supabase.from('sms_schools').select('name, region_id').eq('id', assessment.school_id).single(),
      supabase.from('users').select('first_name, last_name, email').eq('id', assessment.headteacher_id).single()
    ])

    // Get region name if school has region_id
    let regionName = 'Unknown Region'
    if (schoolResult.data?.region_id) {
      const regionResult = await supabase.from('sms_regions').select('name').eq('id', schoolResult.data.region_id).single()
      regionName = regionResult.data?.name || 'Unknown Region'
    }

    // Combine the data
    const combinedAssessment = {
      ...assessment,
      sms_schools: schoolResult.data ? {
        ...schoolResult.data,
        region_name: regionName
      } : null,
      users: userResult.data || null
    }
    
    const { data: answers, error: answersError } = await supabase
      .from('hmr_nursery_assessment_answers')
      .select(`
        *,
        hmr_nursery_assessment_questions:question_id(question_text, question_type, section, options)
      `)
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true })
    
    if (answersError) {
      console.error('Error fetching answers:', answersError)
      return { assessment: combinedAssessment, answers: [], error: "Failed to fetch answers: " + answersError.message }
    }
    
    return { assessment: combinedAssessment, answers: answers || [], error: null }
  } catch (err) {
    console.error('Error in getNurseryAssessmentDetails:', err)
    return { assessment: null, answers: [], error: "An unexpected error occurred" }
  }
}

// Update nursery assessment status
export async function updateNurseryAssessmentStatus(assessmentId: string, status: 'draft' | 'completed' | 'submitted') {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { error } = await supabase
      .from('hmr_nursery_assessment')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
    
    if (error) {
      console.error('Error updating assessment status:', error)
      return { success: false, error: "Failed to update status: " + error.message }
    }
    
    return { success: true, error: null }
  } catch (err) {
    console.error('Error in updateNurseryAssessmentStatus:', err)
    return { success: false, error: "An unexpected error occurred" }
  }
}