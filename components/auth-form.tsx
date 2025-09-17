"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFormStatus } from "react-dom"
import { signIn, signUp } from "@/app/actions/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase-client"
import { EmailVerification } from "./email-verification"
import { Loader2, Eye, EyeOff } from "lucide-react"

function SubmitButton({ text }: { text: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full gradient-button text-white hover:shadow-lg transition-all duration-200"
      disabled={pending}
    >
      {pending ? "Processing..." : text}
    </Button>
  )
}

function AuthFormContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [role, setRole] = useState<"head_teacher" | "regional_officer" | "education_official">("head_teacher")
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [selectedSchool, setSelectedSchool] = useState<string>("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [schools, setSchools] = useState<Array<{ id: string; name: string; region_id: string; code: string }>>([])
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState<string>("")
  const [detectedSchool, setDetectedSchool] = useState<{ id: string; name: string; region_id: string; code: string } | null>(null)
  const [isDetectingSchool, setIsDetectingSchool] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [capsLockOn, setCapsLockOn] = useState(false)
  
  // Email verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [pendingUserData, setPendingUserData] = useState<any>(null)

  const searchParams = useSearchParams()

  // Caps Lock detection function
  const handleKeyPress = (event: React.KeyboardEvent) => {
    const capsLock = event.getModifierState && event.getModifierState('CapsLock')
    setCapsLockOn(capsLock)
  }

  const handleKeyUp = (event: React.KeyboardEvent) => {
    const capsLock = event.getModifierState && event.getModifierState('CapsLock')
    setCapsLockOn(capsLock)
  }

  // Fetch regions and schools on component mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Check if Supabase client is properly configured
        if (!supabase) {
          throw new Error("Supabase client not configured")
        }

        // Fetch regions with better error handling
        const { data: regionsData, error: regionsError } = await supabase
          .from("sms_regions")
          .select("id, name")
          .order("name")

        if (regionsError) {
          console.error("Regions fetch error:", regionsError)
          throw new Error(`Failed to fetch regions: ${regionsError.message}`)
        }

        setRegions(regionsData || [])

        // Fetch schools with better error handling
        const { data: schoolsData, error: schoolsError } = await supabase
          .from("sms_schools")
          .select("id, name, region_id, code")
          .order("name")

        if (schoolsError) {
          console.error("Schools fetch error:", schoolsError)
          throw new Error(`Failed to fetch schools: ${schoolsError.message}`)
        }

        setSchools(schoolsData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        // Set fallback empty arrays so form still works
        setRegions([])
        setSchools([])
        // Only show error if it's not a configuration issue
        if (error instanceof Error && !error.message.includes("not configured")) {
          setError("Unable to load regions and schools. You can still sign in, but registration may be limited.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Check for success message on component mount
  useEffect(() => {
    if (searchParams.get("signup") === "success") {
      setShowSuccess(true)
      setIsSignUp(false) // Make sure we're on sign-in form

      // Check if it's a verification pending case
      const verificationParam = searchParams.get("verification")
      if (verificationParam === "pending") {
        setSuccessMessage(
          "Your account has been created and is pending admin verification. You will be notified once approved.",
        )
      } else {
        setSuccessMessage("Your account has been created successfully. Please sign in with your credentials.")
      }

      // Hide success message after 8 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Function to detect school from email
  const detectSchoolFromEmail = async (email: string) => {
    if (!email || role !== "head_teacher") {
      setDetectedSchool(null)
      setSelectedSchool("")
      setSelectedRegion("")
      return
    }

    // Check if email matches the pattern hm.code@moe.edu.gy
    const emailPattern = /^hm\.([a-z0-9]+)@moe\.edu\.gy$/i
    const match = email.toLowerCase().match(emailPattern)
    
    if (!match) {
      setDetectedSchool(null)
      setSelectedSchool("")
      setSelectedRegion("")
      return
    }

    const schoolCode = match[1].toUpperCase() // Convert to uppercase for database matching
    
    setIsDetectingSchool(true)
    try {
      // Find school by code
      const school = schools.find(s => s.code === schoolCode)
      
      if (school) {
        setDetectedSchool(school)
        setSelectedSchool(school.id)
        setSelectedRegion(school.region_id)
        setError(null) // Clear any previous errors
      } else {
        setDetectedSchool(null)
        setSelectedSchool("")
        setSelectedRegion("")
        setError(`No school found with code "${schoolCode}". Please verify your email address.`)
      }
    } catch (error) {
      console.error("Error detecting school:", error)
      setDetectedSchool(null)
      setSelectedSchool("")
      setSelectedRegion("")
    } finally {
      setIsDetectingSchool(false)
    }
  }

  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    
    // Debounce school detection
    const timeoutId = setTimeout(() => {
      detectSchoolFromEmail(newEmail)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }

  useEffect(() => {
    // Re-detect school when schools data is loaded and email exists
    if (schools.length > 0 && email && role === "head_teacher") {
      detectSchoolFromEmail(email)
    }
  }, [schools, email, role])

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setShowSuccess(false)
    setPasswordError(null)

    // Validate password confirmation for sign up
    if (isSignUp) {
      const password = formData.get("password") as string
      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match")
        return
      }
      
      // Basic password validation
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters long")
        return
      }
    }

    // Validate regional officer has selected a region
    if (isSignUp && role === "regional_officer" && !selectedRegion && regions.length > 0) {
      setError("Please select a region for Regional Officer role")
      return
    }

    // Validate head teacher has detected school from email
    if (isSignUp && role === "head_teacher") {
      if (!email) {
        setError("Please enter your head teacher email")
        return
      }
      
      // Check email format
      const emailPattern = /^hm\.([a-z0-9]+)@moe\.edu\.gy$/i
      if (!emailPattern.test(email)) {
        setError("Head teacher email must be in format: hm.code@moe.edu.gy")
        return
      }
      
      if (!detectedSchool) {
        setError("Could not detect school from email. Please verify your email address contains a valid school code.")
        return
      }
      
      if (!selectedSchool) {
        setError("School detection failed. Please try again or contact support.")
        return
      }
    }

    try {
      let result: { error?: string; success?: boolean; requiresVerification?: boolean } | undefined

      if (isSignUp) {
        formData.append("role", role)

        // Add the selected region to form data for regional officer
        if (role === "regional_officer" && selectedRegion) {
          formData.append("region", selectedRegion)
        }

        // Add the selected school to form data for head teacher
        if (role === "head_teacher" && selectedSchool) {
          formData.append("school", selectedSchool)

          // Find the region for the selected school
          const selectedSchoolData = schools.find((school) => school.id === selectedSchool)
          if (selectedSchoolData?.region_id) {
            // Set the selectedRegion state to match the school's region
            setSelectedRegion(selectedSchoolData.region_id)
            // Add the region to the form data
            formData.append("region", selectedSchoolData.region_id)
          }
        }

        // For sign up, start with email verification instead of directly calling signUp
        const userData = {
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: role,
          ...(role === "head_teacher" && selectedSchool && {
            school: selectedSchool,
            region: schools.find((school) => school.id === selectedSchool)?.region_id
          }),
          ...(role === "regional_officer" && selectedRegion && { region: selectedRegion }),
        }

        // Send verification code
        const verifyResponse = await fetch("/api/send-verification-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userData.email, userData })
        })

        const verifyData = await verifyResponse.json()

        if (verifyData.success) {
          setVerificationEmail(userData.email as string)
          setPendingUserData(userData)
          setShowEmailVerification(true)
          return // Don't proceed with signup yet
        } else {
          throw new Error(verifyData.error || "Failed to send verification code")
        }
      } else {
        result = await signIn(formData)
      }

      // Only set error if there's actually an error returned
      if (result?.error) {
        setError(result.error)
      }
    } catch (error: any) {
      // Only handle actual errors, not redirects
      if (error?.digest && error.digest.includes("NEXT_REDIRECT")) {
        // This is a redirect, which is expected - don't show error
        return
      }

      console.error("Form submission error:", error)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  // Handle successful email verification
  const handleEmailVerificationSuccess = async (userData: any) => {
    setError(null)
    setShowSuccess(false)

    try {
      // Create FormData from the verified user data
      const formData = new FormData()
      formData.append("name", userData.name)
      formData.append("email", userData.email)
      formData.append("password", userData.password)
      formData.append("role", userData.role)
      
      if (userData.school) {
        formData.append("school", userData.school)
      }
      if (userData.region) {
        formData.append("region", userData.region)
      }

      // Now create the user account
      const result = await signUp(formData)

      if (result?.error) {
        setError(result.error)
        setShowEmailVerification(false)
      } else {
        // Handle success based on role
        if (userData.role === "education_official") {
          setSuccessMessage("Account created successfully! Your account has been sent for admin approval. You will be notified once approved.")
        } else {
          setSuccessMessage("Account created successfully! You can now log in.")
        }
        setShowSuccess(true)
        setShowEmailVerification(false)
        setIsSignUp(false)
      }
    } catch (error: any) {
      // Only handle actual errors, not redirects
      if (error?.digest && error.digest.includes("NEXT_REDIRECT")) {
        // This is a redirect, which is expected - don't show error
        return
      }
      
      console.error("Account creation error:", error)
      setError("Failed to create account. Please try again.")
      setShowEmailVerification(false)
    }
  }

  // Handle going back from email verification
  const handleBackFromVerification = () => {
    setShowEmailVerification(false)
    setPendingUserData(null)
    setVerificationEmail("")
    setError(null)
  }

  const handleRoleChange = (value: "head_teacher" | "regional_officer" | "education_official") => {
    setRole(value)
    setSelectedRegion("") // Reset selected region when role changes
    setSelectedSchool("") // Reset selected school when role changes
    setDetectedSchool(null) // Reset detected school when role changes
    setError(null) // Clear any previous errors
    
    // Re-detect school if switching to head teacher and email exists
    if (value === "head_teacher" && email) {
      detectSchoolFromEmail(email)
    }
  }

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setShowSuccess(false)
    setSelectedRegion("") // Reset region selection
    setSelectedSchool("") // Reset school selection
    setDetectedSchool(null) // Reset detected school
    setEmail("") // Reset email
    setConfirmPassword("") // Reset confirm password
    setPasswordError(null) // Reset password error
    setShowPassword(false) // Reset password visibility
    setShowConfirmPassword(false) // Reset confirm password visibility
    // Reset email verification states
    setShowEmailVerification(false)
    setPendingUserData(null)
    setVerificationEmail("")
  }

  // Show email verification component if in verification mode
  if (showEmailVerification) {
    return (
      <EmailVerification
        email={verificationEmail}
        userData={pendingUserData}
        onVerificationSuccess={handleEmailVerificationSuccess}
        onBack={handleBackFromVerification}
      />
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo and Header */}
      <div className="text-center mb-8">
        <div className="relative h-20 w-20 mx-auto mb-4">
          <Image src="/images/moe-logo.png" alt="Ministry of Education Guyana" fill className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Ministry of Education</h1>
        <p className="text-muted-foreground">Republic of Guyana</p>
      </div>

      <Card className="gradient-card shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-primary-700">{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Register for your School Headteachers' Monthly Reporting Portal account" : "Access your School Headteachers' Monthly reporting portal account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="grid gap-4">
            {showSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircledIcon className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Registration Successful!</AlertTitle>
                <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {isSignUp && (
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-primary-700 font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                  className="border-primary-200 focus:border-primary-500"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-primary-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder={isSignUp && role === "head_teacher" ? "hm.code@moe.edu.gy" : "email@moe.gov.gy"}
                required
                className="border-primary-200 focus:border-primary-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-primary-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="border-primary-200 focus:border-primary-500 pr-10"
                  onKeyPress={handleKeyPress}
                  onKeyUp={handleKeyUp}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {capsLockOn && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>
            {isSignUp && (
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-primary-700 font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setPasswordError(null) // Clear error when user types
                    }}
                    onKeyPress={handleKeyPress}
                    onKeyUp={handleKeyUp}
                    required
                    className={`border-primary-200 focus:border-primary-500 pr-10 ${
                      passwordError ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {capsLockOn && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>Caps Lock is ON</span>
                  </div>
                )}
                {passwordError && (
                  <p className="text-red-600 text-sm mt-1">{passwordError}</p>
                )}
              </div>
            )}
            {isSignUp && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-primary-700 font-medium">
                    Role
                  </Label>
                  <Select value={role} onValueChange={handleRoleChange}>
                    <SelectTrigger id="role" name="role" className="border-primary-200 focus:border-primary-500">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head_teacher">Head Teacher</SelectItem>
                      <SelectItem value="regional_officer">Regional Officer</SelectItem>
                      <SelectItem value="education_official">Education Official</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {role === "head_teacher" && (
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">
                      School Detection
                    </Label>
                    
                    {/* Show loading state */}
                    {isDetectingSchool && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          🔍 Detecting school from email...
                        </p>
                      </div>
                    )}
                    
                    {/* Show detected school */}
                    {detectedSchool && !isDetectingSchool && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800 font-medium">
                          ✅ School Detected: {detectedSchool.name}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Code: {detectedSchool.code} | Region: {regions.find(r => r.id === detectedSchool.region_id)?.name} (Auto-selected)
                        </p>
                      </div>
                    )}
                    
                    {/* Show instruction when no email or wrong format */}
                    {!detectedSchool && !isDetectingSchool && email && role === "head_teacher" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-sm text-amber-800">
                          💡 Please enter your head teacher email in the format: <strong>hm.code@moe.edu.gy</strong>
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Example: hm.pr05004@moe.edu.gy (where pr05004 is your school code)
                        </p>
                      </div>
                    )}
                    
                    {/* Show initial instruction when no email */}
                    {!email && role === "head_teacher" && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm text-gray-700">
                          Enter your email above to automatically detect your school
                        </p>
                      </div>
                    )}
                    
                    {/* Hidden inputs for form submission */}
                    <input type="hidden" name="school" value={selectedSchool} />
                    <input type="hidden" name="region" value={selectedRegion} />
                  </div>
                )}

                {role === "regional_officer" && (
                  <div className="grid gap-2">
                    <Label htmlFor="region" className="text-primary-700 font-medium">
                      Affiliated Region
                    </Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger
                        id="region"
                        name="region"
                        className="border-primary-200 focus:border-primary-500"
                        disabled={isLoading || regions.length === 0}
                      >
                        <SelectValue
                          placeholder={
                            isLoading
                              ? "Loading regions..."
                              : regions.length === 0
                                ? "No regions available"
                                : "Select your region"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.length === 0 ? (
                          <SelectItem value="" disabled>
                            No regions available
                          </SelectItem>
                        ) : (
                          regions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                              {region.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === "education_official" && (
                  <div className="grid gap-2">
                    <Label className="text-primary-700 font-medium">Education Official</Label>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Your account will require admin verification before you can access the
                        dashboard.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            <SubmitButton text={isSignUp ? "Create Account" : "Sign In"} />
          </form>
          <div className="mt-6 text-center text-sm">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <Button
              variant="link"
              onClick={toggleSignUp}
              className="p-0 h-auto text-primary-600 hover:text-primary-700"
            >
              {isSignUp ? "Sign In" : "Create Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AuthFormFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo and Header */}
      <div className="text-center mb-8">
        <div className="relative h-20 w-20 mx-auto mb-4">
          <Image src="/images/moe-logo.png" alt="Ministry of Education Guyana" fill className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Ministry of Education</h1>
        <p className="text-muted-foreground">Republic of Guyana</p>
      </div>

      <Card className="gradient-card shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-primary-700">Loading...</CardTitle>
          <CardDescription>Please wait while we load the authentication form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-primary-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AuthForm() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <AuthFormContent />
    </Suspense>
  )
}
