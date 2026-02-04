"use client"

import { ShieldAlert, ArrowLeft, Home, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-wrapper"

interface AccessDeniedProps {
  /** The title to display */
  title?: string
  /** The description message */
  message?: string
  /** The specific permission that was denied (for display purposes) */
  permission?: string
  /** Show back button */
  showBackButton?: boolean
  /** Show home button */
  showHomeButton?: boolean
  /** Custom action button */
  customAction?: {
    label: string
    onClick: () => void
  }
  /** Variant style */
  variant?: "full-page" | "card" | "inline"
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access this resource.",
  permission,
  showBackButton = true,
  showHomeButton = true,
  customAction,
  variant = "card",
}: AccessDeniedProps) {
  const router = useRouter()
  const { user } = useAuth()

  // Determine home route based on user role
  const getHomeRoute = () => {
    if (!user?.role) return "/auth"
    switch (user.role) {
      case "Admin":
        return "/dashboard/admin"
      case "Regional Officer":
        return "/dashboard/regional-officer"
      case "Head Teacher":
        return "/dashboard/head-teacher"
      case "Education Official":
        return "/dashboard/education-official"
      default:
        return "/dashboard"
    }
  }

  const content = (
    <>
      {/* Icon */}
      <div className="relative">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>

      {/* Text Content */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {message}
        </p>
        {permission && (
          <p className="text-xs text-slate-500 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md inline-block">
            Required: {permission}
          </p>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Signed in as</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {user.name || user.email}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
            {user.role}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {showBackButton && (
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        )}
        {showHomeButton && (
          <Button
            onClick={() => router.push(getHomeRoute())}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        )}
        {customAction && (
          <Button onClick={customAction.onClick} variant="secondary">
            {customAction.label}
          </Button>
        )}
      </div>

      {/* Contact Admin */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          If you believe this is an error, please contact your administrator.
        </p>
        <a
          href="mailto:support@moe.gov.gy"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
        >
          <Mail className="w-3.5 h-3.5" />
          support@moe.gov.gy
        </a>
      </div>
    </>
  )

  // Full page variant
  if (variant === "full-page") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-lg">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-6">
            {content}
          </div>
        </div>
      </div>
    )
  }

  // Inline variant (minimal)
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {title}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 truncate">
            {message}
          </p>
        </div>
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Go Back
          </Button>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-6 shadow-sm">
      {content}
    </div>
  )
}
