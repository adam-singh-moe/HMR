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

    // First, get all reports for the current year in the region
    const { data: reports, error: reportsError } = await supabase
      .from("hmr_report")
      .select(`
        id,
        month,
        year,
        school_id,
        sms_schools!inner(id, name, region_id)
      `)
      .eq("sms_schools.region_id", user.region)
      .eq("year", currentYear)
      .order("month", { ascending: true })

    if (reportsError) {
      console.error("Error fetching reports:", reportsError)
      return { expenditures: [], error: "Failed to fetch reports." }
    }

    if (!reports || reports.length === 0) {
      return { expenditures: [], error: null }
    }

    // Get report IDs
    const reportIds = reports.map(r => r.id)

    // Now get finance data for these reports
    const { data: financeData, error: financeError } = await supabase
      .from("hmr_finance")
      .select("report_id, total_expenditure")
      .in("report_id", reportIds)
      .not("total_expenditure", "is", null)

    if (financeError) {
      console.error("Error fetching finance data:", financeError)
      return { expenditures: [], error: "Failed to fetch expenditure data." }
    }

    if (!financeData || financeData.length === 0) {
      // Return empty data structure instead of error to show empty chart
      return { 
        expenditures: [], 
        topSchools: [],
        error: null 
      }
    }

    // Create a map of report_id to expenditure
    const expenditureMap = new Map()
    financeData.forEach(finance => {
      expenditureMap.set(finance.report_id, parseFloat(finance.total_expenditure) || 0)
    })

    // Transform data for chart display
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    // Group data by month and school
    const expenditureByMonth = new Map()

    reports.forEach((report: any) => {
      const expenditure = expenditureMap.get(report.id)
      if (expenditure) {
        const month = monthNames[report.month - 1]
        const schoolName = report.sms_schools.name

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
    reports.forEach((report: any) => {
      const expenditure = expenditureMap.get(report.id)
      if (expenditure) {
        const schoolName = report.sms_schools.name
        
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
