"use client"

import { ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/components/auth-wrapper"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Baby,
  Sparkles,
  MapPin,
  Activity,
  ChevronRight,
  Menu,
  X,
  Settings,
  ClipboardCheck,
  Sun,
  Moon,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notification-bell"
import { FeatureRequestButton } from "@/components/feature-request-button"
import { AccessDenied } from "@/components/auth"

interface RegionalAssessmentLayoutProps {
  children: ReactNode
}

export default function RegionalAssessmentLayout({ children }: RegionalAssessmentLayoutProps) {
  const { user, isLoading } = useAuth()

  // Security check: Only allow Regional Officers
  const isRegionalOfficer = user?.role === "Regional Officer"
  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Block non-Regional Officers
  if (!isRegionalOfficer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <AccessDenied
          variant="card"
          title="Access Denied"
          message="This page is only accessible to Regional Officers."
        />
      </div>
    )
  }

  return (
    <>
      {children}
    </>
  )
}
