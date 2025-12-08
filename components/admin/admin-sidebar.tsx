"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Users,
  School,
  MapPin,
  UserCheck,
  LogOut,
  Menu,
  X,
  Key,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/app/actions/auth"

interface AdminSidebarProps {
  pendingCount: number
}

export function AdminSidebar({ pendingCount }: AdminSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Users",
      href: "/dashboard/admin/users",
      icon: Users,
    },
    {
      name: "Access Tokens",
      href: "/dashboard/admin/access-tokens",
      icon: Key,
    },
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
      name: "Verifications",
      href: "/dashboard/admin/verifications",
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const handleMobileMenuClick = () => {
    setIsMobileMenuOpen(false)
  }

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
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200 shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col shadow-lg transition-transform duration-300 ease-in-out",
        "fixed lg:relative inset-y-0 left-0 z-40",
        "w-64 lg:w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-primary-700">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Ministry of Education</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
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
                
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="h-6 w-6 p-0 flex items-center justify-center text-xs font-bold bg-red-500 hover:bg-red-600 border-2 border-white shadow-md"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </Link>
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
              <LogOut className="h-5 w-5 mr-3 text-gray-400" />
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
