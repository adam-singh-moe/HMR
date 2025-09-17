"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getRegionalAttendanceData() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { attendanceData: [], error: "Only Regional Officers can access attendance data." }
    }

    if (!user.region) {
      return { attendanceData: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch attendance data by joining with reports and schools to filter by region
    const { data: attendanceData, error } = await supabase
      .from("hmr_attendance")
      .select(`
        *,
        hmr_report!inner(
          id,
          month,
          year,
          status,
          sms_schools!inner(
            id,
            name,
            region_id
          )
        )
      `)
      .eq("hmr_report.sms_schools.region_id", user.region)
      .eq("hmr_report.status", "submitted")
      .is("hmr_report.deleted_on", null)

    if (error) {
      console.error("Error fetching regional attendance data:", error)
      return { attendanceData: [], error: "Failed to fetch attendance data." }
    }

    if (!attendanceData || attendanceData.length === 0) {
      return { attendanceData: [], error: null }
    }

    // Process the data to calculate monthly averages
    const monthlyAttendance = processAttendanceData(attendanceData)

    return {
      attendanceData: monthlyAttendance,
      error: null
    }

  } catch (error) {
    console.error("Error in getRegionalAttendanceData:", error)
    return { attendanceData: [], error: "An unexpected error occurred while fetching attendance data." }
  }
}

// New function specifically for the line chart with both attendance and punctuality
export async function getRegionalAttendanceTrends() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { trendsData: [], error: "Only Regional Officers can access attendance trends." }
    }

    if (!user.region) {
      return { trendsData: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // First, let's get the report IDs for this region to debug the relationship
    const { data: debugReports, error: debugError } = await supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        status,
        sms_schools!inner(
          id,
          name,
          region_id
        )
      `)
      .eq("sms_schools.region_id", user.region)
      .eq("status", "submitted")
      .is("deleted_on", null)

    // Fetch attendance and punctuality data with report and school information
    const { data: attendanceData, error } = await supabase
      .from("hmr_attendance")
      .select(`
        attendance_rate,
        punctuality_rate,
        role,
        report_id,
        hmr_report!inner(
          id,
          month,
          year,
          status,
          sms_schools!inner(
            id,
            name,
            region_id
          )
        )
      `)
      .eq("hmr_report.sms_schools.region_id", user.region)
      .eq("hmr_report.status", "submitted")
      .is("hmr_report.deleted_on", null)
      .order("hmr_report(year)", { ascending: true })
      .order("hmr_report(month)", { ascending: true })

    if (error) {
      console.error("Error fetching regional attendance trends:", error)
      return { trendsData: [], error: "Failed to fetch attendance trends." }
    }

    if (!attendanceData || attendanceData.length === 0) {
      return { trendsData: [], error: null }
    }

    // Process the data to calculate monthly averages for the line chart
    const monthlyTrends = processAttendanceTrendsData(attendanceData)

    return {
      trendsData: monthlyTrends,
      error: null
    }

  } catch (error) {
    console.error("Error in getRegionalAttendanceTrends:", error)
    return { trendsData: [], error: "An unexpected error occurred while fetching attendance trends." }
  }
}

function processAttendanceData(rawData: any[]) {
  // Group data by month-year
  const monthlyGroups: { [key: string]: any[] } = {}
  
  rawData.forEach(record => {
    const report = record.hmr_report
    const monthYear = `${report.month}-${report.year}`
    
    if (!monthlyGroups[monthYear]) {
      monthlyGroups[monthYear] = []
    }
    monthlyGroups[monthYear].push(record)
  })

  // Calculate averages for each month
  const monthlyAverages = Object.entries(monthlyGroups).map(([monthYear, records]) => {
    const [month, year] = monthYear.split('-').map(Number)
    
    // Separate student and teacher records
    const studentRecords = records.filter(r => r.role === 'student')
    const teacherRecords = records.filter(r => r.role === 'teacher')
    
    // Calculate averages
    const studentAttendance = studentRecords.length > 0 
      ? Math.round(studentRecords.reduce((sum, r) => sum + (r.attendance_rate || 0), 0) / studentRecords.length)
      : 0
      
    const teacherAttendance = teacherRecords.length > 0
      ? Math.round(teacherRecords.reduce((sum, r) => sum + (r.attendance_rate || 0), 0) / teacherRecords.length)
      : 0

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthFull = new Date(year, month - 1).toLocaleString('default', { month: 'long' })

    return {
      month: monthNames[month - 1],
      monthFull,
      monthIndex: month - 1,
      year,
      studentAttendance,
      teacherAttendance,
      recordCount: records.length
    }
  })

  // Sort by year and month
  return monthlyAverages.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.monthIndex - b.monthIndex
  })
}

function processAttendanceTrendsData(rawData: any[]) {
  // Group data by month-year
  const monthlyGroups: { [key: string]: any[] } = {}
  
  rawData.forEach(record => {
    const report = record.hmr_report
    if (!report) {
      return
    }
    
    // Validate that month and year are valid numbers
    if (!report.month || !report.year || isNaN(report.month) || isNaN(report.year)) {
      return
    }
    
    const monthYear = `${report.month}-${report.year}`
    
    if (!monthlyGroups[monthYear]) {
      monthlyGroups[monthYear] = []
    }
    monthlyGroups[monthYear].push(record)
  })

  // Only process months that actually have data
  const monthlyTrends = Object.entries(monthlyGroups)
    .filter(([monthYear, records]) => records.length > 0) // Only include months with actual data
    .map(([monthYear, records]) => {
      const [month, year] = monthYear.split('-').map(Number)
      
      // Additional validation
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

      // Calculate punctuality averages
      const studentPunctuality = studentRecords.length > 0 
        ? Math.round(studentRecords.reduce((sum, r) => sum + (r.punctuality_rate || 0), 0) / studentRecords.length)
        : 0
        
      const teacherPunctuality = teacherRecords.length > 0
        ? Math.round(teacherRecords.reduce((sum, r) => sum + (r.punctuality_rate || 0), 0) / teacherRecords.length)
        : 0

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthFull = new Date(year, month - 1).toLocaleString('default', { month: 'long' })

      const result = {
        month: monthNames[month - 1],
        monthFull,
        monthYear: `${monthNames[month - 1]} ${year}`,
        monthIndex: month - 1,
        year,
        studentAttendance,
        teacherAttendance,
        studentPunctuality,
        teacherPunctuality,
        recordCount: records.length
      }
      
      return result
    })
    .filter(trend => trend !== null) // Remove any null entries from validation failures

  // Sort by year and month
  const sortedTrends = monthlyTrends.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.monthIndex - b.monthIndex
  })
  
  return sortedTrends
}
