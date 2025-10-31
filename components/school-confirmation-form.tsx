"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { School } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { SchoolSearch } from "@/components/school-search"

interface SchoolConfirmationFormProps {
  userEmail: string
  userId: string
  currentSchoolId: string | null
  currentSchoolName: string | null
  onConfirm: (schoolId: string) => void
  onBack: () => void
}

export function SchoolConfirmationForm({ 
  userEmail, 
  userId, 
  currentSchoolId, 
  currentSchoolName,
  onConfirm,
  onBack 
}: SchoolConfirmationFormProps) {
  const [isChangingSchool, setIsChangingSchool] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState(currentSchoolId || "")
  const [schools, setSchools] = useState<Array<{ id: string; name: string; region_id: string; sms_regions?: { id: string; name: string } | { id: string; name: string }[] }>>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch schools on component mount
  useEffect(() => {
    async function fetchSchools() {
      try {
        if (!supabase) return
        
        const { data: schoolsData } = await supabase
          .from("sms_schools")
          .select(`
            id, 
            name, 
            region_id,
            sms_regions (
              id,
              name
            )
          `)
          .order("name")
        
        setSchools(schoolsData || [])
      } catch (error) {
        console.error("Error fetching schools:", error)
      }
    }
    
    fetchSchools()
  }, [])

  const handleConfirmSchool = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // If school was changed, update it in the database
      if (isChangingSchool && selectedSchoolId && selectedSchoolId !== currentSchoolId) {
        if (!supabase) {
          throw new Error("Database connection not available")
        }
        
        const { error: updateError } = await supabase
          .from("hmr_users")
          .update({ school_id: selectedSchoolId })
          .eq("id", userId)

        if (updateError) {
          throw updateError
        }
      }

      // Proceed to password change with the confirmed/selected school
      onConfirm(selectedSchoolId || currentSchoolId || "")
    } catch (error) {
      console.error("Error updating school:", error)
      setError("Failed to update school assignment. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-lg border-0 max-w-lg mx-auto bg-white">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <School className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl text-primary-700">
          Confirm Your School Assignment
        </CardTitle>
        <CardDescription className="text-base">
          Before setting up your account, please confirm the school assigned to your account is correct.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Your Email</Label>
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
              {userEmail}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Currently Assigned School</Label>
            <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-lg">
              <p className="font-semibold text-blue-900 text-lg">
                {currentSchoolName || "No school currently assigned"}
              </p>
              {currentSchoolName && (
                <p className="text-sm text-blue-700 mt-2">
                  Is this your school?
                </p>
              )}
            </div>
          </div>

          {!isChangingSchool && currentSchoolName && (
            <div className="flex gap-3">
              <Button
                onClick={() => handleConfirmSchool()}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? "Confirming..." : "Yes, This is My School"}
              </Button>
              <Button
                onClick={() => setIsChangingSchool(true)}
                variant="outline"
                className="flex-1"
              >
                No, Change School
              </Button>
            </div>
          )}

          {(isChangingSchool || !currentSchoolName) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school">Select Your School</Label>
                <SchoolSearch
                  schools={schools}
                  value={selectedSchoolId}
                  onChange={setSelectedSchoolId}
                  placeholder="Search for your school..."
                  showRegion={true}
                  maxResults={1000}
                />
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Important</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Please select the school where you are the head teacher. This will determine 
                  which reports you can access and submit.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={() => setIsChangingSchool(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSchool}
                  disabled={isLoading || !selectedSchoolId}
                  className="flex-1 gradient-button text-white"
                >
                  {isLoading ? "Confirming..." : "Confirm School"}
                </Button>
              </div>
            </div>
          )}

          {!currentSchoolName && !isChangingSchool && (
            <div className="text-center">
              <Alert className="border-red-200 bg-red-50 mb-4">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">No School Assigned</AlertTitle>
                <AlertDescription className="text-red-700">
                  No school is currently assigned to your account. Please select your school to continue.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setIsChangingSchool(true)}
                className="gradient-button text-white"
              >
                Select My School
              </Button>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="text-sm"
              disabled={isLoading}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}