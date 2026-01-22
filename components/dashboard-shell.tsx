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
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[hsl(222,47%,6%)] transition-colors duration-300 relative overflow-hidden">
      {/* Background - Subtle, non-distracting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/10" />

        {/* Subtle grid pattern - less prominent */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* Header - Clean, aligned with main content */}
      <header className="admin-hide-on-mobile fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-700/50 bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50 transition-all duration-300">
        <div className="flex h-14 sm:h-16 md:h-[72px] items-center">
          {/* Mobile Logo - Shows only on smaller screens */}
          <Link href={dashboardUrl} className="flex lg:hidden items-center gap-3 font-semibold min-w-0 flex-1 px-4">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-[2px] shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20">
                <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/moe-logo.png"
                    alt="Ministry of Education Guyana"
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate tracking-tight">
                HMR Portal
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">Ministry of Education</span>
            </div>
          </Link>

          {/* Desktop: Content aligned with main content area (after sidebar) */}
          <div className="hidden lg:flex flex-1 items-center justify-between h-full ml-[260px] px-6">
            {/* Left side - Logo and title */}
            <Link href={dashboardUrl} className="flex items-center gap-3 font-semibold">
              <div className="relative h-10 w-10 flex-shrink-0">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-[2px] shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20">
                  <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/images/moe-logo.png"
                      alt="Ministry of Education Guyana"
                      fill
                      className="object-contain p-1.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
                  School Headteacher's Reporting Portal
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Ministry of Education</span>
              </div>
            </Link>

            {/* Right side - Nav items */}
            <nav className="flex items-center gap-2.5">
              {/* Theme Toggle - Refined */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 border border-slate-200/80 dark:border-slate-700/50"
                aria-label="Toggle theme"
              >
                {mounted && (
                  theme === "dark" ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-500" />
                  )
                )}
              </button>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Feature Request Button */}
              {(role === "Regional Officer" || role === "Education Official" || role === "Head Teacher") && (
                <FeatureRequestButton />
              )}

              {/* User info - Cleaner layout */}
              <div className="text-right hidden md:block pl-2 border-l border-slate-200 dark:border-slate-700/50 ml-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 truncate max-w-32 lg:max-w-none">
                  Welcome, {capitalizedName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize font-medium">{formattedRole}</p>
              </div>

              {/* User Dropdown Menu - Refined */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 sm:h-10 bg-white dark:bg-slate-800/80 rounded-xl font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Account</span>
                    <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                  {/* Show user info in dropdown on mobile */}
                  <div className="px-3 py-2 md:hidden border-b border-slate-200 dark:border-slate-700/50">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{capitalizedName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{formattedRole}</p>
                  </div>
                  <DropdownMenuItem asChild className="rounded-lg mx-1 my-0.5">
                    <Link href="/dashboard/settings" className="flex items-center text-slate-700 dark:text-slate-200 cursor-pointer">
                      <Settings className="h-4 w-4 mr-2.5 opacity-70" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700/50" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isPending}
                    className="flex items-center text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg mx-1 my-0.5"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2.5 animate-spin opacity-70" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2.5 opacity-70" />
                    )}
                    {isPending ? "Signing out..." : "Sign Out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Mobile nav - Shows on smaller screens */}
          <nav className="flex lg:hidden items-center gap-2 px-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 border border-slate-200/80 dark:border-slate-700/50"
              aria-label="Toggle theme"
            >
              {mounted && (
                theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-500" />
                )
              )}
            </button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 bg-white dark:bg-slate-800/80 rounded-xl font-medium"
                >
                  <User className="h-4 w-4" />
                  <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 rounded-xl shadow-xl">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700/50">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{capitalizedName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{formattedRole}</p>
                </div>
                <DropdownMenuItem asChild className="rounded-lg mx-1 my-0.5">
                  <Link href="/dashboard/settings" className="flex items-center text-slate-700 dark:text-slate-200 cursor-pointer">
                    <Settings className="h-4 w-4 mr-2.5 opacity-70" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700/50" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="flex items-center text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg mx-1 my-0.5"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2.5 animate-spin opacity-70" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2.5 opacity-70" />
                  )}
                  {isPending ? "Signing out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 sm:h-16 md:h-[72px] flex-shrink-0" />
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Help Desk Button */}
      <HelpDeskButton userRole={role} />
    </div>
  )
}
