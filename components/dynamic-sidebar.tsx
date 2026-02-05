"use client"

import type React from "react"
import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-wrapper"
import { usePermissions } from "@/hooks/use-permissions"
import { getUserSchoolInfo } from "@/app/actions/auth"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import {
  NAVIGATION_SECTIONS,
  getDashboardPath,
  type NavigationItem,
  type NavigationSection,
} from "@/components/sidebar/sidebar-config"
import { UserProfileCard } from "@/components/sidebar/user-profile-card"
import { SignOutButton } from "@/components/sidebar/sign-out-button"

interface DynamicSidebarProps {
  pendingCount?: number
  onNavigate?: () => void
}

export interface DynamicSidebarRef {
  toggleMobileMenu: () => void
}

export const DynamicSidebar = forwardRef<DynamicSidebarRef, DynamicSidebarProps>(
  ({ pendingCount = 0, onNavigate }, ref) => {
    const pathname = usePathname()
    const { user } = useAuth()
    const { hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions()

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [schoolInfo, setSchoolInfo] = useState<{ id: string; name: string; level: string } | null>(null)
    const [isLoadingSchool, setIsLoadingSchool] = useState(true)

    // Initialize open sections based on role
    const getInitialOpenSections = (): Record<string, boolean> => {
      const sections: Record<string, boolean> = {}
      NAVIGATION_SECTIONS.forEach((section) => {
        sections[section.id] = section.defaultExpanded ?? true
      })
      return sections
    }

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(getInitialOpenSections)

    // Fetch school info for Head Teachers
    useEffect(() => {
      async function fetchSchoolInfo() {
        if (user?.role !== "Head Teacher") {
          setIsLoadingSchool(false)
          return
        }
        try {
          const result = await getUserSchoolInfo()
          if (result.school) {
            setSchoolInfo(result.school)
          }
        } catch (error) {
          console.error("Error fetching school info:", error)
        } finally {
          setIsLoadingSchool(false)
        }
      }
      fetchSchoolInfo()
    }, [user?.role])

    // Filter navigation sections and items based on role and permissions
    const visibleSections = useMemo(() => {
      if (!user?.role || isLoadingPermissions) return []

      return NAVIGATION_SECTIONS.map((section) => {
        // Check section-level role restriction
        if (section.roles && !section.roles.includes(user.role)) {
          return { ...section, items: [] }
        }

        // Check section-level permissions
        if (section.requiredPermissions && !hasAnyPermission(section.requiredPermissions)) {
          return { ...section, items: [] }
        }

        // Filter items based on role and permissions
        const visibleItems = section.items.filter((item) => {
          // Check item-level role restriction
          if (item.roles && !item.roles.includes(user.role)) {
            return false
          }

          // Check item-level permissions
          if (item.requiredPermissions && !hasAnyPermission(item.requiredPermissions)) {
            return false
          }

          return true
        })

        return { ...section, items: visibleItems }
      }).filter((section) => section.items.length > 0)
    }, [user?.role, hasAnyPermission, isLoadingPermissions])

    // Get the href for an item (handles dynamic paths)
    const getItemHref = (item: NavigationItem): string => {
      if (typeof item.href === "function") {
        return item.href(user?.role || "")
      }
      return item.href
    }

    // Check if a path is active
    const isActive = (href: string, exact?: boolean) => {
      // Handle paths with query params
      const pathWithoutQuery = pathname.split("?")[0]
      const hrefWithoutQuery = href.split("?")[0]
      const currentSearchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null

      // For regional officer tabs, check if pathname matches and check tab
      if (href.includes("?tab=") && pathname.includes("regional-officer")) {
        const urlTab = new URLSearchParams(href.split("?")[1]).get("tab")
        const currentTab = currentSearchParams?.get("tab") || "overview"
        return pathWithoutQuery === hrefWithoutQuery && urlTab === currentTab
      }

      // For head teacher pages with mainTab, check mainTab parameter
      if (pathname.includes("head-teacher")) {
        const currentMainTab = currentSearchParams?.get("mainTab") || "dashboard"

        // If href has mainTab, compare them
        if (href.includes("?mainTab=")) {
          const urlMainTab = new URLSearchParams(href.split("?")[1]).get("mainTab")
          return pathWithoutQuery === hrefWithoutQuery && urlMainTab === currentMainTab
        }

        // For head-teacher subpages (like /head-teacher/school-readiness), check exact path
        if (pathWithoutQuery !== "/dashboard/head-teacher") {
          return pathname.startsWith(hrefWithoutQuery) && !href.includes("?")
        }
      }

      if (exact) {
        // For exact match, also verify there's no mainTab mismatch
        if (href.includes("?") || (currentSearchParams && currentSearchParams.toString())) {
          return href === `${pathname}${currentSearchParams ? '?' + currentSearchParams.toString() : ''}`
        }
        return pathWithoutQuery === hrefWithoutQuery
      }

      return pathname.startsWith(hrefWithoutQuery)
    }

    const isSectionActive = (section: NavigationSection) => {
      return section.items.some((item) => isActive(getItemHref(item), item.exact))
    }

    const toggleSection = (sectionId: string) => {
      setOpenSections((prev) => ({
        ...prev,
        [sectionId]: !prev[sectionId],
      }))
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

      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [])

    // Get dashboard path for the current role
    const dashboardPath = user?.role ? getDashboardPath(user.role) : "/dashboard"

    // Get portal title based on role
    const getPortalTitle = () => {
      if (user?.role === "Admin") {
        return "Admin Panel"
      }
      return (
        <>
          <span className="block">Headteacher</span>
          <span className="block">Reporting Portal</span>
        </>
      )
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
        <div
          className={cn(
            "bg-white/95 dark:bg-[hsl(222,47%,7%)]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-700/50 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50",
            "fixed lg:relative inset-y-0 left-0 z-40",
            "w-[240px] 2xl:w-[280px]",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* App Logo and Name Header */}
          <div className="px-3 py-2.5 2xl:px-4 2xl:py-4 border-b border-slate-200/80 dark:border-slate-700/50 flex-shrink-0">
            <Link href={dashboardPath} className="flex items-center gap-2.5 2xl:gap-3">
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
                  {getPortalTitle()}
                </span>
                <span className="text-[10px] 2xl:text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Ministry of Education
                </span>
              </div>
            </Link>
          </div>

          {/* User Profile Card */}
          <UserProfileCard onNavigate={handleMobileMenuClick} schoolInfo={schoolInfo} />

          {/* Navigation - Scrollable */}
          <nav className="flex-1 px-2 2xl:px-3 py-1 overflow-y-auto min-h-0">
            {visibleSections.map((section) => {
              const isOpen = openSections[section.id] ?? true
              const sectionActive = isSectionActive(section)

              return (
                <div key={section.id}>
                  {/* Overview section renders items directly (same style as other items) */}
                  {section.id === "overview" ? (
                    section.items.map((item) => {
                      const Icon = item.icon
                      const href = getItemHref(item)
                      const active = isActive(href, item.exact)

                      return (
                        <Link
                          key={item.id}
                          href={href}
                          onClick={handleMobileMenuClick}
                          className={cn(
                            "flex items-center w-full px-2 py-1.5 2xl:py-2 text-left rounded-lg transition-all duration-200 group",
                            active
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 2xl:h-4 2xl:w-4 transition-colors flex-shrink-0",
                                active
                                  ? "text-white"
                                  : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                              )}
                            />
                            <span
                              className={cn(
                                "text-[11px] 2xl:text-[13px] font-medium",
                                active ? "text-white" : "text-slate-700 dark:text-slate-300"
                              )}
                            >
                              {item.name}
                            </span>
                          </div>
                        </Link>
                      )
                    })
                  ) : (
                    <>
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={cn(
                          "flex items-center justify-between w-full px-2 py-1.5 2xl:py-2 text-left rounded-md transition-all duration-200 group mt-1.5 first:mt-0",
                          sectionActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                        )}
                      >
                        <span className="text-[9px] 2xl:text-[11px] font-semibold uppercase tracking-wider">
                          {section.title}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 2xl:h-3.5 2xl:w-3.5 transition-transform duration-200",
                            !isOpen && "-rotate-90"
                          )}
                        />
                      </button>

                      {/* Section Items */}
                      {isOpen && (
                        <div className="mt-0.5 space-y-0.5">
                          {section.items.map((item) => {
                            const Icon = item.icon
                            const href = getItemHref(item)
                            const active = isActive(href, item.exact)
                            const badgeCount = item.id === "verifications" ? pendingCount : item.badge

                            return (
                              <Link
                                key={item.id}
                                href={href}
                                onClick={handleMobileMenuClick}
                                className={cn(
                                  "flex items-center justify-between w-full px-2 py-1.5 2xl:py-2 text-left rounded-lg transition-all duration-200 group relative ml-3",
                                  active
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                                )}
                              >
                                <div className="flex items-center space-x-2">
                                  <Icon
                                    className={cn(
                                      "h-3.5 w-3.5 2xl:h-4 2xl:w-4 transition-colors flex-shrink-0",
                                      active
                                        ? "text-white"
                                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-[11px] 2xl:text-[13px] font-medium",
                                      active ? "text-white" : "text-slate-700 dark:text-slate-300"
                                    )}
                                  >
                                    {item.name}
                                  </span>
                                </div>

                                {badgeCount !== undefined && badgeCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="h-4 w-4 2xl:h-5 2xl:w-5 p-0 flex items-center justify-center text-[8px] 2xl:text-[10px] font-bold bg-red-500 hover:bg-red-600"
                                  >
                                    {badgeCount > 99 ? "99+" : badgeCount}
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
          <SignOutButton />
        </div>
      </>
    )
  }
)

DynamicSidebar.displayName = "DynamicSidebar"
