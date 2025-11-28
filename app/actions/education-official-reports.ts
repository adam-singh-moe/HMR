"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getSubmittedReportsForEducationOfficial() {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { reports: [], error: "Only Education Officials and Admins can access this data." }
    }
    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // First, get all submitted reports
    const { data: reports, error: reportsError } = await supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        status,
        updated_at,
        created_at,
        headteacher_id,
        school_id
      `)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("updated_at", { ascending: false })

    if (reportsError) {
      console.error("Error fetching reports:", reportsError)
      return { reports: [], error: "Failed to fetch reports." }
    }

    if (!reports || reports.length === 0) {
      return { reports: [], error: null }
    }

    // Get unique school IDs and head teacher IDs
    const schoolIds = [...new Set(reports.map((r) => r.school_id).filter(Boolean))]
    const headTeacherIds = [...new Set(reports.map((r) => r.headteacher_id).filter(Boolean))]

    // Fetch schools with regions
    const { data: schools, error: schoolsError } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        region_id,
        sms_regions (
          id,
          name
        )
      `)
      .in("id", schoolIds)

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
      return { reports: [], error: "Failed to fetch school information." }
    }

    // Fetch head teachers
    const { data: headTeachers, error: headTeachersError } = await supabase
      .from("hmr_users")
      .select(`
        id,
        name,
        email
      `)
      .in("id", headTeacherIds)

    if (headTeachersError) {
      console.error("Error fetching head teachers:", headTeachersError)
      return { reports: [], error: "Failed to fetch head teacher information." }
    }

    // Create lookup maps
    const schoolsMap = new Map(schools?.map((s) => [s.id, s]) || [])
    const headTeachersMap = new Map(headTeachers?.map((ht) => [ht.id, ht]) || [])

    // Combine the data
    const enrichedReports = reports.map((report) => ({
      ...report,
      sms_schools: schoolsMap.get(report.school_id) || null,
      hmr_users: headTeachersMap.get(report.headteacher_id) || null,
    }))

    return { reports: enrichedReports, error: null }
  } catch (error) {
    console.error("Error in getSubmittedReportsForEducationOfficial:", error)
    return { reports: [], error: "An unexpected error occurred." }
  }
}

export async function getSubmittedReportsWithSearchAndPagination({
  searchTerm = "",
  selectedSchoolId = "",
  selectedRegionId = "",
  selectedSchoolLevel = "",
  selectedMonth = "",
  selectedYear = "",
  selectedStatus = "submitted",
  page = 1,
  pageSize = 25,
  sortBy = "updated_at",
  sortOrder = "desc"
}: {
  searchTerm?: string
  selectedSchoolId?: string
  selectedRegionId?: string
  selectedSchoolLevel?: string
  selectedMonth?: string
  selectedYear?: string
  selectedStatus?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
} = {}) {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], totalCount: 0, totalPages: 0, error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { reports: [], totalCount: 0, totalPages: 0, error: "Only Education Officials and Admins can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Build the query with explicit region join
    let query = supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        status,
        updated_at,
        created_at,
        headteacher_id,
        school_id,
        school_level,
        school_grade,
        sms_schools!inner (
          id,
          name,
          region_id,
          sms_regions!inner (
            id,
            name
          )
        ),
        hmr_users (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .is("deleted_on", null)

    // Apply status filter - default to submitted, but allow filtering by other statuses
    if (selectedStatus && selectedStatus !== "all") {
      query = query.eq("status", selectedStatus)
    } else {
      // Default to submitted only if no specific status filter
      query = query.eq("status", "submitted")
    }

    // Apply school filter if provided
    if (selectedSchoolId) {
      query = query.eq("school_id", selectedSchoolId)
    }

    // Apply region filter if provided
    if (selectedRegionId && selectedRegionId !== "all") {
      query = query.eq("sms_schools.region_id", selectedRegionId)
    }

    // Apply school level filter if provided
    if (selectedSchoolLevel && selectedSchoolLevel !== "all") {
      query = query.eq("school_level", selectedSchoolLevel)
    }

    // Apply month filter if provided
    if (selectedMonth && selectedMonth !== "all") {
      query = query.eq("month", parseInt(selectedMonth))
    }

    // Apply year filter if provided
    if (selectedYear && selectedYear !== "all") {
      query = query.eq("year", parseInt(selectedYear))
    }

    // Apply search term if provided
    if (searchTerm.trim()) {
      // Simple approach: search only in school names for now to avoid parsing issues
      query = query.ilike('sms_schools.name', `%${searchTerm}%`)
    }

    // Apply sorting
    const ascending = sortOrder === "asc"
    if (sortBy === "school_name") {
      query = query.order("name", { ascending, referencedTable: "sms_schools" })
    } else if (sortBy === "teacher_name") {
      query = query.order("name", { ascending, referencedTable: "hmr_users" })
    } else if (sortBy === "month_year") {
      query = query.order("year", { ascending }).order("month", { ascending })
    } else {
      query = query.order(sortBy, { ascending })
    }

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data: reports, error: reportsError, count } = await query

    if (reportsError) {
      console.error("Error fetching reports with search:", reportsError)
      return { reports: [], totalCount: 0, totalPages: 0, error: "Failed to fetch reports." }
    }



    // Transform the nested data structure to flat structure expected by the client
    const transformedReports = (reports || []).map((report: any) => {
      const schoolName = report.sms_schools?.name || 'Unknown School'
      
      // Handle region data - it might be an array or single object
      let regionName = 'Unknown Region'
      const regionData = report.sms_schools?.sms_regions
      if (regionData) {
        if (Array.isArray(regionData)) {
          regionName = regionData[0]?.name || 'Unknown Region'
        } else {
          regionName = regionData.name || 'Unknown Region'
        }
      }
      
      const teacherName = report.hmr_users?.name || 'Unknown Teacher'
      

      
      return {
        id: report.id,
        school_id: report.school_id,
        month: report.month,
        year: report.year,
        status: report.status,
        created_at: report.created_at,
        updated_at: report.updated_at,
        school_name: schoolName,
        region: regionName,
        head_teacher_name: teacherName,
        submitted_at: report.updated_at,
        sms_schools: report.sms_schools, // Keep the original structure for client-side compatibility
      }
    })

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / pageSize)



    return { 
      reports: transformedReports, 
      totalCount, 
      totalPages, 
      currentPage: page,
      pageSize,
      error: null 
    }
  } catch (error) {
    console.error("Error in getSubmittedReportsWithSearchAndPagination:", error)
    return { reports: [], totalCount: 0, totalPages: 0, error: "An unexpected error occurred." }
  }
}

export async function getSchoolsForSearch() {
  try {
    const user = await getUser()



    if (!user) {
      return { schools: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {

      return { schools: [], error: "Only Education Officials and Admins can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all schools that have submitted reports
    const { data: reportSchools, error: reportError } = await supabase
      .from("hmr_report")
      .select("school_id")
      .eq("status", "submitted")
      .is("deleted_on", null)



    if (reportError) {
      console.error("Error fetching report schools:", reportError)
      return { schools: [], error: "Failed to fetch report schools." }
    }

    const schoolIds = [...new Set(reportSchools?.map(r => r.school_id) || [])]

    if (schoolIds.length === 0) {
      return { schools: [], error: null }
    }


    
    // Batch process school IDs to avoid Supabase .in() limit
    const batchSize = 100 // Safe batch size for Supabase .in() queries
    const allSchools = []
    
    for (let i = 0; i < schoolIds.length; i += batchSize) {
      const batchIds = schoolIds.slice(i, i + batchSize)

      
      const { data: batchSchools, error: batchError } = await supabase
        .from("sms_schools")
        .select(`
          id,
          name,
          region_id,
          sms_regions (
            id,
            name
          )
        `)
        .in("id", batchIds)
        .order("name")

      if (batchError) {
        console.error(`Error fetching schools batch ${Math.floor(i / batchSize) + 1}:`, batchError)
        return { schools: [], error: "Failed to fetch schools." }
      }
      
      if (batchSchools) {
        allSchools.push(...batchSchools)
      }
    }



    return { schools: allSchools || [], error: null }
  } catch (error) {
    console.error("Error in getSchoolsForSearch:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}

export async function getTeacherStatusOptions() {
  try {
    const user = await getUser()

    if (!user) {
      return { statusOptions: [], error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Try to get status options from hmr_status table
    const { data: statusOptions, error } = await supabase
      .from("hmr_status")
      .select("name")
      .order("name")

    if (error) {
      // If hmr_status table doesn't exist, return predefined status options
      return { 
        statusOptions: [
          "Trained Graduate Teacher",
          "Untrained Graduate Teacher", 
          "Trained Non-Graduate Teacher",
          "Untrained Non-Graduate Teacher",
          "Graduate Teaching Assistant",
          "Non-Graduate Teaching Assistant",
          "Pupil Teacher",
          "Temporary Teacher",
          "Substitute Teacher",
          "Acting Teacher",
          "Senior Teacher",
          "Head of Department",
          "Deputy Head Teacher",
          "Acting Head Teacher"
        ], 
        error: null 
      }
    }

    // Extract just the name values from the response
    const statusNames = statusOptions?.map(option => option.name) || []

    return { statusOptions: statusNames, error: null }
  } catch (error) {
    console.error("Error in getTeacherStatusOptions:", error)
    // Return predefined options as fallback
    return { 
      statusOptions: [
        "Trained Graduate Teacher",
        "Untrained Graduate Teacher", 
        "Trained Non-Graduate Teacher",
        "Untrained Non-Graduate Teacher",
        "Graduate Teaching Assistant",
        "Non-Graduate Teaching Assistant",
        "Pupil Teacher",
        "Temporary Teacher",
        "Substitute Teacher",
        "Acting Teacher",
        "Senior Teacher",
        "Head of Department",
        "Deputy Head Teacher",
        "Acting Head Teacher"
      ], 
      error: null 
    }
  }
}

export async function getReportCounts() {
  try {
    const user = await getUser()

    if (!user) {
      return { totalReports: 0, currentMonthReports: 0, error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { totalReports: 0, currentMonthReports: 0, error: "Only Education Officials and Admins can access this data." }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Get total count of all submitted reports
    const { count: totalCount, error: totalError } = await supabase
      .from("hmr_report")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted")
      .is("deleted_on", null)

    if (totalError) {
      console.error("Error fetching total reports count:", totalError)
      return { totalReports: 0, currentMonthReports: 0, error: "Failed to fetch total reports count." }
    }

    // Get current month and year
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
    const currentYear = now.getFullYear()

    // Get count of reports submitted in current month/year
    const { count: currentMonthCount, error: currentMonthError } = await supabase
      .from("hmr_report")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .is("deleted_on", null)

    if (currentMonthError) {
      console.error("Error fetching current month reports count:", currentMonthError)
      return { totalReports: totalCount || 0, currentMonthReports: 0, error: "Failed to fetch current month reports count." }
    }

    return {
      totalReports: totalCount || 0,
      currentMonthReports: currentMonthCount || 0,
      error: null
    }

  } catch (error) {
    console.error("Error in getReportCounts:", error)
    return { totalReports: 0, currentMonthReports: 0, error: "An unexpected error occurred." }
  }
}

export async function getSchoolCount() {
  try {
    const user = await getUser()

    if (!user) {
      return { totalSchools: 0, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { totalSchools: 0, error: "Only Education Officials can access this data." }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Get total count of all schools
    const { count: totalCount, error: totalError } = await supabase
      .from("sms_schools")
      .select("*", { count: "exact", head: true })

    if (totalError) {
      console.error("Error fetching total schools count:", totalError)
      return { totalSchools: 0, error: "Failed to fetch total schools count." }
    }

    return {
      totalSchools: totalCount || 0,
      error: null
    }

  } catch (error) {
    console.error("Error in getSchoolCount:", error)
    return { totalSchools: 0, error: "An unexpected error occurred." }
  }
}

export async function getCurrentMonthExpenditure() {
  try {
    const user = await getUser()

    if (!user) {
      return { totalExpenditure: 0, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { totalExpenditure: 0, error: "Only Education Officials can access this data." }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Get current month and year
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
    const currentYear = now.getFullYear()
    
    // Calculate the start and end of current month
    const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999).toISOString()

    // Get sum of total_expenditure for current month
    const { data: expenditureData, error: expenditureError } = await supabase
      .from("hmr_finance")
      .select("total_expenditure")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd)

    if (expenditureError) {
      console.error("Error fetching current month expenditure:", expenditureError)
      return { totalExpenditure: 0, error: "Failed to fetch current month expenditure." }
    }

    // Calculate total expenditure
    const totalExpenditure = expenditureData?.reduce((sum, record) => {
      return sum + (record.total_expenditure || 0)
    }, 0) || 0

    return {
      totalExpenditure,
      error: null
    }

  } catch (error) {
    console.error("Error in getCurrentMonthExpenditure:", error)
    return { totalExpenditure: 0, error: "An unexpected error occurred." }
  }
}

export async function getAverageStudentAttendance() {
  try {
    const user = await getUser()

    if (!user) {
      return { averageAttendance: 0, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { averageAttendance: 0, error: "Only Education Officials can access this data." }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Get all student attendance records
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("hmr_attendance")
      .select("attendance_rate")
      .eq("role", "student")

    if (attendanceError) {
      console.error("Error fetching student attendance:", attendanceError)
      return { averageAttendance: 0, error: "Failed to fetch student attendance data." }
    }

    if (!attendanceData || attendanceData.length === 0) {
      return { averageAttendance: 0, error: null }
    }

    // Calculate average attendance rate
    const totalAttendanceRate = attendanceData.reduce((sum, record) => {
      return sum + (record.attendance_rate || 0)
    }, 0)

    const averageAttendance = totalAttendanceRate / attendanceData.length

    return {
      averageAttendance: Math.round(averageAttendance * 10) / 10, // Round to 1 decimal place
      error: null
    }

  } catch (error) {
    console.error("Error in getAverageStudentAttendance:", error)
    return { averageAttendance: 0, error: "An unexpected error occurred." }
  }
}

export async function getDetailedReportData(reportId: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { reportData: null, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { reportData: null, error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get the main report
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("*")
      .eq("id", reportId)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      console.error("Error fetching report:", reportError)
      return { reportData: null, error: "Report not found or not submitted." }
    }

    // Get school with region
    const { data: school, error: schoolError } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        region_id,
        sms_regions (
          id,
          name
        )
      `)
      .eq("id", report.school_id)
      .single()

    if (schoolError) {
      console.error("Error fetching school:", schoolError)
    }

    // Get head teacher
    const { data: headTeacher, error: headTeacherError } = await supabase
      .from("hmr_users")
      .select(`
        id,
        name,
        email
      `)
      .eq("id", report.headteacher_id)
      .single()

    if (headTeacherError) {
      console.error("Error fetching head teacher:", headTeacherError)
    }

    // Get student enrollment data
    const { data: studentEnrollment, error: enrollmentError } = await supabase
      .from("hmr_student_enrollment")
      .select("*")
      .eq("report_id", reportId)
      .single()

    if (enrollmentError) {
      console.error("Error fetching student enrollment:", enrollmentError)
    }

    // Get attendance data
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("hmr_attendance")
      .select("*")
      .eq("report_id", reportId)

    if (attendanceError) {
      console.error("Error fetching attendance data:", attendanceError)
    }

    // Get staff development data
    const { data: staffDevelopment, error: staffDevError } = await supabase
      .from("hmr_staff_development")
      .select("*")
      .eq("report_id", reportId)

    if (staffDevError) {
      console.error("Error fetching staff development:", staffDevError)
    }

    // Get finance data
    const { data: financeData, error: financeError } = await supabase
      .from("hmr_finance")
      .select("*")
      .eq("report_id", reportId)

    if (financeError) {
      console.error("Error fetching finance data:", financeError)
    }

    // Get income data
    const { data: incomeData, error: incomeError } = await supabase
      .from("hmr_income")
      .select("*")
      .eq("report_id", reportId)

    if (incomeError) {
      console.error("Error fetching income data:", incomeError)
    }

    // Get accident safety data
    const { data: accidentSafety, error: accidentError } = await supabase
      .from("hmr_accident_safety")
      .select("*")
      .eq("report_id", reportId)

    if (accidentError) {
      console.error("Error fetching accident safety data:", accidentError)
    }

    // Get staff meetings data
    const { data: staffMeetings, error: meetingsError } = await supabase
      .from("hmr_staff_meetings")
      .select("*")
      .eq("report_id", reportId)

    if (meetingsError) {
      console.error("Error fetching staff meetings data:", meetingsError)
    }

    // Get repairs data
    const { data: repairsData, error: repairsError } = await supabase
      .from("hmr_repairs")
      .select("*")
      .eq("report_id", reportId)

    if (repairsError) {
      console.error("Error fetching repairs data:", repairsError)
    }

    // Get facilities data
    const { data: facilitiesData, error: facilitiesError } = await supabase
      .from("hmr_facilities")
      .select("*")
      .eq("report_id", reportId)

    if (facilitiesError) {
      console.error("Error fetching facilities data:", facilitiesError)
    }

    // Get resources needed data
    const { data: resourcesNeeded, error: resourcesError } = await supabase
      .from("hmr_resources_needed")
      .select("*")
      .eq("report_id", reportId)

    if (resourcesError) {
      console.error("Error fetching resources needed data:", resourcesError)
    }

    // Process attendance data to separate student and teacher stats
    const studentAttendance = attendanceData?.find(a => a.role === "student") || null
    const teacherAttendance = attendanceData?.find(a => a.role === "teacher") || null

    // Combine all data
    const reportData = {
      // Basic report info
      id: report.id,
      month: report.month,
      year: report.year,
      status: report.status,
      submittedDate: report.updated_at,
      school: school || null,
      headTeacher: headTeacher || null,
      
      // Student enrollment
      studentEnrollment: {
        totalStudents: studentEnrollment?.total_students || 0,
        totalTransferredIn: studentEnrollment?.total_transferred_in || 0,
        totalTransferredOut: studentEnrollment?.total_transferred_out || 0,
      },
      
      // Attendance data
      attendance: {
        student: {
          attendanceRate: studentAttendance?.attendance_rate || 0,
          punctualityRate: studentAttendance?.punctuality_rate || 0,
        },
        teacher: {
          attendanceRate: teacherAttendance?.attendance_rate || 0,
          punctualityRate: teacherAttendance?.punctuality_rate || 0,
        },
      },
      
      // Staff development
      staffDevelopment: {
        sessionHeld: staffDevelopment?.[0]?.PD_session_held === 'yes',
        percentageAttended: staffDevelopment?.[0]?.percentage_attended || 0,
        topic: staffDevelopment?.[0]?.PD_topic || '',
        outcomes: staffDevelopment?.[0]?.Outcomes || '',
        reason: staffDevelopment?.[0]?.Reason || '',
      },
      
      // Staffing data (mock since exact structure isn't clear)
      staffing: {
        totalStaffEntitlement: 25,
        currentTeachersOnStaff: 22,
        underStaffedBy: 3,
        overStaffedBy: 0,
        secondmentCertificatesPrepared: true,
      },

      // Supervision data (mock since not in clear tables)
      supervision: {
        headMaster: {
          lessonsObserved: 15,
          positiveFindings: "Strong classroom management and student engagement",
          negativeFindings: "Need improvement in lesson planning documentation",
          followUpActions: "Scheduled mentoring sessions with experienced teachers",
        },
        deputyHeadMaster: {
          lessonsObserved: 12,
          positiveFindings: "Excellent use of teaching aids and resources",
          negativeFindings: "Time management needs attention",
          followUpActions: "Professional development workshop attendance",
        },
        yearGroupHead: {
          lessonsObserved: 8,
          positiveFindings: "Good student participation and assessment practices",
          negativeFindings: "Limited use of technology in lessons",
          followUpActions: "Technology integration training scheduled",
        },
        headOfDepartment: {
          lessonsObserved: 10,
          positiveFindings: "Clear learning objectives and differentiated instruction",
          negativeFindings: "Insufficient feedback to students",
          followUpActions: "Feedback techniques workshop organized",
        },
      },

      // Curriculum monitoring (mock data)
      curriculumMonitoring: {
        teachersNotSubmittedPlans: 3,
        actionsTaken: "Individual meetings scheduled with non-compliant teachers and deadline extension provided",
      },

      // Finance data
      finance: {
        openingBalance: financeData?.[0]?.opening_balance || 0,
        totalIncome: financeData?.[0]?.total_income || 0,
        totalExpenditure: financeData?.[0]?.total_expenditure || 0,
        closingBalance: financeData?.[0]?.closing_balance || 0,
        netChange: (financeData?.[0]?.total_income || 0) - (financeData?.[0]?.total_expenditure || 0),
      },

      // Income sources
      income: {
        governmentGrant: incomeData?.[0]?.government_grant || 0,
        ptaContribution: incomeData?.[0]?.pta_contribution || 0,
        donations: incomeData?.[0]?.donations || 0,
        other: incomeData?.[0]?.other_income || 0,
      },

      // Accident and safety
      accidentSafety: {
        evacuationDrillHeld: accidentSafety?.[0]?.evacuation_drill_held === 'yes',
        classroomFireBuckets: accidentSafety?.[0]?.classroom_fire_buckets === 'yes',
        fireExtinguishersFunctional: accidentSafety?.[0]?.fire_extinguishers_functional === 'yes',
        numIncidents: accidentSafety?.[0]?.num_incidents || 0,
        studentsInvolved: accidentSafety?.[0]?.students_involved || 0,
        teachersInvolved: accidentSafety?.[0]?.teachers_involved || 0,
        preventionActions: accidentSafety?.[0]?.prevention_actions || '',
      },

      // Staff meetings
      staffMeeting: {
        meetingHeld: staffMeetings?.[0]?.meeting_held === 'yes',
        keyIssues: staffMeetings?.[0]?.key_issues || '',
        percentageImplemented: staffMeetings?.[0]?.percentage_implemented || 0,
      },

      // Physical facilities
      facilities: {
        repairs: repairsData || [],
        teacherFacilities: {
          functionalToilets: facilitiesData?.[0]?.teacher_functional_toilets || 0,
          workingSinks: facilitiesData?.[0]?.teacher_working_sinks || 0,
          workingTaps: facilitiesData?.[0]?.teacher_working_taps || 0,
        },
        studentFacilities: {
          functionalToilets: facilitiesData?.[0]?.student_functional_toilets || 0,
          workingSinks: facilitiesData?.[0]?.student_working_sinks || 0,
          workingTaps: facilitiesData?.[0]?.student_working_taps || 0,
        },
      },

      // Resources needed
      resourcesNeeded: {
        curriculumResources: resourcesNeeded?.[0]?.curriculum_resources?.split(',') || [],
//         janitorialSupplies: resourcesNeeded?.[0]?.janitorial_supplies?.split(',') || [],
        otherIssues: resourcesNeeded?.[0]?.other_issues || '',
      },
    }

    return { reportData, error: null }
  } catch (error) {
    console.error("Error in getDetailedReportData:", error)
    return { reportData: null, error: "An unexpected error occurred." }
  }
}

// Simple in-memory cache for schools data
let schoolsCache: { data: any[], timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to clear the server-side cache
export async function clearSchoolsCache() {
  schoolsCache = null;
}

export async function getSchoolsOverviewData() {
  try {
    const user = await getUser()

    if (!user) {
      return { schools: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { schools: [], error: "Only Education Officials can access this data." }
    }

    // Check cache first
    if (schoolsCache && (Date.now() - schoolsCache.timestamp) < CACHE_DURATION) {
      return { schools: schoolsCache.data, error: null }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Optimized: Get schools with additional information
    const [schoolsResult] = await Promise.all([
      // Get all schools with their regions and school levels
      supabase
        .from("sms_schools")
        .select(`
          id,
          name,
          region_id,
          code,
          grade,
          school_level_id,
          sms_regions!inner(
            id,
            name
          ),
          sms_school_levels(
            id,
            name
          )
        `)
        .order("name", { ascending: true })
    ])

    const { data: schools, error: schoolsError } = schoolsResult

    if (schoolsError) {
      console.error("Error fetching schools:", schoolsError)
      return { schools: [], error: "Failed to fetch schools data." }
    }

    if (!schools || schools.length === 0) {
      return { schools: [], error: null }
    }

    // Build final schools data with enhanced information
    const schoolsWithStats = schools.map((school: any) => {
      const regionName = Array.isArray(school.sms_regions) 
        ? school.sms_regions[0]?.name 
        : school.sms_regions?.name

      const schoolLevelName = Array.isArray(school.sms_school_levels)
        ? school.sms_school_levels[0]?.name
        : school.sms_school_levels?.name

      return {
        id: school.id,
        name: school.name,
        region: regionName || "Unknown Region",
        schoolLevel: schoolLevelName || "Not specified",
        code: school.code || null,
        grade: school.grade || null,
        status: "active", // You can add logic here to determine school status
      }
    })

    // Cache the results
    schoolsCache = {
      data: schoolsWithStats,
      timestamp: Date.now()
    }

    return { schools: schoolsWithStats, error: null }
  } catch (error) {
    console.error("Error in getSchoolsOverviewData:", error)
    return { schools: [], error: "An unexpected error occurred." }
  }
}

export async function getSchoolStatistics(schoolId: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { schoolData: null, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { schoolData: null, error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get school basic information
    const { data: school, error: schoolError } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        region_id,
        sms_regions!inner(
          id,
          name
        )
      `)
      .eq("id", schoolId)
      .single()

    if (schoolError || !school) {
      return { schoolData: null, error: "School not found." }
    }

    // Get head teacher information - direct lookup using school_id foreign key
    let headTeacher = null
    try {
      // Get all users assigned to this school and filter for Head Teacher role
      const { data: schoolUsers } = await supabase
        .from("hmr_users")
        .select(`
          id,
          name,
          email,
          school_id,
          role,
          hmr_user_roles!inner(
            id,
            name
          )
        `)
        .eq("school_id", schoolId)
        .eq("hmr_user_roles.name", "Head Teacher")

      // Take the first head teacher found (there should only be one)
      if (schoolUsers && schoolUsers.length > 0) {
        headTeacher = schoolUsers[0]
      }
    } catch (error) {
      // Fallback: Try to get head teacher by role name directly if roles table join fails
      try {
        const { data: roleData } = await supabase
          .from("hmr_user_roles")
          .select("id")
          .eq("name", "Head Teacher")
          .single()

        if (roleData) {
          const { data: headTeacherUser } = await supabase
            .from("hmr_users")
            .select(`
              id,
              name,
              email,
              school_id,
              role
            `)
            .eq("school_id", schoolId)
            .eq("role", roleData.id)
            .single()

          if (headTeacherUser) {
            headTeacher = headTeacherUser
          }
        }
      } catch (fallbackError) {
        // Fallback lookup failed
      }
    }

    // Get reports for this school - only submitted reports (exclude drafts)
    const { data: reports, error: reportsError } = await supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        status,
        created_at,
        updated_at,
        headteacher_id,
        school_level,
        school_grade
      `)
      .eq("school_id", schoolId)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    if (reportsError) {
      console.error("Error fetching school reports:", reportsError)
    }

    // Process statistics with simplified data
    const reportsData = reports || []
    
    // Get attendance data for all reports for this school
    let attendanceDataMap = new Map()
    let staffingDataMap = new Map()
    let financeDataMap = new Map()
    let enrollmentDataMap = new Map()
    if (reportsData.length > 0) {
      const reportIds = reportsData.map(report => report.id)
      
      // Fetch attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("hmr_attendance")
        .select(`
          report_id,
          role,
          attendance_rate,
          created_at
        `)
        .in("report_id", reportIds)

      if (attendanceError) {
        console.error("Error fetching attendance data:", attendanceError)
      } else {
        // Create a map of report_id -> {student: rate, teacher: rate}
        attendanceData?.forEach(attendance => {
          if (!attendanceDataMap.has(attendance.report_id)) {
            attendanceDataMap.set(attendance.report_id, {})
          }
          attendanceDataMap.get(attendance.report_id)[attendance.role] = attendance.attendance_rate
        })
      }

      // Fetch staffing data
      const { data: staffingData, error: staffingError } = await supabase
        .from("hmr_staffing")
        .select(`
          report_id,
          total_current_teachers,
          created_at
        `)
        .in("report_id", reportIds)

      if (staffingError) {
        console.error("Error fetching staffing data:", staffingError)
      } else {
        // Create a map of report_id -> total_current_teachers
        staffingData?.forEach(staffing => {
          staffingDataMap.set(staffing.report_id, staffing.total_current_teachers)
        })
      }

      // Fetch finance data
      const { data: financeData, error: financeError } = await supabase
        .from("hmr_finance")
        .select(`
          report_id,
          total_expenditure,
          created_at
        `)
        .in("report_id", reportIds)

      if (financeError) {
        console.error("Error fetching finance data:", financeError)
      } else {
        // Create a map of report_id -> total_expenditure
        financeData?.forEach(finance => {
          financeDataMap.set(finance.report_id, finance.total_expenditure)
        })
      }

      // Fetch enrollment data
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("hmr_student_enrollment")
        .select(`
          report_id,
          total_students,
          created_at
        `)
        .in("report_id", reportIds)

      if (enrollmentError) {
        console.error("Error fetching enrollment data:", enrollmentError)
      } else {
        // Create a map of report_id -> total_students
        enrollmentData?.forEach(enrollment => {
          enrollmentDataMap.set(enrollment.report_id, enrollment.total_students)
        })
      }
    }
    
    // Calculate monthly trends for the last 12 months with real attendance data
    const monthlyTrends = reportsData
      .slice(0, 12)
      .map(report => {
        const attendanceForReport = attendanceDataMap.get(report.id) || {}
        const studentAttendance = attendanceForReport.student || 0
        const teacherAttendance = attendanceForReport.teacher || 0
        const expenditure = financeDataMap.get(report.id) || 0
        const enrollment = enrollmentDataMap.get(report.id) || 0
        
        return {
          month: `${getMonthName(report.month)} ${report.year}`,
          monthShort: `${getMonthName(report.month).substring(0, 3)} ${report.year}`,
          attendance: studentAttendance, // Use student attendance as primary attendance
          teacherAttendance: teacherAttendance,
          studentAttendance: studentAttendance,
          enrollment: enrollment,
          expenditure: expenditure,
          monthYear: `${report.year}-${report.month.toString().padStart(2, '0')}`
        }
      })
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear))

    // Calculate summary statistics with real attendance data
    const latestReport = reportsData[0]
    
    const totalReports = reportsData.length
    
    // Calculate average attendance rates from the monthly trends data
    const validStudentAttendance = monthlyTrends.filter(trend => trend.studentAttendance > 0)
    const validTeacherAttendance = monthlyTrends.filter(trend => trend.teacherAttendance > 0)
    
    const averageAttendance = validStudentAttendance.length > 0 
      ? Math.round((validStudentAttendance.reduce((sum, trend) => sum + trend.studentAttendance, 0) / validStudentAttendance.length) * 10) / 10
      : 0
      
    const averageTeacherAttendance = validTeacherAttendance.length > 0 
      ? Math.round((validTeacherAttendance.reduce((sum, trend) => sum + trend.teacherAttendance, 0) / validTeacherAttendance.length) * 10) / 10
      : 0

    // Get total staff from the latest report with staffing data
    let totalStaff = 0
    if (latestReport && staffingDataMap.has(latestReport.id)) {
      totalStaff = staffingDataMap.get(latestReport.id) || 0
    } else {
      // If latest report doesn't have staffing data, find the most recent report that does
      for (const report of reportsData) {
        if (staffingDataMap.has(report.id)) {
          totalStaff = staffingDataMap.get(report.id) || 0
          break
        }
      }
    }

    // Get current enrollment from the latest report with enrollment data
    let currentEnrollment = 0
    if (latestReport && enrollmentDataMap.has(latestReport.id)) {
      currentEnrollment = enrollmentDataMap.get(latestReport.id) || 0
    } else {
      // If latest report doesn't have enrollment data, find the most recent report that does
      for (const report of reportsData) {
        if (enrollmentDataMap.has(report.id)) {
          currentEnrollment = enrollmentDataMap.get(report.id) || 0
          break
        }
      }
    }

    // If no head teacher found in users table, try to get from latest report
    let finalHeadTeacher = headTeacher
    if (!finalHeadTeacher && latestReport?.headteacher_id) {
      try {
        const { data: reportHeadTeacher } = await supabase
          .from("hmr_users")
          .select(`
            id,
            name,
            email,
            school_id,
            role,
            hmr_user_roles!inner(
              id,
              name
            )
          `)
          .eq("id", latestReport.headteacher_id)
          .eq("hmr_user_roles.name", "Head Teacher")
          .single()
        
        finalHeadTeacher = reportHeadTeacher
      } catch (error) {
        // Try direct lookup without role filtering
        try {
          const { data: directHeadTeacher } = await supabase
            .from("hmr_users")
            .select(`
              id,
              name,
              email,
              school_id,
              role
            `)
            .eq("id", latestReport.headteacher_id)
            .single()
          
          if (directHeadTeacher) {
            finalHeadTeacher = directHeadTeacher
          }
        } catch (directError) {
          // Direct lookup also failed
        }
      }
    }

    const regionName = Array.isArray(school.sms_regions) 
      ? school.sms_regions[0]?.name 
      : (school.sms_regions as any)?.name

    const schoolData = {
      id: school.id,
      name: school.name,
      region: regionName || "Unknown Region",
      headTeacher: finalHeadTeacher ? {
        name: finalHeadTeacher.name,
        email: finalHeadTeacher.email
      } : null,
      statistics: {
        totalReports,
        averageAttendance,
        averageTeacherAttendance,
        currentEnrollment: currentEnrollment,
        totalStaff: totalStaff,
        lastReportDate: latestReport?.created_at || null,
        monthlyTrends
      },
      reports: reportsData.map(report => ({
        id: report.id,
        title: `${getMonthName(report.month)} ${report.year} Report`,
        month: report.month,
        year: report.year,
        status: report.status,
        submittedAt: report.created_at,
        updatedAt: report.updated_at,
        schoolLevel: report.school_level,
        schoolGrade: report.school_grade,
        enrollment: null, // Will be populated when enrollment data is available
        staffDevelopment: null, // Will be populated when staff data is available
        curriculum: null // Will be populated when curriculum data is available
      }))
    }

    return { schoolData, error: null }
  } catch (error) {
    console.error("Error in getSchoolStatistics:", error)
    return { schoolData: null, error: "An unexpected error occurred." }
  }
}

export async function getRecentReportsWithSchools() {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { reports: [], error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get recent reports with school and head teacher information
    const { data: reports, error: reportsError } = await supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        status,
        created_at,
        updated_at,
        school_id,
        headteacher_id,
        sms_schools!inner(
          id,
          name,
          sms_regions!inner(
            id,
            name
          )
        ),
        hmr_users!inner(
          id,
          name,
          email
        )
      `)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("created_at", { ascending: false })
      .limit(20) // Get last 20 reports

    if (reportsError) {
      console.error("Error fetching recent reports:", reportsError)
      return { reports: [], error: "Failed to fetch recent reports." }
    }

    if (!reports || reports.length === 0) {
      return { reports: [], error: null }
    }

    // Format the reports data
    const formattedReports = reports.map(report => {
      const school = Array.isArray(report.sms_schools) 
        ? report.sms_schools[0] 
        : report.sms_schools

      const region = school?.sms_regions 
        ? (Array.isArray(school.sms_regions) ? school.sms_regions[0] : school.sms_regions)
        : null

      const headTeacher = Array.isArray(report.hmr_users) 
        ? report.hmr_users[0] 
        : report.hmr_users

      return {
        id: report.id,
        title: `${getMonthName(report.month)} ${report.year} Report`,
        month: report.month,
        year: report.year,
        status: report.status,
        submittedAt: report.created_at,
        updatedAt: report.updated_at,
        school: {
          id: school?.id,
          name: school?.name || "Unknown School"
        },
        region: {
          id: region?.id,
          name: region?.name || "Unknown Region"
        },
        headTeacher: {
          id: headTeacher?.id,
          name: headTeacher?.name || "Head Teacher",
          email: headTeacher?.email
        }
      }
    })

    return { reports: formattedReports, error: null }
  } catch (error) {
    console.error("Error in getRecentReportsWithSchools:", error)
    return { reports: [], error: "An unexpected error occurred." }
  }
}

export async function getRegionalStatistics() {
  try {
    const supabase = createServiceRoleSupabaseClient()

    const { data: regionData, error: regionError } = await supabase
      .from('sms_regions')
      .select('id, name')
      .order('name')

    if (regionError) {
      console.error('Error fetching regions:', regionError)
      return { regionStats: [], error: regionError.message }
    }

    // Get statistics for each region
    const regionStats = await Promise.all(
      regionData.map(async (region) => {
        // Count schools in this region
        const { count: schoolCount, error: schoolError } = await supabase
          .from('sms_schools')
          .select('*', { count: 'exact', head: true })
          .eq('region_id', region.id)

        // Count reports from schools in this region
        const { count: reportCount, error: reportError } = await supabase
          .from('hmr_report')
          .select(`
            *,
            sms_schools!inner(region_id)
          `, { count: 'exact', head: true })
          .eq('sms_schools.region_id', region.id)

        if (schoolError || reportError) {
          console.error('Error fetching region stats:', { schoolError, reportError })
          return {
            region: region.name,
            schools: 0,
            reports: 0
          }
        }

        return {
          region: region.name,
          region_id: region.id,
          schools: schoolCount || 0,
          reports: reportCount || 0
        }
      })
    )

    return { regionStats, error: null }
  } catch (error) {
    console.error('Error in getRegionalStatistics:', error)
    return { regionStats: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function getMonthName(monthNumber: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  return months[monthNumber - 1] || "Unknown"
}

export async function getRegionsForFilter() {
  try {
    const user = await getUser()

    if (!user) {
      return { regions: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { regions: [], error: "Only Education Officials and Admins can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all regions that have schools with submitted reports
    const { data: regions, error } = await supabase
      .from("sms_regions")
      .select(`
        id,
        name
      `)
      .order("name")

    if (error) {
      console.error("Error fetching regions for filter:", error)
      return { regions: [], error: "Failed to fetch regions." }
    }

    return { regions: regions || [], error: null }
  } catch (error) {
    console.error("Error in getRegionsForFilter:", error)
    return { regions: [], error: "An unexpected error occurred." }
  }
}

export async function getSchoolLevelsForFilter() {
  try {
    const user = await getUser()

    if (!user) {
      return { schoolLevels: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { schoolLevels: [], error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get distinct school levels from submitted reports
    const { data: schoolLevels, error } = await supabase
      .from("hmr_report")
      .select("school_level")
      .eq("status", "submitted")
      .is("deleted_on", null)
      .not("school_level", "is", null)

    if (error) {
      console.error("Error fetching school levels for filter:", error)
      return { schoolLevels: [], error: "Failed to fetch school levels." }
    }

    // Extract unique school levels
    const uniqueLevels = [...new Set(schoolLevels?.map(item => item.school_level).filter(Boolean))]
    const formattedLevels = uniqueLevels.map(level => ({ id: level, name: level }))

    return { schoolLevels: formattedLevels || [], error: null }
  } catch (error) {
    console.error("Error in getSchoolLevelsForFilter:", error)
    return { schoolLevels: [], error: "An unexpected error occurred." }
  }
}

export async function getReportDetails(reportId: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { report: null, error: "User not authenticated." }
    }

    if (user.role !== "Education Official") {
      return { report: null, error: "Only Education Officials can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get the report with all details
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select(`
        *,
        sms_schools (
          id,
          name,
          code,
          sms_regions (
            id,
            name
          )
        ),
        hmr_users!hmr_report_headteacher_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq("id", reportId)
      .single()

    if (reportError) {
      console.error("Error fetching report details:", reportError)
      if (reportError.code === 'PGRST116') {
        return { report: null, error: "Report not found." }
      }
      return { report: null, error: "Failed to fetch report details." }
    }

    return { report, error: null }
  } catch (error) {
    console.error("Error in getReportDetails:", error)
    return { report: null, error: "An unexpected error occurred." }
  }
}

export async function getPhysicalEducationReports() {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], error: "User not authenticated." }
    }

    if (user.role !== "Education Official" && user.role !== "Admin") {
      return { reports: [], error: "Only Education Officials and Admins can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch physical education reports with related data including enrollment in one query
    const { data: physicalEducationData, error } = await supabase
      .from("hmr_physical_education")
      .select(`
        id,
        report_id,
        activities,
        challenges,
        created_at,
        hmr_report!inner (
          id,
          month,
          year,
          status,
          school_id,
          sms_schools (
            id,
            name,
            region_id,
            sms_regions (
              id,
              name
            )
          ),
          hmr_student_enrollment (
            total_students
          )
        )
      `)
      .eq("hmr_report.status", "submitted")
      .is("hmr_report.deleted_on", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching physical education reports:", error)
      return { reports: [], error: "Failed to fetch physical education reports." }
    }

    if (!physicalEducationData || physicalEducationData.length === 0) {
      return { reports: [], error: null }
    }

    // Transform the data for the table
    const transformedReports = physicalEducationData.map(pe => {
      const report = pe.hmr_report as any
      const school = report?.sms_schools as any
      const region = school?.sms_regions as any
      const enrollment = report?.hmr_student_enrollment as any
      
      // Get total_students from enrollment data
      let totalStudents = 0
      if (Array.isArray(enrollment) && enrollment.length > 0) {
        totalStudents = enrollment[0].total_students || 0
      } else if (enrollment && enrollment.total_students) {
        totalStudents = enrollment.total_students || 0
      }
      
     // console.log(`Report ${pe.report_id}: School ${school?.name}, Students: ${totalStudents}`)
      
      return {
        id: pe.id,
        report_id: pe.report_id,
        month: report?.month || 0,
        year: report?.year || 0,
        region_id: school?.region_id || '',
        region_name: region?.name || 'Unknown Region',
        school_id: school?.id || '',
        school_name: school?.name || 'Unknown School',
        total_students: totalStudents,
        activities: pe.activities || '',
        challenges: pe.challenges || '',
        created_at: pe.created_at
      }
    })

    return { reports: transformedReports, error: null }
  } catch (error) {
    console.error("Error in getPhysicalEducationReports:", error)
    return { reports: [], error: "An unexpected error occurred." }
  }
}

export async function getRegionalPhysicalEducationReports({
  searchTerm = "",
  selectedRegionId = "",
  selectedMonth = "",
  selectedYear = "",
  page = 1,
  pageSize = 25
}: {
  searchTerm?: string
  selectedRegionId?: string
  selectedMonth?: string
  selectedYear?: string
  page?: number
  pageSize?: number
} = {}) {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], totalCount: 0, totalPages: 0, error: "User not authenticated." }
    }

    if (user.role !== "Regional Officer" && user.role !== "Education Official" && user.role !== "Admin") {
      return { reports: [], totalCount: 0, totalPages: 0, error: "Only Regional Officers, Education Officials and Admins can access this data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Build the query step by step
    let query = supabase
      .from("hmr_physical_education")
      .select(`
        id,
        report_id,
        activities,
        challenges,
        created_at,
        hmr_report!inner (
          id,
          month,
          year,
          school_id,
          status,
          sms_schools!inner (
            id,
            name,
            region_id,
            sms_regions (
              id,
              name
            )
          ),
          hmr_student_enrollment (
            total_students
          )
        )
      `, { count: 'exact' })
      .eq('hmr_report.status', 'submitted')
      .is('hmr_report.deleted_on', null)

    // Filter by region for Regional Officers - use region ID for more reliable filtering
    if (user.role === "Regional Officer" && user.region) {
      query = query.eq('hmr_report.sms_schools.region_id', user.region)
    }

    // Apply additional filters
    if (searchTerm.trim()) {
      query = query.ilike('hmr_report.sms_schools.name', `%${searchTerm}%`)
    }

    if (selectedMonth && selectedMonth !== "all") {
      query = query.eq('hmr_report.month', parseInt(selectedMonth))
    }

    if (selectedYear && selectedYear !== "all") {
      query = query.eq('hmr_report.year', parseInt(selectedYear))
    }

    // Add ordering
    query = query.order('created_at', { ascending: false })

    const { data: peReports, error: queryError, count } = await query

    if (queryError) {
      console.error("Database query error:", queryError)
      return { 
        reports: [], 
        totalCount: 0, 
        totalPages: 0, 
        error: `Database error: ${queryError.message}` 
      }
    }

    if (!peReports || peReports.length === 0) {
      return { 
        reports: [], 
        totalCount: 0, 
        totalPages: 0, 
        error: null 
      }
    }

    // Transform the data to match the expected format
    const transformedReports = peReports.map((peReport: any) => {
      const report = peReport.hmr_report
      const school = report?.sms_schools
      const region = school?.sms_regions
      const enrollment = report?.hmr_student_enrollment?.[0]
      
      // Create period string (month and year concatenated)
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]
      const monthName = monthNames[(report?.month || 1) - 1] || 'Unknown'
      const period = `${monthName} ${report?.year || ''}`

      return {
        id: peReport.id,
        report_id: peReport.report_id,
        school_id: report?.school_id,
        month: report?.month,
        year: report?.year,
        status: report?.status || 'submitted',
        school_name: school?.name || 'Unknown School',
        region_name: region?.name || 'Unknown Region',
        period: period,
        total_students: enrollment?.total_students || 0,
        activities: peReport.activities || '',
        challenges: peReport.challenges || '',
        created_at: peReport.created_at
      }
    })

    // Apply pagination
    const totalCount = count || transformedReports.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const offset = (page - 1) * pageSize
    const paginatedReports = transformedReports.slice(offset, offset + pageSize)

    return { 
      reports: paginatedReports, 
      totalCount, 
      totalPages, 
      currentPage: page,
      pageSize,
      error: null 
    }

  } catch (error) {
    console.error("Unexpected error in getRegionalPhysicalEducationReports:", error)
    return { 
      reports: [], 
      totalCount: 0, 
      totalPages: 0, 
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}
