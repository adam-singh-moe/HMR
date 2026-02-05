import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  School,
  MapPin,
  UserCheck,
  FileText,
  FilePlus,
  Baby,
  ClipboardCheck,
  Bell,
  Shield,
  MessageSquare,
  Sparkles,
  Activity,
  BookOpen,
  GraduationCap,
  CheckCircle,
} from "lucide-react"

export interface NavigationItem {
  id: string
  name: string
  description?: string
  href: string | ((role: string) => string)
  icon: LucideIcon
  badge?: number
  requiredPermissions?: string[]
  exact?: boolean
  roles?: string[]
  showForNurseryOnly?: boolean
}

export interface NavigationSection {
  id: string
  title: string
  items: NavigationItem[]
  defaultExpanded?: boolean
  requiredPermissions?: string[]
  roles?: string[]
}

// Role-specific dashboard paths
export const getDashboardPath = (role: string): string => {
  switch (role) {
    case "Admin":
      return "/dashboard/admin"
    case "Education Official":
      return "/dashboard/education-official"
    case "Regional Officer":
      return "/dashboard/regional-officer?tab=overview"
    case "Head Teacher":
      return "/dashboard/head-teacher?mainTab=dashboard"
    default:
      return "/dashboard"
  }
}

// Role-specific monthly reports paths
const getMonthlyReportsPath = (role: string): string => {
  switch (role) {
    case "Admin":
      return "/dashboard/admin/reports"
    case "Education Official":
      return "/dashboard/education-official/reports"
    case "Regional Officer":
      return "/dashboard/regional-officer?tab=reports"
    case "Head Teacher":
      return "/dashboard/head-teacher?mainTab=monthly-reports&tab=current-report"
    default:
      return "/dashboard/reports"
  }
}

// Role-specific nursery assessment paths
const getNurseryAssessmentPath = (role: string): string => {
  switch (role) {
    case "Admin":
      return "/dashboard/admin/nursery-assessments"
    case "Education Official":
      return "/dashboard/education-official/nursery-assessment"
    case "Regional Officer":
      return "/dashboard/regional-officer?tab=nursery-assessment"
    case "Head Teacher":
      return "/dashboard/head-teacher?mainTab=nursery-assessment&tab=view-assessments"
    default:
      return "/dashboard/nursery-assessment"
  }
}

// Role-specific school assessment paths
const getSchoolAssessmentPath = (role: string): string => {
  switch (role) {
    case "Admin":
      return "/dashboard/school-assessment"
    case "Regional Officer":
      return "/dashboard/school-assessment/regional"
    default:
      return "/dashboard/school-assessment"
  }
}

// Role-specific teachers paths
const getTeachersPath = (role: string): string => {
  switch (role) {
    case "Head Teacher":
      return "/dashboard/head-teacher?mainTab=teachers"
    default:
      return "/dashboard/teachers"
  }
}

// Role-specific school readiness paths
const getSchoolReadinessPath = (role: string): string => {
  switch (role) {
    case "Admin":
      return "/dashboard/education-official/school-readiness"
    case "Education Official":
      return "/dashboard/education-official/school-readiness"
    case "Regional Officer":
      return "/dashboard/regional-officer/school-readiness"
    case "Head Teacher":
      return "/dashboard/head-teacher/school-readiness"
    default:
      return "/dashboard/school-readiness"
  }
}

// All navigation sections configuration
export const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: "overview",
    title: "Overview",
    defaultExpanded: true,
    items: [
      {
        id: "dashboard",
        name: "Dashboard",
        description: "Key metrics & analytics",
        href: getDashboardPath,
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    id: "user-management",
    title: "User Management",
    roles: ["Admin"],
    items: [
      {
        id: "users",
        name: "Users",
        description: "Manage user accounts",
        href: "/dashboard/admin/users",
        icon: Users,
        requiredPermissions: ["users.view", "users.edit_all"],
        roles: ["Admin"],
      },
      {
        id: "verifications",
        name: "Verifications",
        description: "Approve new users",
        href: "/dashboard/admin/verifications",
        icon: UserCheck,
        requiredPermissions: ["users.approve"],
        roles: ["Admin"],
      },
      {
        id: "send-notifications",
        name: "Send Notifications",
        description: "Send system notifications",
        href: "/dashboard/admin/notifications",
        icon: Bell,
        requiredPermissions: ["notifications.create"],
        roles: ["Admin"],
      },
    ],
  },
  {
    id: "school-management",
    title: "School Management",
    roles: ["Admin"],
    items: [
      {
        id: "schools",
        name: "Schools",
        description: "Manage schools",
        href: "/dashboard/admin/schools",
        icon: School,
        requiredPermissions: ["schools.view_all", "schools.view_regional"],
        roles: ["Admin"],
      },
      {
        id: "regions",
        name: "Regions",
        description: "Manage regions",
        href: "/dashboard/admin/regions",
        icon: MapPin,
        requiredPermissions: ["regions.view"],
        roles: ["Admin"],
      },
    ],
  },
  {
    id: "schools-overview",
    title: "Schools",
    roles: ["Education Official", "Regional Officer", "Head Teacher"],
    items: [
      {
        id: "schools-overview",
        name: "Schools Overview",
        description: "View all schools",
        href: "/dashboard/schools-overview",
        icon: School,
        requiredPermissions: ["schools_overview.view_all", "schools_overview.view_regional"],
      },
    ],
  },
  {
    id: "teachers",
    title: "Teachers",
    roles: ["Education Official", "Regional Officer", "Head Teacher"],
    items: [
      {
        id: "teachers",
        name: "Teacher Details",
        description: "Teacher records",
        href: getTeachersPath,
        icon: Users,
        requiredPermissions: ["teacher_details.view_all", "teacher_details.view_regional", "teacher_details.view_own"],
      },
    ],
  },
  {
    id: "reports",
    title: "Monthly Reports",
    items: [
      {
        id: "monthly-reports",
        name: "View Reports",
        description: "School report submissions",
        href: getMonthlyReportsPath,
        icon: FileText,
        requiredPermissions: ["monthly_report.view_all", "monthly_report.view_regional", "monthly_report.view_own", "monthly_report.create_own", "monthly_report.draft_own"],
      },
      {
        id: "submit-report",
        name: "Submit Report",
        description: "Submit for any school",
        href: "/dashboard/submit-report",
        icon: FilePlus,
        requiredPermissions: ["monthly_report.create_all"],
        roles: ["Admin", "Education Official", "Regional Officer"],
      },
    ],
  },
  {
    id: "assessments",
    title: "Assessments",
    items: [
      {
        id: "school-assessment",
        name: "School Assessment",
        description: "Performance evaluations",
        href: getSchoolAssessmentPath,
        icon: ClipboardCheck,
        requiredPermissions: [
          "school_assessments.view_all",
          "school_assessments.view_regional",
          "school_assessments.view_own",
          "school_assessments.create",
        ],
      },
      {
        id: "nursery-assessment",
        name: "Nursery Assessment",
        description: "Early childhood evaluations",
        href: getNurseryAssessmentPath,
        icon: BookOpen,
        requiredPermissions: [
          "nursery_assessment.view_all",
          "nursery_assessment.view_regional",
          "nursery_assessment.view_own",
          "nursery_assessment.create_own",
        ],
      },
    ],
  },
  {
    id: "nursery",
    title: "Nursery Management",
    items: [
      {
        id: "nursery-classes",
        name: "Nursery Classes",
        description: "Manage nursery schools",
        href: "/dashboard/nursery-classes",
        icon: Baby,
        requiredPermissions: [
          "nursery_class.view",
          "nursery_class.View",
          "nursery_class.create",
          "nursery_class.delete",
        ],
      },
      {
        id: "admin-nursery-assessments",
        name: "Assessments",
        description: "View all assessments",
        href: "/dashboard/admin/nursery-assessments",
        icon: Baby,
        requiredPermissions: ["nursery_assessment.view_all", "nursery_assessment.view_regional"],
        roles: ["Admin"],
      },
    ],
  },
  {
    id: "pe-reports",
    title: "PE Reports",
    items: [
      {
        id: "pe-reports",
        name: "PE Reports",
        description: "Physical education reports",
        href: "/dashboard/pe-reports",
        icon: Activity,
        requiredPermissions: ["pe_reports.view_all", "pe_reports.view_regional"],
      },
    ],
  },
  {
    id: "school-readiness",
    title: "School Readiness",
    items: [
      {
        id: "school-readiness",
        name: "School Readiness",
        description: "Update readiness status",
        href: getSchoolReadinessPath,
        icon: CheckCircle,
        requiredPermissions: [
          "school_readiness.view_all",
          "school_readiness.view_regional",
          "school_readiness.view_own",
          "school_readiness.create_own",
        ],
      },
    ],
  },
  {
    id: "insights",
    title: "AI & Analytics",
    items: [
      {
        id: "ai-insights",
        name: "AI Insights",
        description: "AI-powered analytics",
        href: "/dashboard/ai-insights",
        icon: Sparkles,
        requiredPermissions: ["ai_insights.View", "ai_insights.view_regional"],
      },
    ],
  },
  {
    id: "system",
    title: "System",
    roles: ["Admin"],
    items: [
      {
        id: "roles-permissions",
        name: "Roles & Permissions",
        description: "Manage access control",
        href: "/dashboard/admin/roles-permissions",
        icon: Shield,
        requiredPermissions: ["roles.view", "roles.assign_permissions"],
        roles: ["Admin"],
      },
      {
        id: "feature-requests",
        name: "Feature Requests",
        description: "View user requests",
        href: "/dashboard/admin/feature-requests",
        icon: MessageSquare,
        requiredPermissions: ["feature_request.view"],
        roles: ["Admin"],
      },
    ],
  },
]

// Role configuration for user profile card
export interface RoleConfig {
  badge: string
  color: "purple" | "emerald" | "orange" | "blue"
  showRegion: boolean
  showSchool: boolean
  avatarGradient: string
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  Admin: {
    badge: "System Admin",
    color: "purple",
    showRegion: false,
    showSchool: false,
    avatarGradient: "from-blue-500 to-indigo-600",
  },
  "Education Official": {
    badge: "Education Official",
    color: "emerald",
    showRegion: false,
    showSchool: false,
    avatarGradient: "from-emerald-500 to-teal-600",
  },
  "Regional Officer": {
    badge: "Regional Officer",
    color: "orange",
    showRegion: true,
    showSchool: false,
    avatarGradient: "from-blue-500 to-indigo-600",
  },
  "Head Teacher": {
    badge: "Head Teacher",
    color: "emerald",
    showRegion: false,
    showSchool: true,
    avatarGradient: "from-blue-500 to-indigo-600",
  },
}

// Badge color classes
export const BADGE_COLOR_CLASSES: Record<string, string> = {
  purple: "bg-purple-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  blue: "bg-blue-500",
}
