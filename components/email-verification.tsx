"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Clock, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface EmailVerificationProps {
  email: string
  userData: any
  onVerificationSuccess: (userData: any) => void
  onBack: () => void
  initialToken?: string
  verificationType?: "signup" | "password_reset"
}

export function EmailVerification({ 
  email, 
  userData, 
  onVerificationSuccess, 
  onBack,
  initialToken,
  verificationType = "signup"
}: EmailVerificationProps) {
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false)
  const [verificationToken, setVerificationToken] = useState<string | null>(initialToken || null)
  
  // Password reset states
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifiedCode, setVerifiedCode] = useState("")

  // Only send verification code on mount if no initial token provided
  useEffect(() => {
    if (!initialToken) {
      sendVerificationCode()
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const sendVerificationCode = async () => {
    try {
      const endpoint = verificationType === "password_reset" ? "/api/forgot-password" : "/api/send-verification-code"
      const requestBody = verificationType === "password_reset" 
        ? { email } 
        : { email, userData }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        setVerificationToken(data.token)
        setTimeLeft(600) // Reset timer
        setCanResend(false)
        setCode("")
        setError("")
      } else {
        setError(data.error || "Failed to send verification code")
      }
    } catch (error) {
      setError("Failed to send verification code. Please try again.")
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationToken) {
      setError("No verification token available. Please request a new code.")
      return
    }
    
    setIsVerifying(true)
    setError("")

    try {
      if (verificationType === "password_reset") {
        // For password reset, show password form after verification
        const response = await fetch("/api/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: verificationToken, code })
        })

        const data = await response.json()

        if (data.success) {
          setVerifiedCode(code) // Store the verified code
          setShowPasswordForm(true)
          setCode("") // Clear the input field
        } else {
          setError(data.error || "Invalid verification code")
        }
      } else {
        // For signup, proceed with normal verification
        const response = await fetch("/api/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: verificationToken, code })
        })

        const data = await response.json()

        if (data.success) {
          onVerificationSuccess(data.userData)
        } else {
          setError(data.error || "Invalid verification code")
        }
      }
    } catch (error) {
      setError("Failed to verify code. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    setError("")
    await sendVerificationCode()
    setIsResending(false)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    if (error && value.length === 6) {
      setError("") // Clear error when user types a complete code
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    // Validate all required fields
    if (!verificationToken) {
      setPasswordError("No verification token available")
      return
    }

    if (!verifiedCode) {
      setPasswordError("No verified code available")
      return
    }

    if (!newPassword) {
      setPasswordError("New password is required")
      return
    }

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long")
      return
    }

    console.log("Password reset attempt:", {
      hasToken: !!verificationToken,
      hasCode: !!verifiedCode,
      hasPassword: !!newPassword,
      codeValue: verifiedCode
    })

    setIsVerifying(true)

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: verificationToken, 
          code: verifiedCode, // Use the stored verified code
          newPassword 
        })
      })

      const data = await response.json()

      if (data.success) {
        onVerificationSuccess({ success: true, message: data.message })
      } else {
        setPasswordError(data.error || "Failed to reset password")
      }
    } catch (error) {
      setPasswordError("Failed to reset password. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const roleDisplay = userData.role?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "User"

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
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl text-primary-700">
            {showPasswordForm ? "Reset Your Password" : verificationType === "password_reset" ? "Verify Your Email" : "Verify Your Email"}
          </CardTitle>
          <CardDescription className="text-center">
            {showPasswordForm ? (
              <>Enter your new password below</>
            ) : (
              <>
                We've sent a 6-digit verification code to<br />
                <strong className="text-primary-600">{email}</strong><br />
                {verificationType === "signup" && <span className="text-sm text-muted-foreground">Role: {roleDisplay}</span>}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showPasswordForm ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full"
                />
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full"
                />
              </div>

              {passwordError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full gradient-button text-white hover:shadow-lg transition-all duration-200" 
                disabled={isVerifying || !newPassword || !confirmNewPassword}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={handleCodeChange}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={6}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              {timeLeft > 0 ? (
                <span>Code expires in {formatTime(timeLeft)}</span>
              ) : (
                <span className="text-red-600">Code has expired</span>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-button text-white hover:shadow-lg transition-all duration-200" 
              disabled={isVerifying || code.length !== 6 || timeLeft === 0}
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Email
                </>
              )}
            </Button>
          </form>
          )}

          {!showPasswordForm && (
            <>
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={!canResend || isResending || timeLeft > 0}
                  className="text-sm"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Resending...
                    </>
                  ) : canResend ? (
                    "Resend Code"
                  ) : (
                    `Resend available in ${formatTime(timeLeft)}`
                  )}
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                <p>Didn't receive the email? Check your spam folder.</p>
                {verificationType === "signup" && userData.role === "education_official" && (
                  <p className="mt-2 font-medium text-primary-600">
                    After verification, your account will be sent for admin approval.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="text-center">
            <Button variant="outline" onClick={onBack} className="text-sm">
              ← Back to {verificationType === "password_reset" ? "Sign In" : "Sign Up"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
