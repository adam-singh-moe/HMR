"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { FileTextIcon, ChevronLeft, ChevronRight, BookOpenIcon, Loader2, Save } from "lucide-react"
import { getUserSchoolInfo, getUser } from "@/app/actions/auth"
import { getNurseryAssessmentQuestions } from "@/app/actions/nursery-assessment"
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
  // Section 2: Autobiographical Knowledge Assessment responses
  autobiographicalResponses: { 
    [questionId: string]: {
      fullSentenceResponse: number
      singleWordOrPhraseResponse: number
      incorrectResponse: number
      noResponseGiven: number
    }
  }
  // Section 3: Alphabet Recitation and Identification responses
  alphabetResponses: {
    [questionId: string]: {
      range1to6Correct: number
      range7to12Correct: number
      range13to18Correct: number
      range19to26Correct: number
    }
  }
  // Section 4: Colour Identification responses
  colourResponses: {
    [questionId: string]: {
      oneCorrect: number
      twoCorrect: number
      threeCorrect: number
    }
  }
  // Section 5: Quantity Differentiation and Counting Fluency responses
  quantityCountingResponses: {
    [questionId: string]: {
      // For Quantity Differentiation
      numberCorrect?: number
      numberIncorrect?: number
      // For Counting Fluency
      range1to10Correct?: number
      range11to20Correct?: number
      range20PlusCorrect?: number
    }
  }
  // Section 6: Shape Recognition and One on One Correspondence responses
  shapeRecognitionResponses: {
    [questionId: string]: {
      // For Shape Recognition questions
      oneCorrect?: number
      twoCorrect?: number
      threeCorrect?: number
      // For other questions (One on One Correspondence, Number Identification)
      range1to5Correct?: number
      range6to10Correct?: number
    }
  }
  // Section 7: Motor Skills responses
  motorSkillsResponses: {
    [questionId: string]: {
      // For Picture of Yourself
      range1to4Correct?: number
      range5to8Correct?: number
      // For Pencil Grip
      cylindricalGrasp?: number
      digital?: number
      modifiedTripodGrasp?: number
      tripod?: number
      // For Letter Formation
      scribbleUR?: number
      scribbleR?: number
      approximation?: number
      name?: number
    }
  }
  // Section 8: Gross Motor Skills responses
  grossMotorSkillsResponses: {
    [questionId: string]: {
      // For throw and catch (1-5 times)
      oneTime?: number
      twoTimes?: number
      threeTimes?: number
      fourTimes?: number
      fiveTimes?: number
      // For one leg hop and two leg hop (1-3 times)
      oneLegOneTime?: number
      oneLegTwoTimes?: number
      oneLegThreeTimes?: number
      // For stand on one leg (left/right)
      left?: number
      right?: number
    }
  }
}

interface SchoolInfo {
  id: string
  name: string
  level: string
  region: string
}

const SECTIONS = [
  "Basic Information",
  "Autobiographical Knowledge Assessment",
  "Alphabet Recitation and Identification",
  "Colour Identification",
  "Quantity Differentiation and Counting Fluency",
  "Shape Recognition and One on One Correspondence",
  "Motor Skills",
  "Gross Motor Skills"
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
  const [questions, setQuestions] = useState<any[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    schoolName: "",
    region: "",
    date: new Date().toISOString().split('T')[0], // Today's date
    schoolGrade: "",
    headTeacherName: "",
    assessmentType: "",
    autobiographicalResponses: {},
    alphabetResponses: {},
    colourResponses: {},
    quantityCountingResponses: {},
    shapeRecognitionResponses: {},
    motorSkillsResponses: {},
    grossMotorSkillsResponses: {}
  })

  // Helper function to handle response changes
  const handleResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      autobiographicalResponses: {
        ...prev.autobiographicalResponses,
        [questionId]: {
          fullSentenceResponse: 0,
          singleWordOrPhraseResponse: 0,
          incorrectResponse: 0,
          noResponseGiven: 0,
          ...prev.autobiographicalResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Helper function to handle alphabet response changes
  const handleAlphabetResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      alphabetResponses: {
        ...prev.alphabetResponses,
        [questionId]: {
          range1to6Correct: 0,
          range7to12Correct: 0,
          range13to18Correct: 0,
          range19to26Correct: 0,
          ...prev.alphabetResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Helper function to handle colour response changes
  const handleColourResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      colourResponses: {
        ...prev.colourResponses,
        [questionId]: {
          oneCorrect: 0,
          twoCorrect: 0,
          threeCorrect: 0,
          ...prev.colourResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Helper function to handle quantity/counting response changes
  const handleQuantityCountingResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      quantityCountingResponses: {
        ...prev.quantityCountingResponses,
        [questionId]: {
          ...prev.quantityCountingResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Helper function to handle shape recognition response changes
  const handleShapeRecognitionResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      shapeRecognitionResponses: {
        ...prev.shapeRecognitionResponses,
        [questionId]: {
          ...prev.shapeRecognitionResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Helper function to handle motor skills response changes
  const handleMotorSkillsResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      motorSkillsResponses: {
        ...prev.motorSkillsResponses,
        [questionId]: {
          ...prev.motorSkillsResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Helper function to handle gross motor skills response changes
  const handleGrossMotorSkillsResponseChange = (questionId: string, category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      grossMotorSkillsResponses: {
        ...prev.grossMotorSkillsResponses,
        [questionId]: {
          oneTime: 0,
          twoTimes: 0,
          threeTimes: 0,
          fourTimes: 0,
          fiveTimes: 0,
          oneLegOneTime: 0,
          oneLegTwoTimes: 0,
          oneLegThreeTimes: 0,
          left: 0,
          right: 0,
          ...prev.grossMotorSkillsResponses[questionId],
          [category]: value
        }
      }
    }))
  }

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

  // Load questions when entering sections 2, 3, 4, 5, 6, 7, or 8
  useEffect(() => {
    if (currentSection === 1) {
      loadQuestions("Autobiographical Knowledge")
    } else if (currentSection === 2) {
      loadQuestions("Alphabet Recitation and Identification")
    } else if (currentSection === 3) {
      loadQuestions("Colour Identification")
    } else if (currentSection === 4) {
      loadQuestions("Quantity Differentiation and Counting Fluency")
    } else if (currentSection === 5) {
      loadQuestions("Shape Recognition and One on One Correspondence")
    } else if (currentSection === 6) {
      loadQuestions("Motor Skills")
    } else if (currentSection === 7) {
      loadQuestions("Gross Motor Skills")
    }
  }, [currentSection])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const loadQuestions = async (section: string) => {
    setQuestionsLoading(true)
    try {
     // console.log('Loading questions for section:', section)
      const result = await getNurseryAssessmentQuestions(section)
     // console.log('Questions result:', result)
      if (!result.error) {
        setQuestions(result.questions)
        // console.log('Questions loaded:', result.questions.length)
      } else {
        console.error("Error loading questions:", result.error)
        toast({
          title: "Error",
          description: "Failed to load questions: " + result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading questions:", error)
      toast({
        title: "Error", 
        description: "Failed to load questions",
        variant: "destructive",
      })
    } finally {
      setQuestionsLoading(false)
    }
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

  const renderAutobiographicalKnowledge = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Instructions</h4>
            <p className="text-sm text-blue-700">
              Record based on the responses made by the students, the total number for each category.
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Response Categories Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Full Sentence Response */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Full Sentence Response
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.autobiographicalResponses[question.id]?.fullSentenceResponse || ""}
                        onChange={(e) => handleResponseChange(question.id, 'fullSentenceResponse', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* Single Word or Phrase Response */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Single Word or Phrase Response
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.autobiographicalResponses[question.id]?.singleWordOrPhraseResponse || ""}
                        onChange={(e) => handleResponseChange(question.id, 'singleWordOrPhraseResponse', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* Incorrect Response */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Incorrect Response
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.autobiographicalResponses[question.id]?.incorrectResponse || ""}
                        onChange={(e) => handleResponseChange(question.id, 'incorrectResponse', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* No Response Given */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        No Response Given
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.autobiographicalResponses[question.id]?.noResponseGiven || ""}
                        onChange={(e) => handleResponseChange(question.id, 'noResponseGiven', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                  </div>
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {(formData.autobiographicalResponses[question.id]?.fullSentenceResponse || 0) +
                         (formData.autobiographicalResponses[question.id]?.singleWordOrPhraseResponse || 0) +
                         (formData.autobiographicalResponses[question.id]?.incorrectResponse || 0) +
                         (formData.autobiographicalResponses[question.id]?.noResponseGiven || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAlphabetRecitation = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-green-900 mb-1">Instructions</h4>
            <p className="text-sm text-green-700">
              Record the total number of students based on how many they got correct for each question.
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Response Categories Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1-6 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        1 - 6 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.alphabetResponses[question.id]?.range1to6Correct || ""}
                        onChange={(e) => handleAlphabetResponseChange(question.id, 'range1to6Correct', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* 7-12 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        7 - 12 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.alphabetResponses[question.id]?.range7to12Correct || ""}
                        onChange={(e) => handleAlphabetResponseChange(question.id, 'range7to12Correct', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* 13-18 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        13 - 18 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.alphabetResponses[question.id]?.range13to18Correct || ""}
                        onChange={(e) => handleAlphabetResponseChange(question.id, 'range13to18Correct', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* 19-26 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        19 - 26 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.alphabetResponses[question.id]?.range19to26Correct || ""}
                        onChange={(e) => handleAlphabetResponseChange(question.id, 'range19to26Correct', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                  </div>
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {(formData.alphabetResponses[question.id]?.range1to6Correct || 0) +
                         (formData.alphabetResponses[question.id]?.range7to12Correct || 0) +
                         (formData.alphabetResponses[question.id]?.range13to18Correct || 0) +
                         (formData.alphabetResponses[question.id]?.range19to26Correct || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderColourIdentification = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-purple-900 mb-1">Instructions</h4>
            <p className="text-sm text-purple-700">
              Record the total number of students based on how many colors they got correct for each question.
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Response Categories Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        1 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.colourResponses[question.id]?.oneCorrect || ""}
                        onChange={(e) => handleColourResponseChange(question.id, 'oneCorrect', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* 2 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        2 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.colourResponses[question.id]?.twoCorrect || ""}
                        onChange={(e) => handleColourResponseChange(question.id, 'twoCorrect', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                    
                    {/* 3 Correct */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        3 Correct
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.colourResponses[question.id]?.threeCorrect || ""}
                        onChange={(e) => handleColourResponseChange(question.id, 'threeCorrect', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </div>
                  </div>
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {(formData.colourResponses[question.id]?.oneCorrect || 0) +
                         (formData.colourResponses[question.id]?.twoCorrect || 0) +
                         (formData.colourResponses[question.id]?.threeCorrect || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderQuantityAndCounting = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-orange-900 mb-1">Instructions</h4>
            <p className="text-sm text-orange-700">
              Record the total number of students based on their performance for each question. For Quantity Differentiation, record correct/incorrect responses. For Counting Fluency, record based on the counting range achieved.
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Conditional Response Categories based on question type */}
                  {question.questions.toLowerCase().includes('quantity') ? (
                    // Quantity Differentiation options
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Number Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.quantityCountingResponses[question.id]?.numberCorrect || ""}
                          onChange={(e) => handleQuantityCountingResponseChange(question.id, 'numberCorrect', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Number Incorrect
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.quantityCountingResponses[question.id]?.numberIncorrect || ""}
                          onChange={(e) => handleQuantityCountingResponseChange(question.id, 'numberIncorrect', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : (
                    // Counting Fluency options
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          1 - 10 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.quantityCountingResponses[question.id]?.range1to10Correct || ""}
                          onChange={(e) => handleQuantityCountingResponseChange(question.id, 'range1to10Correct', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          11 - 20 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.quantityCountingResponses[question.id]?.range11to20Correct || ""}
                          onChange={(e) => handleQuantityCountingResponseChange(question.id, 'range11to20Correct', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          20 + Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.quantityCountingResponses[question.id]?.range20PlusCorrect || ""}
                          onChange={(e) => handleQuantityCountingResponseChange(question.id, 'range20PlusCorrect', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {question.questions.toLowerCase().includes('quantity') ? (
                          (formData.quantityCountingResponses[question.id]?.numberCorrect || 0) +
                          (formData.quantityCountingResponses[question.id]?.numberIncorrect || 0)
                        ) : (
                          (formData.quantityCountingResponses[question.id]?.range1to10Correct || 0) +
                          (formData.quantityCountingResponses[question.id]?.range11to20Correct || 0) +
                          (formData.quantityCountingResponses[question.id]?.range20PlusCorrect || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderShapeRecognition = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-indigo-900 mb-1">Instructions</h4>
            <p className="text-sm text-indigo-700">
              Record the total number of students based on their correct and incorrect responses for each shape recognition and one-to-one correspondence question.
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Conditional Response Categories based on question type */}
                  {question.questions.toLowerCase().includes('shape') ? (
                    // Shape Recognition options (1, 2, 3 correct)
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          1 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.shapeRecognitionResponses[question.id]?.oneCorrect || ""}
                          onChange={(e) => handleShapeRecognitionResponseChange(question.id, 'oneCorrect', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          2 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.shapeRecognitionResponses[question.id]?.twoCorrect || ""}
                          onChange={(e) => handleShapeRecognitionResponseChange(question.id, 'twoCorrect', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          3 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.shapeRecognitionResponses[question.id]?.threeCorrect || ""}
                          onChange={(e) => handleShapeRecognitionResponseChange(question.id, 'threeCorrect', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : (
                    // Other questions options (1-5 correct, 6-10 correct)
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          1 - 5 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.shapeRecognitionResponses[question.id]?.range1to5Correct || ""}
                          onChange={(e) => handleShapeRecognitionResponseChange(question.id, 'range1to5Correct', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          6 - 10 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.shapeRecognitionResponses[question.id]?.range6to10Correct || ""}
                          onChange={(e) => handleShapeRecognitionResponseChange(question.id, 'range6to10Correct', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {question.questions.toLowerCase().includes('shape') ? (
                          (formData.shapeRecognitionResponses[question.id]?.oneCorrect || 0) +
                          (formData.shapeRecognitionResponses[question.id]?.twoCorrect || 0) +
                          (formData.shapeRecognitionResponses[question.id]?.threeCorrect || 0)
                        ) : (
                          (formData.shapeRecognitionResponses[question.id]?.range1to5Correct || 0) +
                          (formData.shapeRecognitionResponses[question.id]?.range6to10Correct || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderMotorSkills = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-teal-900 mb-1">Instructions</h4>
            <p className="text-sm text-teal-700">
              Record the total number of students based on their correct and incorrect responses for each motor skills assessment question.
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-teal-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Conditional Response Categories based on question type */}
                  {question.questions.toLowerCase().includes('picture') ? (
                    // Picture of Yourself options (1-4 correct, 5-8 correct)
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          1 - 4 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.range1to4Correct || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'range1to4Correct', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          5 - 8 Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.range5to8Correct || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'range5to8Correct', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : question.questions.toLowerCase().includes('pencil') || question.questions.toLowerCase().includes('grip') ? (
                    // Pencil Grip options
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Cylindrical Grasp
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.cylindricalGrasp || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'cylindricalGrasp', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Digital
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.digital || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'digital', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Modified Tripod Grasp
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.modifiedTripodGrasp || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'modifiedTripodGrasp', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Tripod
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.tripod || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'tripod', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : question.questions.toLowerCase().includes('letter') || question.questions.toLowerCase().includes('formation') ? (
                    // Letter Formation options
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Scribble (UR)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.scribbleUR || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'scribbleUR', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Scribble (R)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.scribbleR || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'scribbleR', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Approximation
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.approximation || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'approximation', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Name
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.motorSkillsResponses[question.id]?.name || ""}
                          onChange={(e) => handleMotorSkillsResponseChange(question.id, 'name', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : (
                    // Default fallback (should not be reached)
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-gray-500">No options available for this question type</div>
                    </div>
                  )}
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {question.questions.toLowerCase().includes('picture') ? (
                          (formData.motorSkillsResponses[question.id]?.range1to4Correct || 0) +
                          (formData.motorSkillsResponses[question.id]?.range5to8Correct || 0)
                        ) : question.questions.toLowerCase().includes('pencil') || question.questions.toLowerCase().includes('grip') ? (
                          (formData.motorSkillsResponses[question.id]?.cylindricalGrasp || 0) +
                          (formData.motorSkillsResponses[question.id]?.digital || 0) +
                          (formData.motorSkillsResponses[question.id]?.modifiedTripodGrasp || 0) +
                          (formData.motorSkillsResponses[question.id]?.tripod || 0)
                        ) : question.questions.toLowerCase().includes('letter') || question.questions.toLowerCase().includes('formation') ? (
                          (formData.motorSkillsResponses[question.id]?.scribbleUR || 0) +
                          (formData.motorSkillsResponses[question.id]?.scribbleR || 0) +
                          (formData.motorSkillsResponses[question.id]?.approximation || 0) +
                          (formData.motorSkillsResponses[question.id]?.name || 0)
                        ) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderGrossMotorSkills = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpenIcon className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-emerald-900 mb-1">Instructions</h4>
            <p className="text-sm text-emerald-700">
              Record the total number of students based on their performance for each gross motor skills assessment question. Scoring varies by activity: Throw/Catch (1-5 times), Hop activities (1-3 times), Stand on One Leg (Left/Right).
            </p>
          </div>
        </div>
      </div>

      {questionsLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading assessment questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-600">Unable to load assessment questions for this section.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-emerald-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-4">{question.questions}</h4>
                  
                  {/* Conditional Response Categories based on question type */}
                  {(question.questions.toLowerCase().includes('throw') || question.questions.toLowerCase().includes('catch')) ? (
                    // Throw and Catch: 1-5 Times
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          1 Time
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.oneTime || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'oneTime', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          2 Times
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.twoTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'twoTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          3 Times
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.threeTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'threeTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          4 Times
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.fourTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'fourTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          5 Times
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.fiveTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'fiveTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : (question.questions.toLowerCase().includes('hop')) ? (
                    // One/Two Leg Hop: 1-3 Times
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          1 Time
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.oneLegOneTime || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'oneLegOneTime', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          2 Times
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.oneLegTwoTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'oneLegTwoTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          3 Times
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.oneLegThreeTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'oneLegThreeTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : (question.questions.toLowerCase().includes('stand')) ? (
                    // Stand on One Leg: Left/Right
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Left
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.left || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'left', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Right
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.right || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'right', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ) : (
                    // Default: Number Correct/Incorrect (fallback)
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Number Correct
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.oneTime || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'oneTime', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Number Incorrect
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.twoTimes || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'twoTimes', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Total Count Display */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium text-gray-900">
                        {(() => {
                          const responses = formData.grossMotorSkillsResponses[question.id] || {}
                          if (question.questions.toLowerCase().includes('throw') || question.questions.toLowerCase().includes('catch')) {
                            return (responses.oneTime || 0) + (responses.twoTimes || 0) + (responses.threeTimes || 0) + (responses.fourTimes || 0) + (responses.fiveTimes || 0)
                          } else if (question.questions.toLowerCase().includes('hop')) {
                            return (responses.oneLegOneTime || 0) + (responses.oneLegTwoTimes || 0) + (responses.oneLegThreeTimes || 0)
                          } else if (question.questions.toLowerCase().includes('stand')) {
                            return (responses.left || 0) + (responses.right || 0)
                          } else {
                            return (responses.oneTime || 0) + (responses.twoTimes || 0)
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderBasicInformation()
      case 1:
        return renderAutobiographicalKnowledge()
      case 2:
        return renderAlphabetRecitation()
      case 3:
        return renderColourIdentification()
      case 4:
        return renderQuantityAndCounting()
      case 5:
        return renderShapeRecognition()
      case 6:
        return renderMotorSkills()
      case 7:
        return renderGrossMotorSkills()
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