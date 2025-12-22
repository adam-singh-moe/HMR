"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser as getCurrentUser } from "./auth"
import { revalidatePath } from "next/cache"

export async function getNotifications(page = 1, limit = 10) {
  const user = await getCurrentUser()
  if (!user) {
    return { notifications: [], total: 0, error: "User not authenticated." }
  }

  const supabase = createServiceRoleSupabaseClient()

  let query = supabase.from("notifications").select("*", { count: "exact" })

  // Filter notifications based on user role
  if (user.role === "Head Teacher") {
    // Head teachers see notifications for their user ID, school, or region
    query = query.or(`user_id.eq.${user.id},school_id.eq.${user.school_id},region_id.eq.${user.region}`)
  } else if (user.role === "Regional Officer") {
    // Regional officers see notifications for their user ID or region
    query = query.or(`user_id.eq.${user.id},region_id.eq.${user.region}`)
  } else if (user.role === "Admin") {
    // Admins see all notifications
    // No additional filter needed
  } else {
    // Other users see only their personal notifications
    query = query.eq("user_id", user.id)
  }

  const {
    data: notifications,
    error,
    count,
  } = await query.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1)

  if (error) {
    console.error("Error fetching notifications:", error)
    return { notifications: [], total: 0, error: "Failed to fetch notifications." }
  }

  return { notifications: notifications || [], total: count || 0, error: null }
}

export async function getUnreadNotificationCount() {
  const user = await getCurrentUser()
  if (!user) {
    return 0
  }

  const supabase = createServiceRoleSupabaseClient()

  let query = supabase.from("notifications").select("id", { count: "exact" }).eq("read", false)

  // Filter notifications based on user role
  if (user.role === "Head Teacher") {
    query = query.or(`user_id.eq.${user.id},school_id.eq.${user.school_id},region_id.eq.${user.region}`)
  } else if (user.role === "Regional Officer") {
    query = query.or(`user_id.eq.${user.id},region_id.eq.${user.region}`)
  } else if (user.role === "Admin") {
    // Admins see all notifications
    // No additional filter needed
  } else {
    query = query.eq("user_id", user.id)
  }

  const { count, error } = await query

  if (error) {
    console.error("Error fetching unread notification count:", error)
    return 0
  }

  return count || 0
}

export async function markNotificationAsRead(notificationId: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "User not authenticated." }
  }

  const supabase = createServiceRoleSupabaseClient()

  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)

  if (error) {
    console.error("Error marking notification as read:", error)
    return { error: "Failed to mark notification as read." }
  }

  revalidatePath("/dashboard/admin/notifications")
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "User not authenticated." }
  }

  const supabase = createServiceRoleSupabaseClient()

  let query = supabase.from("notifications").update({ read: true, read_at: new Date().toISOString() }).eq("read", false)

  // Filter notifications based on user role
  if (user.role === "Head Teacher") {
    query = query.or(`user_id.eq.${user.id},school_id.eq.${user.school_id},region_id.eq.${user.region}`)
  } else if (user.role === "Regional Officer") {
    query = query.or(`user_id.eq.${user.id},region_id.eq.${user.region}`)
  } else if (user.role === "Admin") {
    // Admins can mark all notifications as read
  } else {
    query = query.eq("user_id", user.id)
  }

  const { error } = await query

  if (error) {
    console.error("Error marking all notifications as read:", error)
    return { error: "Failed to mark all notifications as read." }
  }

  revalidatePath("/dashboard/admin/notifications")
  return { success: true }
}

export async function createNotification(data: {
  title: string
  message: string
  type: string
  user_id?: string
  school_id?: string
  region_id?: string
}) {
  const user = await getCurrentUser()
  if (!user || user.role !== "Admin") {
    return { error: "Only admins can create notifications." }
  }

  const supabase = createServiceRoleSupabaseClient()

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert([
      {
        title: data.title,
        message: data.message,
        type: data.type,
        user_id: data.user_id || null,
        school_id: data.school_id || null,
        region_id: data.region_id || null,
        read: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating notification:", error)
    return { error: "Failed to create notification." }
  }

  revalidatePath("/dashboard/admin/notifications")
  return { success: true, notification }
}

export async function sendReportReminders(schoolIds: string[]) {
  const user = await getCurrentUser()
  if (!user || user.role !== "Regional Officer") {
    return { success: false, message: "Only Regional Officers can send report reminders." }
  }

  if (!schoolIds || schoolIds.length === 0) {
    return { success: false, message: "No schools selected for reminders." }
  }

  const supabase = createServiceRoleSupabaseClient()

  try {
    // Get previous month and year for report lookup (since reports are due for the previous month)
    const now = new Date()
    const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth() // If current month is January (0), previous month is December (12)
    const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear() // If current month is January, previous year

    // Get school information and their previous month reports
    const { data: schools, error: schoolsError } = await supabase
      .from("sms_schools")
      .select(`
        id,
        name,
        sms_regions!inner(name)
      `)
      .in("id", schoolIds)
      .is("deleted_at", null)

    if (schoolsError) {
      console.error("Error fetching schools for reminders:", schoolsError)
      return { success: false, message: "Failed to fetch school information." }
    }

    if (!schools || schools.length === 0) {
      return { success: false, message: "No valid schools found for the selected IDs." }
    }

    // Get reports for these schools to find head teacher IDs (if reports exist)
    const { data: reports, error: reportsError } = await supabase
      .from("hmr_report")
      .select("school_id, headteacher_id")
      .in("school_id", schoolIds)
      .eq("month", previousMonth)
      .eq("year", previousYear)
      .is("deleted_on", null)

    if (reportsError) {
      console.error("Error fetching reports for reminders:", reportsError)
      return { success: false, message: "Failed to fetch report information." }
    }

    // Create a map of school_id to headteacher_id from reports (if they exist)
    const schoolHeadTeacherFromReportsMap = new Map()
    reports?.forEach((report) => {
      if (report.headteacher_id) {
        schoolHeadTeacherFromReportsMap.set(report.school_id, report.headteacher_id)
      }
    })

    // Find head teachers directly from hmr_users table using school_id
    const { data: headTeachersFromUsers, error: headTeachersFromUsersError } = await supabase
      .from("hmr_users")
      .select(`
        id,
        name,
        email,
        school_id,
        hmr_user_roles!inner(name)
      `)
      .in("school_id", schoolIds)
      .eq("hmr_user_roles.name", "Head Teacher")
      .is("deleted_at", null)

    if (headTeachersFromUsersError) {
      console.error("Error fetching head teachers from users table:", headTeachersFromUsersError)
      return { success: false, message: "Failed to fetch head teacher information." }
    }

    // Create a map of school_id to head teacher from users table
    const schoolHeadTeacherFromUsersMap = new Map()
    headTeachersFromUsers?.forEach((teacher) => {
      if (teacher.school_id) {
        schoolHeadTeacherFromUsersMap.set(teacher.school_id, teacher)
      }
    })

    // Combine both approaches - prefer head teachers from reports if available, otherwise use from users table
    const finalHeadTeachers = new Map()
    const schoolHeadTeacherMap = new Map()

    for (const schoolId of schoolIds) {
      let headTeacher = null
      
      // First, try to get head teacher from reports
      const headTeacherIdFromReport = schoolHeadTeacherFromReportsMap.get(schoolId)
      if (headTeacherIdFromReport) {
        // Find this head teacher in the users we fetched
        headTeacher = headTeachersFromUsers?.find(ht => ht.id === headTeacherIdFromReport)
      }
      
      // If not found in reports, get from users table directly
      if (!headTeacher) {
        headTeacher = schoolHeadTeacherFromUsersMap.get(schoolId)
      }
      
      if (headTeacher) {
        finalHeadTeachers.set(headTeacher.id, headTeacher)
        schoolHeadTeacherMap.set(schoolId, headTeacher.id)
      }
    }

    if (finalHeadTeachers.size === 0) {
      return {
        success: false,
        message: "No head teachers found for the selected schools. Please ensure head teachers are assigned to these schools.",
      }
    }

    // Create a map of head teacher ID to head teacher data
    const headTeacherMap = new Map()
    finalHeadTeachers.forEach((teacher, teacherId) => {
      headTeacherMap.set(teacherId, teacher)
    })

    // Prepare email data and notifications
    const emailPromises = []
    const notifications = []
    const currentDate = new Date()
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    // Use previous month for the report period
    const previousMonthIndex = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1 // If current month is January (0), previous month index is December (11)
    const previousMonthName = monthNames[previousMonthIndex]
    const previousYearNumber = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()

    for (const school of schools) {
      const headTeacherId = schoolHeadTeacherMap.get(school.id)
      const headTeacher = headTeacherId ? headTeacherMap.get(headTeacherId) : null

      if (headTeacher && headTeacher.email) {
        // Send email reminder
        const emailPromise = sendReminderEmail({
          to: headTeacher.email,
          headTeacherName: headTeacher.name,
          schoolName: school.name,
          regionName: (school as any).sms_regions?.name || "Unknown Region",
          month: previousMonthName,
          year: previousYearNumber,
          regionalOfficerName: user.name,
        })
        emailPromises.push(emailPromise)

        // Create in-app notification
        notifications.push({
          title: "Monthly Report Reminder",
          message: `This is a reminder to submit your monthly report for ${previousMonthName} ${previousYearNumber}. The report is currently overdue. Please submit it as soon as possible.`,
          type: "reminder",
          user_id: headTeacher.id,
          school_id: school.id,
          region_id: user.region,
          read: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    if (emailPromises.length === 0) {
      return { success: false, message: "No head teachers with email addresses found for the selected schools." }
    }

    // Send all emails concurrently
    const emailResults = await Promise.allSettled(emailPromises)

    // Count successful email sends
    const successfulEmails = emailResults.filter((result) => result.status === "fulfilled").length
    const failedEmails = emailResults.filter((result) => result.status === "rejected")

    // Log failed emails for debugging
    if (failedEmails.length > 0) {
      console.error("Failed to send some emails:", failedEmails.map((f: any) => ({
        status: f.status,
        reason: f.reason?.message || String(f.reason)
      })))
    }

    // Insert notifications into the database
    let successfulNotifications = 0
    if (notifications.length > 0) {
      const { error: insertError } = await supabase.from("notifications").insert(notifications)

      if (insertError) {
        console.error("Error creating reminder notifications:", insertError)
        // Don't fail the entire operation if notifications fail
      } else {
        successfulNotifications = notifications.length
      }
    }

    // Log the reminder activity

    // Provide better messaging based on results
    let message = ""
    if (successfulEmails > 0 && failedEmails.length === 0) {
      message = `Successfully sent email reminders to ${successfulEmails} head teachers.`
    } else if (successfulEmails > 0 && failedEmails.length > 0) {
      message = `Sent email reminders to ${successfulEmails} head teachers. ${failedEmails.length} emails failed (this may be due to email service configuration).`
    } else if (successfulNotifications > 0) {
      message = `Created ${successfulNotifications} in-app notifications. Email sending failed (this may be due to email service configuration).`
    } else {
      message = "Failed to send email reminders. This may be due to email service configuration issues."
    }

    return {
      success: successfulEmails > 0 || successfulNotifications > 0,
      message,
      emailsSent: successfulEmails,
      emailsFailed: failedEmails.length,
      notificationsCreated: successfulNotifications,
    }
  } catch (error) {
    console.error("Unexpected error sending reminders:", error)
    return { success: false, message: "An unexpected error occurred while sending reminders." }
  }
}

async function sendReminderEmail(data: {
  to: string
  headTeacherName: string
  schoolName: string
  regionName: string
  month: string
  year: number
  regionalOfficerName: string
}) {
  const sendGridApiKey = process.env.SENDGRID_API_KEY

  if (!sendGridApiKey) {
    throw new Error("SendGrid API key not configured")
  }

  const emailTemplate = generateReminderEmailTemplate(data)

  const emailData = {
    personalizations: [
      {
        to: [{ email: data.to, name: data.headTeacherName }],
        subject: `Monthly Report Reminder - ${data.month} ${data.year}`,
      },
    ],
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || "noreply@moe.gov.gy",
      name: "Ministry of Education - HMR System",
    },
    content: [
      {
        type: "text/html",
        value: emailTemplate,
      },
    ],
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
  }

  return { success: true, email: data.to }
}

function generateReminderEmailTemplate(data: {
  headTeacherName: string
  schoolName: string
  regionName: string
  month: string
  year: number
  regionalOfficerName: string
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Report Reminder</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #1e40af;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        .content {
            margin-bottom: 30px;
        }
        .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
            border-radius: 4px;
        }
        .school-info {
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .school-info h3 {
            margin-top: 0;
            color: #1e40af;
        }
        .cta-button {
            display: inline-block;
            background-color: #1e40af;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .urgent {
            color: #dc2626;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">Ministry of Education</div>
            <div class="subtitle">Head Teacher Monthly Report System</div>
        </div>
        
        <div class="content">
            <h2>Monthly Report Reminder</h2>
            
            <p>Dear ${data.headTeacherName},</p>
            
            <p>This is a friendly reminder that your monthly report for <strong>${data.month} ${data.year}</strong> is currently overdue and needs to be submitted as soon as possible.</p>
            
            <div class="school-info">
                <h3>School Information</h3>
                <p><strong>School:</strong> ${data.schoolName}</p>
                <p><strong>Region:</strong> ${data.regionName}</p>
                <p><strong>Report Period:</strong> ${data.month} ${data.year}</p>
            </div>
            
            <div class="highlight">
                <p class="urgent">⚠️ URGENT: This report is overdue</p>
                <p>Please log into the HMR system and submit your monthly report immediately to avoid any compliance issues.</p>
            </div>
            
            <p>If you have any questions or need assistance with the reporting system, please contact your Regional Officer or the Ministry of Education IT Support team.</p>
            
            <p>Thank you for your cooperation in maintaining accurate and timely reporting.</p>
            
            <p>Best regards,<br>
            <strong>${data.regionalOfficerName}</strong><br>
            Regional Officer<br>
            ${data.regionName}<br>
            Ministry of Education, Guyana</p>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder from the Head Teacher Monthly Report System.</p>
            <p>Ministry of Education, Guyana | Email: info@moe.gov.bz</p>
            <p>Please do not reply to this email. For support, contact your Regional Officer.</p>
        </div>
    </div>
</body>
</html>
  `
}
