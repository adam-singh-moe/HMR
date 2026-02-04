import { getUsers, getSchoolsForFilter } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { UserPlus, MoreHorizontal, Pencil, Users, Mail, Building2, Calendar, Shield, GraduationCap, MapPin, Briefcase } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog"
import { GenerateAccessTokenDialog } from "@/components/admin/generate-access-token-dialog"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { SearchInput } from "@/components/admin/search-input"
import { UserFilters } from "@/components/admin/user-filters"
import { checkPermission } from "@/lib/permissions"

interface UsersPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    school?: string
  }>
}

// Helper function to get role badge styling
function getRoleBadge(role: string) {
  switch (role) {
    case "Admin":
      return {
        bg: "bg-purple-100 dark:bg-purple-900/40",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-200 dark:border-purple-700/50",
        icon: Shield
      }
    case "Head Teacher":
      return {
        bg: "bg-blue-100 dark:bg-blue-900/40",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-700/50",
        icon: GraduationCap
      }
    case "Regional Officer":
      return {
        bg: "bg-orange-100 dark:bg-orange-900/40",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-200 dark:border-orange-700/50",
        icon: MapPin
      }
    case "Education Official":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-900/40",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-700/50",
        icon: Briefcase
      }
    default:
      return {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
        icon: Users
      }
  }
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { page: pageParam, search: searchParam, school: schoolParam } = await searchParams
  const page = Number(pageParam) || 1
  const search = searchParam || ""
  const school = schoolParam || ""
  const limit = 10

  // Check permissions - using actual permission keys from database
  const [canView, canCreate, canEdit, canDelete, canGenerateToken] = await Promise.all([
    checkPermission("users.view"),
    checkPermission("users.create"),
    checkPermission("users.edit_all"),
    checkPermission("users.delete"),
    checkPermission("users.access_token"),
  ])

  // If user can't view users at all, redirect to dashboard
  if (!canView) {
    redirect("/dashboard/admin")
  }

  // Fetch users and filter options in parallel
  const [usersResult, schoolsResult] = await Promise.all([
    getUsers(page, limit, search, "", school),
    getSchoolsForFilter()
  ])

  const { users, total, error } = usersResult
  const { schools } = schoolsResult

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Users</h2>
          {canCreate && (
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
              <Link href="/dashboard/admin/users/new" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Add User</span>
              </Link>
            </Button>
          )}
        </div>
        <div className="text-center py-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          Error loading users: {error}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)
  const hasActiveFilters = !!school

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Users
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage all system users and their permissions
          </p>
        </div>
        {canCreate && (
          <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
            <Link href="/dashboard/admin/users/new" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <SearchInput placeholder="Search users..." baseUrl="/dashboard/admin/users" />
          <UserFilters
            schools={schools}
            currentSchool={school}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {total} {hasActiveFilters ? 'filtered' : 'total'} users
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Name
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    Role
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    School/Region
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                  </div>
                </th>
                {(canEdit || canDelete || canGenerateToken) && (
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[80px]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={(canEdit || canDelete || canGenerateToken) ? 6 : 5} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <span>
                        {search || hasActiveFilters
                          ? "No users found matching your filters"
                          : "No users found"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const roleBadge = getRoleBadge(user.role)
                  const RoleIcon = roleBadge.icon

                  return (
                    <tr
                      key={user.id}
                      className={`
                        transition-colors duration-150
                        ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/20'}
                        hover:bg-blue-50/50 dark:hover:bg-blue-900/10
                      `}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 dark:text-white">{user.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{user.email}</span>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                            <RoleIcon className="h-3 w-3" />
                            {user.role}
                          </span>
                          <div className="text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                            {user.role === "Head Teacher" ? user.school_name : user.region_name}
                          </div>
                        </div>
                      </td>
                      {/* School/Region */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {user.role === "Head Teacher" ? user.school_name : user.region_name || '—'}
                        </span>
                      </td>
                      {/* Created */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {user.created_at && formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      {/* Actions */}
                      {(canEdit || canDelete || canGenerateToken) && (
                        <td className="px-4 py-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              {canEdit && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit User
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canGenerateToken && (
                                <GenerateAccessTokenDialog
                                  userId={user.id}
                                  userName={user.name}
                                  userEmail={user.email}
                                />
                              )}
                              {(canEdit || canGenerateToken) && canDelete && <DropdownMenuSeparator />}
                              {canDelete && <DeleteUserDialog userId={user.id} userName={user.name} />}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          baseUrl="/dashboard/admin/users"
        />
      )}
    </div>
  )
}
