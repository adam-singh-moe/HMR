"use server"

import { getReportBySchoolAndMonth, getReportSectionData, getStaffing } from "@/app/actions/hmr-reports"

interface ReportSection {
  index: number
  name: string
  data: any
}

const sectionNames = [
  "Basic Information",
  "Student Enrollment", 
  "Attendance",
  "Staffing and Vacancy",
  "Staff Development",
  "Supervision",
  "Curriculum Monitoring",
  "Finance",
  "Income Sources",
  "Accident and Safety",
  "Staff Meeting",
  "Physical Facilities",
  "Repairs Needed",
  "Resource Needed",
  "Physical Education"
]

const sectionTypeMap = [
  null, // Basic Information - no API needed
  "student_enrollment", // Student Enrollment
  "attendance", // Attendance  
  "staffing", // Staffing and Vacancy
  "staff_development", // Staff Development
  "supervision", // Supervision
  "curriculum", // Curriculum Monitoring
  "finance", // Finance
  "income", // Income Sources
  "accident_safety", // Accident and Safety
  "staff_meetings", // Staff Meeting
  "facilities", // Physical Facilities
  "repairs", // Repairs
  "resources_needed", // Resource Needed
  "physical_education" // Physical Education
]

export async function generateIndividualReportPDF(schoolId: string, monthParam: string) {
  try {
    // Parse month parameter
    const [month, year] = monthParam.split('-').map(Number)
    
    // Get the main report data
    const reportResult = await getReportBySchoolAndMonth(schoolId, month, year)
    
    if (reportResult.error || !reportResult.report) {
      return { success: false, error: reportResult.error || "Report not found" }
    }

    const report = reportResult.report
    const schoolData = report.sms_schools
    const headTeacher = report.hmr_users

    // Fetch all section data
    const sections: ReportSection[] = []
    
    for (let i = 0; i < sectionNames.length; i++) {
      const sectionType = sectionTypeMap[i]
      let sectionData = null
      
      if (sectionType) {
        if (i === 3) { // Staffing section - use special function to get teacher status data
          const result = await getStaffing(report.id)
          sectionData = result.data
        } else {
          const result = await getReportSectionData(report.id, sectionType)
          sectionData = result.data
        }
      }
      
      sections.push({
        index: i,
        name: sectionNames[i],
        data: sectionData
      })
    }

    // Generate HTML content for PDF
    const htmlContent = generateReportHTML(report, schoolData, headTeacher, sections)
    
    return { success: true, htmlContent }
  } catch (error) {
    console.error('Error generating individual report PDF:', error)
    return { success: false, error: 'Failed to generate PDF' }
  }
}

function generateReportHTML(report: any, schoolData: any, headTeacher: any, sections: ReportSection[]) {
  const monthName = new Date(report.year, report.month - 1).toLocaleString("default", { month: "long" })
  const regionName = Array.isArray(schoolData?.sms_regions) 
    ? schoolData.sms_regions[0]?.name 
    : schoolData?.sms_regions?.name
  
  const pageStyle = `
    @page {
      size: A4;
      margin: 20mm;
    }
    
    @media print {
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      
      .page-break:first-child {
        page-break-before: auto;
        break-before: auto;
      }
      
      .avoid-page-break {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.4;
      color: #333;
      margin: 0;
      padding: 0;
      font-size: 12px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    
    .page-break:first-child {
      page-break-before: auto;
      break-before: auto;
    }
    
    .section {
      padding: 20px;
      margin: 0;
      background: white;
      min-height: 400px;
      max-width: 800px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #1e40af;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .title {
      color: #1e40af;
      font-size: 22px;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }
    
    .section-title {
      background: #1e40af !important;
      color: white !important;
      padding: 12px;
      margin: 15px 0 20px 0;
      border-radius: 6px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    
    .info-item {
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .info-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
    }
    
    .info-value {
      color: #1f2937;
      font-size: 13px;
      padding: 6px 10px;
      background: #f9fafb !important;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    
    .supervision-item, .teacher-item {
      margin-bottom: 15px;
      padding: 12px;
      background: #f8fafc !important;
      border-radius: 6px;
      border-left: 3px solid #1e40af;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .teacher-grid, .teacher-grid-wide {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
      font-size: 11px;
      line-height: 1.3;
    }
    
    .teacher-status-category {
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .teacher-status-category h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: bold;
    }
    
    .no-data {
      text-align: center;
      color: #6b7280;
      font-style: italic;
      padding: 15px;
      background: #f9fafb !important;
      border: 1px dashed #d1d5db;
      border-radius: 6px;
      margin: 15px 0;
      font-size: 12px;
    }
    
    .badge {
      background: #dcfce7 !important;
      color: #166534 !important;
      padding: 3px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 11px;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      text-align: left;
    }
    
    th {
      background: #f3f4f6 !important;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #1e40af;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 15px;
    }
    
    .title {
      color: #1e40af;
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    
    .subtitle {
      color: #64748b;
      font-size: 16px;
      margin: 0;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 15px 20px;
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 20px 0;
      border-radius: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .info-item {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #1e40af;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    .data-table th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .data-table tr:hover {
      background: #f8fafc;
    }
    
    .no-data {
      text-align: center;
      color: #64748b;
      font-style: italic;
      padding: 40px;
      background: #f8fafc;
      border-radius: 8px;
      border: 2px dashed #cbd5e1;
    }
    
    .teacher-status-category {
      margin-bottom: 25px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #1e40af;
    }
    
    .teacher-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .teacher-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .teacher-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      align-items: start;
    }
    
    .teacher-grid-wide {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      align-items: start;
    }
    
    @media print {
      .teacher-grid-wide {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #22c55e;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
  `

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Report - ${schoolData?.name} - ${monthName} ${report.year}</title>
      <style>${pageStyle}</style>
    </head>
    <body>
  `

  // Generate each section on a separate page
  sections.forEach((section, index) => {
    htmlContent += `
      <div class="${index > 0 ? 'page-break' : ''} section">
        <div class="header">
          <div class="logo-section">
            <div>
              <h1 class="title">Ministry of Education - Guyana</h1>
              <p class="subtitle">Monthly Head Teacher Report</p>
            </div>
          </div>
        </div>
        
        <div class="section-title">
          ${section.name}
        </div>
        
        ${generateSectionContent(section, report, schoolData, headTeacher, regionName, monthName)}
      </div>
    `
  })

  htmlContent += `
    </body>
    </html>
  `

  return htmlContent
}

function generateSectionContent(section: ReportSection, report: any, schoolData: any, headTeacher: any, regionName: string, monthName: string) {
  switch (section.index) {
    case 0: // Basic Information
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">School Name</div>
            <div class="info-value">${schoolData?.name || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Region</div>
            <div class="info-value">${regionName || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Report Period</div>
            <div class="info-value">${monthName} ${report.year}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Head Teacher</div>
            <div class="info-value">${headTeacher?.name || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Report Status</div>
            <div class="info-value">
              <span class="badge">${report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Date Submitted</div>
            <div class="info-value">${new Date(report.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</div>
          </div>
        </div>
      `

    case 1: // Student Enrollment
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No enrollment data available for this report</div>'
      }
      
      const enrollmentData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Total Students Enrolled</div>
            <div class="info-value">${enrollmentData.total_students || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Students Transferred In</div>
            <div class="info-value">${enrollmentData.total_transferred_in || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Students Transferred Out</div>
            <div class="info-value">${enrollmentData.total_transferred_out || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Net Transfer</div>
            <div class="info-value">${(enrollmentData.total_transferred_in || 0) - (enrollmentData.total_transferred_out || 0)}</div>
          </div>
        </div>
      `

    case 2: // Attendance
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No attendance data available for this report</div>'
      }
      
      if (Array.isArray(section.data)) {
        let tableRows = ''
        section.data.forEach(attendance => {
          tableRows += `
            <tr>
              <td>${attendance.role || 'N/A'}</td>
              <td>${attendance.attendance_rate || 0}%</td>
              <td>${attendance.punctuality_rate || 0}%</td>
            </tr>
          `
        })
        
        return `
          <table class="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Attendance Rate</th>
                <th>Punctuality Rate</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `
      } else {
        return `
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Attendance Rate</div>
              <div class="info-value">${section.data.attendance_rate || 0}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">Punctuality Rate</div>
              <div class="info-value">${section.data.punctuality_rate || 0}%</div>
            </div>
          </div>
        `
      }

    case 3: // Staffing and Vacancy
      if (!section.data) {
        return '<div class="no-data">No staffing data available for this report</div>'
      }
      
      const staffingData = section.data.staffing ? (Array.isArray(section.data.staffing) ? section.data.staffing[0] : section.data.staffing) : null
      const teacherStatusData = section.data.teacherStatusUpdates || {}

      let staffingHtml = ''
      
      // Basic staffing information
      if (staffingData) {
        staffingHtml += `
          <div class="section-title">Staffing Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Total Staff Entitlement</div>
              <div class="info-value">${staffingData.total_staff_entitlement || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Current Teachers</div>
              <div class="info-value">${staffingData.total_current_teachers || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Under-staffed By</div>
              <div class="info-value">${staffingData.under_staffed_by || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Over-staffed By</div>
              <div class="info-value">${staffingData.over_staffed_by || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Secondment Certificates</div>
              <div class="info-value">${staffingData.secondment_attendance_cert ? 'Yes' : 'No'}</div>
            </div>
          </div>
        `
      }

      // Teacher Status Updates
      staffingHtml += '<div class="section-title" style="margin-top: 30px;">Teacher Status Updates</div>'
      
      // Teachers Who Left School
      if (teacherStatusData.leftSchool && teacherStatusData.leftSchool.length > 0) {
        staffingHtml += `
          <div class="teacher-status-category">
            <h4 style="color: #dc2626; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Teachers Who Left School</h4>
            <div class="teacher-list">
        `
        teacherStatusData.leftSchool.forEach((teacher: any) => {
          staffingHtml += `
            <div class="teacher-item">
              <div class="teacher-grid">
                <div><strong>Name:</strong> ${teacher.name || 'N/A'}</div>
                <div><strong>Status:</strong> ${teacher.status || 'N/A'}</div>
                <div><strong>Reason:</strong> ${teacher.reason || 'N/A'}</div>
              </div>
            </div>
          `
        })
        staffingHtml += '</div></div>'
      }

      // Teachers on Special Leave
      if (teacherStatusData.specialLeave && teacherStatusData.specialLeave.length > 0) {
        staffingHtml += `
          <div class="teacher-status-category">
            <h4 style="color: #ea580c; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Teachers on Special Leave</h4>
            <div class="teacher-list">
        `
        teacherStatusData.specialLeave.forEach((teacher: any) => {
          staffingHtml += `
            <div class="teacher-item">
              <div class="teacher-grid">
                <div><strong>Name:</strong> ${teacher.name || 'N/A'}</div>
                <div><strong>Status:</strong> ${teacher.status || 'N/A'}</div>
                <div><strong>Offence:</strong> ${teacher.offence || 'N/A'}</div>
              </div>
            </div>
          `
        })
        staffingHtml += '</div></div>'
      }

      // Teachers Who Assumed Duty
      if (teacherStatusData.assumedDuty && teacherStatusData.assumedDuty.length > 0) {
        staffingHtml += `
          <div class="teacher-status-category">
            <h4 style="color: #16a34a; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Teachers Who Assumed Duty</h4>
            <div class="teacher-list">
        `
        teacherStatusData.assumedDuty.forEach((teacher: any) => {
          staffingHtml += `
            <div class="teacher-item">
              <div class="teacher-grid">
                <div><strong>Name:</strong> ${teacher.name || 'N/A'}</div>
                <div><strong>Status:</strong> ${teacher.status || 'N/A'}</div>
              </div>
            </div>
          `
        })
        staffingHtml += '</div></div>'
      }

      // Teachers Not Reported
      if (teacherStatusData.notReported && teacherStatusData.notReported.length > 0) {
        staffingHtml += `
          <div class="teacher-status-category">
            <h4 style="color: #ca8a04; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Teachers Not Reported</h4>
            <div class="teacher-list">
        `
        teacherStatusData.notReported.forEach((teacher: any) => {
          staffingHtml += `
            <div class="teacher-item">
              <div class="teacher-grid-wide">
                <div><strong>Name:</strong> ${teacher.name || 'N/A'}</div>
                <div><strong>Status:</strong> ${teacher.status || 'N/A'}</div>
                <div><strong>Reason:</strong> ${teacher.reason || 'N/A'}</div>
                <div><strong>Days Absent:</strong> ${teacher.daysAbsent || 'N/A'}</div>
                <div><strong>Action Taken:</strong> ${teacher.actionTaken || 'N/A'}</div>
              </div>
            </div>
          `
        })
        staffingHtml += '</div></div>'
      }

      // Teachers Without Salary
      if (teacherStatusData.didNotReceiveSalary && teacherStatusData.didNotReceiveSalary.length > 0) {
        staffingHtml += `
          <div class="teacher-status-category">
            <h4 style="color: #7c2d12; margin-bottom: 15px; font-size: 16px; font-weight: bold;">Teachers Who Did Not Receive Salary</h4>
            <div class="teacher-list">
        `
        teacherStatusData.didNotReceiveSalary.forEach((teacher: any) => {
          staffingHtml += `
            <div class="teacher-item">
              <div class="teacher-grid">
                <div><strong>Name:</strong> ${teacher.name || 'N/A'}</div>
                <div><strong>Status:</strong> ${teacher.status || 'N/A'}</div>
                <div><strong>Reason:</strong> ${teacher.reason || 'N/A'}</div>
              </div>
            </div>
          `
        })
        staffingHtml += '</div></div>'
      }

      // No teacher status data message
      const hasAnyTeacherStatus = 
        (teacherStatusData.leftSchool && teacherStatusData.leftSchool.length > 0) ||
        (teacherStatusData.specialLeave && teacherStatusData.specialLeave.length > 0) ||
        (teacherStatusData.assumedDuty && teacherStatusData.assumedDuty.length > 0) ||
        (teacherStatusData.notReported && teacherStatusData.notReported.length > 0) ||
        (teacherStatusData.didNotReceiveSalary && teacherStatusData.didNotReceiveSalary.length > 0)

      if (!hasAnyTeacherStatus) {
        staffingHtml += '<div class="no-data">No teacher status updates recorded for this report</div>'
      }

      return staffingHtml

    case 4: // Staff Development
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No staff development data available for this report</div>'
      }
      
      const devData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">PD Session Held</div>
            <div class="info-value">${devData.PD_session_held === 'yes' ? 'Yes' : 'No'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Percentage Attended</div>
            <div class="info-value">${devData.percentage_attended || 0}%</div>
          </div>
          <div class="info-item">
            <div class="info-label">PD Topic</div>
            <div class="info-value">${devData.PD_topic || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Outcomes</div>
            <div class="info-value">${devData.Outcomes || 'N/A'}</div>
          </div>
        </div>
      `

    case 5: // Supervision
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No supervision data available for this report</div>'
      }
      
      if (Array.isArray(section.data)) {
        let supervisionHtml = '<div class="space-y-4">'
        
        section.data.forEach((supervision, index) => {
          supervisionHtml += `
            <div class="supervision-item" style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e40af;">
              <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin-bottom: 15px;">${supervision.role || "Supervision"}</h4>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Lessons Observed</div>
                  <div class="info-value">${supervision.lesson_observed || 0}</div>
                </div>
              </div>
              
              ${supervision.positive_findings ? `
                <div style="margin-top: 15px;">
                  <div class="info-label">Positive Findings</div>
                  <div style="margin-top: 5px; padding: 10px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 6px;">
                    ${supervision.positive_findings}
                  </div>
                </div>
              ` : ''}
              
              ${supervision.negative_findings ? `
                <div style="margin-top: 15px;">
                  <div class="info-label">Negative Findings</div>
                  <div style="margin-top: 5px; padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">
                    ${supervision.negative_findings}
                  </div>
                </div>
              ` : ''}
              
              ${supervision.follow_up_actions ? `
                <div style="margin-top: 15px;">
                  <div class="info-label">Follow-up Actions</div>
                  <div style="margin-top: 5px; padding: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">
                    ${supervision.follow_up_actions}
                  </div>
                </div>
              ` : ''}
            </div>
          `
        })
        
        supervisionHtml += '</div>'
        return supervisionHtml
      } else {
        return '<div class="no-data">No supervision data available for this report</div>'
      }

    case 6: // Curriculum Monitoring
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No curriculum monitoring data available for this report</div>'
      }
      
      const curriculumData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Teachers without Lesson Plans</div>
            <div class="info-value">${curriculumData.teachers_no_lesson_plans || '0'}</div>
          </div>
        </div>
        ${curriculumData.actions_taken ? `
          <div style="margin-top: 20px;">
            <div class="info-label">Actions Taken</div>
            <div style="margin-top: 10px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              ${curriculumData.actions_taken}
            </div>
          </div>
        ` : ''}
      `

    case 7: // Finance
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No finance data available for this report</div>'
      }
      
      const financeData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Opening Balance</div>
            <div class="info-value">$${financeData.opening_balance || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Income</div>
            <div class="info-value">$${financeData.total_income || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Expenditure</div>
            <div class="info-value">$${financeData.total_expenditure || 0}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Closing Balance</div>
            <div class="info-value">$${financeData.closing_balance || 0}</div>
          </div>
        </div>
      `

    case 8: // Income Sources
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No income sources data available for this report</div>'
      }
      
      let incomeTableRows = ''
      const incomeData = Array.isArray(section.data) ? section.data : [section.data]
      
      incomeData.forEach(income => {
        incomeTableRows += `
          <tr>
            <td>${income.source || 'N/A'}</td>
            <td>$${income.amount || 0}</td>
          </tr>
        `
      })
      
      return `
        <table class="data-table">
          <thead>
            <tr>
              <th>Income Source</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${incomeTableRows}
          </tbody>
        </table>
      `

    case 9: // Accident and Safety
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No accident and safety data available for this report</div>'
      }
      
      const safetyData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="space-y-4">
          <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin-bottom: 15px;">Emergency Drills</h4>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Evacuation Drill Held</div>
              <div class="info-value">${safetyData.evacuationDrill === 'yes' ? 'Yes' : 'No'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Persons Involved</div>
              <div class="info-value">${safetyData.personsInvolvedDrill || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Time Taken</div>
              <div class="info-value">${safetyData.timeTakenDrill || 0} minutes</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fire Buckets Available</div>
              <div class="info-value">${safetyData.classroomFirebuckets === 'yes' ? 'Yes' : 'No'}</div>
            </div>
          </div>
          
          <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin-bottom: 15px; margin-top: 30px;">Incident Reports</h4>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Total Accidents</div>
              <div class="info-value">${safetyData.totalAccidents || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Students Involved</div>
              <div class="info-value">${safetyData.totalStudentsInvolved || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Teachers Involved</div>
              <div class="info-value">${safetyData.totalTeachersInvolved || 0}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Prevention Actions</div>
              <div class="info-value">${safetyData.actions || 'N/A'}</div>
            </div>
          </div>
        </div>
      `

    case 10: // Staff Meeting
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No staff meeting data available for this report</div>'
      }
      
      const meetingData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">General Staff Meeting Held</div>
            <div class="info-value">${meetingData.general_meeting ? 'Yes' : 'No'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Implementation Percentage</div>
            <div class="info-value">${meetingData.percentage_decisions_implemented || 0}%</div>
          </div>
        </div>
        ${meetingData.key_issues ? `
          <div style="margin-top: 20px;">
            <div class="info-label">Key Issues Discussed</div>
            <div style="margin-top: 10px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              ${meetingData.key_issues}
            </div>
          </div>
        ` : ''}
      `

    case 11: // Physical Facilities
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No physical facilities data available for this report</div>'
      }
      
      const facilitiesArray = Array.isArray(section.data) ? section.data : [section.data]
      const teacherFacilities = facilitiesArray.find(f => f.role === 'Teacher')
      const studentFacilities = facilitiesArray.find(f => f.role === 'Student')
      
      return `
        <div class="space-y-4">
          <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin-bottom: 15px;">Teacher Facilities</h4>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Functional Washrooms</div>
              <div class="info-value">${teacherFacilities?.percentage_functional_washroom || 0}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">Working Sinks</div>
              <div class="info-value">${teacherFacilities?.percentage_working_sinks || 0}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">Working Taps</div>
              <div class="info-value">${teacherFacilities?.percentage_working_taps || 0}%</div>
            </div>
          </div>
          
          <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin-bottom: 15px; margin-top: 30px;">Student Facilities</h4>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Functional Washrooms</div>
              <div class="info-value">${studentFacilities?.percentage_functional_washroom || 0}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">Working Sinks</div>
              <div class="info-value">${studentFacilities?.percentage_working_sinks || 0}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">Working Taps</div>
              <div class="info-value">${studentFacilities?.percentage_working_taps || 0}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">Overcrowded Classrooms</div>
              <div class="info-value">${studentFacilities?.percentage_overcrowded_classroom || 0}%</div>
            </div>
          </div>
        </div>
      `

    case 12: // Repairs Needed
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No repairs needed data available for this report</div>'
      }
      
      if (Array.isArray(section.data)) {
        let repairsHtml = '<div class="space-y-4">'
        
        section.data.forEach((repair, index) => {
          repairsHtml += `
            <div style="margin-bottom: 20px; padding: 15px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
              <h5 style="color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 10px;">
                ${repair.repair_area || 'Repair Required'}
              </h5>
              <p style="color: #374151; line-height: 1.6;">
                ${repair.details || 'No details provided'}
              </p>
            </div>
          `
        })
        
        repairsHtml += '</div>'
        return repairsHtml
      } else {
        return `
          <div style="padding: 15px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
            <h5 style="color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 10px;">
              ${section.data.repair_area || 'Repair Required'}
            </h5>
            <p style="color: #374151; line-height: 1.6;">
              ${section.data.details || 'No details provided'}
            </p>
          </div>
        `
      }

    case 13: // Resource Needed
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No resource needs data available for this report</div>'
      }
      
      const resourceData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="space-y-4">
          ${resourceData.curriculum_resources ? `
            <div style="padding: 15px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px;">
              <h5 style="color: #166534; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Curriculum Resources</h5>
              <p style="color: #374151; line-height: 1.6;">${resourceData.curriculum_resources}</p>
            </div>
          ` : ''}
          
          ${resourceData.janitorial_supplies ? `
            <div style="padding: 15px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;">
              <h5 style="color: #1e40af; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Janitorial Supplies</h5>
              <p style="color: #374151; line-height: 1.6;">${resourceData.janitorial_supplies}</p>
            </div>
          ` : ''}
          
          ${resourceData.issues ? `
            <div style="padding: 15px; background: #fce7f3; border: 1px solid #f9a8d4; border-radius: 8px;">
              <h5 style="color: #be185d; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Other Issues</h5>
              <p style="color: #374151; line-height: 1.6;">${resourceData.issues}</p>
            </div>
          ` : ''}
          
          ${!resourceData.curriculum_resources && !resourceData.janitorial_supplies && !resourceData.issues ? 
            '<div class="no-data">No resource requirements recorded for this report</div>' : ''
          }
        </div>
      `

    case 14: // Physical Education
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No physical education data available for this report</div>'
      }
      
      const peData = Array.isArray(section.data) ? section.data[0] : section.data
      
      // Handle activities array
      let activitiesList = 'N/A'
      if (peData.activities) {
        if (Array.isArray(peData.activities)) {
          activitiesList = peData.activities.join(', ') || 'N/A'
        } else if (typeof peData.activities === 'string') {
          // Try to parse as JSON if it's a string
          try {
            const parsed = JSON.parse(peData.activities)
            activitiesList = Array.isArray(parsed) ? parsed.join(', ') : peData.activities
          } catch {
            activitiesList = peData.activities
          }
        }
      }
      
      // Handle challenges array
      let challengesList = 'N/A'
      if (peData.challenges) {
        if (Array.isArray(peData.challenges)) {
          challengesList = peData.challenges.join(', ') || 'N/A'
        } else if (typeof peData.challenges === 'string') {
          // Try to parse as JSON if it's a string
          try {
            const parsed = JSON.parse(peData.challenges)
            challengesList = Array.isArray(parsed) ? parsed.join(', ') : peData.challenges
          } catch {
            challengesList = peData.challenges
          }
        }
      }
      
      return `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Physical Education Activities</div>
            <div class="info-value">${activitiesList}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Major Challenges</div>
            <div class="info-value">${challengesList}</div>
          </div>
        </div>
      `

    case 15: // Innovation
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return '<div class="no-data">No innovation data available for this report</div>'
      }
      
      const innovationData = Array.isArray(section.data) ? section.data[0] : section.data
      return `
        <div class="space-y-4">
          ${innovationData.brief_innovation_description ? `
            <div style="padding: 15px; background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px;">
              <h5 style="color: #0369a1; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Innovation Description</h5>
              <p style="color: #374151; line-height: 1.6;">${innovationData.brief_innovation_description}</p>
            </div>
          ` : ''}
          
          ${innovationData.innovation_impact_on_learning ? `
            <div style="padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
              <h5 style="color: #166534; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Impact on Learning</h5>
              <p style="color: #374151; line-height: 1.6;">${innovationData.innovation_impact_on_learning}</p>
            </div>
          ` : ''}
          
          ${innovationData.innovation_outcome ? `
            <div style="padding: 15px; background: #fefce8; border: 1px solid #fde047; border-radius: 8px;">
              <h5 style="color: #ca8a04; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Outcome</h5>
              <p style="color: #374151; line-height: 1.6;">${innovationData.innovation_outcome}</p>
            </div>
          ` : ''}
          
          ${!innovationData.brief_innovation_description && !innovationData.innovation_impact_on_learning && !innovationData.innovation_outcome ? 
            '<div class="no-data">No innovations recorded for this report</div>' : ''
          }
        </div>
      `

    default:
      if (!section.data || (Array.isArray(section.data) && section.data.length === 0)) {
        return `<div class="no-data">No ${section.name.toLowerCase()} data available for this report</div>`
      }
      
      // Generic display for other sections
      return `
        <div class="summary-card">
          <p><strong>Data Available:</strong> This section contains ${Array.isArray(section.data) ? section.data.length : 1} record(s).</p>
          <p>Please refer to the detailed view in the system for complete information.</p>
        </div>
      `
  }
}
