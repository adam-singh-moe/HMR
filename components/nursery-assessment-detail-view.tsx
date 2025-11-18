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
      const totalPages = pdf.internal.getNumberOfPages()
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">School Name</label>
              <p className="text-lg font-semibold mt-2 leading-7">{assessment?.schools?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Region</label>
              <p className="text-lg font-semibold mt-2 leading-7">{assessment?.schools?.region || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Assessment Period</label>
              <p className="text-lg font-semibold mt-2 leading-7">
                {assessment ? format(new Date(assessment.created_at), 'MMMM yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Assessment Type</label>
              <p className="text-lg font-semibold mt-2 leading-7">{assessment?.assessment_type || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Total Enrollment</label>
              <p className="text-lg font-semibold mt-2 leading-7">{assessment?.enrollment || 0} students</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground leading-5">Date Submitted</label>
              <p className="text-lg font-semibold mt-2 leading-7">
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
        <div className="text-center py-8">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground leading-6">No assessment data available for this section</p>
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
      <div className="space-y-6">
        {Object.entries(questionGroups).map(([questionId, group]) => (
          <div key={questionId} className="bg-background border rounded-lg p-6">
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground leading-5">Question</label>
              <p className="text-lg font-semibold mt-1 leading-7">{group.question}</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground leading-5">Student Responses</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {group.responses.map((response) => (
                  <div key={response.id} className="p-3 bg-white/80 rounded-md border border-gray-200 text-center">
                    <div className="mb-2">
                      <label className="text-xs font-medium text-muted-foreground leading-4">Response Type</label>
                      <p className="text-sm font-semibold mt-1 leading-5 break-words">{response.option_text}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground leading-4">Count</label>
                      <p className="text-2xl font-bold text-primary mt-1 leading-6">{response.answer}</p>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="p-6 bg-red-50 rounded-full w-fit mx-auto mb-4">
            <FileText className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment Not Found</h3>
          <p className="text-gray-600 mb-4">The requested assessment could not be loaded.</p>
          <Button onClick={handleBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="flex-shrink-0 border-b bg-background/95 backdrop-blur-sm">
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
            w-64 md:w-72 lg:w-80 
            flex-shrink-0 
            border-r 
            bg-background md:bg-gradient-to-b md:from-muted/30 md:to-muted/50 
            flex flex-col 
            overflow-hidden
            transition-transform duration-300 ease-in-out
            md:transition-none
          `}>
            <div className="p-3 md:p-3.5 lg:p-4 border-b bg-background flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-foreground">Assessment Sections</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 break-words">Navigate between sections</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeMobileSidebar}
                  className="md:hidden flex items-center justify-center min-h-[32px] min-w-[32px] p-1 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent bg-background md:bg-transparent" role="navigation" aria-label="Assessment sections navigation">
              <div className="space-y-1 p-3 md:p-3.5 lg:p-4">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <Button
                      key={section.id}
                      variant={activeSection === section.id ? "default" : "ghost"}
                      className={`w-full justify-start h-auto py-3 md:py-3.5 px-3 md:px-3.5 lg:px-4 text-sm md:text-sm lg:text-base transition-all duration-200 hover:scale-105 min-h-[44px] focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        activeSection === section.id 
                          ? "hover:shadow-md" 
                          : "hover:bg-accent"
                      }`}
                      onClick={() => handleSectionChange(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSectionChange(section.id)
                        }
                      }}
                      aria-label={`Navigate to ${section.name} section`}
                      aria-current={activeSection === section.id ? "page" : undefined}
                      tabIndex={0}
                    >
                      <Icon className="h-4 w-4 md:h-4.5 md:w-4.5 lg:h-5 lg:w-5 mr-2.5 md:mr-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-left text-sm md:text-sm lg:text-base font-medium break-words hyphens-auto leading-tight whitespace-normal flex-1 text-wrap">{section.name}</span>
                      {activeSection === section.id && (
                        <div className="ml-auto w-2 h-2 bg-current rounded-full flex-shrink-0 mt-1" aria-hidden="true"></div>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="p-3 lg:p-4 border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileSidebar}
                  className="md:hidden flex items-center justify-center min-h-[36px] min-w-[36px] p-1 mr-1 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
                
                {(() => {
                  const section = sections.find(s => s.id === activeSection)
                  const Icon = section?.icon || FileText
                  return (
                    <>
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                      <h2 className="text-lg lg:text-xl font-semibold truncate min-w-0 flex-1">{section?.name}</h2>
                    </>
                  )
                })()}
                <Badge variant="outline" className="ml-auto flex-shrink-0">
                  {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent" role="main" aria-live="polite" aria-label="Assessment content area">
              {renderSectionContent()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
