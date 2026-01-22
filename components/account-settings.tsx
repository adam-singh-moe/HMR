"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormStatus } from "react-dom"
import { updateUserProfile, updateUserPassword } from "@/app/actions/users"
import { CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { User, Lock, ArrowLeft, Mail, Shield, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle, KeyRound } from "lucide-react"
import Link from "next/link"

function SubmitButton({ text, icon: Icon }: { text: string; icon?: React.ElementType }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50"
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Updating...
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {text}
        </div>
      )}
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  const handleProfileUpdate = async (formData: FormData) => {
    setProfileMessage(null)
    const result = await updateUserProfile(formData)

    if (result.error) {
      setProfileMessage({ type: "error", message: result.error })
    } else {
      setProfileMessage({ type: "success", message: "Profile updated successfully!" })
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
      const form = document.getElementById("password-form") as HTMLFormElement
      form?.reset()
      setNewPassword("")
      setTimeout(() => setPasswordMessage(null), 3000)
    }
  }

  const getDashboardUrl = () => {
    if (user.role === "Head Teacher") return "/dashboard/head-teacher"
    if (user.role === "Regional Officer") return "/dashboard/regional-officer"
    if (user.role === "Admin") return "/dashboard/admin"
    if (user.role === "Education Official") return "/dashboard/education-official"
    return "/dashboard/admin"
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link 
        href={getDashboardUrl()}
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Dashboard</span>
      </Link>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-2xl">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
          {/* Floating dots */}
          <div className="absolute top-8 right-20 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
          <div className="absolute bottom-12 right-40 w-3 h-3 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-20 left-1/3 w-2 h-2 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>
        
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-xl border border-white/20">
              {getInitials(user.name)}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>
          
          {/* User Info */}
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{user.name}</h1>
            <p className="text-blue-100 flex items-center justify-center sm:justify-start gap-2 mb-3">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
              <Shield className="w-4 h-4" />
              {user.role}
            </div>
          </div>

          {/* Stats/Quick Info */}
          <div className="hidden lg:flex gap-4">
            <div className="text-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <Sparkles className="w-6 h-6 text-yellow-300 mx-auto mb-1" />
              <p className="text-xs text-blue-100">Account Status</p>
              <p className="text-sm font-semibold text-white">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Information</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your personal details</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6">
            {profileMessage && (
              <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
                profileMessage.type === "success" 
                  ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
              }`}>
                {profileMessage.type === "success" ? (
                  <CheckCircledIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${
                    profileMessage.type === "success" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
                  }`}>
                    {profileMessage.type === "success" ? "Success!" : "Error"}
                  </p>
                  <p className={`text-sm ${
                    profileMessage.type === "success" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  }`}>
                    {profileMessage.message}
                  </p>
                </div>
              </div>
            )}

            <form action={handleProfileUpdate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    name="name"
                    defaultValue={user.name}
                    required
                    className="pl-12 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="pl-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Email address cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Role
                </Label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="role"
                    name="role"
                    value={user.role}
                    disabled
                    className="pl-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Role is assigned by administrators
                </p>
              </div>

              <div className="pt-2">
                <SubmitButton text="Save Changes" icon={CheckCircle2} />
              </div>
            </form>
          </div>
        </div>

        {/* Password Security Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Password & Security</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Keep your account secure</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6">
            {passwordMessage && (
              <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 ${
                passwordMessage.type === "success" 
                  ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800" 
                  : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
              }`}>
                {passwordMessage.type === "success" ? (
                  <CheckCircledIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${
                    passwordMessage.type === "success" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
                  }`}>
                    {passwordMessage.type === "success" ? "Success!" : "Error"}
                  </p>
                  <p className={`text-sm ${
                    passwordMessage.type === "success" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  }`}>
                    {passwordMessage.message}
                  </p>
                </div>
              </div>
            )}

            <form id="password-form" action={handlePasswordUpdate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="current_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Current Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="current_password"
                    name="current_password"
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    className="pl-12 pr-12 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  New Password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="new_password"
                    name="new_password"
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      passwordStrength <= 1 ? "text-red-500" :
                      passwordStrength === 2 ? "text-orange-500" :
                      passwordStrength === 3 ? "text-yellow-600 dark:text-yellow-500" :
                      passwordStrength === 4 ? "text-blue-500" :
                      "text-green-500"
                    }`}>
                      Password strength: {strengthLabels[passwordStrength - 1] || "Very Weak"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    className="pl-12 pr-12 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <SubmitButton text="Update Password" icon={KeyRound} />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
