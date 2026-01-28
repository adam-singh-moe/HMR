"use client"

import { useState, useEffect, Suspense } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { signIn, signUp } from "@/app/actions/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase-client"
import { EmailVerification } from "./email-verification"
import { PasswordChangeForm } from "./password-change-form"
import { SchoolConfirmationForm } from "./school-confirmation-form"
import { AccountSetupFlow } from "./account-setup-flow"
import { Loader2, Eye, EyeOff } from "lucide-react"

// Submit button component that uses useFormStatus for loading state
function SubmitButton({ isForgotPassword, isSignUp }: { isForgotPassword: boolean; isSignUp: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {isForgotPassword ? "Sending..." : isSignUp ? "Creating Account..." : "Signing In..."}
        </span>
      ) : (
        isForgotPassword ? "Send Reset Code" : isSignUp ? "Create Account" : "Sign In"
      )}
    </Button>
  )
}

function AuthFormContent() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [role, setRole] = useState<"head_teacher" | "regional_officer" | "education_official">("head_teacher")
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [selectedSchool, setSelectedSchool] = useState<string>("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [schools, setSchools] = useState<Array<{ id: string; name: string; region_id: string; code: string }>>([])
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const [initialVerificationToken, setInitialVerificationToken] = useState<string | null>(null)
  const [verificationType, setVerificationType] = useState<"signup" | "password_reset">("signup")
  
  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordChangeUser, setPasswordChangeUser] = useState<{
    userEmail: string
    userName: string | null
    userId: string
    requiresName: boolean
  } | null>(null)

  // School confirmation states for head teachers
  const [showSchoolConfirmation, setShowSchoolConfirmation] = useState(false)
  const [schoolConfirmationUser, setSchoolConfirmationUser] = useState<{
    userEmail: string
    userName: string | null
    userId: string
    requiresName: boolean
    schoolId: string | null
    schoolName: string | null
  } | null>(null)

  // Account setup flow state (for head teachers with tabbed interface)
  const [showAccountSetup, setShowAccountSetup] = useState(false)
  const [accountSetupUser, setAccountSetupUser] = useState<{
    userEmail: string
    userName: string | null
    userId: string
    requiresName: boolean
    schoolId: string | null
    schoolName: string | null
  } | null>(null)

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
    
    // Only detect school during sign-up for head teachers
    if (isSignUp && role === "head_teacher") {
      // Debounce school detection
      const timeoutId = setTimeout(() => {
        detectSchoolFromEmail(newEmail)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    } else {
      // Clear any existing school detection errors during sign-in
      if (!isSignUp) {
        setDetectedSchool(null)
        setSelectedSchool("")
        setSelectedRegion("")
        setError(null)
      }
    }
  }

  useEffect(() => {
    // Only re-detect school when schools data is loaded and email exists during sign-up
    if (schools.length > 0 && email && role === "head_teacher" && isSignUp) {
      detectSchoolFromEmail(email)
    }
  }, [schools, email, role, isSignUp])

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setShowSuccess(false)
    setPasswordError(null)
    setIsSubmitting(true)

    // Validate password confirmation for sign up
    if (isSignUp) {
      const password = formData.get("password") as string
      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match")
        setIsSubmitting(false)
        return
      }

      // Basic password validation
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters long")
        setIsSubmitting(false)
        return
      }
    }

    // Validate regional officer has selected a region
    if (isSignUp && role === "regional_officer" && !selectedRegion && regions.length > 0) {
      setError("Please select a region for Regional Officer role")
      setIsSubmitting(false)
      return
    }

    // Validate head teacher has detected school from email
    if (isSignUp && role === "head_teacher") {
      if (!email) {
        setError("Please enter your head teacher email")
        setIsSubmitting(false)
        return
      }

      // Check email format
      const emailPattern = /^hm\.([a-z0-9]+)@moe\.edu\.gy$/i
      if (!emailPattern.test(email)) {
        setError("Head teacher email must be in format: hm.code@moe.edu.gy")
        setIsSubmitting(false)
        return
      }

      if (!detectedSchool) {
        setError("Could not detect school from email. Please verify your email address contains a valid school code.")
        setIsSubmitting(false)
        return
      }

      if (!selectedSchool) {
        setError("School detection failed. Please try again or contact support.")
        setIsSubmitting(false)
        return
      }
    }

    try {
      let result: { 
        error?: string; 
        success?: boolean; 
        requiresVerification?: boolean;
        requirePasswordChange?: boolean;
        userEmail?: string;
        userName?: string;
        userId?: string;
        requiresName?: boolean;
        userRole?: string;
        schoolId?: string;
        schoolName?: string;
      } | undefined

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
          //console.log("Received verification token:", verifyData.token)
          setVerificationEmail(userData.email as string)
          setPendingUserData(userData)
          setInitialVerificationToken(verifyData.token) // Store the token from signup
          //console.log("Set initial verification token and showing email verification")
          setShowEmailVerification(true)
          setIsSubmitting(false)
          return // Don't proceed with signup yet
        } else {
          throw new Error(verifyData.error || "Failed to send verification code")
        }
      } else {
        result = await signIn(formData)
      }

      // Check if password change is required
      if (result?.requirePasswordChange && result.userEmail && result.userId) {
        // Debug logging
        // console.log("Password change required:", {
        //   result,
        //   requiresName: result.requiresName
        // })

        // For head teachers with default password, show account setup flow
        if (result.userRole === "Head Teacher") {
          setAccountSetupUser({
            userEmail: result.userEmail,
            userName: result.userName || null,
            userId: result.userId,
            requiresName: result.requiresName || false,
            schoolId: result.schoolId || null,
            schoolName: result.schoolName || null
          })
          setShowAccountSetup(true)
          setIsSubmitting(false)
          return
        } else {
          // For other roles, go directly to password change
          setPasswordChangeUser({
            userEmail: result.userEmail,
            userName: result.userName || null,
            userId: result.userId,
            requiresName: result.requiresName || false
          })
          setShowPasswordChange(true)
          setIsSubmitting(false)
          return
        }
      }

      // Only set error if there's actually an error returned
      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      }
    } catch (error: any) {
      // Only handle actual errors, not redirects
      if (error?.digest && error.digest.includes("NEXT_REDIRECT")) {
        // This is a redirect, which is expected - don't show error
        return
      }

      console.error("Form submission error:", error)
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  // Handle successful email verification
  const handleEmailVerificationSuccess = async (userData: any) => {
    setError(null)

    try {
      // Call the create account API endpoint
      const response = await fetch("/api/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          region: userData.region,
          school: userData.school
        })
      })

      const result = await response.json()

      if (result.success) {
        // Account created successfully
        setShowEmailVerification(false)
        
        if (result.user.needsVerification) {
          setSuccessMessage("Account created successfully! Your account has been sent for admin approval. You will be notified once approved.")
        } else {
          setSuccessMessage("Account created successfully! You can now log in.")
        }
        setShowSuccess(true)
        setIsSignUp(false) // Switch back to sign-in form
      } else {
        // Show error
        setError(result.error)
        setShowEmailVerification(false)
      }
    } catch (error) {
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
    setInitialVerificationToken(null)
    setError(null)
  }

  // Handle forgot password form submission
  const handleForgotPassword = async (formData: FormData) => {
    const email = formData.get("email") as string

    if (!email) {
      setError("Email is required")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setVerificationEmail(email)
        setPendingUserData({ email, type: "password_reset" })
        setInitialVerificationToken(data.token)
        setVerificationType("password_reset")
        setShowEmailVerification(true)
        setIsForgotPassword(false)
      } else {
        // Even on "error", we show success message for security (don't reveal if email exists)
        setSuccessMessage("If an account with this email exists, you will receive a password reset code.")
        setShowSuccess(true)
        setError("")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      setError("Failed to process request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle password reset success
  const handlePasswordResetSuccess = (data: any) => {
    setSuccessMessage(data.message || "Password updated successfully! You can now log in with your new password.")
    setShowSuccess(true)
    setShowEmailVerification(false)
    setIsForgotPassword(false)
    setVerificationType("signup")
  }

  // Handle school confirmation completion
  const handleSchoolConfirmationComplete = (confirmedSchoolId: string) => {
    if (schoolConfirmationUser) {
      // Move to password change with confirmed school
      setPasswordChangeUser({
        userEmail: schoolConfirmationUser.userEmail,
        userName: schoolConfirmationUser.userName,
        userId: schoolConfirmationUser.userId,
        requiresName: schoolConfirmationUser.requiresName
      })
      setShowSchoolConfirmation(false)
      setShowPasswordChange(true)
    }
  }

  // Handle going back from school confirmation
  const handleBackFromSchoolConfirmation = () => {
    setShowSchoolConfirmation(false)
    setSchoolConfirmationUser(null)
    setError(null)
  }

  // Handle account setup flow completion
  const handleAccountSetupComplete = () => {
    setShowAccountSetup(false)
    setAccountSetupUser(null)
    // Redirect to dashboard or show success message
    router.push("/dashboard")
  }

  // Handle going back from account setup
  const handleBackFromAccountSetup = () => {
    setShowAccountSetup(false)
    setAccountSetupUser(null)
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

  // Show account setup flow for head teachers with default password
  if (showAccountSetup && accountSetupUser) {
    return (
      <AccountSetupFlow
        userEmail={accountSetupUser.userEmail}
        userName={accountSetupUser.userName}
        userId={accountSetupUser.userId}
        requiresName={accountSetupUser.requiresName}
        schoolId={accountSetupUser.schoolId}
        schoolName={accountSetupUser.schoolName}
        onComplete={handleAccountSetupComplete}
        onBack={handleBackFromAccountSetup}
      />
    )
  }

  // Show school confirmation component for head teachers with default password
  if (showSchoolConfirmation && schoolConfirmationUser) {
    return (
      <SchoolConfirmationForm
        userEmail={schoolConfirmationUser.userEmail}
        userId={schoolConfirmationUser.userId}
        currentSchoolId={schoolConfirmationUser.schoolId}
        currentSchoolName={schoolConfirmationUser.schoolName}
        onConfirm={handleSchoolConfirmationComplete}
        onBack={handleBackFromSchoolConfirmation}
      />
    )
  }

  // Show password change component if in password change mode
  if (showPasswordChange && passwordChangeUser) {
    return (
      <PasswordChangeForm
        userEmail={passwordChangeUser.userEmail}
        userName={passwordChangeUser.userName}
        userId={passwordChangeUser.userId}
        requiresName={passwordChangeUser.requiresName}
        onBack={() => {
          setShowPasswordChange(false)
          setPasswordChangeUser(null)
        }}
      />
    )
  }

  if (showEmailVerification) {
    return (
      <EmailVerification
        email={verificationEmail}
        userData={pendingUserData}
        onVerificationSuccess={verificationType === "password_reset" ? handlePasswordResetSuccess : handleEmailVerificationSuccess}
        onBack={handleBackFromVerification}
        initialToken={initialVerificationToken || undefined}
        verificationType={verificationType}
      />
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300">
        {/* Card Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-slate-200 dark:border-slate-800/50">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {isForgotPassword ? "Forgot Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {isForgotPassword 
              ? "Enter your email to receive a password reset code" 
              : isSignUp 
                ? "Register for the HMR Portal" 
                : "Sign in to access your dashboard"}
          </p>
          
          {/* First-time login notice for Head Teachers */}
          {!isSignUp && !isForgotPassword && (
            <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-white dark:text-slate-900 text-sm font-bold">!</span>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    First-time Head Teachers
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Use your school email and default password: 
                    <code className="bg-amber-100 dark:bg-slate-800 px-2 py-0.5 rounded text-amber-700 dark:text-amber-400 font-mono ml-1">hnCf4MN</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Card Content */}
        <div className="px-8 py-6">
          <form action={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-5">
            {showSuccess && (
              <Alert className="border-cyan-300 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                <CheckCircledIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <AlertTitle className="text-cyan-700 dark:text-cyan-300">Registration Successful!</AlertTitle>
                <AlertDescription className="text-cyan-600 dark:text-cyan-200/80">{successMessage}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert className="border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-600 dark:text-red-400">Error</AlertTitle>
                <AlertDescription className="text-red-500 dark:text-red-300/80">{error}</AlertDescription>
              </Alert>
            )}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder={isSignUp && role === "head_teacher" ? "hm.code@moe.edu.gy" : "email@moe.gov.gy"}
                required
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  Password
                </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 pr-10"
                  onKeyPress={handleKeyPress}
                  onKeyUp={handleKeyUp}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>
            )}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
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
                    className={`bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 pr-10 ${
                      passwordError ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>Caps Lock is ON</span>
                  </div>
                )}
                {passwordError && (
                  <p className="text-red-400 text-sm mt-1">{passwordError}</p>
                )}
              </div>
            )}
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    Role
                  </Label>
                  <Select value={role} onValueChange={handleRoleChange}>
                    <SelectTrigger id="role" name="role" className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="head_teacher" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Head Teacher</SelectItem>
                      <SelectItem value="regional_officer" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Regional Officer</SelectItem>
                      <SelectItem value="education_official" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Education Official</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {role === "head_teacher" && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      School Detection
                    </Label>
                    
                    {/* Show loading state */}
                    {isDetectingSchool && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          🔍 Detecting school from email...
                        </p>
                      </div>
                    )}
                    
                    {/* Show detected school */}
                    {detectedSchool && !isDetectingSchool && (
                      <div className="p-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 rounded-lg">
                        <p className="text-sm text-cyan-700 dark:text-cyan-300 font-medium">
                          ✅ School Detected: {detectedSchool.name}
                        </p>
                        <p className="text-xs text-cyan-600 dark:text-cyan-400/80 mt-1">
                          Code: {detectedSchool.code} | Region: {regions.find(r => r.id === detectedSchool.region_id)?.name}
                        </p>
                      </div>
                    )}
                    
                    {/* Show instruction when no email or wrong format */}
                    {!detectedSchool && !isDetectingSchool && email && role === "head_teacher" && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          💡 Enter email: <strong className="text-amber-800 dark:text-amber-200">hm.code@moe.edu.gy</strong>
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400/70 mt-1">
                          Example: hm.pr05004@moe.edu.gy
                        </p>
                      </div>
                    )}
                    
                    {/* Show initial instruction when no email */}
                    {!email && role === "head_teacher" && (
                      <div className="p-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Enter your email to detect your school automatically
                        </p>
                      </div>
                    )}
                    
                    {/* Hidden inputs for form submission */}
                    <input type="hidden" name="school" value={selectedSchool} />
                    <input type="hidden" name="region" value={selectedRegion} />
                  </div>
                )}

                {role === "regional_officer" && (
                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      Affiliated Region
                    </Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger
                        id="region"
                        name="region"
                        className="bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500"
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
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {regions.length === 0 ? (
                          <SelectItem value="" disabled className="text-slate-500 dark:text-slate-400">
                            No regions available
                          </SelectItem>
                        ) : (
                          regions.map((region) => (
                            <SelectItem key={region.id} value={region.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                              {region.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {role === "education_official" && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">Education Official</Label>
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Note:</strong> Your account will require admin verification before you can access the
                        dashboard.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Submit Button */}
            <SubmitButton isForgotPassword={isForgotPassword} isSignUp={isSignUp} />
          </form>
          
          {!isForgotPassword && !isSignUp && (
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsForgotPassword(true)}
                className="p-0 h-auto text-blue-400 hover:text-blue-300 text-sm"
              >
                Forgot your password?
              </Button>
            </div>
          )}
        </div>
        
        {/* Card Footer */}
        <div className="px-8 py-5 bg-slate-100 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800/50 text-center">
          {isForgotPassword ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Remember your password?{" "}
              <Button
                variant="link"
                onClick={() => setIsForgotPassword(false)}
                className="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Back to Sign In
              </Button>
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <Button
                variant="link"
                onClick={toggleSignUp}
                className="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </Button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function AuthFormFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Loading...</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Please wait while we load the authentication form</p>
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
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
