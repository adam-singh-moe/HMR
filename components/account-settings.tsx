"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useFormStatus } from "react-dom"
import { updateUserProfile, updateUserPassword } from "@/app/actions/users"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { User, Lock, ArrowLeft } from "lucide-react"
import Link from "next/link"

function SubmitButton({ text, variant = "default" }: { text: string; variant?: "default" | "destructive" }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      className={variant === "default" ? "gradient-button text-white hover:shadow-lg transition-all duration-200" : ""}
    >
      {pending ? "Updating..." : text}
    </Button>
  )
}

interface AccountSettingsProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleProfileUpdate = async (formData: FormData) => {
    setProfileMessage(null)
    const result = await updateUserProfile(formData)

    if (result.error) {
      setProfileMessage({ type: "error", message: result.error })
    } else {
      setProfileMessage({ type: "success", message: "Profile updated successfully!" })
      // Clear success message after 3 seconds
      setTimeout(() => setProfileMessage(null), 3000)
    }
  }

  const handlePasswordUpdate = async (formData: FormData) => {
    setPasswordMessage(null)
    const result = await updateUserPassword(formData)

    if (result.error) {
      setPasswordMessage({ type: "error", message: result.error })
    } else {
      setPasswordMessage({ type: "success", message: "Password updated successfully!" })
      // Clear the form
      const form = document.getElementById("password-form") as HTMLFormElement
      form?.reset()
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordMessage(null), 3000)
    }
  }

  // Determine the correct dashboard URL based on user role
  const getDashboardUrl = () => {
    if (user.role === "Head Teacher") {
      return "/dashboard/head-teacher"
    } else if (user.role === "Regional Officer") {
      return "/dashboard/regional-officer"
    } else if (user.role === "Admin") {
      return "/dashboard/admin"
    } else if (user.role === "Education Official") {
      return "/dashboard/education-official"
    }
    // For unknown roles, default to admin dashboard
    return "/dashboard/admin"
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link href={getDashboardUrl()}>
          <Button variant="outline" size="sm" className="border-primary-200 text-primary-700 hover:bg-primary-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="gradient-header rounded-xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
            <User className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
            <p className="text-blue-100 text-sm sm:text-base">Manage your profile information and security settings</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Profile Information */}
        <Card className="gradient-card border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle className="text-primary-700">Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileMessage && (
              <Alert
                variant={profileMessage.type === "error" ? "destructive" : "default"}
                className={profileMessage.type === "success" ? "border-green-200 bg-green-50" : ""}
              >
                {profileMessage.type === "success" ? (
                  <CheckCircledIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4" />
                )}
                <AlertTitle className={profileMessage.type === "success" ? "text-green-800" : ""}>
                  {profileMessage.type === "success" ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription className={profileMessage.type === "success" ? "text-green-700" : ""}>
                  {profileMessage.message}
                </AlertDescription>
              </Alert>
            )}

            <form action={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-primary-700 font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user.name}
                  required
                  className="border-primary-200 focus:border-primary-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-primary-700 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-gray-50 border-gray-200 text-gray-500"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role" className="text-primary-700 font-medium">
                  Role
                </Label>
                <Input
                  id="role"
                  name="role"
                  value={user.role}
                  disabled
                  className="bg-gray-50 border-gray-200 text-gray-500"
                />
                <p className="text-xs text-muted-foreground">Role cannot be changed</p>
              </div>

              <SubmitButton text="Update Profile" />
            </form>
          </CardContent>
        </Card>

        {/* Password Security */}
        <Card className="gradient-card border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Lock className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle className="text-primary-700">Password Security</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordMessage && (
              <Alert
                variant={passwordMessage.type === "error" ? "destructive" : "default"}
                className={passwordMessage.type === "success" ? "border-green-200 bg-green-50" : ""}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircledIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4" />
                )}
                <AlertTitle className={passwordMessage.type === "success" ? "text-green-800" : ""}>
                  {passwordMessage.type === "success" ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription className={passwordMessage.type === "success" ? "text-green-700" : ""}>
                  {passwordMessage.message}
                </AlertDescription>
              </Alert>
            )}

            <form id="password-form" action={handlePasswordUpdate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current_password" className="text-primary-700 font-medium">
                  Current Password
                </Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  className="border-primary-200 focus:border-primary-500"
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="new_password" className="text-primary-700 font-medium">
                  New Password
                </Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  className="border-primary-200 focus:border-primary-500"
                />
                <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm_password" className="text-primary-700 font-medium">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  className="border-primary-200 focus:border-primary-500"
                />
              </div>

              <SubmitButton text="Update Password" />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
