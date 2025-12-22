"use server"

import { createServiceRoleSupabaseClient, createServerSupabaseClient } from "@/lib/supabase"
import type {
  SchoolAssessmentReport,
  CategoryName,
  RatingLevel,
  ReportRecommendation,
} from "../types"
import { CATEGORY_NAMES, SCORING_WEIGHTS, TERM_NAMES } from "../types"
import { getScoreBreakdown } from "./scoring"
import { getRecommendations } from "./recommendations"
import { jsPDF } from "jspdf"

// ============================================================================
// TYPES
// ============================================================================

export interface ExportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  export_type: 'pdf' | 'excel'
  download_url?: string
  error_message?: string
  created_at: string
}

interface ExportReportData {
  report: SchoolAssessmentReport
  schoolName: string
  regionName: string
  academicYear: string
  termName: string
  recommendations: ReportRecommendation[]
}

interface ExportSchoolRow {
  schoolName: string
  regionName: string
  totalScore: number
  ratingLevel: RatingLevel
  academicScore: number
  attendanceScore: number
  infrastructureScore: number
  teachingQualityScore: number
  managementScore: number
  studentWelfareScore: number
  communityScore: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets full report data for export
 */
async function getReportForExport(reportId: string): Promise<ExportReportData | null> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    const { data: report, error } = await supabase
      .from('hmr_school_assessment_reports')
      .select(`
        *,
        sms_schools(name, sms_regions(name)),
        hmr_school_assessment_periods(academic_year, term_name)
      `)
      .eq('id', reportId)
      .single()
    
    if (error || !report) {
      return null
    }
    
    // Get recommendations
    const { recommendations } = await getRecommendations(reportId)
    
    return {
      report: {
        id: report.id,
        schoolId: report.school_id,
        periodId: report.period_id,
        headteacherId: report.headteacher_id,
        status: report.status,
        academicScores: report.academic_scores,
        attendanceScores: report.attendance_scores,
        infrastructureScores: report.infrastructure_scores,
        teachingQualityScores: report.teaching_quality_scores,
        managementScores: report.management_scores,
        studentWelfareScores: report.student_welfare_scores,
        communityScores: report.community_scores,
        totalScore: report.total_score,
        ratingLevel: report.rating_level,
        submittedAt: report.submitted_at,
        lockedAt: report.locked_at,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      },
      schoolName: report.sms_schools?.name || 'Unknown School',
      regionName: report.sms_schools?.sms_regions?.name || 'Unknown Region',
      academicYear: report.hmr_school_assessment_periods?.academic_year || '',
      termName: report.hmr_school_assessment_periods?.term_name || '',
      recommendations,
    }
  } catch (error) {
    console.error('Error getting report for export:', error)
    return null
  }
}

/**
 * Formats date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Gets rating label with color hint
 */
function getRatingInfo(rating: RatingLevel): { label: string; color: string } {
  const info: Record<RatingLevel, { label: string; color: string }> = {
    outstanding: { label: 'Outstanding', color: '#22c55e' },
    very_good: { label: 'Very Good', color: '#3b82f6' },
    good: { label: 'Good', color: '#f59e0b' },
    satisfactory: { label: 'Satisfactory', color: '#f97316' },
    needs_improvement: { label: 'Needs Improvement', color: '#ef4444' },
  }
  return info[rating] || { label: rating, color: '#6b7280' }
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Generates PDF data for a single report
 * Returns structured data that can be rendered by @react-pdf/renderer on the client
 */
export async function generateReportPDFData(reportId: string) {
  try {
    const reportData = await getReportForExport(reportId)
    
    if (!reportData) {
      return { data: null, error: 'Report not found.' }
    }
    
    const { report, schoolName, regionName, academicYear, termName, recommendations } = reportData
    
    // Calculate score breakdown
    const scoreBreakdown = getScoreBreakdown({
      academic: report.academicScores?.total || 0,
      attendance: report.attendanceScores?.total || 0,
      infrastructure: report.infrastructureScores?.total || 0,
      teaching_quality: report.teachingQualityScores?.total || 0,
      management: report.managementScores?.total || 0,
      student_welfare: report.studentWelfareScores?.total || 0,
      community: report.communityScores?.total || 0,
    })
    
    // Build PDF data structure
    const pdfData = {
      title: 'School Assessment Report',
      generatedAt: new Date().toISOString(),
      school: {
        name: schoolName,
        region: regionName,
      },
      period: {
        academicYear,
        term: termName,
      },
      summary: {
        totalScore: report.totalScore || 0,
        maxScore: 1000,
        percentage: Math.round(((report.totalScore || 0) / 1000) * 100),
        ratingLevel: report.ratingLevel,
        ratingColor: getRatingInfo(report.ratingLevel as RatingLevel).color,
        submittedAt: formatDate(report.submittedAt),
      },
      categories: scoreBreakdown.categories.map(cat => ({
        name: cat.label,
        earned: cat.earned,
        max: cat.max,
        percentage: cat.percentage,
      })),
      categoryDetails: {
        academic: report.academicScores,
        attendance: report.attendanceScores,
        infrastructure: report.infrastructureScores,
        teachingQuality: report.teachingQualityScores,
        management: report.managementScores,
        studentWelfare: report.studentWelfareScores,
        community: report.communityScores,
      },
      recommendations: recommendations.map(rec => ({
        category: getCategoryLabel(rec.category as CategoryName) || rec.category,
        priority: rec.priority,
        text: rec.recommendationText,
        focusAreas: rec.focusAreas,
      })),
    }
    
    return { data: pdfData, error: null }
  } catch (error) {
    console.error('Error generating PDF data:', error)
    return { data: null, error: 'Failed to generate PDF data.' }
  }
}

// Helper function to get category labels
function getCategoryLabel(category: CategoryName): string {
  const labels: Record<CategoryName, string> = {
    academic: 'Academic Performance',
    attendance: 'Attendance',
    infrastructure: 'Infrastructure',
    teaching_quality: 'Teaching Quality',
    management: 'Management',
    student_welfare: 'Student Welfare',
    community: 'Community Engagement',
  }
  return labels[category] || category
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Generates Excel data for a single report
 * Returns structured data that can be used with xlsx library
 */
export async function generateReportExcelData(reportId: string) {
  try {
    const reportData = await getReportForExport(reportId)
    
    if (!reportData) {
      return { data: null, error: 'Report not found.' }
    }
    
    const { report, schoolName, regionName, academicYear, termName, recommendations } = reportData
    
    // Summary sheet data
    const summarySheet = [
      ['School Assessment Report'],
      [],
      ['School Information'],
      ['School Name', schoolName],
      ['Region', regionName],
      ['Academic Year', academicYear],
      ['Term', termName],
      ['Submitted At', formatDate(report.submittedAt)],
      [],
      ['Overall Results'],
      ['Total Score', report.totalScore || 0],
      ['Maximum Score', 1000],
      ['Percentage', `${Math.round(((report.totalScore || 0) / 1000) * 100)}%`],
      ['Rating', report.ratingLevel],
    ]
    
    // Category scores sheet
    const categoryHeaders = ['Category', 'Score', 'Maximum', 'Percentage']
    const categoryData = [
      categoryHeaders,
      ['Academic Performance', report.academicScores?.total || 0, SCORING_WEIGHTS.ACADEMIC, `${Math.round(((report.academicScores?.total || 0) / SCORING_WEIGHTS.ACADEMIC) * 100)}%`],
      ['Attendance', report.attendanceScores?.total || 0, SCORING_WEIGHTS.ATTENDANCE, `${Math.round(((report.attendanceScores?.total || 0) / SCORING_WEIGHTS.ATTENDANCE) * 100)}%`],
      ['Infrastructure', report.infrastructureScores?.total || 0, SCORING_WEIGHTS.INFRASTRUCTURE, `${Math.round(((report.infrastructureScores?.total || 0) / SCORING_WEIGHTS.INFRASTRUCTURE) * 100)}%`],
      ['Teaching Quality', report.teachingQualityScores?.total || 0, SCORING_WEIGHTS.TEACHING_QUALITY, `${Math.round(((report.teachingQualityScores?.total || 0) / SCORING_WEIGHTS.TEACHING_QUALITY) * 100)}%`],
      ['Management', report.managementScores?.total || 0, SCORING_WEIGHTS.MANAGEMENT, `${Math.round(((report.managementScores?.total || 0) / SCORING_WEIGHTS.MANAGEMENT) * 100)}%`],
      ['Student Welfare', report.studentWelfareScores?.total || 0, SCORING_WEIGHTS.STUDENT_WELFARE, `${Math.round(((report.studentWelfareScores?.total || 0) / SCORING_WEIGHTS.STUDENT_WELFARE) * 100)}%`],
      ['Community Engagement', report.communityScores?.total || 0, SCORING_WEIGHTS.COMMUNITY, `${Math.round(((report.communityScores?.total || 0) / SCORING_WEIGHTS.COMMUNITY) * 100)}%`],
    ]
    
    // Recommendations sheet
    const recommendationsHeaders = ['Category', 'Priority', 'Recommendation', 'Focus Areas']
    const recommendationsData = [
      recommendationsHeaders,
      ...recommendations.map(rec => [
        getCategoryLabel(rec.category as CategoryName) || rec.category,
        rec.priority.toUpperCase(),
        rec.recommendationText,
        rec.focusAreas.join(', '),
      ]),
    ]
    
    // Detailed scores sheets
    const academicDetails = buildDetailedScoresSheet('Academic Performance', report.academicScores)
    const attendanceDetails = buildDetailedScoresSheet('Attendance', report.attendanceScores)
    const infrastructureDetails = buildDetailedScoresSheet('Infrastructure', report.infrastructureScores)
    const teachingDetails = buildDetailedScoresSheet('Teaching Quality', report.teachingQualityScores)
    const managementDetails = buildDetailedScoresSheet('Management', report.managementScores)
    const welfareDetails = buildDetailedScoresSheet('Student Welfare', report.studentWelfareScores)
    const communityDetails = buildDetailedScoresSheet('Community Engagement', report.communityScores)
    
    return {
      data: {
        filename: `school_assessment_${schoolName.replace(/\s+/g, '_')}_${academicYear}_${termName.replace(/\s+/g, '_')}.xlsx`,
        sheets: {
          Summary: summarySheet,
          'Category Scores': categoryData,
          Recommendations: recommendationsData,
          'Academic Details': academicDetails,
          'Attendance Details': attendanceDetails,
          'Infrastructure Details': infrastructureDetails,
          'Teaching Details': teachingDetails,
          'Management Details': managementDetails,
          'Welfare Details': welfareDetails,
          'Community Details': communityDetails,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('Error generating Excel data:', error)
    return { data: null, error: 'Failed to generate Excel data.' }
  }
}

/**
 * Builds detailed scores sheet for a category
 */
function buildDetailedScoresSheet(categoryName: string, scores: any): string[][] {
  if (!scores) {
    return [[categoryName], ['No data available']]
  }
  
  const rows: string[][] = [[categoryName], []]
  
  // Convert scores object to rows
  Object.entries(scores).forEach(([key, value]) => {
    if (key !== 'total') {
      const label = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
      
      if (typeof value === 'object' && value !== null) {
        rows.push([label])
        Object.entries(value).forEach(([subKey, subValue]) => {
          const subLabel = subKey
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
          rows.push(['  ' + subLabel, String(subValue)])
        })
      } else {
        rows.push([label, String(value)])
      }
    }
  })
  
  rows.push([])
  rows.push(['Total Score', String(scores.total || 0)])
  
  return rows
}

// ============================================================================
// BULK EXPORT
// ============================================================================

/**
 * Generates Excel data for multiple schools (regional/national export)
 */
export async function generateBulkExportData(
  periodId: string,
  regionId?: string
) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('hmr_school_assessment_reports')
      .select(`
        *,
        sms_schools(name, sms_regions(name)),
        hmr_school_assessment_periods(academic_year, term_name)
      `)
      .eq('period_id', periodId)
      .eq('status', 'submitted')
      .order('total_score', { ascending: false })
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    const { data: reports, error } = await query
    
    if (error) {
      console.error('Error fetching reports for bulk export:', error)
      return { data: null, error: 'Failed to fetch reports.' }
    }
    
    if (!reports || reports.length === 0) {
      return { data: null, error: 'No reports found for the selected period.' }
    }
    
    // Get period info
    const period = reports[0].hmr_school_assessment_periods
    const academicYear = period?.academic_year || ''
    const termName = period?.term_name || ''
    
    // Build summary sheet
    const summaryHeaders = [
      'Rank',
      'School Name',
      'Region',
      'Total Score',
      'Rating',
      'Academic',
      'Attendance',
      'Infrastructure',
      'Teaching Quality',
      'Management',
      'Student Welfare',
      'Community',
    ]
    
    const summaryData = [
      [`School Assessment Report - ${academicYear} ${termName}`],
      [`Generated: ${formatDate(new Date().toISOString())}`],
      [],
      summaryHeaders,
      ...reports.map((report, index) => [
        index + 1,
        report.sms_schools?.name || '',
        report.sms_schools?.sms_regions?.name || '',
        report.total_score || 0,
        report.rating_level || '',
        report.academic_scores?.total || 0,
        report.attendance_scores?.total || 0,
        report.infrastructure_scores?.total || 0,
        report.teaching_quality_scores?.total || 0,
        report.management_scores?.total || 0,
        report.student_welfare_scores?.total || 0,
        report.community_scores?.total || 0,
      ]),
    ]
    
    // Build statistics sheet
    const scores = reports.map(r => r.total_score || 0)
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    
    const ratingCounts: Record<string, number> = {}
    reports.forEach(r => {
      const rating = r.rating_level || 'Unknown'
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1
    })
    
    const statsData = [
      ['Statistics Summary'],
      [],
      ['Total Schools', reports.length],
      ['Average Score', avgScore],
      ['Highest Score', maxScore],
      ['Lowest Score', minScore],
      [],
      ['Rating Distribution'],
      ...Object.entries(ratingCounts).map(([rating, count]) => [
        rating,
        count,
        `${Math.round((count / reports.length) * 100)}%`,
      ]),
    ]
    
    // Determine filename
    const regionPrefix = regionId ? 'regional' : 'national'
    const filename = `${regionPrefix}_assessment_report_${academicYear.replace(/\s+/g, '_')}_${termName.replace(/\s+/g, '_')}.xlsx`
    
    return {
      data: {
        filename,
        sheets: {
          'School Rankings': summaryData,
          Statistics: statsData,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('Error generating bulk export data:', error)
    return { data: null, error: 'Failed to generate export data.' }
  }
}

// ============================================================================
// CSV EXPORT (Simple fallback)
// ============================================================================

/**
 * Generates CSV string for bulk export
 */
export async function generateBulkExportCSV(
  periodId: string,
  regionId?: string
) {
  try {
    const supabase = createServiceRoleSupabaseClient()
    
    let query = supabase
      .from('hmr_school_assessment_reports')
      .select(`
        *,
        sms_schools(name, sms_regions(name)),
        hmr_school_assessment_periods(academic_year, term_name)
      `)
      .eq('period_id', periodId)
      .eq('status', 'submitted')
      .order('total_score', { ascending: false })
    
    if (regionId) {
      query = query.eq('sms_schools.region_id', regionId)
    }
    
    const { data: reports, error } = await query
    
    if (error || !reports || reports.length === 0) {
      return { csv: null, error: 'No reports found.' }
    }
    
    // Build CSV
    const headers = [
      'Rank',
      'School Name',
      'Region',
      'Total Score',
      'Rating',
      'Academic',
      'Attendance',
      'Infrastructure',
      'Teaching Quality',
      'Management',
      'Student Welfare',
      'Community',
    ]
    
    const rows = reports.map((report, index) => [
      index + 1,
      `"${(report.sms_schools?.name || '').replace(/"/g, '""')}"`,
      `"${(report.sms_schools?.sms_regions?.name || '').replace(/"/g, '""')}"`,
      report.total_score || 0,
      `"${report.rating_level || ''}"`,
      report.academic_scores?.total || 0,
      report.attendance_scores?.total || 0,
      report.infrastructure_scores?.total || 0,
      report.teaching_quality_scores?.total || 0,
      report.management_scores?.total || 0,
      report.student_welfare_scores?.total || 0,
      report.community_scores?.total || 0,
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')
    
    return { csv, error: null }
  } catch (error) {
    console.error('Error generating CSV:', error)
    return { csv: null, error: 'Failed to generate CSV.' }
  }
}
// ============================================================================
// BACKGROUND EXPORT JOBS
// ============================================================================

/**
 * Starts a background export job
 */
export async function startExportJob(
  reportId: string,
  exportType: 'pdf' | 'excel' = 'pdf'
) {
  try {
    const supabase = await await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Unauthorized')
    
    // Create job record
    const { data: job, error } = await supabase
      .from('hmr_export_jobs')
      .insert({
        user_id: user.id,
        report_id: reportId,
        export_type: exportType,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    
    // In a real background worker setup, we would trigger a queue here.
    // For this implementation, we'll trigger the processing asynchronously
    // but return the job ID immediately to the client for polling.
    processExportJob(job.id).catch(err => {
      console.error(`Background job ${job.id} failed:`, err)
    })
    
    return { jobId: job.id, error: null }
  } catch (error: any) {
    console.error('Error starting export job:', error)
    return { jobId: null, error: error.message }
  }
}

/**
 * Gets the status of an export job
 */
export async function getExportJobStatus(jobId: string) {
  try {
    const supabase = await await createServerSupabaseClient()
    const { data: job, error } = await supabase
      .from('hmr_export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (error) throw error
    
    return { job: job as ExportJob, error: null }
  } catch (error: any) {
    console.error('Error getting export job status:', error)
    return { job: null, error: error.message }
  }
}

/**
 * Processes an export job (Internal)
 */
async function processExportJob(jobId: string) {
  const supabase = createServiceRoleSupabaseClient()
  
  try {
    // Update status to processing
    await supabase
      .from('hmr_export_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)
    
    // Get job details
    const { data: job } = await supabase
      .from('hmr_export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (!job) return
    
    // 1. Fetch data
    const data = await getReportForExport(job.report_id)
    if (!data) throw new Error('Failed to fetch report data')
    
    // 2. Generate PDF (Simplified for background processing)
    // In a real worker, we might use a headless browser or a more robust PDF lib.
    // Here we use jsPDF to generate a basic report.
    const doc = new jsPDF()
    
    // Add content
    doc.setFontSize(20)
    doc.text('School Assessment Report', 20, 20)
    doc.setFontSize(14)
    doc.text(`School: ${data.schoolName}`, 20, 35)
    doc.text(`Region: ${data.regionName}`, 20, 45)
    doc.text(`Period: ${data.academicYear} - ${data.termName}`, 20, 55)
    
    doc.text('Summary Scores:', 20, 75)
    doc.setFontSize(12)
    doc.text(`Total Score: ${data.report.totalScore}`, 30, 85)
    doc.text(`Rating: ${data.report.ratingLevel}`, 30, 95)
    
    // Add more sections...
    // (In a full implementation, we'd iterate through categories)
    
    // 3. Upload to Storage
    const pdfBlob = doc.output('blob')
    const fileName = `reports/${job.report_id}_${Date.now()}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (uploadError) throw uploadError
    
    // 4. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName)
    
    // 5. Update job status
    await supabase
      .from('hmr_export_jobs')
      .update({
        status: 'completed',
        download_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      
  } catch (error: any) {
    console.error(`Error processing job ${jobId}:`, error)
    await supabase
      .from('hmr_export_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}
