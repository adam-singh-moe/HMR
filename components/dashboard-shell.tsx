"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { User, Settings, LogOut, ChevronDown, Moon, Sun, Loader2 } from "lucide-react"
import { HelpDeskButton } from "@/components/help-desk-button"
import { NotificationBell } from "@/components/notification-bell"
import { FeatureRequestButton } from "@/components/feature-request-button"
import { useTheme } from "next-themes"
import { signOut } from "@/app/actions/auth"

interface DashboardShellProps {
  children: ReactNode
  capitalizedName: string
  formattedRole: string
  dashboardUrl: string
  role: string
}

export function DashboardShell({ 
  children, 
  capitalizedName, 
  formattedRole, 
  dashboardUrl, 
  role 
}: DashboardShellProps) {
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden">
      {/* Background animated elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-cyan-400/15 to-purple-400/20 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400/15 via-blue-400/20 to-cyan-400/15 dark:from-purple-500/10 dark:via-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/10 to-purple-300/10 dark:from-blue-600/5 dark:to-purple-600/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
        
        {/* Floating particles */}
        {mounted && (
          <>
            <div className="absolute top-[10%] left-[15%] w-2 h-2 rounded-full bg-blue-400/40 dark:bg-blue-400/30 animate-float-slow" style={{ animationDelay: '0s' }} />
            <div className="absolute top-[20%] right-[20%] w-3 h-3 rounded-full bg-cyan-400/30 dark:bg-cyan-400/25 animate-float-slow" style={{ animationDelay: '1s' }} />
            <div className="absolute top-[60%] left-[10%] w-2 h-2 rounded-full bg-purple-400/40 dark:bg-purple-400/30 animate-float-slow" style={{ animationDelay: '2s' }} />
            <div className="absolute top-[40%] right-[10%] w-4 h-4 rounded-full bg-blue-300/30 dark:bg-blue-400/20 animate-float-slow" style={{ animationDelay: '3s' }} />
            <div className="absolute bottom-[20%] left-[30%] w-2 h-2 rounded-full bg-cyan-300/40 dark:bg-cyan-400/30 animate-float-slow" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-[30%] right-[25%] w-3 h-3 rounded-full bg-purple-300/30 dark:bg-purple-400/25 animate-float-slow" style={{ animationDelay: '1.5s' }} />
          </>
        )}

        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <header className="admin-hide-on-mobile fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
        <div className="container mx-auto">
          <div className="flex h-14 sm:h-16 md:h-20 items-center justify-between px-3 sm:px-4 py-2 sm:py-4">
            <Link href={dashboardUrl} className="flex items-center gap-2 sm:gap-3 font-semibold min-w-0 flex-1">
              {/* Logo with glow effect */}
              <div className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 flex-shrink-0">
                <div className="absolute inset-0 blur-lg bg-blue-500/20 dark:bg-blue-400/30 rounded-full scale-150 animate-pulse-slow" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    <Image 
                      src="/images/moe-logo.png" 
                      alt="Ministry of Education Guyana" 
                      fill 
                      className="object-contain p-1 rounded-full" 
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-300 bg-clip-text text-transparent truncate">
                  School Headteacher's Reporting Portal
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Ministry of Education</span>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all duration-300 border border-slate-200 dark:border-slate-600/50 shadow-sm dark:shadow-slate-900/20"
                aria-label="Toggle theme"
              >
                {mounted && (
                  theme === "dark" ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-600" />
                  )
                )}
              </button>

              {/* Notification Bell */}
              <NotificationBell />
              
              {/* Feature Request Button */}
              {(role === "Regional Officer" || role === "Education Official" || role === "Head Teacher") && (
                <FeatureRequestButton />
              )}
              
              {/* User info */}
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-32 lg:max-w-none">
                  Welcome, {capitalizedName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{formattedRole}</p>
              </div>

              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 h-9 sm:h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Account</span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700">
                  {/* Show user info in dropdown on mobile */}
                  <div className="px-2 py-1.5 md:hidden border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{capitalizedName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{formattedRole}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center text-slate-700 dark:text-slate-200">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    disabled={isPending}
                    className="flex items-center text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    {isPending ? "Signing out..." : "Sign Out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 sm:h-16 md:h-20 flex-shrink-0" />
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Help Desk Button */}
      <HelpDeskButton userRole={role} />
    </div>
  )
}
