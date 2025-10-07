"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon, CheckCircledIcon } from "@radix-ui/react-icons"
import { Eye, EyeOff } from "lucide-react"
import { changeDefaultPassword } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

interface PasswordChangeFormProps {
  userEmail: string
  userName: string | null
  userId: string
  requiresName: boolean
  onBack: () => void
}

export function PasswordChangeForm({ userEmail, userName, userId, requiresName, onBack }: PasswordChangeFormProps) {
  const [fullName, setFullName] = useState(userName || "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Debug logging
  // console.log("PasswordChangeForm rendered with props:", {
  //   userEmail,
  //   userName,
  //   userId,
  //   requiresName
  // })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate name if required
    if (requiresName && (!fullName || fullName.trim() === "")) {
      setError("Full name is required")
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append("userId", userId)
    formData.append("newPassword", newPassword)
    formData.append("confirmPassword", confirmPassword)
    
    // Include name if provided or required
    if (fullName && fullName.trim() !== "") {
      formData.append("fullName", fullName.trim())
    }

    const result = await changeDefaultPassword(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else if (result.success) {
      setSuccess(true)
      // Auto-redirect to appropriate dashboard if login was successful
      if (result.autoLogin && result.redirectTo) {
        setTimeout(() => {
          router.push(result.redirectTo)
        }, 2000)
      } else {
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push("/auth")
        }, 2000)
      }
    }
  }

  if (success) {
    return (
      <Card className="gradient-card shadow-xl border-0 max-w-md mx-auto">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-green-700">
            {requiresName ? "Profile Completed Successfully!" : "Password Changed Successfully!"}
          </CardTitle>
          <CardDescription>
            {requiresName 
              ? "Your profile has been completed. Redirecting to dashboard..."
              : "Your password has been updated. Redirecting to dashboard..."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircledIcon className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              {requiresName 
                ? "You can now access your dashboard with your new profile information."
                : "You can now sign in with your new password."
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gradient-card shadow-xl border-0 max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl text-primary-700">
          {requiresName ? "Complete Your Profile" : "Change Your Password"}
        </CardTitle>
        <CardDescription>
          {requiresName 
            ? "Please provide your full name and change your default password to continue."
            : `Welcome, ${userName}! For security reasons, you must change your default password before continuing.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-email">Email</Label>
            <Input
              id="current-email"
              type="email"
              value={userEmail}
              disabled
              className="bg-gray-50"
            />
          </div>

          {requiresName && (
            <div className="space-y-2">
              <Label htmlFor="full-name">Head Teacher's Full Name *</Label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter the Head Teacher's full name"
                required
                className="focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={8}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={8}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <h4 className="font-medium text-blue-800 mb-1">Requirements:</h4>
            <ul className="text-blue-700 space-y-1">
              {requiresName && <li>• Full name is required</li>}
              <li>• Password must be at least 8 characters long</li>
              <li>• Cannot be the default password</li>
              <li>• Should be unique and secure</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={isLoading}
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-button text-white hover:shadow-lg transition-all duration-200"
              disabled={isLoading || !newPassword || !confirmPassword || (requiresName && !fullName)}
            >
              {isLoading ? "Updating..." : requiresName ? "Complete Profile" : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
