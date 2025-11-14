"use server"

import { getSubmittedReportsForEducationOfficial, getSubmittedReportsWithSearchAndPagination } from "./education-official-reports"

export async function generateReportsPDF(filters?: {
  searchTerm?: string
  selectedRegionId?: string
  selectedSchoolLevel?: string
  selectedMonth?: string
  selectedYear?: string
}) {
  try {
    let reports: any[] = []
    let error: string | null = null

    if (filters && (filters.searchTerm || filters.selectedRegionId || filters.selectedSchoolLevel || filters.selectedMonth || filters.selectedYear)) {
      // Use filtered reports with a very high limit to get all results
      const result = await getSubmittedReportsWithSearchAndPagination({
        searchTerm: filters.searchTerm || "",
        page: 1,
        pageSize: 999999, // Very high limit to get all results
        selectedRegionId: filters.selectedRegionId || "",
        selectedSchoolLevel: filters.selectedSchoolLevel || "",
        selectedMonth: filters.selectedMonth || "",
        selectedYear: filters.selectedYear || ""
      })
      reports = result.reports
      error = result.error
    } else {
      // Use unfiltered reports
      const result = await getSubmittedReportsForEducationOfficial()
      reports = result.reports
      error = result.error
    }
    
    if (error) {
      return { success: false, error }
    }

    // Generate HTML content for PDF conversion
    const htmlContent = generatePDFHTML(reports, filters)
    
    return { 
      success: true, 
      htmlContent,
      filename: `HMR_Reports_${new Date().toISOString().split('T')[0]}.pdf`,
      reportCount: reports.length
    }
  } catch (error) {
    console.error("Error generating PDF:", error)
    return { success: false, error: "Failed to generate PDF" }
  }
}

function generatePDFHTML(reports: any[], filters?: {
  searchTerm?: string
  selectedRegionId?: string
  selectedSchoolLevel?: string
  fromDate?: string
}) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Generate filter summary
  const filterSummary = []
  if (filters?.searchTerm) filterSummary.push(`Search: "${filters.searchTerm}"`)
  if (filters?.selectedRegionId && filters.selectedRegionId !== "all") filterSummary.push(`Region: ${filters.selectedRegionId}`)
  if (filters?.selectedSchoolLevel && filters.selectedSchoolLevel !== "all") filterSummary.push(`School Level: ${filters.selectedSchoolLevel}`)
  if (filters?.fromDate) filterSummary.push(`From Date: ${filters.fromDate}`)

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long", 
    day: "numeric"
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>HMR Reports Export</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0;
          font-size: 24px;
        }
        .header h2 {
          color: #2563eb;
          margin: 5px 0;
          font-size: 18px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 12px;
        }
        .summary {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
          border-left: 4px solid #2563eb;
          page-break-inside: avoid;
        }
        .summary h3 {
          margin: 0 0 10px 0;
          color: #2563eb;
          font-size: 16px;
        }
        .summary p {
          margin: 5px 0;
          font-size: 11px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #2563eb;
          color: white;
          font-weight: bold;
          font-size: 10px;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .status-badge {
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          background-color: #dcfce7;
          color: #166534;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 10px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          page-break-inside: avoid;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 10px;
          }
          .header, .summary, .footer { 
            break-inside: avoid; 
          }
          table { 
            page-break-inside: auto;
          }
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto;
          }
          thead { 
            display: table-header-group;
          }
          tfoot { 
            display: table-footer-group;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Ministry of Education - Guyana</h1>
        <h2>Head Teacher Monthly Reports (HMR)</h2>
        <p>Comprehensive Report Export</p>
        <p>Generated on: ${currentDate}</p>
      </div>

      <div class="summary">
        <h3>Export Summary</h3>
        <p><strong>Total Reports:</strong> ${reports.length}</p>
        <p><strong>Export Date:</strong> ${currentDate}</p>
        <p><strong>Data Source:</strong> HMR Education Management System</p>
        ${filterSummary.length > 0 ? `<p><strong>Applied Filters:</strong> ${filterSummary.join(', ')}</p>` : '<p><strong>Filters:</strong> All Reports (No filters applied)</p>'}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25%;">School Name</th>
            <th style="width: 20%;">Head Teacher</th>
            <th style="width: 15%;">Region</th>
            <th style="width: 15%;">Report Period</th>
            <th style="width: 15%;">Date Submitted</th>
            <th style="width: 10%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${reports.map((report) => {
            const reportPeriod = `${monthNames[report.month - 1]} ${report.year}`
            const dateSubmitted = new Date(report.updated_at).toLocaleDateString()
            const schoolName = report.sms_schools?.name || "Unknown School"
            const headTeacher = report.hmr_users?.name || "Unknown"
            
            // Handle region - it could be nested or flat
            let regionName = "Unknown Region"
            if (report.sms_schools?.sms_regions) {
              if (Array.isArray(report.sms_schools.sms_regions)) {
                regionName = report.sms_schools.sms_regions[0]?.name || regionName
              } else {
                regionName = report.sms_schools.sms_regions.name || regionName
              }
            }
            
            return `
              <tr>
                <td>${schoolName}</td>
                <td>${headTeacher}</td>
                <td>${regionName}</td>
                <td>${reportPeriod}</td>
                <td>${dateSubmitted}</td>
                <td><span class="status-badge">${report.status.toUpperCase()}</span></td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Ministry of Education - Guyana | Education Management System</p>
        <p>This report was automatically generated on ${currentDate}</p>
        <p>Total Records: ${reports.length} reports</p>
      </div>
    </body>
    </html>
  `
}
