"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { 
  ArrowLeft, 
  Download,
  FileText, 
  ClipboardCheck, 
  Users, 
  GraduationCap,
  BookOpen,
  Activity,
  Menu,
  X,
  Loader2
} from "lucide-react"
import { getNurseryAssessmentDetails } from "@/app/actions/nursery-assessment"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface AssessmentResponse {
  id: string
  answer: number
  question_id: string
  option_id: string
  assessment_id: string
  created_at: string
  question_text: string
  question_section: string
  option_text: string
  option_section: string
}

interface DetailedAssessment {
  id: string
  created_at: string
  assessment_type: string
  enrollment: number
  status: string
  schools: {
    name: string
    region: string
    level: string
  } | null
}

interface NurseryAssessmentDetailViewProps {
  assessmentId: string
}

const sectionIcons = [
  FileText,
  ClipboardCheck,
  Users,
  BookOpen,
  GraduationCap,
  Activity
]

export function NurseryAssessmentDetailView({ assessmentId }: NurseryAssessmentDetailViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null)
  const [responses, setResponses] = useState<AssessmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(0)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const fetchAssessmentDetails = async () => {
      try {
        setLoading(true)
        const result = await getNurseryAssessmentDetails(assessmentId)
        
        if (result.error) {
          console.error('Error fetching assessment details:', result.error)
        } else {
          setAssessment(result.assessment)
          setResponses(result.responses)
          
          // Set first available section as active
          if (result.responses.length > 0) {
            setActiveSection(0) // Start with Basic Information
          }
        }
      } catch (err) {
        console.error('Error fetching assessment details:', err)
      } finally {
        setLoading(false)
      }
    }

    if (assessmentId) {
      fetchAssessmentDetails()
    }
  }, [assessmentId])

  // Group responses by section
  const groupedResponses = responses.reduce((acc, response) => {
    const section = response.question_section
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(response)
    return acc
  }, {} as Record<string, AssessmentResponse[]>)

  // Create sections array with Basic Information first
  const sections = [
    { id: 0, name: "Basic Information", icon: FileText },
    ...Object.keys(groupedResponses).map((section, index) => ({
      id: index + 1,
      name: section,
      icon: sectionIcons[Math.min(index + 1, sectionIcons.length - 1)]
    }))
  ]

  const handleSectionChange = (sectionId: number) => {
    setActiveSection(sectionId)
    setIsMobileSidebarOpen(false)
  }

  const handleBack = () => {
    const backUrl = searchParams.get('back')
    if (backUrl) {
      router.push(decodeURIComponent(backUrl))
    } else {
      // Check the current path to determine the appropriate back location
      const currentPath = window.location.pathname
      const referrer = document.referrer
      
      // Check if we came from regional officer dashboard
      if (referrer.includes('/dashboard/regional-officer') || referrer.includes('tab=nursery-assessment')) {
        router.push('/dashboard/regional-officer?tab=nursery-assessment')
      } else if (currentPath.includes('/education-official/')) {
        router.push('/dashboard/education-official/nursery-assessment')
      } else {
        // Default back to head teacher nursery assessment list
        router.push('/dashboard/head-teacher?tab=view-assessments&subtab=view-assessments&mainTab=nursery-assessment')
      }
    }
  }

  const handleExportPDF = async () => {
    if (!assessment || !responses) return
    
    setIsExporting(true)
    
    try {
      // Dynamically import jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf')
      const html2canvas = await import('html2canvas')
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let currentY = 20
      
      // Add header
      pdf.setFontSize(20)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Nursery Assessment Report', pageWidth / 2, currentY, { align: 'center' })
      currentY += 15
      
      // Add school information
      pdf.setFontSize(14)
      pdf.setTextColor(80, 80, 80)
      pdf.text(`School: ${assessment.schools?.name || 'N/A'}`, 20, currentY)
      currentY += 8
      pdf.text(`Region: ${assessment.schools?.region || 'N/A'}`, 20, currentY)
      currentY += 8
      pdf.text(`Assessment Period: ${format(new Date(assessment.created_at), 'MMMM yyyy')}`, 20, currentY)
      currentY += 8
      pdf.text(`Assessment Type: ${assessment.assessment_type || 'N/A'}`, 20, currentY)
      currentY += 8
      pdf.text(`Total Enrollment: ${assessment.enrollment || 0} students`, 20, currentY)
      currentY += 8
      pdf.text(`Date Submitted: ${format(new Date(assessment.created_at), 'PPP')}`, 20, currentY)
      currentY += 15
      
      // Group responses by section
      const groupedResponses = responses.reduce((acc, response) => {
        const section = response.question_section
        if (!acc[section]) {
          acc[section] = []
        }
        acc[section].push(response)
        return acc
      }, {} as Record<string, AssessmentResponse[]>)
      
      // Add each section
      for (const [sectionName, sectionResponses] of Object.entries(groupedResponses)) {
        // Check if we need a new page
        if (currentY > pageHeight - 40) {
          pdf.addPage()
          currentY = 20
        }
        
        // Section header
        pdf.setFontSize(16)
        pdf.setTextColor(60, 60, 160)
        pdf.text(sectionName, 20, currentY)
        currentY += 12
        
        // Group responses by question
        const questionGroups = sectionResponses.reduce((acc, response) => {
          const questionId = response.question_id
          if (!acc[questionId]) {
            acc[questionId] = {
              question: response.question_text,
              responses: []
            }
          }
          acc[questionId].responses.push(response)
          return acc
        }, {} as Record<string, { question: string, responses: AssessmentResponse[] }>)
        
        // Add each question
        for (const [questionId, group] of Object.entries(questionGroups)) {
          // Check if we need a new page
          if (currentY > pageHeight - 60) {
            pdf.addPage()
            currentY = 20
          }
          
          // Question title
          pdf.setFontSize(12)
          pdf.setTextColor(40, 40, 40)
          const questionLines = pdf.splitTextToSize(`Q: ${group.question}`, pageWidth - 40)
          pdf.text(questionLines, 20, currentY)
          currentY += questionLines.length * 6 + 5
          
          // Calculate total
          const questionTotal = group.responses.reduce((sum, r) => sum + (r.answer || 0), 0)
          const enrollment = assessment?.enrollment || 0
          const isValid = questionTotal === enrollment
          
          // Add total line
          pdf.setFontSize(10)
          if (isValid) {
            pdf.setTextColor(34, 139, 34) // Green for valid
          } else {
            pdf.setTextColor(220, 20, 60) // Red for invalid
          }
          pdf.text(`Total Students: ${questionTotal}/${enrollment} ${isValid ? '✓' : '⚠'}`, 25, currentY)
          currentY += 8
          
          // Add responses
          pdf.setFontSize(10)
          pdf.setTextColor(80, 80, 80)
          group.responses.forEach(response => {
            pdf.text(`• ${response.option_text}: ${response.answer} students`, 25, currentY)
            currentY += 6
          })
          
          currentY += 8 // Add space after each question
        }
        
        currentY += 10 // Add space after each section
      }
      
      // Add footer
      const totalPages = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(120, 120, 120)
        pdf.text(
          `Page ${i} of ${totalPages} - Generated on ${format(new Date(), 'PPP')}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }
      
      // Save the PDF
      const fileName = `Nursery_Assessment_${assessment.schools?.name?.replace(/\s+/g, '_') || 'Report'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      pdf.save(fileName)
      
      toast({
        title: "PDF Exported Successfully",
        description: `Assessment report has been saved as ${fileName}`,
        variant: "default",
      })
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  // Render section content
  const renderSectionContent = () => {
    if (activeSection === 0) {
      // Basic Information
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">School Name</label>
              <p className="text-base font-semibold mt-1.5 text-slate-900 dark:text-white">{assessment?.schools?.name || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Region</label>
              <p className="text-base font-semibold mt-1.5 text-slate-900 dark:text-white">{assessment?.schools?.region || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assessment Period</label>
              <p className="text-base font-semibold mt-1.5 text-slate-900 dark:text-white">
                {assessment ? format(new Date(assessment.created_at), 'MMMM yyyy') : 'N/A'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assessment Type</label>
              <p className="text-base font-semibold mt-1.5 text-slate-900 dark:text-white">{assessment?.assessment_type || 'N/A'}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Enrollment</label>
              <p className="text-base font-semibold mt-1.5 text-blue-600 dark:text-blue-400">{assessment?.enrollment || 0} <span className="text-sm font-normal text-slate-600 dark:text-slate-400">students</span></p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Submitted</label>
              <p className="text-base font-semibold mt-1.5 text-slate-900 dark:text-white">
                {assessment ? format(new Date(assessment.created_at), 'PPP') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Assessment sections
    const sectionName = sections[activeSection]?.name
    const sectionResponses = sectionName ? groupedResponses[sectionName] || [] : []

    if (!sectionName || sectionResponses.length === 0) {
      return (
        <div className="text-center py-12 px-6 bg-slate-50 dark:bg-[hsl(222,47%,11%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mx-auto mb-4">
            <ClipboardCheck className="h-10 w-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No assessment data available for this section</p>
        </div>
      )
    }

    // Group responses by question to show all options for each question
    const questionGroups = sectionResponses.reduce((acc, response) => {
      const questionId = response.question_id
      if (!acc[questionId]) {
        acc[questionId] = {
          question: response.question_text,
          responses: []
        }
      }
      acc[questionId].responses.push(response)
      return acc
    }, {} as Record<string, { question: string, responses: AssessmentResponse[] }>)

    return (
      <div className="space-y-5">
        {Object.entries(questionGroups).map(([questionId, group]) => (
          <div key={questionId} className="bg-slate-50 dark:bg-[hsl(222,47%,11%)] border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-5">
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question</label>
              <p className="text-sm font-semibold mt-1.5 text-slate-900 dark:text-white">{group.question}</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Responses</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {group.responses.map((response) => (
                  <div key={response.id} className="p-3 bg-white dark:bg-[hsl(222,47%,9%)] rounded-lg border border-slate-200/80 dark:border-slate-700/50 text-center transition-all hover:border-blue-300 dark:hover:border-blue-600">
                    <div className="mb-2">
                      <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Response</label>
                      <p className="text-xs font-medium mt-0.5 text-slate-700 dark:text-slate-300">{response.option_text}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/50">
                      <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Count</label>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{response.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-72px)] bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="text-center p-8 bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-slate-600 dark:text-slate-400">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-72px)] bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="text-center p-8 bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
          <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl w-fit mx-auto mb-4">
            <FileText className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Assessment Not Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">The requested assessment could not be loaded.</p>
          <Button onClick={handleBack} variant="outline" className="border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-72px)] overflow-hidden bg-slate-50 dark:bg-[hsl(222,47%,6%)] p-4 lg:p-6">
      <Card className="h-full flex flex-col shadow-sm bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50 rounded-xl overflow-hidden max-w-6xl mx-auto">
        <CardHeader className="flex-shrink-0 border-b border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-[hsl(222,47%,9%)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2 flex-shrink-0 min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Go back to previous page"
                tabIndex={0}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg md:text-xl lg:text-2xl font-bold truncate">
                  {assessment.schools?.name || 'Nursery Assessment'}
                </CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                  {assessment.schools?.region} • {format(new Date(assessment.created_at), 'MMMM yyyy')}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Export assessment as PDF"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </span>
                <span className="sm:hidden">
                  {isExporting ? 'Generating...' : 'Export'}
                </span>
              </Button>
              
              <Select value={format(new Date(assessment.created_at), 'MMMM yyyy')}>
                <SelectTrigger className="w-full sm:w-48 md:w-56 lg:w-64 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={format(new Date(assessment.created_at), 'MMMM yyyy')}>
                    {format(new Date(assessment.created_at), 'MMMM yyyy')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex overflow-hidden p-0 relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
          )}
          
          {/* Responsive Sidebar */}
          <div className={`
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
            fixed md:static
            inset-y-0 left-0
            z-50 md:z-auto
            w-56 md:w-60 lg:w-64
            flex-shrink-0
            border-r border-slate-200 dark:border-slate-700/50
            bg-white dark:bg-[hsl(222,47%,9%)]
            flex flex-col
            overflow-hidden
            transition-transform duration-300 ease-in-out
            md:transition-none
          `}>
            <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Assessment Sections</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Navigate sections</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileSidebar}
                  className="md:hidden flex items-center justify-center h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent" role="navigation" aria-label="Assessment sections navigation">
              <div className="space-y-0.5 p-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200 text-left min-h-[36px] focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => handleSectionChange(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSectionChange(section.id)
                        }
                      }}
                      aria-label={`Navigate to ${section.name} section`}
                      aria-current={isActive ? "page" : undefined}
                      tabIndex={0}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true" />
                      <span className="text-sm font-medium leading-tight">{section.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[hsl(222,47%,9%)]">
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,8%)] flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileSidebar}
                  className="md:hidden flex items-center justify-center h-8 w-8 p-0 mr-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>

                {(() => {
                  const section = sections.find(s => s.id === activeSection)
                  const Icon = section?.icon || FileText
                  return (
                    <>
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                      <h2 className="text-base lg:text-lg font-semibold text-slate-900 dark:text-white truncate min-w-0 flex-1">{section?.name}</h2>
                    </>
                  )
                })()}
                <Badge className="ml-auto flex-shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/20 text-xs font-medium">
                  {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent bg-white dark:bg-[hsl(222,47%,9%)]" role="main" aria-live="polite" aria-label="Assessment content area">
              {renderSectionContent()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
