import type { ReactNode } from "react"
import { getUserDetails } from "@/app/actions/users"
import { redirect } from "next/navigation"
import { signOut } from "@/app/actions/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { User, Settings, LogOut, ChevronDown } from "lucide-react"
import { HelpDeskButton } from "@/components/help-desk-button"

// Helper function to capitalize first and last names
function capitalizeName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to format role with region for Regional Officers and school for Head Teachers
function formatRoleWithRegion(role: string, regionName: string | null, schoolName: string | null): string {
  const formattedRole = role.replace("_", " ")
  if (role === "Regional Officer" && regionName) {
    return `${formattedRole} - ${regionName}`
  }
  if (role === "Head Teacher" && schoolName) {
    return `${formattedRole} - ${schoolName}`
  }
  return formattedRole
}

// Helper function to get the correct dashboard URL based on user role
function getDashboardUrl(role: string): string {
  if (role === "Head Teacher") {
    return "/dashboard/head-teacher"
  } else if (role === "Regional Officer") {
    return "/dashboard/regional-officer"
  } else if (role === "Admin") {
    return "/dashboard/admin"
  } else if (role === "Education Official") {
    return "/dashboard/education-official"
  }
  // For unknown roles, default to admin dashboard
  return "/dashboard/admin"
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, role, error } = await getUserDetails()

  if (error || !user || !role) {
    redirect("/auth")
  }

  // Capitalize the user's name and format role with region/school
  const capitalizedName = capitalizeName(user.name || "")
  const formattedRole = formatRoleWithRegion(role, user.region_name || null, user.school_name || null)
  const dashboardUrl = getDashboardUrl(role)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="admin-hide-on-mobile sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto">
          <div className="flex h-14 sm:h-16 md:h-20 items-center justify-between px-3 sm:px-4 py-2 sm:py-4">
            <Link href={dashboardUrl} className="flex items-center gap-2 sm:gap-3 font-semibold min-w-0 flex-1">
              <div className="relative h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 flex-shrink-0">
                <Image src="/images/moe-logo.png" alt="Ministry of Education Guyana" fill className="object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base md:text-xl font-bold text-primary-700 truncate">
                  School Headteachers' Monthly Reporting Portal
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">Ministry of Education</span>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* User info - hidden on mobile, shown on larger screens */}
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-primary-700 truncate max-w-32 lg:max-w-none">
                  Welcome, {capitalizedName}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{formattedRole}</p>
              </div>

              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary-200 text-primary-700 hover:bg-primary-50 h-9 sm:h-10"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Account</span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Show user info in dropdown on mobile */}
                  <div className="px-2 py-1.5 md:hidden border-b">
                    <p className="text-sm font-medium text-primary-700">{capitalizedName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{formattedRole}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={signOut} className="w-full">
                      <button type="submit" className="flex items-center w-full text-left">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">{children}</main>
      
      {/* Help Desk Button - only shows for Head Teachers */}
      <HelpDeskButton userRole={role} />
    </div>
  )
}
