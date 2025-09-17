"use server"

import { createServiceRoleSupabaseClient } from "@/lib/supabase"
import { getUser } from "./auth"

export async function getTopExpenditureSchools(year: number, month: number) {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { schools: [], error: "Only Regional Officers can access expenditure data." }
    }

    if (!user.region) {
      return { schools: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch finance data with school information for the specified month and year
    const { data: financeData, error } = await supabase
      .from("hmr_finance")
      .select(`
        total_expenditure,
        report_id,
        hmr_report!inner(
          id,
          month,
          year,
          status,
          school_id,
          sms_schools!inner(
            id,
            name,
            region_id
          )
        )
      `)
      .eq("hmr_report.sms_schools.region_id", user.region)
      .eq("hmr_report.status", "submitted")
      .eq("hmr_report.month", month)
      .eq("hmr_report.year", year)
      .is("hmr_report.deleted_on", null)
      .not("total_expenditure", "is", null)
      .order("total_expenditure", { ascending: false })

    if (error) {
      console.error("Error fetching top expenditure schools:", error)
      return { schools: [], error: "Failed to fetch expenditure data." }
    }

    if (!financeData || financeData.length === 0) {
      return { schools: [], error: null }
    }

    // Process the data to get top 10 schools with highest expenditure
    const processedSchools = financeData
      .map(record => {
        const report = record.hmr_report
        const school = report?.sms_schools
        
        if (!school || !record.total_expenditure) {
          return null
        }

        return {
          schoolName: school.name,
          schoolId: school.id,
          totalExpenditure: record.total_expenditure,
          reportId: record.report_id
        }
      })
      .filter(school => school !== null)
      .slice(0, 10) // Get top 10

    return {
      schools: processedSchools,
      error: null
    }

  } catch (error) {
    console.error("Error in getTopExpenditureSchools:", error)
    return { schools: [], error: "An unexpected error occurred while fetching expenditure data." }
  }
}

// Helper function to get available years and months for filters
export async function getAvailableFinancePeriods() {
  try {
    const user = await getUser()

    if (!user || user.role !== "Regional Officer") {
      return { periods: [], error: "Only Regional Officers can access this data." }
    }

    if (!user.region) {
      return { periods: [], error: "Regional Officer has no region assigned." }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Get unique year/month combinations from reports in this region that have finance data
    const { data: periodsData, error } = await supabase
      .from("hmr_report")
      .select(`
        month,
        year,
        hmr_finance!inner(id),
        sms_schools!inner(region_id)
      `)
      .eq("sms_schools.region_id", user.region)
      .eq("status", "submitted")
      .is("deleted_on", null)

    if (error) {
      console.error("Error fetching available finance periods:", error)
      return { periods: [], error: "Failed to fetch available periods." }
    }

    // Extract unique year/month combinations
    const uniquePeriods = Array.from(
      new Set(
        periodsData?.map(record => `${record.year}-${record.month}`) || []
      )
    ).map(period => {
      const [year, month] = period.split('-').map(Number)
      return { year, month }
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year // Most recent year first
      return b.month - a.month // Most recent month first
    })

    return {
      periods: uniquePeriods,
      error: null
    }

  } catch (error) {
    console.error("Error in getAvailableFinancePeriods:", error)
    return { periods: [], error: "An unexpected error occurred." }
  }
}
