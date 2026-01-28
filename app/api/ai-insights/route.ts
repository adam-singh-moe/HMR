import { NextResponse } from "next/server"
import { AIService } from "@/lib/ai-service"
import { getUser } from "@/app/actions/auth"
import { createServiceRoleSupabaseClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const maxDuration = 60 // Extend timeout to 60 seconds for AI API calls

type Body = {
  prompt: string
  reportType: string
  filters?: {
    month?: string
    year?: string
    region?: string
    schoolId?: string
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null

    if (!body?.prompt || !body?.reportType) {
      return NextResponse.json(
        { insight: null, error: "Missing prompt or reportType." },
        { status: 400 }
      )
    }

    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { insight: null, error: "User not authenticated." },
        { status: 401 }
      )
    }

    if (user.role !== "Education Official" && user.role !== "Admin" && user.role !== "Regional Officer") {
      return NextResponse.json(
        { insight: null, error: "Only Education Officials, Regional Officers, and Admins can access AI insights." },
        { status: 403 }
      )
    }

    // Fetch relevant report data based on reportType and filters
    const reportData = await fetchReportData(body.reportType, body.filters)

    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
      return NextResponse.json(
        { insight: null, error: "No report data found for the selected criteria." },
        { status: 404 }
      )
    }

    // Generate AI insight
    const aiService = new AIService()
    const insight = await aiService.generateInsight(body.prompt, reportData)

    return NextResponse.json({ insight, error: null })
  } catch (error) {
    console.error("/api/ai-insights error:", error)
    return NextResponse.json(
      {
        insight: null,
        error: error instanceof Error ? error.message : "Failed to generate AI insight.",
      },
      { status: 500 }
    )
  }
}

// Fetch report data based on type and filters
async function fetchReportData(reportType: string, filters?: {
  month?: string
  year?: string
  region?: string
  schoolId?: string
}) {
  const supabase = createServiceRoleSupabaseClient()

  try {
    // Build base query for hmr_report to get report IDs
    let reportQuery = supabase
      .from("hmr_report")
      .select("id, school_id, region_id, month, year, status, sms_schools(name), sms_regions(name))")
      .eq("status", "submitted")

    // Apply filters - month and year are stored as text numbers (e.g., "1", "2025")
    if (filters?.month && filters.month !== "all") {
      reportQuery = reportQuery.eq("month", filters.month)
    }

    if (filters?.year && filters.year !== "all") {
      reportQuery = reportQuery.eq("year", filters.year)
    }

    const { data: reports, error: reportError } = await reportQuery

    console.log("Filters received:", filters)
    console.log("Report query error:", reportError)
    console.log("Reports found:", reports?.length || 0)

    if (reportError) {
      console.error("Error fetching reports:", reportError)
      return []
    }

    if (!reports || reports.length === 0) {
      console.log("No reports found with status 'submitted'")
      return []
    }

    // Filter by region if specified
    let filteredReports = reports
    if (filters?.region) {
      console.log("Filtering by region:", filters.region)
      console.log("Sample report region data:", reports[0]?.sms_regions)
      filteredReports = reports.filter((r: any) =>
        r.sms_regions?.name === filters.region
      )
      console.log("Reports after region filter:", filteredReports.length)
    }

    const reportIds = filteredReports.map((r: any) => r.id)

    if (reportIds.length === 0) {
      console.log("No reports found after filtering")
      return []
    }

    // Fetch data based on report type
    let dataTable = ""
    switch (reportType) {
      case "attendance":
        dataTable = "hmr_attendance"
        break
      case "student-enrollment":
        dataTable = "hmr_student_enrollment"
        break
      case "staffing":
        dataTable = "hmr_staffing"
        break
      case "staff-development":
        dataTable = "hmr_staff_development"
        break
      case "supervision":
        dataTable = "hmr_supervision"
        break
      case "curriculum":
        dataTable = "hmr_curriculum_monitoring"
        break
      case "finance":
        dataTable = "hmr_finance"
        break
      case "income-sources":
        dataTable = "hmr_income_sources"
        break
      case "safety":
        dataTable = "hmr_safety"
        break
      case "staff-meetings":
        dataTable = "hmr_staff_meetings"
        break
      case "physical-facilities":
        dataTable = "hmr_physical_facilities"
        break
      case "resources":
        dataTable = "hmr_resources_needed"
        break
      case "physical-education":
        dataTable = "hmr_physical_education"
        break
      case "all-reports":
        // For all reports, fetch a summary from multiple tables
        return await fetchAllReportsData(reportIds, filteredReports)
      default:
        return []
    }

    const { data, error } = await supabase
      .from(dataTable)
      .select("*")
      .in("report_id", reportIds)
      .limit(100) // Limit records to prevent timeout

    if (error) {
      console.error(`Error fetching ${dataTable}:`, error)
      return []
    }

    // Enrich data with school info
    const enrichedData = data?.map((item: any) => {
      const report = filteredReports.find((r: any) => r.id === item.report_id)
      return {
        ...item,
        school_name: report?.sms_schools?.name || "Unknown School",
        region_name: report?.sms_regions?.name || "Unknown Region",
        report_month: report?.month || "Unknown"
      }
    })

    return enrichedData || []
  } catch (error) {
    console.error("Error in fetchReportData:", error)
    return []
  }
}

async function fetchAllReportsData(reportIds: string[], reports: any[]) {
  const supabase = createServiceRoleSupabaseClient()
  const allData: any[] = []

  const tables = [
    { name: "hmr_attendance", label: "Attendance" },
    { name: "hmr_student_enrollment", label: "Student Enrollment" },
    { name: "hmr_staffing", label: "Staffing" },
    { name: "hmr_finance", label: "Finance" }
  ]

  for (const table of tables) {
    const { data } = await supabase
      .from(table.name)
      .select("*")
      .in("report_id", reportIds)
      .limit(50)

    if (data && data.length > 0) {
      const enriched = data.map((item: any) => {
        const report = reports.find((r: any) => r.id === item.report_id)
        return {
          ...item,
          data_type: table.label,
          school_name: report?.sms_schools?.name || "Unknown",
          region_name: report?.sms_regions?.name || "Unknown"
        }
      })
      allData.push(...enriched)
    }
  }

  return allData
}
