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
  userName: string
  userId: string
  onBack: () => void
}

export function PasswordChangeForm({ userEmail, userName, userId, onBack }: PasswordChangeFormProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("userId", userId)
    formData.append("newPassword", newPassword)
    formData.append("confirmPassword", confirmPassword)

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
        // Redirect to login if auto-login failed
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
          <CardTitle className="text-xl text-green-700">Password Changed Successfully!</CardTitle>
          <CardDescription>
            Your password has been updated. Redirecting to login...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircledIcon className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              You can now sign in with your new password.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gradient-card shadow-xl border-0 max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl text-primary-700">Change Your Password</CardTitle>
        <CardDescription>
          Welcome, {userName}! For security reasons, you must change your default password before continuing.
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
            <h4 className="font-medium text-blue-800 mb-1">Password Requirements:</h4>
            <ul className="text-blue-700 space-y-1">
              <li>• At least 8 characters long</li>
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
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}