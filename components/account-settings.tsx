"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormStatus } from "react-dom"
import { updateUserProfile, updateUserPassword } from "@/app/actions/users"
import { CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { User, Lock, Mail, Shield, Eye, EyeOff, CheckCircle2, KeyRound, MapPin, Pencil } from "lucide-react"

function SubmitButton({ text, icon: Icon }: { text: string; icon?: React.ElementType }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Saving...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5" />}
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
    region_name?: string
  }
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [activeSection, setActiveSection] = useState<"profile" | "security">("profile")

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
    "bg-emerald-500",
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Account Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your profile and security preferences</p>
      </div>

      {/* Profile Card */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-[hsl(222,47%,9%)] rounded-2xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/50">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
                {getInitials(user.name)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-[hsl(222,47%,9%)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  {user.role}
                </span>
                {user.region_name && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {user.region_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-700/50">
          <button
            onClick={() => setActiveSection("profile")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeSection === "profile"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </div>
            {activeSection === "profile" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveSection("security")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeSection === "security"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <KeyRound className="w-4 h-4" />
              Security
            </div>
            {activeSection === "security" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeSection === "profile" ? (
            <div>
              {profileMessage && (
                <div className={`mb-5 p-3.5 rounded-xl flex items-start gap-2.5 ${
                  profileMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
                }`}>
                  {profileMessage.type === "success" ? (
                    <CheckCircledIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <p className={`text-sm ${
                    profileMessage.type === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                  }`}>
                    {profileMessage.message}
                  </p>
                </div>
              )}

              <form action={handleProfileUpdate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      name="name"
                      defaultValue={user.name}
                      required
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,11%)] text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                      placeholder="Enter your full name"
                    />
                    <Pencil className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="h-11 rounded-xl bg-slate-100 dark:bg-[hsl(222,47%,8%)] border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-500 cursor-not-allowed pr-10"
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Contact an administrator to change your email
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Role
                  </Label>
                  <div className="relative">
                    <Input
                      id="role"
                      name="role"
                      value={user.role}
                      disabled
                      className="h-11 rounded-xl bg-slate-100 dark:bg-[hsl(222,47%,8%)] border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-500 cursor-not-allowed pr-10"
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Roles are managed by system administrators
                  </p>
                </div>

                <div className="pt-3 flex justify-end">
                  <SubmitButton text="Save Changes" icon={CheckCircle2} />
                </div>
              </form>
            </div>
          ) : (
            <div>
              {passwordMessage && (
                <div className={`mb-5 p-3.5 rounded-xl flex items-start gap-2.5 ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
                }`}>
                  {passwordMessage.type === "success" ? (
                    <CheckCircledIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <p className={`text-sm ${
                    passwordMessage.type === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                  }`}>
                    {passwordMessage.message}
                  </p>
                </div>
              )}

              <form id="password-form" action={handlePasswordUpdate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="current_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      name="current_password"
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,11%)] text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700/50" />

                <div className="space-y-2">
                  <Label htmlFor="new_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,11%)] text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
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
                        "text-emerald-500"
                      }`}>
                        {strengthLabels[passwordStrength - 1] || "Very Weak"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      className="h-11 rounded-xl border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[hsl(222,47%,11%)] text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <SubmitButton text="Update Password" icon={KeyRound} />
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
