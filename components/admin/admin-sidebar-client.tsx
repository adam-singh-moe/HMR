"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect, forwardRef, useImperativeHandle, useTransition } from "react"
import { useAuth } from "@/components/auth-wrapper"
import {
  LayoutDashboard,
  Users,
  School,
  MapPin,
  UserCheck,
  FileText,
  FilePlus,
  LogOut,
  Baby,
  Key,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  User,
  Shield,
  MessageSquare,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/app/actions/auth"

interface AdminSidebarClientProps {
  pendingCount: number
  onNavigate?: () => void
}

export interface AdminSidebarRef {
  toggleMobileMenu: () => void
}

type NavigationSection = {
  title: string
  items: NavigationItem[]
}

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  badge?: number
}

export const AdminSidebarClient = forwardRef<AdminSidebarRef, AdminSidebarClientProps>(
  ({ pendingCount, onNavigate }, ref) => {
    const pathname = usePathname()
    const { user } = useAuth()
    const [isPending, startTransition] = useTransition()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      "User Management": true,
      "School Management": true,
      "Nursery Management": false,
      "Monthly Reports": true,
      "Feature Requests": true,
    })

    const navigationSections: NavigationSection[] = [
      {
        title: "Overview",
        items: [
          {
            name: "Dashboard",
            href: "/dashboard/admin",
            icon: LayoutDashboard,
            exact: true,
          },
        ],
      },
      {
        title: "User Management",
        items: [
          {
            name: "Users",
            href: "/dashboard/admin/users",
            icon: Users,
          },
          {
            name: "Verifications",
            href: "/dashboard/admin/verifications",
            icon: UserCheck,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
          {
            name: "Send Notifications",
            href: "/dashboard/admin/notifications",
            icon: Bell,
          },
        ],
      },
      {
        title: "School Management",
        items: [
          {
            name: "Schools",
            href: "/dashboard/admin/schools",
            icon: School,
          },
          {
            name: "Regions",
            href: "/dashboard/admin/regions",
            icon: MapPin,
          },
          {
            name: "School Assessment",
            href: "/dashboard/school-assessment/admin",
            icon: ClipboardCheck,
          },
        ],
      },
      {
        title: "Nursery Management",
        items: [
          {
            name: "Nursery Classes",
            href: "/dashboard/admin/nursery-schools",
            icon: Baby,
          },
          {
            name: "Assessments",
            href: "/dashboard/admin/nursery-assessments",
            icon: Baby,
          },
        ],
      },
      {
        title: "Monthly Reports",
        items: [
          {
            name: "View Reports",
            href: "/dashboard/admin/reports",
            icon: FileText,
          },
          {
            name: "Submit Report",
            href: "/dashboard/admin/submit-report",
            icon: FilePlus,
          },
        ],
      },
      {
        title: "Feature Requests",
        items: [
          {
            name: "All Requests",
            href: "/dashboard/admin/feature-requests",
            icon: MessageSquare,
          },
        ],
      },
    ]

    const toggleSection = (title: string) => {
      setOpenSections(prev => ({
        ...prev,
        [title]: !prev[title]
      }))
    }

    const isActive = (href: string, exact?: boolean) => {
      if (exact) {
        return pathname === href
      }
      return pathname.startsWith(href)
    }

    const isSectionActive = (section: NavigationSection) => {
      return section.items.some(item => isActive(item.href, item.exact))
    }

    const handleSignOut = () => {
      startTransition(async () => {
        await signOut()
      })
    }

    const handleMobileMenuClick = () => {
      setIsMobileMenuOpen(false)
      onNavigate?.()
    }

    const toggleMobileMenu = () => {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    // Expose the toggle function through ref
    useImperativeHandle(ref, () => ({
      toggleMobileMenu,
    }))

    // Close mobile menu when screen size changes to desktop
    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth >= 1024) {
          setIsMobileMenuOpen(false)
        }
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Helper to capitalize name
    const capitalizeName = (name: string) => {
      return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    return (
      <>
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50",
          "fixed lg:relative inset-y-0 left-0 z-40",
          "w-[240px] 2xl:w-[280px]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* App Logo and Name Header */}
          <div className="px-3 py-2.5 2xl:px-4 2xl:py-4 border-b border-slate-200/80 dark:border-slate-700/50 flex-shrink-0">
            <Link href="/dashboard/admin" className="flex items-center gap-2.5 2xl:gap-3">
              <div className="relative h-9 w-9 2xl:h-11 2xl:w-11 flex-shrink-0">
                <div className="w-full h-full rounded-lg 2xl:rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-[2px] shadow-md 2xl:shadow-lg shadow-blue-500/20 2xl:shadow-blue-500/25">
                  <div className="w-full h-full rounded-[6px] 2xl:rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/images/moe-logo.png"
                      alt="Ministry of Education Guyana"
                      fill
                      className="object-contain p-1 2xl:p-1.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm 2xl:text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-tight">
                  Admin Panel
                </span>
                <span className="text-[10px] 2xl:text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Ministry of Education
                </span>
              </div>
            </Link>
          </div>

          {/* User Profile Card */}
          <div className="px-3 py-2 2xl:px-4 2xl:py-3 flex-shrink-0">
            <button
              onClick={() => {
                handleMobileMenuClick()
                window.location.href = '/dashboard/settings'
              }}
              className="w-full p-2.5 2xl:p-3 rounded-xl 2xl:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700/50 hover:shadow-md 2xl:hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 2xl:gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 2xl:w-11 2xl:h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md 2xl:shadow-lg shadow-blue-500/20 2xl:shadow-blue-500/25 flex-shrink-0">
                  <User className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  {/* User Name */}
                  <h3 className="text-[11px] 2xl:text-sm font-bold text-slate-800 dark:text-white leading-tight break-words">
                    {user?.name ? capitalizeName(user.name) : 'Loading...'}
                  </h3>

                  {/* Role Badge */}
                  <div className="inline-flex items-center gap-1 2xl:gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[8px] 2xl:text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      System Admin
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-slate-400 flex-shrink-0" />
              </div>
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 px-2 2xl:px-3 py-1 space-y-0.5 2xl:space-y-1 overflow-y-auto min-h-0">
            {navigationSections.map((section) => {
              const isOpen = openSections[section.title] ?? true
              const sectionActive = isSectionActive(section)

              return (
                <div key={section.title} className="space-y-0.5">
                  {/* Section Header */}
                  {section.title === "Overview" ? (
                    // Single items in "Overview" don't need collapsible header
                    section.items.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href, item.exact)

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={handleMobileMenuClick}
                          className={cn(
                            "w-full flex items-center gap-2 2xl:gap-3 px-2 2xl:px-3 py-1.5 2xl:py-2.5 rounded-lg 2xl:rounded-xl transition-all duration-200 group",
                            active
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md 2xl:shadow-lg shadow-blue-500/20 2xl:shadow-blue-500/25"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 2xl:w-8 2xl:h-8 rounded-md 2xl:rounded-lg flex items-center justify-center transition-all",
                            active
                              ? "bg-white/20"
                              : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                          )}>
                            <Icon className={cn(
                              "w-3.5 h-3.5 2xl:w-4 2xl:h-4",
                              active
                                ? "text-white"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className={cn(
                              "text-[11px] 2xl:text-[13px] font-semibold truncate",
                              active ? "text-white" : "text-slate-700 dark:text-slate-200"
                            )}>{item.name}</p>
                            <p className={cn(
                              "text-[9px] 2xl:text-[11px] truncate",
                              active ? "text-white/70" : "text-slate-500 dark:text-slate-500"
                            )}>Overview & Statistics</p>
                          </div>
                          {active && <ChevronRight className="w-3 h-3 2xl:w-4 2xl:h-4 text-white/70" />}
                        </Link>
                      )
                    })
                  ) : (
                    <>
                      <button
                        onClick={() => toggleSection(section.title)}
                        className={cn(
                          "flex items-center justify-between w-full px-2 2xl:px-3 py-1 2xl:py-1.5 text-left rounded-md 2xl:rounded-lg transition-all duration-200 group",
                          sectionActive
                            ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                      >
                        <span className="text-[9px] 2xl:text-xs font-semibold uppercase tracking-wider">
                          {section.title}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="h-3 w-3 2xl:h-4 2xl:w-4 transition-transform" />
                        ) : (
                          <ChevronRight className="h-3 w-3 2xl:h-4 2xl:w-4 transition-transform" />
                        )}
                      </button>

                      {/* Section Items */}
                      {isOpen && (
                        <div className="ml-1.5 2xl:ml-2 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-700 pl-1.5 2xl:pl-2">
                          {section.items.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href, item.exact)

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleMobileMenuClick}
                                className={cn(
                                  "flex items-center justify-between w-full px-2 2xl:px-3 py-1.5 2xl:py-2 text-left rounded-md 2xl:rounded-lg transition-all duration-200 group relative",
                                  active
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm 2xl:shadow-md shadow-blue-500/20"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                                )}
                              >
                                <div className="flex items-center space-x-2 2xl:space-x-3">
                                  <Icon
                                    className={cn(
                                      "h-3 w-3 2xl:h-4 2xl:w-4 transition-colors",
                                      active
                                        ? "text-white"
                                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                    )}
                                  />
                                  <span className={cn(
                                    "text-[10px] 2xl:text-sm font-medium",
                                    active ? "text-white" : ""
                                  )}>{item.name}</span>
                                </div>

                                {item.badge && (
                                  <Badge
                                    variant="destructive"
                                    className="h-4 w-4 2xl:h-5 2xl:w-5 p-0 flex items-center justify-center text-[8px] 2xl:text-xs font-bold bg-red-500 hover:bg-red-600 border-2 border-white shadow-md"
                                  >
                                    {item.badge > 99 ? "99+" : item.badge}
                                  </Badge>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Sign Out Button */}
          <div className="px-2 2xl:px-3 py-1.5 2xl:py-2 border-t border-slate-200/80 dark:border-slate-700/50 flex-shrink-0">
            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="w-full flex items-center gap-2 2xl:gap-3 px-2 2xl:px-3 py-1.5 2xl:py-2.5 rounded-lg 2xl:rounded-xl transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 group"
            >
              <div className="w-6 h-6 2xl:w-8 2xl:h-8 rounded-md 2xl:rounded-lg flex items-center justify-center transition-all bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50">
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 animate-spin text-red-500" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] 2xl:text-[13px] font-semibold truncate text-red-600 dark:text-red-400">
                  {isPending ? 'Signing out...' : 'Sign Out'}
                </p>
                <p className="hidden 2xl:block text-[11px] truncate text-red-500/70 dark:text-red-500/70">
                  End your session
                </p>
              </div>
            </button>
          </div>
        </div>
      </>
    )
  }
)

AdminSidebarClient.displayName = "AdminSidebarClient"
