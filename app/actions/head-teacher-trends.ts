"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getHeadTeacherDashboardTrends() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Head Teacher") {
      return { 
        enrollmentTrends: [],
        attendanceTrends: [],
        punctualityTrends: [],
        expenditureTrends: [],
        error: "Only Head Teachers can access this data." 
      }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get the current year
    const currentYear = new Date().getFullYear()
    
    // Get school ID from user
    const schoolId = user.school_id

    // console.log("Debug: User object:", { 
    //   id: user.id, 
    //   role: user.role, 
    //   school_id: user.school_id,
    //   email: user.email 
    // })

    if (!schoolId) {
     // console.log("Debug: No school_id found in user object")
      return { 
        enrollmentTrends: [],
        attendanceTrends: [],
        punctualityTrends: [],
        expenditureTrends: [],
        error: "No school associated with this user." 
      }
    }

   // console.log("Fetching trends for school:", schoolId, "year:", currentYear)

    // Simple query exactly like regional officer - get reports with attendance data
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("hmr_report")
      .select(`
        month,
        year,
        school_id,
        hmr_attendance!inner (
          role,
          attendance_rate,
          punctuality_rate
        )
      `)
      .eq("school_id", schoolId)
      .eq("year", currentYear)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("year", { ascending: true })
      .order("month", { ascending: true })

    // Get enrollment data
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("hmr_report")
      .select(`
        month,
        year,
        school_id,
        hmr_student_enrollment!inner (
          total_students
        )
      `)
      .eq("school_id", schoolId)
      .eq("year", currentYear)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("year", { ascending: true })
      .order("month", { ascending: true })

    // Get expenditure data
    const { data: expenditureData, error: expenditureError } = await supabase
      .from("hmr_report")
      .select(`
        month,
        year,
        school_id,
        hmr_finance!inner (
          total_expenditure
        )
      `)
      .eq("school_id", schoolId)
      .eq("year", currentYear)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("year", { ascending: true })
      .order("month", { ascending: true })

    // console.log("Data fetched:", { 
    //   attendanceRecords: attendanceData?.length || 0,
    //   enrollmentRecords: enrollmentData?.length || 0,
    //   expenditureRecords: expenditureData?.length || 0
    // })

    if (attendanceError || enrollmentError || expenditureError) {
      console.error("Error fetching data:", { attendanceError, enrollmentError, expenditureError })
      return { 
        enrollmentTrends: [],
        attendanceTrends: [],
        punctualityTrends: [],
        expenditureTrends: [],
        error: "Failed to fetch trends data." 
      }
    }

    // Process the data exactly like regional officer does
    const attendanceTrends = processAttendanceTrends(attendanceData || [])
    const punctualityTrends = processPunctualityTrends(attendanceData || [])
    const enrollmentTrends = processEnrollmentTrends(enrollmentData || [])
    const expenditureTrends = processExpenditureTrends(expenditureData || [])

    // console.log("Processed trends:", {
    //   attendanceCount: attendanceTrends.length,
    //   punctualityCount: punctualityTrends.length,
    //   enrollmentCount: enrollmentTrends.length,
    //   expenditureCount: expenditureTrends.length
    // })

    return { 
      enrollmentTrends,
      attendanceTrends,
      punctualityTrends,
      expenditureTrends,
      error: null 
    }

  } catch (error) {
    console.error("Error in getHeadTeacherDashboardTrends:", error)
    return { 
      enrollmentTrends: [],
      attendanceTrends: [],
      punctualityTrends: [],
      expenditureTrends: [],
      error: "An unexpected error occurred." 
    }
  }
}

function processAttendanceTrends(rawData: any[]) {
  // Group data by month-year
  const monthlyGroups: { [key: string]: any[] } = {}
  
  rawData.forEach(record => {
    const monthYear = `${record.month}-${record.year}`
    
    if (!monthlyGroups[monthYear]) {
      monthlyGroups[monthYear] = []
    }
    
    // Flatten the attendance records
    record.hmr_attendance.forEach((attendanceRecord: any) => {
      monthlyGroups[monthYear].push({
        ...attendanceRecord,
        month: record.month,
        year: record.year
      })
    })
  })

  // Calculate averages for each month
  const monthlyTrends = Object.entries(monthlyGroups)
    .map(([monthYear, records]) => {
      const [month, year] = monthYear.split('-').map(Number)
      
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return null
      }
      
      // Separate student and teacher records
      const studentRecords = records.filter(r => r.role === 'student')
      const teacherRecords = records.filter(r => r.role === 'teacher')
      
      // Calculate attendance averages
      const studentAttendance = studentRecords.length > 0 
        ? Math.round(studentRecords.reduce((sum, r) => sum + (r.attendance_rate || 0), 0) / studentRecords.length)
        : 0
        
      const teacherAttendance = teacherRecords.length > 0
        ? Math.round(teacherRecords.reduce((sum, r) => sum + (r.attendance_rate || 0), 0) / teacherRecords.length)
        : 0

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      return {
        month: monthNames[month - 1],
        monthIndex: month - 1,
        year,
        studentAttendance,
        teacherAttendance
      }
    })
    .filter(trend => trend !== null)

  // Sort by month
  return (monthlyTrends as any[]).sort((a, b) => (a?.monthIndex || 0) - (b?.monthIndex || 0))
}

function processPunctualityTrends(rawData: any[]) {
  // Same logic as attendance but for punctuality
  const monthlyGroups: { [key: string]: any[] } = {}
  
  rawData.forEach(record => {
    const monthYear = `${record.month}-${record.year}`
    
    if (!monthlyGroups[monthYear]) {
      monthlyGroups[monthYear] = []
    }
    
    record.hmr_attendance.forEach((attendanceRecord: any) => {
      monthlyGroups[monthYear].push({
        ...attendanceRecord,
        month: record.month,
        year: record.year
      })
    })
  })

  const monthlyTrends = Object.entries(monthlyGroups)
    .map(([monthYear, records]) => {
      const [month, year] = monthYear.split('-').map(Number)
      
      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return null
      }
      
      const studentRecords = records.filter(r => r.role === 'student')
      const teacherRecords = records.filter(r => r.role === 'teacher')
      
      const studentPunctuality = studentRecords.length > 0 
        ? Math.round(studentRecords.reduce((sum, r) => sum + (r.punctuality_rate || 0), 0) / studentRecords.length)
        : 0
        
      const teacherPunctuality = teacherRecords.length > 0
        ? Math.round(teacherRecords.reduce((sum, r) => sum + (r.punctuality_rate || 0), 0) / teacherRecords.length)
        : 0

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      return {
        month: monthNames[month - 1],
        monthIndex: month - 1,
        year,
        studentPunctuality,
        teacherPunctuality
      }
    })
    .filter(trend => trend !== null)

  return (monthlyTrends as any[]).sort((a, b) => (a?.monthIndex || 0) - (b?.monthIndex || 0))
}

function processEnrollmentTrends(rawData: any[]) {
  const monthlyData = rawData.map(record => {
    const month = record.month
    const year = record.year
    const enrollment = record.hmr_student_enrollment?.[0]?.total_students || 0
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return {
      month: monthNames[month - 1],
      monthIndex: month - 1,
      year,
      enrollment
    }
  })

  return monthlyData.sort((a, b) => a.monthIndex - b.monthIndex)
}

function processExpenditureTrends(rawData: any[]) {
  const monthlyData = rawData.map(record => {
    const month = record.month
    const year = record.year
    const expenditure = record.hmr_finance?.[0]?.total_expenditure || 0
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return {
      month: monthNames[month - 1],
      monthIndex: month - 1,
      year,
      expenditure
    }
  })

  return monthlyData.sort((a, b) => a.monthIndex - b.monthIndex)
}
