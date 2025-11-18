"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useMemo } from "react"
import { FileTextIcon, ChevronLeft, ChevronRight, BookOpenIcon, Loader2, Save } from "lucide-react"
import { getUserSchoolInfo, getUser } from "@/app/actions/auth"
import { getNurseryAssessmentQuestions, saveNurseryAssessment, updateNurseryAssessment, loadNurseryAssessment, autoSaveNurseryAssessment, saveAssessmentAnswer, getQuestionOptions, loadNurseryAssessmentResponses, loadSavedResponses, checkYearlyAssessmentLimits } from "@/app/actions/nursery-assessment"
import { useToast } from "@/components/ui/use-toast"
import { useAutoSave } from "@/hooks/use-auto-save"

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
  enrollment: string
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
      // For stand on one leg (left/right/both)
      left?: number
      right?: number
      both?: number
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

// Helper function to get sections based on assessment type
const getAvailableSections = (assessmentType: string) => {
  if (assessmentType === 'assessment-1-year-1') {
    // Exclude Gross Motor Skills for Assessment 1 - Year 1
    return SECTIONS.slice(0, -1)
  }
  return SECTIONS
}

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
  const [questionOptions, setQuestionOptions] = useState<{ [questionId: string]: any[] }>({})
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [yearlyLimits, setYearlyLimits] = useState<{
    allThreeSubmitted: boolean
    availableTypes: string[]
    submittedTypes: string[]
  }>({
    allThreeSubmitted: false,
    availableTypes: ["assessment-1-year-1", "assessment-2-year-2", "assessment-3-year-2"],
    submittedTypes: []
  })
  
  const [formData, setFormData] = useState<FormData>({
    schoolName: "",
    region: "",
    date: new Date().toISOString().split('T')[0], // Today's date
    schoolGrade: "",
    headTeacherName: "",
    assessmentType: "",
    enrollment: "",
    autobiographicalResponses: {},
    alphabetResponses: {},
    colourResponses: {},
    quantityCountingResponses: {},
    shapeRecognitionResponses: {},
    motorSkillsResponses: {},
    grossMotorSkillsResponses: {}
  })

  // Helper function to map loaded responses to form state
  const mapResponsestoFormData = (responses: any[]) => {
    const responseMap: any = {
      autobiographicalResponses: {},
      alphabetResponses: {},
      colourResponses: {},
      quantityCountingResponses: {},
      shapeRecognitionResponses: {},
      motorSkillsResponses: {},
      grossMotorSkillsResponses: {}
    }

   // console.log('Processing responses for mapping:', responses.length)

    // Map responses by question_id and option_id
    responses.forEach(response => {
      const questionId = response.question_id
      const optionId = response.option_id
      const answer = parseInt(response.answer) || 0

     // console.log(`Mapping: questionId=${questionId}, optionId=${optionId}, answer=${answer}`)

      // Section 2: Autobiographical Knowledge Assessment
      if (optionId === '1e3164fd-8dc4-4169-ad42-1d6ec4e4e267') { // Full Sentence Response
        if (!responseMap.autobiographicalResponses[questionId]) {
          responseMap.autobiographicalResponses[questionId] = { fullSentenceResponse: 0, singleWordOrPhraseResponse: 0, incorrectResponse: 0, noResponseGiven: 0 }
        }
        responseMap.autobiographicalResponses[questionId].fullSentenceResponse = answer
      } else if (optionId === '4a0b9823-f028-42e3-9c26-a138b0722cd8') { // Single Word or Phrase Response
        if (!responseMap.autobiographicalResponses[questionId]) {
          responseMap.autobiographicalResponses[questionId] = { fullSentenceResponse: 0, singleWordOrPhraseResponse: 0, incorrectResponse: 0, noResponseGiven: 0 }
        }
        responseMap.autobiographicalResponses[questionId].singleWordOrPhraseResponse = answer
      } else if (optionId === 'bbd10cc4-0edc-4e50-b80b-e903573a04ca') { // Incorrect Response
        if (!responseMap.autobiographicalResponses[questionId]) {
          responseMap.autobiographicalResponses[questionId] = { fullSentenceResponse: 0, singleWordOrPhraseResponse: 0, incorrectResponse: 0, noResponseGiven: 0 }
        }
        responseMap.autobiographicalResponses[questionId].incorrectResponse = answer
      } else if (optionId === 'c457615a-a63a-44bd-9ffe-5a5973cc75c7') { // No Response Given
        if (!responseMap.autobiographicalResponses[questionId]) {
          responseMap.autobiographicalResponses[questionId] = { fullSentenceResponse: 0, singleWordOrPhraseResponse: 0, incorrectResponse: 0, noResponseGiven: 0 }
        }
        responseMap.autobiographicalResponses[questionId].noResponseGiven = answer

      // Section 3: Alphabet Recitation and Identification
      } else if (optionId === '689f84cf-2e07-44ff-8d36-e7f9457979f8') { // 1-6 Correct
        if (!responseMap.alphabetResponses[questionId]) {
          responseMap.alphabetResponses[questionId] = { range1to6Correct: 0, range7to12Correct: 0, range13to18Correct: 0, range19to26Correct: 0 }
        }
        responseMap.alphabetResponses[questionId].range1to6Correct = answer
      } else if (optionId === 'b5f8ffa7-a703-43ed-9a3e-4e4716d7a028') { // 7-12 Correct
        if (!responseMap.alphabetResponses[questionId]) {
          responseMap.alphabetResponses[questionId] = { range1to6Correct: 0, range7to12Correct: 0, range13to18Correct: 0, range19to26Correct: 0 }
        }
        responseMap.alphabetResponses[questionId].range7to12Correct = answer
      } else if (optionId === '1189716c-57c4-4136-8475-5866acb3de3a') { // 13-18 Correct
        if (!responseMap.alphabetResponses[questionId]) {
          responseMap.alphabetResponses[questionId] = { range1to6Correct: 0, range7to12Correct: 0, range13to18Correct: 0, range19to26Correct: 0 }
        }
        responseMap.alphabetResponses[questionId].range13to18Correct = answer
      } else if (optionId === '644cb1ba-cd4d-43d9-b014-ecaf8e13edd9') { // 19-26 Correct
        if (!responseMap.alphabetResponses[questionId]) {
          responseMap.alphabetResponses[questionId] = { range1to6Correct: 0, range7to12Correct: 0, range13to18Correct: 0, range19to26Correct: 0 }
        }
        responseMap.alphabetResponses[questionId].range19to26Correct = answer

      // Section 4: Colour Identification
      } else if (optionId === '16ef329d-748d-43e3-90fe-587fe8f9541e') { // 1 Correct
        if (!responseMap.colourResponses[questionId]) {
          responseMap.colourResponses[questionId] = { oneCorrect: 0, twoCorrect: 0, threeCorrect: 0 }
        }
        responseMap.colourResponses[questionId].oneCorrect = answer
      } else if (optionId === '4d479a15-4fbc-4da2-a8ce-51da25cb37c8') { // 2 Correct
        if (!responseMap.colourResponses[questionId]) {
          responseMap.colourResponses[questionId] = { oneCorrect: 0, twoCorrect: 0, threeCorrect: 0 }
        }
        responseMap.colourResponses[questionId].twoCorrect = answer
      } else if (optionId === 'b47fe6cf-8e87-4927-94d2-1463c50b65a9') { // 3 Correct
        if (!responseMap.colourResponses[questionId]) {
          responseMap.colourResponses[questionId] = { oneCorrect: 0, twoCorrect: 0, threeCorrect: 0 }
        }
        responseMap.colourResponses[questionId].threeCorrect = answer

      // Section 5: Quantity Differentiation and Counting Fluency
      } else if (optionId === 'c6ac5034-cd24-4712-83e1-8f0f7d57c0e3') { // Number Correct (Quantity)
        if (!responseMap.quantityCountingResponses[questionId]) {
          responseMap.quantityCountingResponses[questionId] = {}
        }
        responseMap.quantityCountingResponses[questionId].numberCorrect = answer
      } else if (optionId === '1125b912-003e-4911-b653-18087f8c89a4') { // Number Incorrect (Quantity)
        if (!responseMap.quantityCountingResponses[questionId]) {
          responseMap.quantityCountingResponses[questionId] = {}
        }
        responseMap.quantityCountingResponses[questionId].numberIncorrect = answer
      } else if (optionId === '13da4461-dcac-472f-91f4-5a3ab7e44168') { // 1-10 Correct (Counting)
        if (!responseMap.quantityCountingResponses[questionId]) {
          responseMap.quantityCountingResponses[questionId] = {}
        }
        responseMap.quantityCountingResponses[questionId].range1to10Correct = answer
      } else if (optionId === '8824fccf-fa0b-4675-bca1-8cc4a54c996e') { // 11-20 Correct (Counting)
        if (!responseMap.quantityCountingResponses[questionId]) {
          responseMap.quantityCountingResponses[questionId] = {}
        }
        responseMap.quantityCountingResponses[questionId].range11to20Correct = answer
      } else if (optionId === 'ba0ca8fc-e152-4a9a-aa4a-d6bc9217e0a5') { // 20+ Correct (Counting)
        if (!responseMap.quantityCountingResponses[questionId]) {
          responseMap.quantityCountingResponses[questionId] = {}
        }
        responseMap.quantityCountingResponses[questionId].range20PlusCorrect = answer

      // Section 6: Shape Recognition and One on One Correspondence
      } else if (optionId === 'd4abf4a1-4b44-44af-bc02-efc3d74be0e3') { // 1 Correct (Shape)
        if (!responseMap.shapeRecognitionResponses[questionId]) {
          responseMap.shapeRecognitionResponses[questionId] = {}
        }
        responseMap.shapeRecognitionResponses[questionId].oneCorrect = answer
      } else if (optionId === '0a7e66fe-56ec-4b8e-ac1f-b161de32a1d3') { // 2 Correct (Shape)
        if (!responseMap.shapeRecognitionResponses[questionId]) {
          responseMap.shapeRecognitionResponses[questionId] = {}
        }
        responseMap.shapeRecognitionResponses[questionId].twoCorrect = answer
      } else if (optionId === 'd5513101-0748-4d8f-afec-f46f8240be20') { // 3 Correct (Shape)
        if (!responseMap.shapeRecognitionResponses[questionId]) {
          responseMap.shapeRecognitionResponses[questionId] = {}
        }
        responseMap.shapeRecognitionResponses[questionId].threeCorrect = answer
      } else if (optionId === '2d47b560-bac0-42b7-8fe3-a471bd19f14e') { // 1-5 Correct (One on One)
        if (!responseMap.shapeRecognitionResponses[questionId]) {
          responseMap.shapeRecognitionResponses[questionId] = {}
        }
        responseMap.shapeRecognitionResponses[questionId].range1to5Correct = answer
      } else if (optionId === '12ab8b04-82a9-4726-b941-317458e86559') { // 6-10 Correct (One on One)
        if (!responseMap.shapeRecognitionResponses[questionId]) {
          responseMap.shapeRecognitionResponses[questionId] = {}
        }
        responseMap.shapeRecognitionResponses[questionId].range6to10Correct = answer

      // Section 7: Motor Skills
      } else if (optionId === '16e7f2c4-776e-432e-9b96-af8aa4cacdfa') { // 1-4 Correct (Picture)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].range1to4Correct = answer
      } else if (optionId === 'f3c2c73c-6ff6-438e-9c15-7efe0b326379') { // 5-8 Correct (Picture)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].range5to8Correct = answer
      } else if (optionId === '23d85ccf-8b1c-4fc0-9a37-fd309b389f7e') { // Cylindrical Grasp (Pencil Grip)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].cylindricalGrasp = answer
      } else if (optionId === 'e390cf3e-32aa-403f-9d57-80a5ab61bf6a') { // Digital (Pencil Grip)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].digital = answer
      } else if (optionId === '63020f32-d2d5-4bd4-bc5e-cf69cfa26c7e') { // Modified Tripod Grasp (Pencil Grip)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].modifiedTripodGrasp = answer
      } else if (optionId === '10738f03-47e5-4ec9-b30d-668e42c48dd6') { // Tripod (Pencil Grip)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].tripod = answer
      } else if (optionId === '0a8be88c-5dd4-4694-9351-dbb80e031b68') { // Scribble UR (Letter Formation)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].scribbleUR = answer
      } else if (optionId === 'bf43cfde-5b39-4ab2-8736-90d2f60e0504') { // Scribble R (Letter Formation)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].scribbleR = answer
      } else if (optionId === '05db3c6c-7a0c-4904-add3-fc719f7acba4') { // Approximation (Letter Formation)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].approximation = answer
      } else if (optionId === '7533234a-1598-4176-a8ed-8a5e5cb77193') { // Name (Letter Formation)
        if (!responseMap.motorSkillsResponses[questionId]) {
          responseMap.motorSkillsResponses[questionId] = {}
        }
        responseMap.motorSkillsResponses[questionId].name = answer

      // Section 8: Gross Motor Skills
      } else if (optionId === '62b6e481-811e-43ee-88a3-0a1d8f53aa12') { // 1 Time (Throw/Catch)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].oneTime = answer
      } else if (optionId === 'e3e921e1-5296-4c15-bce8-72289447df1e') { // 2 Times (Throw/Catch)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].twoTimes = answer
      } else if (optionId === '0f460701-938e-4c32-97aa-1ad7b35499cc') { // 3 Times (Throw/Catch)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].threeTimes = answer
      } else if (optionId === '46e086cf-f773-4578-aa07-ad694a6a91c7') { // 4 Times (Throw/Catch)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].fourTimes = answer
      } else if (optionId === 'cfbbace8-c1b2-4d17-aefd-657736332adb') { // 5 Times (Throw/Catch)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].fiveTimes = answer
      } else if (optionId === '62b6e481-811e-43ee-88a3-0a1d8f53aa12') { // One Leg 1 Time (Hop) - reusing same ID
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].oneLegOneTime = answer
      } else if (optionId === 'e3e921e1-5296-4c15-bce8-72289447df1e') { // One Leg 2 Times (Hop) - reusing same ID
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].oneLegTwoTimes = answer
      } else if (optionId === '0f460701-938e-4c32-97aa-1ad7b35499cc') { // One Leg 3 Times (Hop) - reusing same ID
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].oneLegThreeTimes = answer
      } else if (optionId === '339fb99d-50ad-4eac-b3af-b69ed44605fc') { // Left (Stand on one leg)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].left = answer
      } else if (optionId === '5f106448-51de-47a2-a7ce-edf46884aaef') { // Right (Stand on one leg)
        if (!responseMap.grossMotorSkillsResponses[questionId]) {
          responseMap.grossMotorSkillsResponses[questionId] = {}
        }
        responseMap.grossMotorSkillsResponses[questionId].right = answer
      }
    })

    return responseMap
  }

  // Auto-save hook
  const { loadFromLocalStorage, clearLocalStorage, isSaving } = useAutoSave({
    key: `nursery-assessment-${schoolInfo?.id || 'unknown'}`,
    data: formData,
    onSave: async (data) => {
      if (currentAssessmentId && currentUser) {
        await autoSaveNurseryAssessment(currentAssessmentId, data, currentUser.id)
      }
    },
    enabled: !!currentAssessmentId && !!currentUser,
    delay: 3000 // Auto-save after 3 seconds of inactivity
  })

  // Helper function to handle response changes
  const handleResponseChange = (questionId: string, category: string, value: number) => {
    // Only update local state - no immediate database save
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

  // Validation function to check if question totals match enrollment
  const validateQuestionTotals = (responses: { [key: string]: number }, questionTitle: string) => {
    const total = Object.values(responses).reduce((sum, value) => sum + value, 0)
    const enrollment = parseInt(formData.enrollment) || 0
    
    if (total !== enrollment) {
      toast({
        title: "Validation Error",
        description: `${questionTitle}: Total responses (${total}) must equal enrollment (${enrollment}). Please check your entries.`,
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // Function to save Section 2 responses to database
  const saveSection2Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 2 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 2 before saving
    for (const [questionId, responses] of Object.entries(formData.autobiographicalResponses)) {
      const questionTitle = `Question ${Object.keys(formData.autobiographicalResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
     // console.log('Saving Section 2 responses to database...')
      
      // Iterate through all autobiographical responses and save them
      for (const [questionId, responses] of Object.entries(formData.autobiographicalResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database
            let optionId = ''
            
            switch (category) {
              case 'fullSentenceResponse':
                optionId = '1e3164fd-8dc4-4169-ad42-1d6ec4e4e267'
                break
              case 'singleWordOrPhraseResponse':
                optionId = '4a0b9823-f028-42e3-9c26-a138b0722cd8'
                break
              case 'incorrectResponse':
                optionId = 'bbd10cc4-0edc-4e50-b80b-e903573a04ca'
                break
              case 'noResponseGiven':
                optionId = 'c457615a-a63a-44bd-9ffe-5a5973cc75c7'
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

     // console.log('Section 2 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 2 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 2 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Function to save Section 3 responses to database
  const saveSection3Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 3 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 3 before saving
    for (const [questionId, responses] of Object.entries(formData.alphabetResponses)) {
      const questionTitle = `Alphabet Question ${Object.keys(formData.alphabetResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
     // console.log('Saving Section 3 responses to database...')
      
      // Iterate through all alphabet responses and save them
      for (const [questionId, responses] of Object.entries(formData.alphabetResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database for Alphabet Recitation and Identification
            let optionId = ''
            
            switch (category) {
              case 'range1to6Correct':
                optionId = '689f84cf-2e07-44ff-8d36-e7f9457979f8' // 1 - 6 Correct
                break
              case 'range7to12Correct':
                optionId = 'b5f8ffa7-a703-43ed-9a3e-4e4716d7a028' // 7 - 12 Correct
                break
              case 'range13to18Correct':
                optionId = '1189716c-57c4-4136-8475-5866acb3de3a' // 13 - 18 Correct
                break
              case 'range19to26Correct':
                optionId = '644cb1ba-cd4d-43d9-b014-ecaf8e13edd9' // 19 - 26 Correct
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

     // console.log('Section 3 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 3 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 3 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Function to save Section 4 responses to database
  const saveSection4Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 4 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 4 before saving
    for (const [questionId, responses] of Object.entries(formData.colourResponses)) {
      const questionTitle = `Colour Question ${Object.keys(formData.colourResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
     // console.log('Saving Section 4 responses to database...')
      
      // Iterate through all colour responses and save them
      for (const [questionId, responses] of Object.entries(formData.colourResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database for Colour Identification
            let optionId = ''
            
            switch (category) {
              case 'oneCorrect':
                optionId = '16ef329d-748d-43e3-90fe-587fe8f9541e' // 1 Correct
                break
              case 'twoCorrect':
                optionId = '4d479a15-4fbc-4da2-a8ce-51da25cb37c8' // 2 Correct
                break
              case 'threeCorrect':
                optionId = 'b47fe6cf-8e87-4927-94d2-1463c50b65a9' // 3 Correct
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

    //  console.log('Section 4 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 4 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 4 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Function to save Section 5 responses to database
  const saveSection5Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 5 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 5 before saving
    for (const [questionId, responses] of Object.entries(formData.quantityCountingResponses)) {
      const questionTitle = `Quantity Question ${Object.keys(formData.quantityCountingResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
     // console.log('Saving Section 5 responses to database...')
      
      // Iterate through all quantity counting responses and save them
      for (const [questionId, responses] of Object.entries(formData.quantityCountingResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database for Quantity Differentiation and Counting Fluency
            let optionId = ''
            
            switch (category) {
              case 'numberCorrect':
                optionId = 'c6ac5034-cd24-4712-83e1-8f0f7d57c0e3' // Number Correct
                break
              case 'numberIncorrect':
                optionId = '1125b912-003e-4911-b653-18087f8c89a4' // Number Incorrect
                break
              case 'range1to10Correct':
                optionId = '13da4461-dcac-472f-91f4-5a3ab7e44168' // 1 - 10 Correct
                break
              case 'range11to20Correct':
                optionId = '8824fccf-fa0b-4675-bca1-8cc4a54c996e' // 11 - 20 Correct
                break
              case 'range20PlusCorrect':
                optionId = 'ba0ca8fc-e152-4a9a-aa4a-d6bc9217e0a5' // 20 + Correct
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

      //console.log('Section 5 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 5 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 5 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Function to save Section 6 responses to database
  const saveSection6Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 6 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 6 before saving
    for (const [questionId, responses] of Object.entries(formData.shapeRecognitionResponses)) {
      const questionTitle = `Shape Recognition Question ${Object.keys(formData.shapeRecognitionResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
     // console.log('Saving Section 6 responses to database...')
      
      // Iterate through all shape recognition responses and save them
      for (const [questionId, responses] of Object.entries(formData.shapeRecognitionResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database for Shape Recognition and One on One Correspondence
            let optionId = ''
            
            switch (category) {
              case 'oneCorrect':
                optionId = 'd4abf4a1-4b44-44af-bc02-efc3d74be0e3' // 1 Correct
                break
              case 'twoCorrect':
                optionId = '0a7e66fe-56ec-4b8e-ac1f-b161de32a1d3' // 2 Correct
                break
              case 'threeCorrect':
                optionId = 'd5513101-0748-4d8f-afec-f46f8240be20' // 3 Correct
                break
              case 'range1to5Correct':
                optionId = '2d47b560-bac0-42b7-8fe3-a471bd19f14e' // 1 - 5 Correct
                break
              case 'range6to10Correct':
                optionId = '12ab8b04-82a9-4726-b941-317458e86559' // 6 - 10 Correct
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

     // console.log('Section 6 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 6 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 6 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Function to save Section 7 responses to database
  const saveSection7Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 7 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 7 before saving
    for (const [questionId, responses] of Object.entries(formData.motorSkillsResponses)) {
      const questionTitle = `Motor Skills Question ${Object.keys(formData.motorSkillsResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
   //   console.log('Saving Section 7 responses to database...')
      
      // Iterate through all motor skills responses and save them
      for (const [questionId, responses] of Object.entries(formData.motorSkillsResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database for Motor Skills
            let optionId = ''
            
            switch (category) {
              case 'range1to4Correct':
                optionId = '16e7f2c4-776e-432e-9b96-af8aa4cacdfa' // 1 - 4 Correct
                break
              case 'range5to8Correct':
                optionId = 'f3c2c73c-6ff6-438e-9c15-7efe0b326379' // 5 - 8 Correct
                break
              case 'cylindricalGrasp':
                optionId = '23d85ccf-8b1c-4fc0-9a37-fd309b389f7e' // Cylindrical Grasp
                break
              case 'digital':
                optionId = 'e390cf3e-32aa-403f-9d57-80a5ab61bf6a' // Digital
                break
              case 'modifiedTripodGrasp':
                optionId = '63020f32-d2d5-4bd4-bc5e-cf69cfa26c7e' // Modified Tripod Grasp
                break
              case 'tripod':
                optionId = '10738f03-47e5-4ec9-b30d-668e42c48dd6' // Tripod
                break
              case 'scribbleUR':
                optionId = '0a8be88c-5dd4-4694-9351-dbb80e031b68' // Scribble (UR)
                break
              case 'scribbleR':
                optionId = 'bf43cfde-5b39-4ab2-8736-90d2f60e0504' // Scribble (R)
                break
              case 'approximation':
                optionId = '05db3c6c-7a0c-4904-add3-fc719f7acba4' // Approximation
                break
              case 'name':
                optionId = '7533234a-1598-4176-a8ed-8a5e5cb77193' // Name
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

    //  console.log('Section 7 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 7 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 7 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Function to save Section 8 responses to database
  const saveSection8Responses = async () => {
    if (!currentAssessmentId) {
      toast({
        title: "Please Save Section 1",
        description: "You need to save Section 1 (Basic Information) before saving Section 8 responses.",
        variant: "destructive",
      })
      return false
    }

    // Validate all questions in Section 8 before saving
    for (const [questionId, responses] of Object.entries(formData.grossMotorSkillsResponses)) {
      const questionTitle = `Gross Motor Skills Question ${Object.keys(formData.grossMotorSkillsResponses).indexOf(questionId) + 1}`
      if (!validateQuestionTotals(responses, questionTitle)) {
        return false
      }
    }

    try {
    //  console.log('Saving Section 8 responses to database...')
      
      // Iterate through all gross motor skills responses and save them
      for (const [questionId, responses] of Object.entries(formData.grossMotorSkillsResponses)) {
        for (const [category, value] of Object.entries(responses)) {
          if (value > 0) { // Only save non-zero values
            // Use the actual option IDs from your database for Gross Motor Skills
            let optionId = ''
            
            switch (category) {
              case 'oneTime':
                optionId = '62b6e481-811e-43ee-88a3-0a1d8f53aa12' // 1 Time
                break
              case 'twoTimes':
                optionId = 'e3e921e1-5296-4c15-bce8-72289447df1e' // 2 Times
                break
              case 'threeTimes':
                optionId = '0f460701-938e-4c32-97aa-1ad7b35499cc' // 3 Times
                break
              case 'fourTimes':
                optionId = '46e086cf-f773-4578-aa07-ad694a6a91c7' // 4 Times
                break
              case 'fiveTimes':
                optionId = 'cfbbace8-c1b2-4d17-aefd-657736332adb' // 5 Times
                break
              case 'oneLegOneTime':
                optionId = '62b6e481-811e-43ee-88a3-0a1d8f53aa12' // 1 Time (reused for One Leg Hop)
                break
              case 'oneLegTwoTimes':
                optionId = 'e3e921e1-5296-4c15-bce8-72289447df1e' // 2 Times (reused for One Leg Hop)
                break
              case 'oneLegThreeTimes':
                optionId = '0f460701-938e-4c32-97aa-1ad7b35499cc' // 3 Times (reused for One Leg Hop)
                break
              case 'left':
                optionId = '339fb99d-50ad-4eac-b3af-b69ed44605fc' // Left
                break
              case 'right':
                optionId = '5f106448-51de-47a2-a7ce-edf46884aaef' // Right
                break
              default:
                continue
            }

            const result = await saveAssessmentAnswer({
              assessment_id: currentAssessmentId,
              question_id: questionId,
              option_id: optionId,
              answer: value as number
            })

            if (!result.success) {
              console.error('Failed to save answer:', result.error)
              throw new Error(`Failed to save response for question ${questionId}`)
            }
          }
        }
      }

     // console.log('Section 8 responses saved successfully!')
      return true
    } catch (error) {
      console.error('Error saving Section 8 responses:', error)
      toast({
        title: "Save Error",
        description: "Failed to save Section 8 responses. Please try again.",
        variant: "destructive",
      })
      return false
    }
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
          both: 0,
          ...prev.grossMotorSkillsResponses[questionId],
          [category]: value
        }
      }
    }))
  }

  // Get sections based on assessment type
  const availableSections = useMemo(() => {
    return getAvailableSections(formData.assessmentType)
  }, [formData.assessmentType])

  // Load school information and existing assessment
  useEffect(() => {
    const loadSchoolInfo = async () => {
      try {
        // Get school info
        const schoolResult = await getUserSchoolInfo()
        if (!schoolResult.error && schoolResult.school) {
          setSchoolInfo(schoolResult.school)
          
          // Get user info for head teacher name
          const userResult = await getUser()
          setCurrentUser(userResult)
          
          // Auto-fill form data
          setFormData(prev => ({
            ...prev,
            schoolName: schoolResult.school.name,
            region: schoolResult.school.region,
            schoolGrade: schoolResult.school.level,
            headTeacherName: userResult?.name || userResult?.email || "Loading..."
          }))

          // Check yearly assessment limits
          if (userResult?.id) {
            const limitsResult = await checkYearlyAssessmentLimits(userResult.id, schoolResult.school.id)
            if (!limitsResult.error) {
              setYearlyLimits({
                allThreeSubmitted: limitsResult.allThreeSubmitted,
                availableTypes: limitsResult.availableTypes,
                submittedTypes: limitsResult.submittedTypes
              })
            }
          }

          // Try to load existing draft assessment
          if (userResult?.id) {
            const existingAssessment = await loadNurseryAssessment(userResult.id, schoolResult.school.id)
            
            if (existingAssessment.assessment) {
           //   console.log('Found existing assessment:', existingAssessment.assessment)
              setCurrentAssessmentId(existingAssessment.assessment.id)
              
              // Load saved responses from answers table
              const responsesResult = await loadSavedResponses(existingAssessment.assessment.id)
              if (responsesResult.responses && responsesResult.responses.length > 0) {
                console.log('Loading saved responses:', responsesResult.responses)
                const mappedResponses = mapResponsestoFormData(responsesResult.responses)
                console.log('Mapped responses:', mappedResponses)
                
                setFormData(prev => ({
                  ...prev,
                  ...mappedResponses,
                  // Keep the auto-filled basic info
                  schoolName: schoolResult.school.name,
                  region: schoolResult.school.region,
                  schoolGrade: schoolResult.school.level,
                  headTeacherName: userResult?.name || userResult?.email || "Loading...",
                  // Load basic assessment info
                  assessmentType: existingAssessment.assessment.assessment_type || prev.assessmentType,
                  enrollment: existingAssessment.assessment.enrollment?.toString() || prev.enrollment
                }))
              } else {
                // No responses saved yet, just load basic info
                setFormData(prev => ({
                  ...prev,
                  // Keep the auto-filled basic info
                  schoolName: schoolResult.school.name,
                  region: schoolResult.school.region,
                  schoolGrade: schoolResult.school.level,
                  headTeacherName: userResult?.name || userResult?.email || "Loading...",
                  // Load basic assessment info
                  assessmentType: existingAssessment.assessment.assessment_type || '',
                  enrollment: existingAssessment.assessment.enrollment?.toString() || ''
                }))
              }
              
              // Load saved form data from JSON field if available (for any other data)
              if (existingAssessment.assessment.form_data) {
               // console.log('Also loading saved form_data JSON:', existingAssessment.assessment.form_data)
                setFormData(prev => ({
                  ...prev,
                  ...existingAssessment.assessment.form_data,
                  // Preserve what we just loaded from responses table
                  autobiographicalResponses: prev.autobiographicalResponses,
                  alphabetResponses: prev.alphabetResponses,
                  colourResponses: prev.colourResponses,
                  quantityCountingResponses: prev.quantityCountingResponses,
                  shapeRecognitionResponses: prev.shapeRecognitionResponses,
                  motorSkillsResponses: prev.motorSkillsResponses,
                  grossMotorSkillsResponses: prev.grossMotorSkillsResponses,
                  // Keep the auto-filled basic info
                  schoolName: schoolResult.school.name,
                  region: schoolResult.school.region,
                  schoolGrade: schoolResult.school.level,
                  headTeacherName: userResult?.name || userResult?.email || "Loading..."
                }))
              }
              
              toast({
                title: "Assessment Loaded",
                description: "Continuing your previous nursery assessment with saved responses.",
              })
            } else {
             // console.log('No existing assessment found')
              // Try to load from localStorage as fallback
              const localData = loadFromLocalStorage()
              if (localData) {
               // console.log('Loading from localStorage:', localData)
                setFormData(prev => ({
                  ...prev,
                  ...localData,
                  // Keep the auto-filled basic info
                  schoolName: schoolResult.school.name,
                  region: schoolResult.school.region,
                  schoolGrade: schoolResult.school.level,
                  headTeacherName: userResult?.name || userResult?.email || "Loading..."
                }))
              }
            }
          }
        } else {
          console.error("Error loading school info:", schoolResult.error)
        }
      } catch (error) {
        console.error("Error loading school info:", error)
      }
    }
    
    loadSchoolInfo()
  }, [loadFromLocalStorage])

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
      [field]: field === 'enrollment' ? (parseInt(value) || 0) : value
    }))
  }

  const loadQuestions = async (section: string) => {
    setQuestionsLoading(true)
    try {
     // console.log('Loading questions for section:', section)
      const result = await getNurseryAssessmentQuestions(section)
     // console.log('Questions result:', result)
      
      if (!result.error && result.questions.length > 0) {
        setQuestions(result.questions)
      //  console.log('Questions loaded:', result.questions.length)
        
        // No need to load options since we're using fixed option IDs for Autobiographical Knowledge
       // console.log('Using fixed option IDs for Autobiographical Knowledge questions')
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

  const saveAssessmentBasicInfo = async () => {
    // console.log('saveAssessmentBasicInfo called')
    // console.log('schoolInfo:', schoolInfo)
    // console.log('currentUser:', currentUser)
    // console.log('formData:', formData)
    
    if (!schoolInfo || !currentUser) {
      toast({
        title: "Error",
        description: "Missing school or user information. Please refresh the page.",
        variant: "destructive",
      })
      return false
    }

    if (!formData.assessmentType || !formData.enrollment) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Assessment Type and Enrollment).",
        variant: "destructive",
      })
      return false
    }

    try {
      setLoading(true)
      
      const enrollmentNumber = parseInt(formData.enrollment) || 0
     // console.log('Saving with enrollment (converted to number):', enrollmentNumber, typeof enrollmentNumber)
      
      if (currentAssessmentId) {
        // Update existing assessment
       // console.log('Updating existing assessment:', currentAssessmentId)
        const result = await updateNurseryAssessment(currentAssessmentId, {
          assessment_type: formData.assessmentType,
          enrollment: enrollmentNumber,
          updated_by: currentUser.id
        })
        
        //console.log('Update result:', result)
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        toast({
          title: "Assessment Updated",
          description: "Basic information has been updated successfully.",
        })
      } else {
        // Create new assessment
        //console.log('Creating new assessment')
        const result = await saveNurseryAssessment({
          school_id: schoolInfo.id,
          headteacher_id: currentUser.id,
          assessment_type: formData.assessmentType,
          enrollment: enrollmentNumber
        })
        
        //console.log('Save result:', result)
        
        if (result.error) {
         // console.log('Primary save failed, attempting workaround...')
          // If the primary save fails due to schema cache, the function will handle it internally
          throw new Error(result.error)
        }
        
        if (result.assessment && result.assessment.id) {
          setCurrentAssessmentId(result.assessment.id)
          //console.log('New assessment ID set:', result.assessment.id)
        }
        
        toast({
          title: "Assessment Created",
          description: "Basic information has been saved successfully.",
        })
      }
      
      return true
    } catch (error) {
      console.error("Error saving assessment:", error)
      toast({
        title: "Error",
        description: `Failed to save assessment: ${error.message}`,
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentSection = async () => {
    setLoading(true)
    try {
      // For Section 1 (Basic Information), save to database
      if (currentSection === 0) {
        const success = await saveAssessmentBasicInfo()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
        }
        return
      }
      
      // For Section 2 (Autobiographical Knowledge Assessment), save responses
      if (currentSection === 1) {
        const success = await saveSection2Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // For Section 3 (Alphabet Recitation and Identification), save responses
      if (currentSection === 2) {
        const success = await saveSection3Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // For Section 4 (Colour Identification), save responses
      if (currentSection === 3) {
        const success = await saveSection4Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // For Section 5 (Quantity Differentiation and Counting Fluency), save responses
      if (currentSection === 4) {
        const success = await saveSection5Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // For Section 6 (Shape Recognition and One on One Correspondence), save responses
      if (currentSection === 5) {
        const success = await saveSection6Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // For Section 7 (Motor Skills), save responses
      if (currentSection === 6) {
        const success = await saveSection7Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // For Section 8 (Gross Motor Skills), save responses
      if (currentSection === 7) {
        const success = await saveSection8Responses()
        if (success) {
          setSavedSections(prev => new Set([...prev, currentSection]))
          toast({
            title: "Section Saved",
            description: `${SECTIONS[currentSection]} has been saved successfully.`,
          })
        }
        return
      }
      
      // TODO: Implement save logic for other sections
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

  // Section completion validation functions (silent - no toast messages)
  const checkSection1Complete = () => {
    const required = ['schoolName', 'region', 'date', 'schoolGrade', 'headTeacherName', 'assessmentType', 'enrollment']
    const missing = required.filter(field => !formData[field as keyof typeof formData] || formData[field as keyof typeof formData] === '')
    return missing.length === 0
  }

  const checkSection2Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 2 (autobiographical)
    const responses = formData.autobiographicalResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      const total = (questionResponses.fullSentenceResponse || 0) + (questionResponses.singleWordOrPhraseResponse || 0) + 
                   (questionResponses.incorrectResponse || 0) + (questionResponses.noResponseGiven || 0)
      if (total !== enrollment) return false
    }
    return true
  }

  const checkSection3Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 3 (alphabet)
    const responses = formData.alphabetResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      const total = (questionResponses.range1to6Correct || 0) + (questionResponses.range7to12Correct || 0) + 
                   (questionResponses.range13to18Correct || 0) + (questionResponses.range19to26Correct || 0)
      if (total !== enrollment) return false
    }
    return true
  }

  const checkSection4Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 4 (colour)
    const responses = formData.colourResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      const total = (questionResponses.oneCorrect || 0) + (questionResponses.twoCorrect || 0) + (questionResponses.threeCorrect || 0)
      if (total !== enrollment) return false
    }
    return true
  }

  const checkSection5Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 5 (quantity/counting)
    const responses = formData.quantityCountingResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      let total = 0
      if (questionResponses.numberCorrect !== undefined || questionResponses.numberIncorrect !== undefined) {
        total = (questionResponses.numberCorrect || 0) + (questionResponses.numberIncorrect || 0)
      } else {
        total = (questionResponses.range1to10Correct || 0) + (questionResponses.range11to20Correct || 0) + (questionResponses.range20PlusCorrect || 0)
      }
      if (total !== enrollment) return false
    }
    return true
  }

  const checkSection6Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 6 (shape recognition)
    const responses = formData.shapeRecognitionResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      let total = 0
      if (questionResponses.oneCorrect !== undefined || questionResponses.twoCorrect !== undefined || questionResponses.threeCorrect !== undefined) {
        total = (questionResponses.oneCorrect || 0) + (questionResponses.twoCorrect || 0) + (questionResponses.threeCorrect || 0)
      } else {
        total = (questionResponses.range1to5Correct || 0) + (questionResponses.range6to10Correct || 0)
      }
      if (total !== enrollment) return false
    }
    return true
  }

  const checkSection7Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 7 (motor skills)
    const responses = formData.motorSkillsResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      let total = 0
      if (questionResponses.range1to4Correct !== undefined || questionResponses.range5to8Correct !== undefined) {
        total = (questionResponses.range1to4Correct || 0) + (questionResponses.range5to8Correct || 0)
      } else if (questionResponses.cylindricalGrasp !== undefined) {
        total = (questionResponses.cylindricalGrasp || 0) + (questionResponses.digital || 0) + (questionResponses.modifiedTripodGrasp || 0) + (questionResponses.tripod || 0)
      } else if (questionResponses.scribbleUR !== undefined) {
        total = (questionResponses.scribbleUR || 0) + (questionResponses.scribbleR || 0) + (questionResponses.approximation || 0) + (questionResponses.name || 0)
      }
      if (total !== enrollment) return false
    }
    return true
  }

  const checkSection8Complete = () => {
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    // Check if any responses exist for section 8 (gross motor skills)
    const responses = formData.grossMotorSkillsResponses
    if (!responses || Object.keys(responses).length === 0) return false

    // Check each question has valid total
    for (const [questionId, questionResponses] of Object.entries(responses)) {
      if (!questionResponses) return false
      let total = 0
      if (questionResponses.oneTime !== undefined && questionResponses.fiveTimes !== undefined) {
        total = (questionResponses.oneTime || 0) + (questionResponses.twoTimes || 0) + (questionResponses.threeTimes || 0) + (questionResponses.fourTimes || 0) + (questionResponses.fiveTimes || 0)
      } else if (questionResponses.oneLegOneTime !== undefined) {
        total = (questionResponses.oneLegOneTime || 0) + (questionResponses.oneLegTwoTimes || 0) + (questionResponses.oneLegThreeTimes || 0)
      } else if (questionResponses.left !== undefined || questionResponses.right !== undefined) {
        total = (questionResponses.left || 0) + (questionResponses.right || 0)
      } else {
        total = (questionResponses.oneTime || 0) + (questionResponses.twoTimes || 0)
      }
      if (total !== enrollment) return false
    }
    return true
  }

  // Section validation functions with toast messages (for Next button click)
  const validateSection1 = () => {
    const required = ['schoolName', 'region', 'date', 'schoolGrade', 'headTeacherName', 'assessmentType', 'enrollment']
    const missing = required.filter(field => !formData[field as keyof typeof formData] || formData[field as keyof typeof formData] === '')
    
    if (missing.length > 0) {
      toast({
        title: "Section 1 Incomplete",
        description: `Please complete all required fields: ${missing.join(', ')}`,
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const validateSection2 = () => {
    if (!section2Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) {
      toast({
        title: "Section 2 Incomplete", 
        description: "Please complete Section 1 first to set enrollment.",
        variant: "destructive",
      })
      return false
    }

    for (const question of section2Questions) {
      const responses = formData.autobiographicalResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 2 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      const total = (responses.fullSentenceResponse || 0) + (responses.singleWordOrPhraseResponse || 0) + 
                   (responses.incorrectResponse || 0) + (responses.noResponseGiven || 0)
      
      if (total !== enrollment) {
        toast({
          title: "Section 2 Incomplete",
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const validateSection3 = () => {
    if (!section3Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    for (const question of section3Questions) {
      const responses = formData.alphabetResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 3 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      const total = (responses.range1to6Correct || 0) + (responses.range7to12Correct || 0) + 
                   (responses.range13to18Correct || 0) + (responses.range19to26Correct || 0)
      
      if (total !== enrollment) {
        toast({
          title: "Section 3 Incomplete", 
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const validateSection4 = () => {
    if (!section4Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    for (const question of section4Questions) {
      const responses = formData.colourResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 4 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      const total = (responses.oneCorrect || 0) + (responses.twoCorrect || 0) + (responses.threeCorrect || 0)
      
      if (total !== enrollment) {
        toast({
          title: "Section 4 Incomplete",
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const validateSection5 = () => {
    if (!section5Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    for (const question of section5Questions) {
      const responses = formData.quantityCountingResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 5 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      let total = 0
      if (question.questions.toLowerCase().includes('quantity')) {
        total = (responses.numberCorrect || 0) + (responses.numberIncorrect || 0)
      } else {
        total = (responses.range1to10Correct || 0) + (responses.range11to20Correct || 0) + (responses.range20PlusCorrect || 0)
      }
      
      if (total !== enrollment) {
        toast({
          title: "Section 5 Incomplete",
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const validateSection6 = () => {
    if (!section6Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    for (const question of section6Questions) {
      const responses = formData.shapeRecognitionResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 6 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      let total = 0
      if (question.questions.toLowerCase().includes('shape')) {
        total = (responses.oneCorrect || 0) + (responses.twoCorrect || 0) + (responses.threeCorrect || 0)
      } else {
        total = (responses.range1to5Correct || 0) + (responses.range6to10Correct || 0)
      }
      
      if (total !== enrollment) {
        toast({
          title: "Section 6 Incomplete",
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const validateSection7 = () => {
    if (!section7Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    for (const question of section7Questions) {
      const responses = formData.motorSkillsResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 7 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      let total = 0
      if (question.questions.toLowerCase().includes('picture')) {
        total = (responses.range1to4Correct || 0) + (responses.range5to8Correct || 0)
      } else if (question.questions.toLowerCase().includes('pencil') || question.questions.toLowerCase().includes('grip')) {
        total = (responses.cylindricalGrasp || 0) + (responses.digital || 0) + (responses.modifiedTripodGrasp || 0) + (responses.tripod || 0)
      } else if (question.questions.toLowerCase().includes('letter') || question.questions.toLowerCase().includes('formation')) {
        total = (responses.scribbleUR || 0) + (responses.scribbleR || 0) + (responses.approximation || 0) + (responses.name || 0)
      }
      
      if (total !== enrollment) {
        toast({
          title: "Section 7 Incomplete",
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const validateSection8 = () => {
    if (!section8Questions.length) return true
    
    const enrollment = parseInt(formData.enrollment) || 0
    if (enrollment === 0) return false

    for (const question of section8Questions) {
      const responses = formData.grossMotorSkillsResponses[question.id]
      if (!responses) {
        toast({
          title: "Section 8 Incomplete",
          description: `Please complete all responses for: ${question.questions}`,
          variant: "destructive",
        })
        return false
      }

      let total = 0
      if (question.questions.toLowerCase().includes('throw') || question.questions.toLowerCase().includes('catch')) {
        total = (responses.oneTime || 0) + (responses.twoTimes || 0) + (responses.threeTimes || 0) + (responses.fourTimes || 0) + (responses.fiveTimes || 0)
      } else if (question.questions.toLowerCase().includes('hop')) {
        total = (responses.oneLegOneTime || 0) + (responses.oneLegTwoTimes || 0) + (responses.oneLegThreeTimes || 0)
      } else if (question.questions.toLowerCase().includes('stand')) {
        total = (responses.left || 0) + (responses.right || 0)
      } else {
        total = (responses.oneTime || 0) + (responses.twoTimes || 0)
      }
      
      if (total !== enrollment) {
        toast({
          title: "Section 8 Incomplete",
          description: `${question.questions}: Total responses (${total}) must equal enrollment (${enrollment})`,
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  // Function to check if current section has been saved
  const isCurrentSectionComplete = () => {
    return savedSections.has(currentSection)
  }

  const nextSection = async () => {
    // Check if current section is saved before proceeding
    if (!savedSections.has(currentSection)) {
      toast({
        title: "Save Required",
        description: "Please save the current section before proceeding to the next.",
        variant: "destructive",
      })
      return
    }

    // Simply move to next section (no auto-saving)
    if (currentSection < availableSections.length - 1) {
      // Skip Section 7 (Gross Motor Skills) if Assessment 1 - Year 1
      let nextSectionIndex = currentSection + 1
      if (formData.assessmentType === 'assessment-1-year-1' && nextSectionIndex === 7) {
        // Already handled by availableSections.length check above
        return
      }
      setCurrentSection(nextSectionIndex)
    }
  }

  const previousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const calculateProgress = () => {
    return (savedSections.size / availableSections.length) * 100
  }

  const submitAssessment = async () => {
    if (!currentAssessmentId || !currentUser) {
      toast({
        title: "Error",
        description: "Assessment ID or user information is missing. Please save Section 1 first.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log('Submitting assessment:', currentAssessmentId)

      // First, auto-save the current section if it's Section 8 (final section)
      if (currentSection === 7) {
        const success = await saveSection8Responses()
        if (!success) {
          return // Don't proceed if save failed
        }
        setSavedSections(prev => new Set([...prev, currentSection]))
      }

      // Update the assessment status to "submitted"
      const result = await updateNurseryAssessment(currentAssessmentId, {
        status: 'submitted',
        updated_by: currentUser.id
      })

      if (result.error) {
        console.error('Failed to submit assessment:', result.error)
        toast({
          title: "Submission Failed",
          description: "Failed to submit the assessment. Please try again.",
          variant: "destructive",
        })
        return
      }

      console.log('Assessment submitted successfully:', result.assessment)
      
      // Clear local storage since assessment is now submitted
      clearLocalStorage()
      
      // Show success message
      toast({
        title: "Assessment Submitted",
        description: "Your nursery assessment has been submitted successfully.",
      })

      // Call the onSuccess callback if provided
      onSuccess?.()

    } catch (error) {
      console.error('Error submitting assessment:', error)
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred while submitting the assessment.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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

        {/* Enrollment */}
        <div className="space-y-2">
          <Label htmlFor="enrollment" className="text-sm font-medium text-gray-700">
            Enrollment
          </Label>
          <Input
            id="enrollment"
            type="number"
            min="0"
            placeholder="Enter number of students enrolled"
            value={formData.enrollment}
            onChange={(e) => handleInputChange('enrollment', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Assessment Type */}
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="assessmentType" className="text-sm font-medium text-gray-700">
            Assessment Type <span className="text-red-500">*</span>
          </Label>
          {yearlyLimits.allThreeSubmitted ? (
            <div className="p-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600">
              All assessments completed for this academic year
            </div>
          ) : (
            <Select 
              value={formData.assessmentType} 
              onValueChange={(value) => handleInputChange('assessmentType', value)}
              disabled={yearlyLimits.allThreeSubmitted}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select assessment type" />
              </SelectTrigger>
              <SelectContent>
                {ASSESSMENT_TYPES.filter(type => yearlyLimits.availableTypes.includes(type.value)).map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
                {yearlyLimits.submittedTypes.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-500 border-t border-gray-200 mt-1">
                      Already Submitted:
                    </div>
                    {ASSESSMENT_TYPES.filter(type => yearlyLimits.submittedTypes.includes(type.value)).map((type) => (
                      <SelectItem key={`submitted-${type.value}`} value={type.value} disabled>
                        {type.label} ✓
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          )}
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
                         (formData.autobiographicalResponses[question.id]?.noResponseGiven || 0)}/{parseInt(formData.enrollment) || 0}
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

  const renderAlphabetRecitation = () => {
    // Filter questions based on assessment type
    const filteredQuestions = formData.assessmentType === 'assessment-1-year-1' 
      ? questions.filter((question, index) => index === 0 || index === 2) // Show questions 1 and 3 (Alphabet Recitation and Letter Identification Lowercase)
      : questions // Show all questions for Year 2
    
    return (
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
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-8">
            <BookOpenIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Available</h3>
            <p className="text-gray-600">Unable to load assessment questions for this section.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question, index) => (
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
                         (formData.alphabetResponses[question.id]?.range19to26Correct || 0)}/{parseInt(formData.enrollment) || 0}
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
  }

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
                         (formData.colourResponses[question.id]?.threeCorrect || 0)}/{parseInt(formData.enrollment) || 0}
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
                        )}/{parseInt(formData.enrollment) || 0}
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
                        )}/{parseInt(formData.enrollment) || 0}
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
                        ) : 0}/{parseInt(formData.enrollment) || 0}
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
              Record the total number of students based on their performance for each gross motor skills assessment question. Scoring varies by activity: Throw/Catch (1-5 times), Hop activities (1-3 times), Stand on One Leg (Left/Right/Both).
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
                    // Stand on One Leg: Left/Right/Both
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Left Only
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
                          Right Only
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
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Both
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.grossMotorSkillsResponses[question.id]?.both || ""}
                          onChange={(e) => handleGrossMotorSkillsResponseChange(question.id, 'both', parseInt(e.target.value) || 0)}
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
                            return (responses.left || 0) + (responses.right || 0) + (responses.both || 0)
                          } else {
                            return (responses.oneTime || 0) + (responses.twoTimes || 0)
                          }
                        })()}/{parseInt(formData.enrollment) || 0}
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
        // Hide Gross Motor Skills section for Assessment 1 - Year 1
        if (formData.assessmentType === 'assessment-1-year-1') {
          return null
        }
        return renderGrossMotorSkills()
      default:
        return null
    }
  }

  return (
    <>
      {/* All Assessments Submitted Message */}
      {yearlyLimits.allThreeSubmitted && (
        <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              All Nursery Assessments Completed
            </CardTitle>
            <CardDescription className="text-blue-700">
              You have successfully submitted all three nursery assessments for this academic year. 
              New assessment forms will be available at the start of the next academic year.
              <div className="mt-2 text-sm">
                <strong>Submitted assessments:</strong>
                <ul className="list-disc list-inside mt-1">
                  {yearlyLimits.submittedTypes.map(type => {
                    const typeInfo = ASSESSMENT_TYPES.find(t => t.value === type)
                    return (
                      <li key={type}>{typeInfo?.label || type}</li>
                    )
                  })}
                </ul>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Form Container with Disabled State */}
      <div className={yearlyLimits.allThreeSubmitted ? "opacity-60 pointer-events-none" : ""}>
        
      {/* Progress Tabs - Hidden on mobile */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Nursery Assessment Report
              </h2>
              {currentAssessmentId && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-orange-600">Continuing draft assessment</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {Math.round(calculateProgress())}% Complete
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between min-w-max px-2">
              {availableSections.map((section, index) => {
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
                    {index < availableSections.length - 1 && (
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
                Section {currentSection + 1} of {availableSections.length}: {availableSections[currentSection]}
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
                className="w-full sm:w-auto border border-blue-300 text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                <Save className="h-4 w-4" />
                Save Section
              </Button>

              {/* Auto-save indicator */}
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auto-saving...
                </div>
              )}

              {currentSection === availableSections.length - 1 ? (
                <Button
                  onClick={submitAssessment}
                  disabled={loading || yearlyLimits.allThreeSubmitted}
                  className="w-full sm:w-auto gradient-button text-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextSection}
                  disabled={currentSection === availableSections.length - 1 || !isCurrentSectionComplete() || yearlyLimits.allThreeSubmitted}
                  className={`w-full sm:w-auto transition-all duration-200 flex items-center gap-2 ${
                    (!isCurrentSectionComplete() || yearlyLimits.allThreeSubmitted)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'gradient-button text-white hover:shadow-lg'
                  }`}
                >
                  {(!isCurrentSectionComplete() || yearlyLimits.allThreeSubmitted) ? 'Save Section First' : 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      </div> {/* End of disabled form container */}
    </>
  )
}
