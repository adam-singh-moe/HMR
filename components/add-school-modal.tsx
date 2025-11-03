"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { School, X } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface Region {
  id: string
  name: string
}

interface AddSchoolModalProps {
  isVisible: boolean
  initialSchoolName: string
  onClose: () => void
  onSchoolAdded: (schoolId: string, schoolName: string) => void
  onRefreshSchools: () => void
}

export function AddSchoolModal({ 
  isVisible, 
  initialSchoolName, 
  onClose, 
  onSchoolAdded, 
  onRefreshSchools 
}: AddSchoolModalProps) {
  const [schoolName, setSchoolName] = useState(initialSchoolName)
  const [schoolCode, setSchoolCode] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("")
  const [schoolGrade, setSchoolGrade] = useState("")
  const [regions, setRegions] = useState<Region[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)

  const gradeOptions = [
    { value: "A", label: "Grade A" },
    { value: "B", label: "Grade B" },
    { value: "C", label: "Grade C" },
    { value: "D", label: "Grade D" },
    { value: "E", label: "Grade E" },
    { value: "O", label: "Grade O" },
  ]

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      setSchoolName(initialSchoolName)
      setSchoolCode("")
      setSelectedRegion("")
      setSchoolGrade("")
      setError(null)
    }
  }, [isVisible, initialSchoolName])

  // Fetch regions when component mounts
  useEffect(() => {
    async function fetchRegions() {
      setIsLoadingRegions(true)
      try {
        if (!supabase) return
        
        const { data: regionsData, error } = await supabase
          .from("sms_regions")
          .select("id, name")
          .order("name")
        
        if (error) {
          console.error("Error fetching regions:", error)
          setError("Failed to load regions")
          return
        }
        
        setRegions(regionsData || [])
      } catch (error) {
        console.error("Error fetching regions:", error)
        setError("Failed to load regions")
      } finally {
        setIsLoadingRegions(false)
      }
    }
    
    if (isVisible) {
      fetchRegions()
    }
  }, [isVisible])

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (!schoolName.trim()) {
      setError("School name is required")
      setIsLoading(false)
      return
    }

    if (!schoolCode.trim()) {
      setError("School code is required")
      setIsLoading(false)
      return
    }

    if (!selectedRegion) {
      setError("Please select a region")
      setIsLoading(false)
      return
    }

    if (!schoolGrade) {
      setError("Please select a school grade")
      setIsLoading(false)
      return
    }

    try {
      if (!supabase) {
        throw new Error("Database connection not available")
      }

      // Check if school already exists
      const { data: existingSchool } = await supabase
        .from("sms_schools")
        .select("id, name")
        .ilike("name", schoolName.trim())
        .single()

      if (existingSchool) {
        setError("A school with this name already exists")
        setIsLoading(false)
        return
      }

      // Insert new school
      const { data: newSchool, error: insertError } = await supabase
        .from("sms_schools")
        .insert({
          name: schoolName.trim(),
          region_id: selectedRegion,
          code: schoolCode.trim(),
          grade: schoolGrade
        })
        .select("id, name")
        .single()

      if (insertError) {
        throw insertError
      }

      if (!newSchool) {
        throw new Error("Failed to create school")
      }

      // Refresh schools list
      onRefreshSchools()
      
      // Notify parent of success
      onSchoolAdded(newSchool.id, newSchool.name)
      
      // Close modal
      handleClose()
    } catch (error) {
      console.error("Error creating school:", error)
      setError("Failed to create school. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      data-modal="add-school"
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the content
        if (e.target === e.currentTarget) {
          // Don't close - user must use buttons
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-visible relative z-[10000]"
        data-modal-content="add-school"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <School className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Add New School</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-visible">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 overflow-visible">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Enter school name"
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-code">School Code *</Label>
              <Input
                id="school-code"
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="Enter school code"
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Select
                value={selectedRegion}
                onValueChange={setSelectedRegion}
                disabled={isLoading || isLoadingRegions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingRegions ? "Loading regions..." : "Select a region"} />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 10001 }}>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">School Grade *</Label>
              <Select
                value={schoolGrade}
                onValueChange={setSchoolGrade}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select school grade" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 10001 }}>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <ExclamationTriangleIcon className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Important</AlertTitle>
              <AlertDescription className="text-blue-700">
                Please ensure all information is correct. This will be used to manage 
                reports and assignments for this school.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !schoolName.trim() || !schoolCode.trim() || !selectedRegion || !schoolGrade}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Creating..." : "Add School"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
