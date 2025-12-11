"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/app/actions/auth"

interface AdminSidebarClientProps {
  pendingCount: number
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
  ({ pendingCount }, ref) => {
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      "User Management": true,
      "School Management": true,
      "Nursery Management": false,
      "Monthly Reports": true,
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

    const handleSignOut = async () => {
      await signOut()
    }

    const handleMobileMenuClick = () => {
      setIsMobileMenuOpen(false)
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

    return (
      <>
        {/* Mobile Overlay - appears below header but above sidebar */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "bg-transparent flex flex-col transition-transform duration-300 ease-in-out",
          "fixed lg:relative inset-y-0 left-0",
          "z-20 lg:z-10", // Higher z-index on mobile, lower on desktop
          "w-64 lg:w-64",
          "top-16 lg:top-0", // Add top offset for mobile to account for header
          // Mobile: keep white background and shadow
          "lg:bg-transparent lg:shadow-none",
          "lg:border-r lg:border-gray-200", // Keep border on desktop for separation
          "bg-white shadow-lg border-r border-gray-200", // Mobile styling
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-primary-700">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">Ministry of Education</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationSections.map((section) => {
              const isOpen = openSections[section.title] ?? true
              const sectionActive = isSectionActive(section)
              
              return (
                <div key={section.title} className="space-y-1">
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
                            "flex items-center justify-between w-full px-4 py-3 text-left rounded-lg transition-all duration-200 group relative",
                            active
                              ? "bg-primary-100 text-primary-700 shadow-sm border-l-4 border-primary-500"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent hover:border-gray-300"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon
                              className={cn(
                                "h-5 w-5 transition-colors",
                                active 
                                  ? "text-primary-600" 
                                  : "text-gray-400 group-hover:text-gray-600"
                              )}
                            />
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </Link>
                      )
                    })
                  ) : (
                    <>
                      <button
                        onClick={() => toggleSection(section.title)}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 text-left rounded-lg transition-all duration-200 group",
                          sectionActive
                            ? "text-primary-700 bg-primary-50"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        )}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {section.title}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        ) : (
                          <ChevronRight className="h-4 w-4 transition-transform" />
                        )}
                      </button>

                      {/* Section Items */}
                      {isOpen && (
                        <div className="ml-2 space-y-1 border-l-2 border-gray-200 pl-2">
                          {section.items.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href, item.exact)

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleMobileMenuClick}
                                className={cn(
                                  "flex items-center justify-between w-full px-3 py-2.5 text-left rounded-lg transition-all duration-200 group relative text-sm",
                                  active
                                    ? "bg-primary-100 text-primary-700 shadow-sm border-l-4 border-primary-500"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent hover:border-gray-300"
                                )}
                              >
                                <div className="flex items-center space-x-3">
                                  <Icon
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      active 
                                        ? "text-primary-600" 
                                        : "text-gray-400 group-hover:text-gray-600"
                                    )}
                                  />
                                  <span className="font-medium">{item.name}</span>
                                </div>
                                
                                {item.badge && (
                                  <Badge 
                                    variant="destructive" 
                                    className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold bg-red-500 hover:bg-red-600 border-2 border-white shadow-md"
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

          {/* Footer/Logout */}
          <div className="p-4 border-t border-gray-200">
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={handleMobileMenuClick}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </>
    )
  }
)

AdminSidebarClient.displayName = "AdminSidebarClient"
