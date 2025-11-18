"use server"

import { GeminiService } from "@/lib/gemini-service"
import { getUser } from "./auth"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"

export async function generateAIInsight(prompt: string, reportType: string, filters?: {
  month?: string
  year?: string
  region?: string
  schoolId?: string
}) {
  try {
    const user = await getUser()

    if (!user) {
      return { insight: null, error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { insight: null, error: "Only Education Officials and Admins can access AI insights." }
    }

    // Fetch relevant report data based on reportType and filters
    const reportData = await fetchReportData(reportType, filters)

    //console.log("Report data type:", typeof reportData, "Is array:", Array.isArray(reportData))
    //console.log("Report data length:", reportData?.length)

    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return { insight: null, error: "No report data found for the selected criteria." }
    }

    // Generate AI insight using Gemini
    const geminiService = new GeminiService()
    const insight = await geminiService.generateInsight(prompt, reportData)

    return { insight, error: null }

  } catch (error) {
    console.error("Error generating AI insight:", error)
    return { 
      insight: null, 
      error: error instanceof Error ? error.message : "Failed to generate AI insight." 
    }
  }
}

async function fetchReportData(reportType: string, filters?: {
  month?: string
  year?: string
  region?: string
  schoolId?: string
}) {
  const supabase = createServiceRoleSupabaseClient()

  try {
    switch (reportType) {
      case 'student-enrollment':
        return await fetchStudentEnrollmentData(supabase, filters)
      
      case 'attendance':
        return await fetchAttendanceData(supabase, filters)
        
      case 'staffing':
        const staffingResult = await fetchStaffingData(supabase, filters)
        // Combine staffing data and teacher updates into a single array
        return [
          ...(staffingResult.staffing || []).map((item: any) => ({ ...item, data_type: 'staffing' })),
          ...(staffingResult.teacherUpdates || []).map((item: any) => ({ ...item, data_type: 'teacher_updates' }))
        ]
        
      case 'staff-development':
        return await fetchStaffDevelopmentData(supabase, filters)
        
      case 'supervision':
        return await fetchSupervisionData(supabase, filters)
        
      case 'curriculum':
        return await fetchCurriculumData(supabase, filters)
        
      case 'finance':
        return await fetchFinanceData(supabase, filters)
        
      case 'income-sources':
        return await fetchIncomeSourcesData(supabase, filters)
        
      case 'safety':
        return await fetchSafetyData(supabase, filters)
        
      case 'staff-meetings':
        return await fetchStaffMeetingsData(supabase, filters)
        
      case 'physical-facilities':
        return await fetchPhysicalFacilitiesData(supabase, filters)
        
      case 'resources':
        return await fetchResourcesData(supabase, filters)
      
      case 'physical-education':
        return await fetchPhysicalEducationData(supabase, filters)
      
      case 'all-reports':
        const allReportsResult = await fetchAllReportsData(supabase, filters)
        // Extract the data array from the result object
        return allReportsResult.data || []
      
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }
  } catch (error) {
    console.error(`Error fetching ${reportType} data:`, error)
    throw error
  }
}

async function fetchPhysicalEducationData(supabase: any, filters?: any) {
  let query = supabase
    .from("hmr_physical_education")
    .select(`
      *,
      hmr_report!inner (
        id,
        school_id,
        month,
        year,
        status,
        sms_schools (
          name,
          sms_regions (
            name
          )
        )
      )
    `)
    .eq("hmr_report.status", "submitted")
    .is("hmr_report.deleted_on", null)

  if (filters?.month && filters.month !== "all") {
    query = query.eq("hmr_report.month", parseInt(filters.month))
  }

  if (filters?.year && filters.year !== "all") {
    query = query.eq("hmr_report.year", parseInt(filters.year))
  }

  if (filters?.schoolId) {
    query = query.eq("hmr_report.school_id", filters.schoolId)
  }

  const { data, error } = await query

  if (error) throw error

  // Transform data for AI analysis
  return data?.map((item: any) => ({
    school_name: item.hmr_report?.sms_schools?.name || 'Unknown School',
    region: item.hmr_report?.sms_schools?.sms_regions?.name || 'Unknown Region',
    month: item.hmr_report?.month,
    year: item.hmr_report?.year,
    total_students: item.total_students,
    activities: item.activities_performed,
    challenges: item.challenges,
    status: item.hmr_report?.status
  })) || []
}

// Generic function to fetch report data for any section
async function fetchReportBaseData(supabase: any, filters?: any) {
  let query = supabase
    .from("hmr_report")
    .select(`
      id,
      school_id,
      month,
      year,
      status,
      created_at,
      updated_at,
      sms_schools (
        name,
        sms_regions (
          name
        )
      ),
      hmr_users (
        name
      )
    `)
    .eq("status", "submitted")
    .is("deleted_on", null)
    .limit(100) // Limit base reports to prevent large datasets

  if (filters?.month && filters.month !== "all") {
    query = query.eq("month", parseInt(filters.month))
  }

  if (filters?.year && filters.year !== "all") {
    query = query.eq("year", parseInt(filters.year))
  }

  if (filters?.schoolId) {
    query = query.eq("school_id", filters.schoolId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching base report data:", error)
    throw error
  }

  return data || []
}

async function fetchSectionDataWithReports(supabase: any, tableName: string, filters?: any) {
  const reports = await fetchReportBaseData(supabase, filters)
  
  if (!reports.length) {
    return []
  }

  const reportIds = reports.map((report: any) => report.id)
  
  // Limit the number of report IDs to prevent large queries
  const limitedReportIds = reportIds.slice(0, 100) // Limit to 100 reports maximum
  
  let query = supabase
    .from(tableName)
    .select("*")
    .in("report_id", limitedReportIds)
    .limit(500) // Limit result set size

  const { data, error } = await query

  if (error) {
    console.error(`Error fetching data from ${tableName}:`, error)
    throw error
  }

  // Combine section data with report data
  return (data || []).map((sectionData: any) => {
    const report = reports.find((r: any) => r.id === sectionData.report_id)
    return {
      ...sectionData,
      school_name: report?.sms_schools?.name || 'Unknown School',
      region: report?.sms_schools?.sms_regions?.name || 'Unknown Region',
      month: report?.month,
      year: report?.year,
      status: report?.status,
      head_teacher: report?.hmr_users?.name || 'Unknown',
      created_at: report?.created_at,
      updated_at: report?.updated_at
    }
  })
}

// Section-specific data fetchers
async function fetchStudentEnrollmentData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_student_enrollment", filters)
}

async function fetchAttendanceData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_attendance", filters)
}

async function fetchStaffingData(supabase: any, filters?: any) {
  try {
    const staffingData = await fetchSectionDataWithReports(supabase, "hmr_staffing", filters)
    const teacherUpdates = await fetchSectionDataWithReports(supabase, "hmr_teacher_status_updates", filters)
    
    return {
      staffing: staffingData.slice(0, 50), // Limit staffing records
      teacherUpdates: teacherUpdates.slice(0, 100) // Limit teacher updates
    }
  } catch (error) {
    console.error("Error in fetchStaffingData:", error)
    // Return empty data instead of throwing to prevent complete failure
    return {
      staffing: [],
      teacherUpdates: []
    }
  }
}

async function fetchStaffDevelopmentData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_staff_development", filters)
}

async function fetchSupervisionData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_supervision", filters)
}

async function fetchCurriculumData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_curriculum", filters)
}

async function fetchFinanceData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_finance", filters)
}

async function fetchIncomeSourcesData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_income", filters)
}

async function fetchSafetyData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_accident_safety", filters)
}

async function fetchStaffMeetingsData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_staff_meetings", filters)
}

async function fetchPhysicalFacilitiesData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_facilities", filters)
}

async function fetchResourcesData(supabase: any, filters?: any) {
  return await fetchSectionDataWithReports(supabase, "hmr_resources_needed", filters)
}

async function fetchAllReportsData(supabase: any, filters?: any) {
  try {
    // For "all reports", only fetch a summary from the most important sections 
    // to prevent overwhelming data loads
   // console.log("Fetching combined reports data with limits...")
    
    // Fetch only the most critical sections with error handling
    const [studentEnrollment, attendance, staffingResult, finance] = await Promise.allSettled([
      fetchStudentEnrollmentData(supabase, filters),
      fetchAttendanceData(supabase, filters),
      fetchStaffingData(supabase, filters),
      fetchFinanceData(supabase, filters)
    ])

    const combinedData = []

    // Process results and handle any failures
    if (studentEnrollment.status === 'fulfilled' && studentEnrollment.value) {
      combinedData.push(...(studentEnrollment.value || []).slice(0, 20).map((r: any) => ({ ...r, report_type: 'student-enrollment' })))
    }
    
    if (attendance.status === 'fulfilled' && attendance.value) {
      combinedData.push(...(attendance.value || []).slice(0, 20).map((r: any) => ({ ...r, report_type: 'attendance' })))
    }
    
    if (staffingResult.status === 'fulfilled' && staffingResult.value) {
      combinedData.push(...(staffingResult.value.staffing || []).slice(0, 15).map((r: any) => ({ ...r, report_type: 'staffing' })))
      combinedData.push(...(staffingResult.value.teacherUpdates || []).slice(0, 15).map((r: any) => ({ ...r, report_type: 'teacher-updates' })))
    }
    
    if (finance.status === 'fulfilled' && finance.value) {
      combinedData.push(...(finance.value || []).slice(0, 20).map((r: any) => ({ ...r, report_type: 'finance' })))
    }

    return {
      totalRecords: combinedData.length,
      data: combinedData,
      note: "Showing summary from key sections to optimize performance. For detailed analysis, please select specific report types."
    }
  } catch (error) {
    console.error("Error in fetchAllReportsData:", error)
    return {
      totalRecords: 0,
      data: [],
      error: "Unable to fetch combined report data. Please try selecting specific report types."
    }
  }
}

export async function getAISuggestedPrompts(category: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { prompts: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { prompts: [], error: "Only Education Officials and Admins can access AI features." }
    }

    const prompts = GeminiService.getSuggestedPrompts(category as any)
    return { prompts, error: null }

  } catch (error) {
    console.error("Error getting AI suggested prompts:", error)
    return { 
      prompts: [], 
      error: "Failed to get suggested prompts." 
    }
  }
}

export async function getAvailableSchools() {
  try {
    const user = await getUser()

    if (!user) {
      return { schools: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { schools: [], error: "Only Education Officials and Admins can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // First get school IDs that have submitted reports
    const { data: reportSchools, error: reportError } = await supabase
      .from('hmr_report')
      .select('school_id')
      .eq('status', 'submitted')
      .is('deleted_on', null)

    if (reportError) {
      console.error("Error fetching report schools:", reportError)
      return { schools: [], error: "Failed to fetch report data." }
    }

    const schoolIds = [...new Set(reportSchools?.map(r => r.school_id) || [])]

    if (schoolIds.length === 0) {
      return { schools: [], error: null }
    }

    // Use batch processing for large datasets
    const batchSize = 100
    const allSchools = []
    
    for (let i = 0; i < schoolIds.length; i += batchSize) {
      const batchIds = schoolIds.slice(i, i + batchSize)
      
      const { data: batchSchools, error: batchError } = await supabase
        .from("sms_schools")
        .select(`
          id,
          name,
          region_id
        `)
        .in('id', batchIds)
        .order('name')

      if (batchError) {
        console.error("Error fetching schools batch:", batchError)
        continue // Skip this batch but continue with others
      }

      if (batchSchools) {
        allSchools.push(...batchSchools)
      }
    }

    // Get region names separately to avoid complex joins
    const regionIds = [...new Set(allSchools.map(s => s.region_id).filter(Boolean))]
    const { data: regions } = await supabase
      .from("sms_regions")
      .select("id, name")
      .in('id', regionIds)

    const regionMap = new Map(regions?.map(r => [r.id, r.name]) || [])

    return { 
      schools: allSchools.map((school: any) => ({
        id: school.id,
        name: school.name,
        region: regionMap.get(school.region_id) || 'Unknown Region'
      })), 
      error: null 
    }

  } catch (error) {
    console.error("Error in getAvailableSchools:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}
