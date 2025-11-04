"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { FileTextIcon, ChevronLeft, ChevronRight, BookOpenIcon, Loader2, Save } from "lucide-react"
import { getUserSchoolInfo, getUser } from "@/app/actions/auth"
import { useToast } from "@/components/ui/use-toast"

interface NurseryAssessmentFormProps {
  onSuccess?: () => void
}

interface FormData {
  // Basic Information
  schoolName: string
  region: string
  date: string
  schoolGrade: string
  headTeacherName: string
  assessmentType: string
}

interface SchoolInfo {
  id: string
  name: string
  level: string
  region: string
}

const SECTIONS = [
  "Basic Information",
  "Student Assessment",
  "Learning Milestones",
  "Development Tracking",
  "Progress Monitoring"
]

const ASSESSMENT_TYPES = [
  { value: "assessment-1-year-1", label: "Assessment 1 - Year 1" },
  { value: "assessment-2-year-2", label: "Assessment 2 - Year 2" },
  { value: "assessment-3-year-2", label: "Assessment 3 - Year 2" }
]

export function NurseryAssessmentForm({ onSuccess }: NurseryAssessmentFormProps) {
  const { toast } = useToast()
  const [currentSection, setCurrentSection] = useState(0)
  const [loading, setLoading] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [savedSections, setSavedSections] = useState<Set<number>>(new Set())
  
  const [formData, setFormData] = useState<FormData>({
    schoolName: "",
    region: "",
    date: new Date().toISOString().split('T')[0], // Today's date
    schoolGrade: "",
    headTeacherName: "",
    assessmentType: ""
  })

  // Load school information
  useEffect(() => {
    const loadSchoolInfo = async () => {
      try {
        // Get school info
        const schoolResult = await getUserSchoolInfo()
        if (!schoolResult.error && schoolResult.school) {
          setSchoolInfo(schoolResult.school)
          
          // Get user info for head teacher name
          const userResult = await getUser()
          
          // Auto-fill form data
          setFormData(prev => ({
            ...prev,
            schoolName: schoolResult.school.name,
            region: schoolResult.school.region,
            schoolGrade: schoolResult.school.level,
            headTeacherName: userResult?.name || userResult?.email || "Loading..."
          }))
        } else {
          console.error("Error loading school info:", schoolResult.error)
        }
      } catch (error) {
        console.error("Error loading school info:", error)
      }
    }
    
    loadSchoolInfo()
  }, [])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveCurrentSection = async () => {
    setLoading(true)
    try {
      // TODO: Implement save logic for current section
      // For now, just mark as saved
      setSavedSections(prev => new Set([...prev, currentSection]))
      
      toast({
        title: "Section Saved",
        description: `${SECTIONS[currentSection]} has been saved successfully.`,
      })
    } catch (error) {
      console.error("Error saving section:", error)
      toast({
        title: "Error",
        description: "Failed to save section. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const nextSection = () => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const previousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const calculateProgress = () => {
    return (savedSections.size / SECTIONS.length) * 100
  }

  const renderBasicInformation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School Name */}
        <div className="space-y-2">
          <Label htmlFor="schoolName" className="text-sm font-medium text-gray-700">
            School Name
          </Label>
          <Input
            id="schoolName"
            value={formData.schoolName}
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Region */}
        <div className="space-y-2">
          <Label htmlFor="region" className="text-sm font-medium text-gray-700">
            Region
          </Label>
          <Input
            id="region"
            value={formData.region}
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-medium text-gray-700">
            Assessment Date
          </Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full"
          />
        </div>

        {/* School Grade */}
        <div className="space-y-2">
          <Label htmlFor="schoolGrade" className="text-sm font-medium text-gray-700">
            School Level
          </Label>
          <Input
            id="schoolGrade"
            value={formData.schoolGrade}
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Head Teacher Name */}
        <div className="space-y-2">
          <Label htmlFor="headTeacherName" className="text-sm font-medium text-gray-700">
            Head Teacher Name
          </Label>
          <Input
            id="headTeacherName"
            value={formData.headTeacherName}
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Assessment Type */}
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="assessmentType" className="text-sm font-medium text-gray-700">
            Assessment Type <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.assessmentType} 
            onValueChange={(value) => handleInputChange('assessmentType', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select assessment type" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Assessment Information</h4>
            <p className="text-sm text-blue-700">
              This nursery assessment will track developmental milestones and learning progress for students in your nursery school. 
              Please ensure all information is accurate before proceeding.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderBasicInformation()
      case 1:
        return (
          <div className="text-center py-12">
            <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Assessment Section</h3>
            <p className="text-gray-600">This section will contain student assessment details.</p>
          </div>
        )
      case 2:
        return (
          <div className="text-center py-12">
            <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Learning Milestones Section</h3>
            <p className="text-gray-600">This section will track learning milestones.</p>
          </div>
        )
      case 3:
        return (
          <div className="text-center py-12">
            <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Development Tracking Section</h3>
            <p className="text-gray-600">This section will track student development.</p>
          </div>
        )
      case 4:
        return (
          <div className="text-center py-12">
            <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Monitoring Section</h3>
            <p className="text-gray-600">This section will monitor student progress.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Progress Tabs - Hidden on mobile */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Nursery Assessment Report
            </h2>
            <div className="text-sm text-gray-600">
              {Math.round(calculateProgress())}% Complete
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between min-w-max px-2">
              {SECTIONS.map((section, index) => {
                const isCompleted = savedSections.has(index)
                const isCurrent = index === currentSection
                
                return (
                  <div key={index} className="flex items-center">
                    {/* Circle and Content */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => setCurrentSection(index)}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 transition-all duration-200
                          ${isCurrent 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100' 
                            : isCompleted 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }
                          cursor-pointer
                        `}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </button>
                      
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-900 mb-1 max-w-[80px] leading-tight">
                          {section}
                        </div>
                        <div className={`text-xs ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                          {isCompleted ? '100%' : isCurrent ? '50%' : '0%'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Connecting Line */}
                    {index < SECTIONS.length - 1 && (
                      <div className={`
                        w-8 h-0.5 mx-2 mt-[-24px]
                        ${savedSections.has(index) ? 'bg-green-500' : 'bg-gray-200'}
                      `} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Card className="gradient-card border-0 shadow-lg">
        <CardHeader className="gradient-header text-white rounded-t-lg p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <BookOpenIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl">
                Section {currentSection + 1} of {SECTIONS.length}: {SECTIONS[currentSection]}
              </CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                Complete this section to continue with your assessment
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="min-h-[400px] sm:min-h-[500px]">
            {renderCurrentSection()}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t">
            <Button
              variant="outline"
              onClick={previousSection}
              disabled={currentSection === 0}
              className="order-2 sm:order-1 w-full sm:w-auto flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <Button
                onClick={saveCurrentSection}
                disabled={loading}
                variant="outline"
                className="w-full sm:w-auto border border-primary-600 text-primary-600 hover:bg-primary-50 transition-all duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? "Saving..." : "Save Section"}
              </Button>

              {currentSection === SECTIONS.length - 1 ? (
                <Button
                  onClick={() => {
                    // TODO: Handle final submission
                    toast({
                      title: "Assessment Submitted",
                      description: "Your nursery assessment has been submitted successfully.",
                    })
                    onSuccess?.()
                  }}
                  className="w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200"
                >
                  Submit Assessment
                </Button>
              ) : (
                <Button
                  onClick={nextSection}
                  disabled={currentSection === SECTIONS.length - 1}
                  className="w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}