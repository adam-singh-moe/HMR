"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getExpenditureTrends() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { expenditures: [], error: "Only Regional Officers can access expenditure trends." }
    }

    if (!user.region) {
      return { expenditures: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get the current year
    const currentYear = new Date().getFullYear()

   // console.log("Debug: Fetching expenditure trends for year:", currentYear, "region:", user.region)

    // Use a simpler approach that matches your working SQL query
    const { data: expenditureData, error } = await supabase
      .from("hmr_finance")
      .select(`
        total_expenditure,
        report_id,
        hmr_report!inner (
          id,
          month,
          year,
          region_id,
          status,
          sms_schools (
            id,
            name
          )
        )
      `)
      .eq("hmr_report.region_id", user.region)
      .eq("hmr_report.year", currentYear)
      .eq("hmr_report.status", "submitted")
      .is("hmr_report.deleted_on", null)
      .not("total_expenditure", "is", null)

   // console.log("Debug: Raw expenditure data found:", expenditureData?.length || 0)

    if (error) {
      console.error("Error fetching expenditure data:", error)
      return { expenditures: [], error: "Failed to fetch expenditure data." }
    }

    if (!expenditureData || expenditureData.length === 0) {
     // console.log("Debug: No expenditure data found for", currentYear)
      return { 
        expenditures: [], 
        topSchools: [],
        error: null 
      }
    }

   // console.log("Debug: Sample expenditure data:", expenditureData.slice(0, 3))

    // Check for 2025 data specifically
    const data2025 = expenditureData.filter(record => 
      record.hmr_report && (parseInt((record.hmr_report as any).year) === 2025 || (record.hmr_report as any).year === '2025')
    )
   // console.log("Debug: 2025 expenditure records found:", data2025.length)

    // Transform data for chart display
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    // Group data by month and school (similar to your SQL GROUP BY)
    const expenditureByMonth = new Map()

    expenditureData.forEach((record: any) => {
      const expenditure = record.total_expenditure ? parseFloat(record.total_expenditure) : 0
      const report = record.hmr_report
      
      if (expenditure > 0 && report) {
        const month = monthNames[report.month - 1]
        const schoolName = report.sms_schools?.name || 'Unknown School'

        if (!expenditureByMonth.has(month)) {
          expenditureByMonth.set(month, { month, total: 0, schools: new Map() })
        }

        const monthData = expenditureByMonth.get(month)
        monthData.total += expenditure

        if (!monthData.schools.has(schoolName)) {
          monthData.schools.set(schoolName, 0)
        }
        monthData.schools.set(schoolName, monthData.schools.get(schoolName) + expenditure)
      }
    })

    // Convert to array format for chart
    const chartData = Array.from(expenditureByMonth.values()).map(monthData => {
      const result: any = {
        month: monthData.month,
        total: monthData.total
      }
      
      // Add individual school expenditures as separate keys
      monthData.schools.forEach((expenditure: number, schoolName: string) => {
        // Truncate school name for chart readability
        const shortName = schoolName.length > 15 ? schoolName.substring(0, 15) + "..." : schoolName
        result[shortName] = expenditure
      })
      
      return result
    })

    // Get school names for legend (top 5 schools by total expenditure)
    const schoolTotals = new Map()
    expenditureData.forEach((record: any) => {
      const expenditure = record.total_expenditure ? parseFloat(record.total_expenditure) : 0
      const schoolName = record.hmr_report?.sms_schools?.name || 'Unknown School'
      
      if (expenditure > 0) {
        if (!schoolTotals.has(schoolName)) {
          schoolTotals.set(schoolName, 0)
        }
        schoolTotals.set(schoolName, schoolTotals.get(schoolName) + expenditure)
      }
    })

    const topSchools = Array.from(schoolTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([schoolName]) => schoolName.length > 15 ? schoolName.substring(0, 15) + "..." : schoolName)

   // console.log("Debug: Chart data processed:", chartData.length, "months")
    // console.log("Debug: Top schools:", topSchools)

    return { 
      expenditures: chartData, 
      topSchools,
      error: null 
    }
  } catch (error) {
    console.error("Error in getExpenditureTrends:", error)
    return { expenditures: [], error: "An unexpected error occurred." }
  }
}
