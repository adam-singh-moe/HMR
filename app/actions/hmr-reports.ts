"use server"

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"
import { revalidatePath } from "next/cache"

export async function createHmrReport(formData: FormData) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can submit reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Extract form data
    const schoolName = formData.get("schoolName") as string
    const educationDistrict = formData.get("educationDistrict") as string
    const schoolLevel = formData.get("schoolLevel") as string
    const schoolGrade = formData.get("schoolGrade") as string
    const month = formData.get("month") as string
    const year = formData.get("year") as string

    if (!schoolName || !educationDistrict || !schoolLevel || !schoolGrade || !month || !year) {
      return { error: "Please fill in all required fields." }
    }

    // Get school ID from school name
    const { data: school, error: schoolError } = await supabase
      .from("sms_schools")
      .select("id")
      .eq("name", schoolName)
      .single()

    if (schoolError || !school) {
      return { error: "School not found. Please select a valid school." }
    }

    // Get region ID from region name
    const { data: region, error: regionError } = await supabase
      .from("sms_regions")
      .select("id")
      .eq("name", educationDistrict)
      .single()

    if (regionError || !region) {
      return { error: "Education district not found. Please select a valid district." }
    }

    // Check if report already exists for this month/year/school
    const { data: existingReport } = await supabase
      .from("hmr_report")
      .select("id, status")
      .eq("school_id", school.id)
      .eq("month", Number.parseInt(month))
      .eq("year", Number.parseInt(year))
      .is("deleted_on", null)
      .single()

    if (existingReport) {
      if (existingReport.status === "submitted") {
        // Report already submitted for this month
        return {
          error:
            "A report has already been submitted for this month. You cannot create or edit reports for months that have already been submitted.",
          isSubmitted: true,
        }
      }
      // Return the existing draft report ID to continue editing
      return { success: true, reportId: existingReport.id, isExistingReport: true, status: existingReport.status }
    }

    // Create the report
    const { data: newReport, error: insertError } = await supabase
      .from("hmr_report")
      .insert({
        school_id: school.id,
        headteacher_id: user.id,
        month: Number.parseInt(month),
        year: Number.parseInt(year),
        region_id: region.id,
        school_level: schoolLevel,
        school_grade: schoolGrade,
        status: "draft",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return { error: "Failed to create report. Please try again." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true, reportId: newReport.id }
  } catch (error) {
    console.error("Error creating HMR report:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function updateHmrReport(reportId: string, formData: FormData) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can update reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Verify the report belongs to the current user (or user is admin)
    let reportQuery = supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      .is("deleted_on", null)

    // Only filter by headteacher_id for head teachers, admins can update any report
    if (user.role !== "Admin") {
      reportQuery = reportQuery.eq("headteacher_id", user.id)
    }

    const { data: report, error: reportError } = await reportQuery.single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to update it." }
    }

    // Update the report
    const { error: updateError } = await supabase
      .from("hmr_report")
      .update({
        updated_on: new Date().toISOString(),
      })
      .eq("id", reportId)

    if (updateError) {
      console.error("Update error:", updateError)
      return { error: "Failed to update report. Please try again." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error updating HMR report:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getHmrReports() {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], error: "User not authenticated." }
    }
    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // For Head Teachers, get all reports for their school
    if (user.role === "Head Teacher") {
      // First check if user has a school_id
      if (!user.school_id) {
        console.error("Head Teacher does not have a school_id assigned")
        return { reports: [], error: "No school assigned to this Head Teacher." }
      }

      const { data: reports, error } = await supabase
        .from("hmr_report")
        .select(`
          *,
          sms_schools:school_id (id, name)
        `)
        .eq("school_id", user.school_id)
        .eq("status", "submitted")
        .is("deleted_on", null)
        .order("created_at", { ascending: false })
      if (error) {
        console.error("Error fetching HMR reports:", error)
        return { reports: [], error: "Failed to fetch reports." }
      }
      return { reports: reports || [], error: null }
    }

    // For other roles (Regional Officer, Admin), use different logic
    let query = supabase
      .from("hmr_report")
      .select(`
        *,
        sms_schools:school_id (id, name)
      `)
      .is("deleted_on", null)
      .order("created_at", { ascending: false })

    if (user.role === "Regional Officer" && user.region) {
      query = query.eq("region_id", user.region)
    }
    // Admins can see all reports (no additional filter)

    const { data: reports, error } = await query

    if (error) {
      console.error("Error fetching HMR reports:", error)
      return { reports: [], error: "Failed to fetch reports." }
    }

    return { reports: reports || [], error: null }
  } catch (error) {
    console.error("Error in getHmrReports:", error)
    return { reports: [], error: "An unexpected error occurred." }
  }
}

export async function deleteHmrReport(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can delete reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to delete it." }
    }

    // Soft delete the report
    const { error: deleteError } = await supabase
      .from("hmr_report")
      .update({
        deleted_on: new Date().toISOString(),
        updated_on: new Date().toISOString(),
      })
      .eq("id", reportId)

    if (deleteError) {
      console.error("Delete error:", deleteError)
      return { error: "Failed to delete report. Please try again." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error deleting HMR report:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function saveStudentEnrollment(formData: FormData) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can update reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Extract form data
    const reportId = formData.get("reportId") as string
    const totalStudents = formData.get("totalStudents") as string
    const totalTransferredIn = formData.get("totalTransferredIn") as string
    const totalTransferredOut = formData.get("totalTransferredOut") as string
    if (!reportId) {
      return { error: "Report ID is required. Please start from the Basic Information section." }
    }

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()
    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to update it." }
    }

    // Check if student enrollment data already exists
    const { data: existingEnrollment } = await supabase
      .from("hmr_student_enrollment")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()
    const enrollmentData = {
      report_id: reportId,
      total_students: totalStudents ? Number.parseInt(totalStudents) : null,
      total_transferred_in: totalTransferredIn ? Number.parseInt(totalTransferredIn) : null,
      total_transferred_out: totalTransferredOut ? Number.parseInt(totalTransferredOut) : null,
    }
    if (existingEnrollment) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("hmr_student_enrollment")
        .update(enrollmentData)
        .eq("id", existingEnrollment.id)

      if (updateError) {
        console.error("Update error:", updateError)
        return { error: "Failed to update student enrollment data. Please try again." }
      }
    } else {
      // Create new record
      const { data: insertResult, error: insertError } = await supabase
        .from("hmr_student_enrollment")
        .insert(enrollmentData)
        .select()
      if (insertError) {
        console.error("Insert error:", insertError)
        return { error: "Failed to save student enrollment data. Please try again." }
      }
    }
    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error saving student enrollment:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getStudentEnrollment(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can view reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Verify the report belongs to the current user's school
    if (!user.school_id) {
      return { error: "No school assigned to this Head Teacher." }
    }

    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, school_id")
      .eq("id", reportId)
      .eq("school_id", user.school_id)
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to view it." }
    }

    // Get student enrollment data
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("hmr_student_enrollment")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle()

    if (enrollmentError) {
      console.error("Error fetching student enrollment:", enrollmentError)
      return { error: "Failed to fetch student enrollment data." }
    }

    return { success: true, data: enrollment }
  } catch (error) {
    console.error("Error getting student enrollment:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function saveAttendance(formData: FormData) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can update reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Extract form data
    const reportId = formData.get("reportId") as string
    const studentAttendanceRate = formData.get("studentAttendanceRate") as string
    const studentPunctualityRate = formData.get("studentPunctualityRate") as string
    const teacherAttendanceRate = formData.get("teacherAttendanceRate") as string
    const teacherPunctualityRate = formData.get("teacherPunctualityRate") as string
    if (!reportId) {
      return { error: "Report ID is required. Please start from the Basic Information section." }
    }

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()
    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to update it." }
    }

    // Delete existing attendance records for this report (using service role)
    const { error: deleteError } = await supabase.from("hmr_attendance").delete().eq("report_id", reportId)

    if (deleteError) {
      console.error("Error deleting existing attendance records:", deleteError)
      return { error: "Failed to update attendance data. Please try again." }
    }

    // Prepare attendance records
    const attendanceRecords = []

    // Add student attendance record if data provided
    if (studentAttendanceRate || studentPunctualityRate) {
      attendanceRecords.push({
        report_id: reportId,
        role: "student",
        attendance_rate: studentAttendanceRate ? Number.parseFloat(studentAttendanceRate) : null,
        punctuality_rate: studentPunctualityRate ? Number.parseFloat(studentPunctualityRate) : null,
      })
    }

    // Add teacher attendance record if data provided
    if (teacherAttendanceRate || teacherPunctualityRate) {
      attendanceRecords.push({
        report_id: reportId,
        role: "teacher",
        attendance_rate: teacherAttendanceRate ? Number.parseFloat(teacherAttendanceRate) : null,
        punctuality_rate: teacherPunctualityRate ? Number.parseFloat(teacherPunctualityRate) : null,
      })
    }
    // Insert new attendance records (using service role)
    if (attendanceRecords.length > 0) {
      const { data: insertResult, error: insertError } = await supabase
        .from("hmr_attendance")
        .insert(attendanceRecords)
        .select()
      if (insertError) {
        console.error("Insert error:", insertError)
        return { error: "Failed to save attendance data. Please try again." }
      }
    }
    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error saving attendance:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getAttendance(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can view reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Verify the report belongs to the current user's school
    if (!user.school_id) {
      return { error: "No school assigned to this Head Teacher." }
    }

    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, school_id")
      .eq("id", reportId)
      .eq("school_id", user.school_id)
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to view it." }
    }

    // Get attendance data
    const { data: attendance, error: attendanceError } = await supabase
      .from("hmr_attendance")
      .select("*")
      .eq("report_id", reportId)

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError)
      return { error: "Failed to fetch attendance data." }
    }

    // Separate student and teacher records
    const studentRecord = attendance?.find((record) => record.role === "student")
    const teacherRecord = attendance?.find((record) => record.role === "teacher")

    return {
      success: true,
      data: {
        student: studentRecord,
        teacher: teacherRecord,
      },
    }
  } catch (error) {
    console.error("Error getting attendance:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function saveStaffing(formData: FormData) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can update reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Extract form data
    const reportId = formData.get("reportId") as string
    const totalStaffEntitlement = formData.get("totalStaffEntitlement") as string
    const totalCurrentTeachers = formData.get("totalCurrentTeachers") as string
    const underStaffedBy = formData.get("underStaffedBy") as string
    const overStaffedBy = formData.get("overStaffedBy") as string
    const secondmentAttendanceCert = formData.get("secondmentAttendanceCert") as string
    const teacherStatusData = formData.get("teacherStatusData") as string
    if (!reportId) {
      return { error: "Report ID is required. Please start from the Basic Information section." }
    }

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to update it." }
    }

    // 1. Handle hmr_staffing table
    // Check if staffing data already exists
    const { data: existingStaffing } = await supabase
      .from("hmr_staffing")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()

    const staffingData = {
      report_id: reportId,
      total_staff_entitlement: totalStaffEntitlement ? Number.parseInt(totalStaffEntitlement) : null,
      total_current_teachers: totalCurrentTeachers ? Number.parseInt(totalCurrentTeachers) : null,
      under_staffed_by: underStaffedBy ? Number.parseInt(underStaffedBy) : null,
      over_staffed_by: overStaffedBy ? Number.parseInt(overStaffedBy) : null,
      secondment_attendance_cert: secondmentAttendanceCert === "true",
    }

    if (existingStaffing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("hmr_staffing")
        .update(staffingData)
        .eq("id", existingStaffing.id)

      if (updateError) {
        console.error("Staffing update error:", updateError)
        return { error: "Failed to update staffing data. Please try again." }
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase.from("hmr_staffing").insert(staffingData)

      if (insertError) {
        console.error("Staffing insert error:", insertError)
        return { error: "Failed to save staffing data. Please try again." }
      }
    }

    // 2. Handle hmr_teacher_status_updates table
    // Delete existing teacher status records for this report
    const { error: deleteError } = await supabase.from("hmr_teacher_status_updates").delete().eq("report_id", reportId)

    if (deleteError) {
      console.error("Error deleting existing teacher status records:", deleteError)
      return { error: "Failed to update teacher status data. Please try again." }
    }

    // Parse and insert new teacher status records
    if (teacherStatusData) {
      const teacherStatusRecords = JSON.parse(teacherStatusData)

      if (teacherStatusRecords.length > 0) {
        const { error: insertError } = await supabase.from("hmr_teacher_status_updates").insert(teacherStatusRecords)

        if (insertError) {
          console.error("Teacher status insert error:", insertError)
          return { error: "Failed to save teacher status data. Please try again." }
        }
      }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error saving staffing:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getStaffing(reportId: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // For Head Teachers, verify the report belongs to their school
    if (user.role === "Head Teacher") {
      if (!user.school_id) {
        return { error: "No school assigned to this Head Teacher." }
      }

      const { data: report, error: reportError } = await supabase
        .from("hmr_report")
        .select("id, school_id")
        .eq("id", reportId)
        .eq("school_id", user.school_id)
        .is("deleted_on", null)
        .single()

      if (reportError || !report) {
        return { error: "Report not found or you don't have permission to view it." }
      }
    } else if (!["Admin", "Super Admin", "Regional Officer", "Education Official"].includes(user.role)) {
      return { error: "You don't have permission to view this report." }
    }

    // Get staffing data
    const { data: staffing, error: staffingError } = await supabase
      .from("hmr_staffing")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle()

    if (staffingError) {
      console.error("Error fetching staffing:", staffingError)
      return { error: "Failed to fetch staffing data." }
    }

    // Get teacher status updates
    const { data: teacherStatusUpdates, error: teacherStatusError } = await supabase
      .from("hmr_teacher_status_updates")
      .select("*")
      .eq("report_id", reportId)

    if (teacherStatusError) {
      console.error("Error fetching teacher status updates:", teacherStatusError)
      return { error: "Failed to fetch teacher status data." }
    }

    // Group teacher status updates by category
    const teacherStatusByCategory = {
      leftSchool: teacherStatusUpdates?.filter((record) => record.category === "Left School").map(record => ({
        ...record,
        daysAbsent: record.days_absent,
        actionTaken: record.action_taken
      })) || [],
      specialLeave: teacherStatusUpdates?.filter((record) => record.category === "Special Leave").map(record => ({
        ...record,
        daysAbsent: record.days_absent,
        actionTaken: record.action_taken
      })) || [],
      assumedDuty: teacherStatusUpdates?.filter((record) => record.category === "Assumed Duty").map(record => ({
        ...record,
        daysAbsent: record.days_absent,
        actionTaken: record.action_taken
      })) || [],
      notReported: teacherStatusUpdates?.filter((record) => record.category === "Not Reported").map(record => ({
        ...record,
        daysAbsent: record.days_absent,
        actionTaken: record.action_taken
      })) || [],
      didNotReceiveSalary: teacherStatusUpdates?.filter((record) => record.category === "Did Not Receive Salary").map(record => ({
        ...record,
        daysAbsent: record.days_absent,
        actionTaken: record.action_taken
      })) || [],
    }

    return {
      success: true,
      data: {
        staffing: staffing,
        teacherStatusUpdates: teacherStatusByCategory,
      },
    }
  } catch (error) {
    console.error("Error getting staffing:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveStaffDevelopment(formData: FormData) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can update reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Extract form data
    const reportId = formData.get("reportId") as string
    const pdSessionHeld = formData.get("pdSessionHeld") as string
    const percentageAttended = formData.get("percentageAttended") as string
    const pdTopic = formData.get("pdTopic") as string
    const outcomes = formData.get("outcomes") as string
    const reason = formData.get("reason") as string

    if (!reportId) {
      return { error: "Report ID is required. Please start from the Basic Information section." }
    }

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to update it." }
    }

    // Check if staff development data already exists
    const { data: existingStaffDev } = await supabase
      .from("hmr_staff_development")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()

    const staffDevData = {
      report_id: reportId,
      PD_session_held: pdSessionHeld === "true" ? "yes" : pdSessionHeld === "false" ? "no" : null,
      percentage_attended: percentageAttended ? Number.parseFloat(percentageAttended) : null,
      PD_topic: pdTopic || null,
      Outcomes: outcomes || null,
      Reason: reason || null,
    }

    if (existingStaffDev) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("hmr_staff_development")
        .update(staffDevData)
        .eq("id", existingStaffDev.id)

      if (updateError) {
        console.error("Update error:", updateError)
        return { error: "Failed to update staff development data. Please try again." }
      }
    } else {
      // Create new record
      const { data: insertResult, error: insertError } = await supabase
        .from("hmr_staff_development")
        .insert(staffDevData)
        .select()

      if (insertError) {
        console.error("Insert error:", insertError)
        return { error: "Failed to save staff development data. Please try again." }
      }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error saving staff development:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function getStaffDevelopment(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can view reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Verify the report belongs to the current user's school
    if (!user.school_id) {
      return { error: "No school assigned to this Head Teacher." }
    }

    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, school_id")
      .eq("id", reportId)
      .eq("school_id", user.school_id)
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to view it." }
    }

    // Get staff development data
    const { data: staffDev, error: staffDevError } = await supabase
      .from("hmr_staff_development")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle()

    if (staffDevError) {
      console.error("Error fetching staff development:", staffDevError)
      return { error: "Failed to fetch staff development data." }
    }

    return { success: true, data: staffDev }
  } catch (error) {
    console.error("Error getting staff development:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function saveSupervision(formData: FormData) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can update reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Extract form data
    const reportId = formData.get("reportId") as string
    const hmLessonsObserved = formData.get("hmLessonsObserved") as string
    const hmPositiveFindings = formData.get("hmPositiveFindings") as string
    const hmNegativeFindings = formData.get("hmNegativeFindings") as string
    const hmFollowUpActions = formData.get("hmFollowUpActions") as string
    const dhmLessonsObserved = formData.get("dhmLessonsObserved") as string
    const dhmPositiveFindings = formData.get("dhmPositiveFindings") as string
    const dhmNegativeFindings = formData.get("dhmNegativeFindings") as string
    const dhmFollowUpActions = formData.get("dhmFollowUpActions") as string
    const groupHeadLessonsObserved = formData.get("groupHeadLessonsObserved") as string
    const groupHeadPositiveFindings = formData.get("groupHeadPositiveFindings") as string
    const groupHeadNegativeFindings = formData.get("groupHeadNegativeFindings") as string
    const groupHeadFollowUpActions = formData.get("groupHeadFollowUpActions") as string
    const hodLessonsObserved = formData.get("hodLessonsObserved") as string
    const hodPositiveFindings = formData.get("hodPositiveFindings") as string
    const hodNegativeFindings = formData.get("hodNegativeFindings") as string
    const hodFollowUpActions = formData.get("hodFollowUpActions") as string

    if (!reportId) {
      return { error: "Report ID is required. Please start from the Basic Information section." }
    }

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to update it." }
    }

    // Prepare supervision entries for the 4 roles
    const supervisionEntries = [
      {
        report_id: reportId,
        role: "Headmaster",
        lesson_observed: hmLessonsObserved ? Number.parseInt(hmLessonsObserved) : 0,
        positive_findings: hmPositiveFindings?.trim() || null,
        negative_findings: hmNegativeFindings?.trim() || null,
        follow_up_actions: hmFollowUpActions?.trim() || null,
      },
      {
        report_id: reportId,
        role: "Deputy HM",
        lesson_observed: dhmLessonsObserved ? Number.parseInt(dhmLessonsObserved) : 0,
        positive_findings: dhmPositiveFindings?.trim() || null,
        negative_findings: dhmNegativeFindings?.trim() || null,
        follow_up_actions: dhmFollowUpActions?.trim() || null,
      },
      {
        report_id: reportId,
        role: "Year Group Head/SM/Divisional Head",
        lesson_observed: groupHeadLessonsObserved ? Number.parseInt(groupHeadLessonsObserved) : 0,
        positive_findings: groupHeadPositiveFindings?.trim() || null,
        negative_findings: groupHeadNegativeFindings?.trim() || null,
        follow_up_actions: groupHeadFollowUpActions?.trim() || null,
      },
      {
        report_id: reportId,
        role: "Head of Department",
        lesson_observed: hodLessonsObserved ? Number.parseInt(hodLessonsObserved) : 0,
        positive_findings: hodPositiveFindings?.trim() || null,
        negative_findings: hodNegativeFindings?.trim() || null,
        follow_up_actions: hodFollowUpActions?.trim() || null,
      },
    ]

    // Delete existing entries for this report
    const { error: deleteError } = await supabase.from("hmr_supervision").delete().eq("report_id", reportId)

    if (deleteError) {
      console.error("Error deleting existing supervision entries:", deleteError)
      return { error: "Failed to update supervision data. Please try again." }
    }

    // Insert new entries
    const { error: insertError } = await supabase.from("hmr_supervision").insert(supervisionEntries)

    if (insertError) {
      console.error("Error inserting supervision entries:", insertError)
      return { error: "Failed to save supervision data. Please try again." }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error saving supervision:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getSupervision(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can view reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Verify the report belongs to the current user's school
    if (!user.school_id) {
      return { error: "No school assigned to this Head Teacher." }
    }

    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, school_id")
      .eq("id", reportId)
      .eq("school_id", user.school_id)
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to view it." }
    }

    // Get supervision data for all roles
    const { data: supervisionData, error: supervisionError } = await supabase
      .from("hmr_supervision")
      .select("*")
      .eq("report_id", reportId)

    if (supervisionError) {
      console.error("Error fetching supervision:", supervisionError)
      return { error: "Failed to fetch supervision data." }
    }

    // Transform the data back to the expected format
    const hmData = supervisionData?.find((s) => s.role === "Headmaster") || {}
    const dhmData = supervisionData?.find((s) => s.role === "Deputy HM") || {}
    const groupHeadData = supervisionData?.find((s) => s.role === "Year Group Head/SM/Divisional Head") || {}
    const hodData = supervisionData?.find((s) => s.role === "Head of Department") || {}

    const transformedData = {
      hmLessonsObserved: hmData.lesson_observed?.toString() || "",
      hmPositiveFindings: hmData.positive_findings || "",
      hmNegativeFindings: hmData.negative_findings || "",
      hmFollowUpActions: hmData.follow_up_actions || "",
      dhmLessonsObserved: dhmData.lesson_observed?.toString() || "",
      dhmPositiveFindings: dhmData.positive_findings || "",
      dhmNegativeFindings: dhmData.negative_findings || "",
      dhmFollowUpActions: dhmData.follow_up_actions || "",
      groupHeadLessonsObserved: groupHeadData.lesson_observed?.toString() || "",
      groupHeadPositiveFindings: groupHeadData.positive_findings || "",
      groupHeadNegativeFindings: groupHeadData.negative_findings || "",
      groupHeadFollowUpActions: groupHeadData.follow_up_actions || "",
      hodLessonsObserved: hodData.lesson_observed?.toString() || "",
      hodPositiveFindings: hodData.positive_findings || "",
      hodNegativeFindings: hodData.negative_findings || "",
      hodFollowUpActions: hodData.follow_up_actions || "",
    }

    return { success: true, data: transformedData }
  } catch (error) {
    console.error("Error getting supervision:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getCurrentMonthReport() {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can access reports." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get previous month and year (head teachers submit reports for the previous month)
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const reportMonth = previousMonth.getMonth() + 1 // JavaScript months are 0-indexed
    const reportYear = previousMonth.getFullYear()

    // Build query - filter by school for head teachers, no filter for admins
    let query = supabase
      .from("hmr_report")
      .select("*")
      .eq("month", reportMonth)
      .eq("year", reportYear)
      .is("deleted_on", null)

    // Head teachers can only see reports for their school
    if (user.role === "Head Teacher") {
      query = query.eq("headteacher_id", user.id)
    }

    const { data: existingReport, error: reportError } = await query.maybeSingle()

    if (reportError) {
      console.error("Error fetching current month report:", reportError)
      return { error: "Failed to check for existing report." }
    }

    return {
      success: true,
      report: existingReport,
      hasExistingReport: !!existingReport,
      status: existingReport?.status || "draft",
      isSubmitted: existingReport?.status === "submitted",
    }
  } catch (error) {
    console.error("Error in getCurrentMonthReport:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getReportProgress(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can access reports." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Verify the report belongs to the current user
    const { data: report, error: reportError } = await supabase
      .from("hmr_report")
      .select("id, headteacher_id")
      .eq("id", reportId)
      
      .is("deleted_on", null)
      .single()

    if (reportError || !report) {
      return { error: "Report not found or you don't have permission to view it." }
    }

    // Check which sections have data
    const sectionsCompleted = []

    // Section 0: Basic Info (always completed if report exists)
    sectionsCompleted.push(0)

    // Section 1: Student Enrollment
    const { data: enrollment } = await supabase
      .from("hmr_student_enrollment")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()
    if (enrollment) sectionsCompleted.push(1)

    // Section 2: Attendance
    const { data: attendance } = await supabase.from("hmr_attendance").select("id").eq("report_id", reportId).limit(1)
    if (attendance && attendance.length > 0) sectionsCompleted.push(2)

    // Section 3: Staffing
    const { data: staffing } = await supabase.from("hmr_staffing").select("id").eq("report_id", reportId).maybeSingle()
    if (staffing) sectionsCompleted.push(3)

    // Section 4: Staff Development
    const { data: staffDev } = await supabase
      .from("hmr_staff_development")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()
    if (staffDev) sectionsCompleted.push(4)

    // Section 5: Supervision
    const { data: supervision } = await supabase.from("hmr_supervision").select("id").eq("report_id", reportId).limit(1)
    if (supervision && supervision.length > 0) sectionsCompleted.push(5)

    // Section 6: Curriculum
    const { data: curriculum } = await supabase
      .from("hmr_curriculum")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()
    if (curriculum) sectionsCompleted.push(6)

    // Section 7: Finance
    const { data: finance } = await supabase.from("hmr_finance").select("id").eq("report_id", reportId).maybeSingle()
    if (finance) sectionsCompleted.push(7)

    // Section 8: Income Sources
    const { data: income } = await supabase.from("hmr_income").select("id").eq("report_id", reportId).limit(1)
    if (income && income.length > 0) sectionsCompleted.push(8)

    // Section 9: Accident & Safety
    const { data: accidentSafety } = await supabase
      .from("hmr_accident_safety")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()
    if (accidentSafety) sectionsCompleted.push(9)

    // Find the next incomplete section
    let nextSection = 0
    for (let i = 0; i < 13; i++) {
      // We have 13 sections total (0-12)
      if (!sectionsCompleted.includes(i)) {
        nextSection = i
        break
      }
    }

    return {
      success: true,
      completedSections: sectionsCompleted,
      nextIncompleteSection: nextSection,
    }
  } catch (error) {
    console.error("Error in getReportProgress:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveCurriculum(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const reportId = formData.get("reportId") as string
    const teachersNoLessonPlans = formData.get("teachersNoLessonPlans") as string
    const curriculumActionsTaken = formData.get("curriculumActionsTaken") as string

    if (!reportId) {
      return { error: "Report ID is required" }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if curriculum data already exists for this report
    const { data: existing } = await supabase
      .from("hmr_curriculum")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()

    const curriculumRecord = {
      report_id: reportId,
      teachers_no_lesson_plans: Number.parseInt(teachersNoLessonPlans) || 0,
      actions_taken: curriculumActionsTaken || "",
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase.from("hmr_curriculum").update(curriculumRecord).eq("id", existing.id)

      if (error) {
        console.error("Error updating curriculum:", error)
        return { error: "Failed to update curriculum data." }
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("hmr_curriculum").insert([curriculumRecord])

      if (error) {
        console.error("Error inserting curriculum:", error)
        return { error: "Failed to save curriculum data." }
      }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error in saveCurriculum:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getCurriculum(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: curriculum, error } = await supabase
      .from("hmr_curriculum")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching curriculum:", error)
      return { error: "Failed to fetch curriculum data." }
    }

    if (!curriculum) {
      return {
        success: true,
        data: {
          teachersNoLessonPlans: "",
          curriculumActionsTaken: "",
        },
      }
    }

    return {
      success: true,
      data: {
        teachersNoLessonPlans: curriculum.teachers_no_lesson_plans?.toString() || "",
        curriculumActionsTaken: curriculum.actions_taken || "",
      },
    }
  } catch (error) {
    console.error("Error in getCurriculum:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveFinance(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const reportId = formData.get("reportId") as string
    const openingBalance = formData.get("openingBalance") as string
    const totalIncome = formData.get("totalIncome") as string
    const totalExpenditure = formData.get("totalExpenditure") as string
    const closingBalance = formData.get("closingBalance") as string

    if (!reportId) {
      return { error: "Report ID is required" }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if finance data already exists for this report
    const { data: existing } = await supabase.from("hmr_finance").select("id").eq("report_id", reportId).maybeSingle()

    const financeRecord = {
      report_id: reportId,
      opening_balance: Number.parseFloat(openingBalance) || 0,
      total_income: Number.parseFloat(totalIncome) || 0,
      total_expenditure: Number.parseFloat(totalExpenditure) || 0,
      closing_balance: Number.parseFloat(closingBalance) || 0,
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase.from("hmr_finance").update(financeRecord).eq("id", existing.id)

      if (error) {
        console.error("Error updating finance:", error)
        return { error: "Failed to update finance data." }
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("hmr_finance").insert([financeRecord])

      if (error) {
        console.error("Error inserting finance:", error)
        return { error: "Failed to save finance data." }
      }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error in saveFinance:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getFinance(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: finance, error } = await supabase
      .from("hmr_finance")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching finance:", error)
      return { error: "Failed to fetch finance data." }
    }

    if (!finance) {
      return {
        success: true,
        data: {
          openingBalance: "",
          totalIncome: "",
          totalExpenditure: "",
          closingBalance: "",
        },
      }
    }

    return {
      success: true,
      data: {
        openingBalance: finance.opening_balance?.toString() || "",
        totalIncome: finance.total_income?.toString() || "",
        totalExpenditure: finance.total_expenditure?.toString() || "",
        closingBalance: finance.closing_balance?.toString() || "",
      },
    }
  } catch (error) {
    console.error("Error in getFinance:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveIncome(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const reportId = formData.get("reportId") as string
    const incomeSourcesData = formData.get("incomeSourcesData") as string

    if (!reportId) {
      return { error: "Report ID is required" }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Parse the income sources data
    const incomeSources = JSON.parse(incomeSourcesData || "[]")

    // Delete existing income records for this report
    await supabase.from("hmr_income").delete().eq("report_id", reportId)

    // Insert new income records
    if (incomeSources.length > 0) {
      const incomeRecords = incomeSources
        .filter((income: any) => income.source.trim() && income.amount.trim())
        .map((income: any) => ({
          report_id: reportId,
          source: income.source.trim(),
          amount: Number.parseFloat(income.amount) || 0,
        }))

      if (incomeRecords.length > 0) {
        const { error } = await supabase.from("hmr_income").insert(incomeRecords)

        if (error) {
          console.error("Error inserting income:", error)
          return { error: "Failed to save income data." }
        }
      }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error in saveIncome:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getIncome(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: income, error } = await supabase
      .from("hmr_income")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching income:", error)
      return { error: "Failed to fetch income data." }
    }

    if (!income || income.length === 0) {
      return {
        success: true,
        data: [{ source: "", amount: "" }],
      }
    }

    return {
      success: true,
      data: income.map((item) => ({
        source: item.source || "",
        amount: item.amount?.toString() || "",
      })),
    }
  } catch (error) {
    console.error("Error in getIncome:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function saveAccidentSafety(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const reportId = formData.get("reportId") as string
    const evacuationDrill = formData.get("evacuationDrill") as string
    const personsInvolvedDrill = formData.get("personsInvolvedDrill") as string
    const timeTakenDrill = formData.get("timeTakenDrill") as string
    const observationsDrill = formData.get("observationsDrill") as string
    const classroomFirebuckets = formData.get("classroomFirebuckets") as string
    const functionalFireExtinguishers = formData.get("functionalFireExtinguishers") as string
    const totalAccidents = formData.get("totalAccidents") as string
    const totalStudentsInvolved = formData.get("totalStudentsInvolved") as string
    const totalTeachersInvolved = formData.get("totalTeachersInvolved") as string
    const actions = formData.get("actions") as string

    if (!reportId) {
      return { error: "Report ID is required" }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if accident safety data already exists for this report
    const { data: existing } = await supabase
      .from("hmr_accident_safety")
      .select("id")
      .eq("report_id", reportId)
      .maybeSingle()

    const accidentSafetyRecord = {
      report_id: reportId,
      evacuation_drill: evacuationDrill === "" ? null : evacuationDrill,
      persons_involved_drill: Number.parseInt(personsInvolvedDrill) || 0,
      time_taken_drill: Number.parseInt(timeTakenDrill) || 0,
      observations_drill: observationsDrill || "",
      classroom_firebuckets: classroomFirebuckets === "" ? null : classroomFirebuckets,
      functional_fire_extinguishers: functionalFireExtinguishers === "" ? null : functionalFireExtinguishers,
      total_accidents: Number.parseInt(totalAccidents) || 0,
      total_students_involved: Number.parseInt(totalStudentsInvolved) || 0,
      total_teachers_involved: Number.parseInt(totalTeachersInvolved) || 0,
      actions: actions || "",
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase.from("hmr_accident_safety").update(accidentSafetyRecord).eq("id", existing.id)

      if (error) {
        console.error("Error updating accident safety:", error)
        return { error: "Failed to update accident safety data." }
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("hmr_accident_safety").insert([accidentSafetyRecord])

      if (error) {
        console.error("Error inserting accident safety:", error)
        return { error: "Failed to save accident safety data." }
      }
    }

    revalidatePath("/dashboard/head-teacher")
    return { success: true }
  } catch (error) {
    console.error("Error in saveAccidentSafety:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getAccidentSafety(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "Unauthorized" }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: accidentSafety, error } = await supabase
      .from("hmr_accident_safety")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching accident safety:", error)
      return { error: "Failed to fetch accident safety data." }
    }

    if (!accidentSafety) {
      return {
        success: true,
        data: {
          evacuationDrill: null,
          personsInvolvedDrill: "0",
          timeTakenDrill: "0",
          observationsDrill: "",
          classroomFirebuckets: null,
          functionalFireExtinguishers: null,
          totalAccidents: "0",
          totalStudentsInvolved: "0",
          totalTeachersInvolved: "0",
          actions: "",
        },
      }
    }

    return {
      success: true,
      data: {
        evacuationDrill: accidentSafety.evacuation_drill || null,
        personsInvolvedDrill: accidentSafety.persons_involved_drill?.toString() || "0",
        timeTakenDrill: accidentSafety.time_taken_drill?.toString() || "0",
        observationsDrill: accidentSafety.observations_drill || "",
        classroomFirebuckets: accidentSafety.classroom_firebuckets || null,
        functionalFireExtinguishers: accidentSafety.functional_fire_extinguishers || null,
        totalAccidents: accidentSafety.total_accidents?.toString() || "0",
        totalStudentsInvolved: accidentSafety.total_students_involved?.toString() || "0",
        totalTeachersInvolved: accidentSafety.total_teachers_involved?.toString() || "0",
        actions: accidentSafety.actions || "",
      },
    }
  } catch (error) {
    console.error("Error in getAccidentSafety:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Staff Meetings Functions
export async function saveStaffMeetings(
  reportId: string,
  staffMeetingsData: {
    generalMeetingHeld: boolean | null
    keyIssuesDiscussed: string
    decisionsImplemented: string
  },
) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can save staff meetings data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Convert boolean to yes/no/null for database
    const generalMeeting = staffMeetingsData.generalMeetingHeld === null ? null : 
      (staffMeetingsData.generalMeetingHeld ? "yes" : "no")
    const percentageDecisions = Number.parseFloat(staffMeetingsData.decisionsImplemented) || 0

    // Check if record already exists
    const { data: existingRecord } = await supabase
      .from("hmr_staff_meetings")
      .select("id")
      .eq("report_id", reportId)
      .single()

    let error
    if (existingRecord) {
      // Update existing record
      const result = await supabase
        .from("hmr_staff_meetings")
        .update({
          general_meeting: generalMeeting,
          key_issues: staffMeetingsData.keyIssuesDiscussed,
          percentage_decisions_implemented: percentageDecisions,
          updated_at: new Date().toISOString(),
        })
        .eq("report_id", reportId)

      error = result.error
    } else {
      // Insert new record
      const result = await supabase.from("hmr_staff_meetings").insert({
        report_id: reportId,
        general_meeting: generalMeeting,
        key_issues: staffMeetingsData.keyIssuesDiscussed,
        percentage_decisions_implemented: percentageDecisions,
      })

      error = result.error
    }

    if (error) {
      console.error("Error saving staff meetings data:", error)
      return { error: "Failed to save staff meetings data." }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error in saveStaffMeetings:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getStaffMeetings(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    const supabase = createServerSupabaseClient()

    const { data: staffMeetings, error } = await supabase
      .from("hmr_staff_meetings")
      .select("*")
      .eq("report_id", reportId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error getting staff meetings data:", error)
      return { error: "Failed to load staff meetings data." }
    }

    if (!staffMeetings) {
      // Return default values if no data exists
      return {
        success: true,
        data: {
          generalMeetingHeld: null,
          keyIssuesDiscussed: "",
          decisionsImplemented: "0",
        },
      }
    }

    return {
      success: true,
      data: {
        generalMeetingHeld: staffMeetings.general_meeting === null ? null :
          (staffMeetings.general_meeting === "yes" || staffMeetings.general_meeting === true || staffMeetings.general_meeting === 'true' ? true : false),
        keyIssuesDiscussed: staffMeetings.key_issues || "",
        decisionsImplemented: staffMeetings.percentage_decisions_implemented?.toString() || "0",
      },
    }
  } catch (error) {
    console.error("Error in getStaffMeetings:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Physical Facilities Functions
export async function savePhysicalFacilities(
  reportId: string,
  facilitiesData: {
    repairsNeeded: Array<{ area: string; details: string }>
    teacherToiletsFunctional: string
    teacherSinksFunctional: string
    teacherTapsFunctional: string
    studentToiletsFunctional?: string
    studentSinksFunctional: string
    studentTapsFunctional: string
    overcrowdedClassrooms?: string
  },
) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can save physical facilities data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // First, delete existing repairs for this report
    const { error: deleteRepairsError } = await supabase.from("hmr_repairs").delete().eq("report_id", reportId)

    if (deleteRepairsError) {
      console.error("Error deleting existing repairs:", deleteRepairsError)
      return { error: "Failed to update repairs data." }
    }

    // Insert new repairs data
    if (facilitiesData.repairsNeeded.length > 0) {
      const repairsToInsert = facilitiesData.repairsNeeded
        .filter((repair) => repair.area && repair.details) // Only insert non-empty repairs
        .map((repair) => ({
          report_id: reportId,
          repair_area: repair.area,
          details: repair.details,
        }))

      if (repairsToInsert.length > 0) {
        const { error: repairsError } = await supabase.from("hmr_repairs").insert(repairsToInsert)

        if (repairsError) {
          console.error("Error saving repairs data:", repairsError)
          return { error: "Failed to save repairs data." }
        }
      }
    }

    // Delete existing facilities data for this report
    const { error: deleteFacilitiesError } = await supabase.from("hmr_facilities").delete().eq("report_id", reportId)

    if (deleteFacilitiesError) {
      console.error("Error deleting existing facilities:", deleteFacilitiesError)
      return { error: "Failed to update facilities data." }
    }

    // Prepare facilities data to insert
    const facilitiesToInsert = []

    // Teacher facilities data
    const teacherPercentageWashroom = Number.parseFloat(facilitiesData.teacherToiletsFunctional) || 0
    const teacherPercentageSinks = Number.parseFloat(facilitiesData.teacherSinksFunctional) || 0
    const teacherPercentageTaps = Number.parseFloat(facilitiesData.teacherTapsFunctional) || 0

    facilitiesToInsert.push({
      report_id: reportId,
      role: "Teachers",
      percentage_functional_washroom: teacherPercentageWashroom,
      percentage_working_sinks: teacherPercentageSinks,
      percentage_working_taps: teacherPercentageTaps,
    })

    // Student facilities data
    const studentPercentageWashroom = Number.parseFloat(facilitiesData.studentToiletsFunctional || "0") || 0
    const studentPercentageSinks = Number.parseFloat(facilitiesData.studentSinksFunctional) || 0
    const studentPercentageTaps = Number.parseFloat(facilitiesData.studentTapsFunctional) || 0
    const overcrowdedClassroomsPercentage = Number.parseFloat(facilitiesData.overcrowdedClassrooms || "0") || 0

    facilitiesToInsert.push({
      report_id: reportId,
      role: "Students",
      percentage_functional_washroom: studentPercentageWashroom,
      percentage_working_sinks: studentPercentageSinks,
      percentage_working_taps: studentPercentageTaps,
      percentage_overcrowded_classroom: overcrowdedClassroomsPercentage,
    })

    // Insert facilities data
    const { error: facilitiesError } = await supabase.from("hmr_facilities").insert(facilitiesToInsert)

    if (facilitiesError) {
      console.error("Error saving facilities data:", facilitiesError)
      return { error: "Failed to save facilities data." }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error in savePhysicalFacilities:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getPhysicalFacilities(reportId: string) {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can view reports." }
    }

    const supabase = createServiceRoleSupabaseClient() // Use service role to bypass RLS

    // Get repairs data
    const { data: repairs, error: repairsError } = await supabase
      .from("hmr_repairs")
      .select("*")
      .eq("report_id", reportId)

    if (repairsError && repairsError.code !== "PGRST116") {
      console.error("Error getting repairs data:", repairsError)
      return { error: "Failed to load repairs data." }
    }

    // Get facilities data
    const { data: facilities, error: facilitiesError } = await supabase
      .from("hmr_facilities")
      .select("*")
      .eq("report_id", reportId)

    if (facilitiesError && facilitiesError.code !== "PGRST116") {
      console.error("Error getting facilities data:", facilitiesError)
      return { error: "Failed to load facilities data." }
    }

    // Process repairs data
    const repairsNeeded =
      repairs && repairs.length > 0
        ? repairs.map((repair) => ({
            area: repair.repair_area,
            details: repair.details,
          }))
        : [{ area: "", details: "" }]

    // Process facilities data
    const teacherFacilities = facilities?.find((f) => f.role === "Teachers")
    const studentFacilities = facilities?.find((f) => f.role === "Students")

    return {
      success: true,
      data: {
        repairsNeeded,
        teacherToiletsFunctional: teacherFacilities?.percentage_functional_washroom?.toString() || "",
        teacherSinksFunctional: teacherFacilities?.percentage_working_sinks?.toString() || "",
        teacherTapsFunctional: teacherFacilities?.percentage_working_taps?.toString() || "",
        studentToiletsFunctional: studentFacilities?.percentage_functional_washroom?.toString() || "",
        studentSinksFunctional: studentFacilities?.percentage_working_sinks?.toString() || "",
        studentTapsFunctional: studentFacilities?.percentage_working_taps?.toString() || "",
        overcrowdedClassrooms: studentFacilities?.percentage_overcrowded_classroom?.toString() || "",
      },
    }
  } catch (error) {
    console.error("Error in getPhysicalFacilities:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Resources Needed Functions
export async function saveResourcesNeeded(
  reportId: string,
  resourcesData: {
    curriculumResources: string
    janitorialSupplies: string
    otherIssues: string
  },
) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can save resources needed data." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from("hmr_resources_needed")
      .select("id")
      .eq("report_id", reportId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing resources needed record:", checkError)
      return { error: "Failed to check existing resources needed data." }
    }

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from("hmr_resources_needed")
        .update({
          curriculum_resources: resourcesData.curriculumResources,
          janitorial_supplies: resourcesData.janitorialSupplies,
          issues: resourcesData.otherIssues,
          updated_at: new Date().toISOString(),
        })
        .eq("report_id", reportId)

      if (error) {
        console.error("Error updating resources needed data:", error)
        return { error: "Failed to update resources needed data." }
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("hmr_resources_needed").insert({
        report_id: reportId,
        curriculum_resources: resourcesData.curriculumResources,
        janitorial_supplies: resourcesData.janitorialSupplies,
        issues: resourcesData.otherIssues,
      })

      if (error) {
        console.error("Error inserting resources needed data:", error)
        return { error: "Failed to save resources needed data." }
      }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error in saveResourcesNeeded:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getResourcesNeeded(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    const supabase = createServerSupabaseClient()

    const { data: resourcesNeeded, error } = await supabase
      .from("hmr_resources_needed")
      .select("*")
      .eq("report_id", reportId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error getting resources needed data:", error)
      return { error: "Failed to load resources needed data." }
    }

    if (!resourcesNeeded) {
      // Return default values if no data exists
      return {
        success: true,
        data: {
          curriculumResources: "",
          janitorialSupplies: "",
          otherIssues: "",
        },
      }
    }

    return {
      success: true,
      data: {
        curriculumResources: resourcesNeeded.curriculum_resources || "",
        janitorialSupplies: resourcesNeeded.janitorial_supplies || "",
        otherIssues: resourcesNeeded.issues || "",
      },
    }
  } catch (error) {
    console.error("Error in getResourcesNeeded:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Physical Education Functions
export async function savePhysicalEducation(formData: FormData) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can save physical education data." }
    }

    const reportId = formData.get("reportId") as string
    const activities = formData.get("activities") as string
    const challenges = formData.get("challenges") as string

    if (!reportId) {
      return { error: "Report ID is required." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from("hmr_physical_education")
      .select("id")
      .eq("report_id", reportId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing physical education record:", checkError)
      return { error: "Failed to check existing physical education data." }
    }

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from("hmr_physical_education")
        .update({
          activities: activities || "",
          challenges: challenges || "",
          created_at: new Date().toISOString(),
        })
        .eq("report_id", reportId)

      if (error) {
        console.error("Error updating physical education data:", error)
        return { error: "Failed to update physical education data." }
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("hmr_physical_education").insert({
        report_id: reportId,
        activities: activities || "",
        challenges: challenges || "",
      })

      if (error) {
        console.error("Error inserting physical education data:", error)
        return { error: "Failed to save physical education data." }
      }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error in savePhysicalEducation:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getPhysicalEducation(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    const supabase = createServerSupabaseClient()

    const { data: physicalEducation, error } = await supabase
      .from("hmr_physical_education")
      .select("*")
      .eq("report_id", reportId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error getting physical education data:", error)
      return { error: "Failed to load physical education data." }
    }

    if (!physicalEducation) {
      // Return default values if no data exists
      return {
        success: true,
        data: {
          physicalEducationActivities: "",
          physicalEducationChallenges: "",
        },
      }
    }

    return {
      success: true,
      data: {
        physicalEducationActivities: physicalEducation.activities || "",
        physicalEducationChallenges: physicalEducation.challenges || "",
      },
    }
  } catch (error) {
    console.error("Error in getPhysicalEducation:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Submit Report Function
export async function submitReport(reportId: string) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { error: "Only Head Teachers and Admins can submit reports." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Check if report exists and is in draft status
    let query = supabase
      .from("hmr_report")
      .select("id, status")
      .eq("id", reportId)

    // Only filter by headteacher_id for head teachers, admins can access any report
    if (user.role === "Head Teacher") {
      query = query.eq("headteacher_id", user.id)
    }

    const { data: existingReport, error: checkError } = await query.single()

    if (checkError || !existingReport) {
      return { error: "Report not found or you don't have permission to submit it." }
    }

    if (existingReport.status !== "draft") {
      return { error: "This report has already been submitted." }
    }

    // Update report status to submitted
    const { error: updateError } = await supabase
      .from("hmr_report")
      .update({
        status: "submitted",
        updated_on: new Date().toISOString(),
      })
      .eq("id", reportId)

    if (updateError) {
      console.error("Error submitting report:", updateError)
      return { error: "Failed to submit report." }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error in submitReport:", error)
    return { error: "An unexpected error occurred." }
  }
}

// Get Report Status Function
export async function getReportStatus(reportId: string) {
  try {
    const user = await getUser()
    if (!user) {
      return { error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    const { data: report, error } = await supabase.from("hmr_report").select("status").eq("id", reportId).single()

    if (error) {
      console.error("Error getting report status:", error)
      return { error: "Failed to get report status." }
    }

    return {
      success: true,
      status: report.status || "draft",
    }
  } catch (error) {
    console.error("Error in getReportStatus:", error)
    return { error: "An unexpected error occurred." }
  }
}

export async function getSubmittedReports() {
  try {
    const user = await getUser()

    if (!user) {
      return { reports: [], error: "User not authenticated." }
    }

    // Use service role client to bypass RLS for this query
    const supabase = createServiceRoleSupabaseClient()

    let query = supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        updated_on,
        status,
        sms_schools:school_id (id, name),
        sms_regions:region_id (id, name)
      `)
      .eq("status", "submitted")
      .is("deleted_on", null)
      .order("updated_on", { ascending: false })

    // Filter based on user role
    if (user.role === "Head Teacher") {
      query = query
    } else if (user.role === "Regional Officer") {
      // For Regional Officers, filter by the region_id which represents the school's region
      // The user.region should match the region_id in the hmr_report table
      if (user.region) {
        query = query.eq("region_id", user.region)
      } else {
        console.warn("Regional Officer user has no region assigned")
        return { reports: [], error: "Regional Officer has no region assigned." }
      }
    }
    // Admins can see all reports (no additional filter)

    const { data: reports, error } = await query

    if (error) {
      console.error("Error fetching submitted reports:", error)
      console.error("User details:", { id: user.id, role: user.role, region: user.region })
      return { reports: [], error: `Failed to fetch submitted reports: ${error.message}` }
    }

    return { reports: reports || [], error: null }
  } catch (error) {
    console.error("Error in getSubmittedReports:", error)
    return { reports: [], error: "An unexpected error occurred." }
  }
}

export async function getReportBySchoolAndMonth(schoolId: string, month: number, year: number) {
  try {
    const user = await getUser()

    if (!user) {
      return { report: null, error: "User not authenticated." }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Get the report for the specific school, month, and year
    const { data: report, error } = await supabase
      .from("hmr_report")
      .select(`
        *,
        sms_schools:school_id (
          id,
          name,
          region_id,
          sms_regions (id, name)
        ),
        hmr_users:headteacher_id (
          id,
          name,
          email
        )
      `)
      .eq("school_id", schoolId)
      .eq("month", month)
      .eq("year", year)
      .is("deleted_on", null)
      .single()

    if (error) {
      console.error("Error fetching report:", error)
      return { report: null, error: "Failed to fetch report." }
    }

    if (!report) {
      return { report: null, error: "Report not found." }
    }

    // Debug the report structure
    return { report, error: null }
  } catch (error) {
    console.error("Error in getReportBySchoolAndMonth:", error)
    return { report: null, error: "An unexpected error occurred." }
  }
}

export async function getAvailableMonthsForSchool(schoolId: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { months: [], error: "User not authenticated." }
    }

    // Use service role client to ensure we can read all data
    const supabase = createServiceRoleSupabaseClient()

    // Get all reports for the specific school, ordered by year and month
    const { data: reports, error } = await supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        status,
        created_at,
        updated_at
      `)
      .eq("school_id", schoolId)
      .eq("status", "submitted") // Only get submitted reports
      .is("deleted_on", null)
      .order("year", { ascending: false })
      .order("month", { ascending: false })

    if (error) {
      console.error("Error fetching available months:", error)
      return { months: [], error: "Failed to fetch available months." }
    }

    // Transform the data to include formatted month names
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]

    const availableMonths = (reports || []).map(report => ({
      month: report.month,
      year: report.year,
      monthParam: `${report.month}-${report.year}`,
      displayName: `${monthNames[report.month - 1]} ${report.year}`,
      status: report.status,
      created_at: report.created_at,
      updated_at: report.updated_at
    }))

    return { months: availableMonths, error: null }
  } catch (error) {
    console.error("Error in getAvailableMonthsForSchool:", error)
    return { months: [], error: "An unexpected error occurred." }
  }
}

export async function getReportSectionData(reportId: string, sectionType: string) {
  try {
    const user = await getUser()

    if (!user) {
      return { data: null, error: "User not authenticated." }
    }

    const supabase = createServiceRoleSupabaseClient()

    let tableName = ""
    switch (sectionType) {
      case "student_enrollment":
        tableName = "hmr_student_enrollment"
        break
      case "attendance":
        tableName = "hmr_attendance"
        break
      case "staffing":
        tableName = "hmr_staffing"
        break
      case "staff_development":
        tableName = "hmr_staff_development"
        break
      case "supervision":
        tableName = "hmr_supervision"
        break
      case "curriculum":
        tableName = "hmr_curriculum"
        break
      case "finance":
        tableName = "hmr_finance"
        break
      case "income":
        tableName = "hmr_income"
        break
      case "accident_safety":
        tableName = "hmr_accident_safety"
        break
      case "staff_meetings":
        tableName = "hmr_staff_meetings"
        break
      case "facilities":
        tableName = "hmr_facilities"
        break
      case "repairs":
        tableName = "hmr_repairs"
        break
      case "resources_needed":
        tableName = "hmr_resources_needed"
        break
      default:
        return { data: null, error: "Invalid section type." }
    }

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("report_id", reportId)

    if (error) {
      console.error(`Error fetching ${sectionType} data:`, error)
      return { data: null, error: `Failed to fetch ${sectionType} data.` }
    }

    return { data, error: null }
  } catch (error) {
    console.error(`Error in getReportSectionData for ${sectionType}:`, error)
    return { data: null, error: "An unexpected error occurred." }
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

export async function getMissingMonthsForSchool() {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { missingMonths: [], error: "Only Head Teachers and Admins can check missing reports." }
    }

    if (!user.school_id) {
      return { missingMonths: [], error: "No school assigned to this Head Teacher." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get the current date
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-based month

    // Get all submitted reports for this school (exclude draft reports)
    const { data: existingReports, error: reportsError } = await supabase
      .from("hmr_report")
      .select("month, year")
      .eq("school_id", user.school_id)
      .eq("status", "submitted") // Only count submitted reports
      .is("deleted_on", null)

    if (reportsError) {
      console.error("Error fetching existing reports:", reportsError)
      return { missingMonths: [], error: "Failed to fetch existing reports." }
    }

    // Create a set of existing month-year combinations for fast lookup
    const existingMonthYears = new Set(
      existingReports?.map(report => `${report.month}-${report.year}`) || []
    )

    const missingMonths: Array<{ month: number, year: number, displayName: string }> = []

    // Check for missing months in the current year only
    // Start from January to previous month of current year
    const startMonth = 1
    const endMonth = currentMonth - 1 // Only check up to the previous month

    for (let month = startMonth; month <= endMonth; month++) {
      const monthYearKey = `${month}-${currentYear}`
      
      if (!existingMonthYears.has(monthYearKey)) {
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ]
        
        missingMonths.push({
          month,
          year: currentYear,
          displayName: `${monthNames[month - 1]} ${currentYear}`
        })
      }
    }

    return { missingMonths, error: null }
  } catch (error) {
    console.error("Error getting missing months:", error)
    return { missingMonths: [], error: "An unexpected error occurred." }
  }
}

export async function getDraftReports() {
  try {
    const user = await getUser()

    if (!user || (user.role !== "Head Teacher" && user.role !== "Admin")) {
      return { draftReports: [], error: "Only Head Teachers and Admins can check draft reports." }
    }

    if (!user.school_id) {
      return { draftReports: [], error: "No school assigned to this Head Teacher." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get all draft reports for this school
    const { data: draftReports, error: reportsError } = await supabase
      .from("hmr_report")
      .select("id, month, year, created_at, updated_at")
      .eq("school_id", user.school_id)
      .eq("status", "draft")
      .is("deleted_on", null)
      .order("updated_at", { ascending: false })

    if (reportsError) {
      console.error("Error fetching draft reports:", reportsError)
      return { draftReports: [], error: "Failed to fetch draft reports." }
    }

    // Format the draft reports with display names
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]

    const formattedDraftReports = draftReports?.map(report => ({
      ...report,
      displayName: `${monthNames[report.month - 1]} ${report.year}`,
      lastModified: new Date(report.updated_at).toLocaleDateString()
    })) || []

    return { draftReports: formattedDraftReports, error: null }
  } catch (error) {
    console.error("Error getting draft reports:", error)
    return { draftReports: [], error: "An unexpected error occurred." }
  }
}
