import { getSchools, getRegions, getSchoolLevels } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { School, MoreHorizontal, Pencil, ArrowUpDown, ArrowUp, ArrowDown, MapPin, GraduationCap, Calendar } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DeleteSchoolDialog } from "@/components/admin/delete-school-dialog"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { SearchInput } from "@/components/admin/search-input"
import { SchoolFilters } from "@/components/admin/school-filters"
import { checkPermission, checkAnyPermission } from "@/lib/permissions"

interface SchoolsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    region?: string
    schoolLevel?: string
    sortBy?: string
    sortOrder?: string
  }>
}

// Helper function to get school level badge styling
function getSchoolLevelBadge(level: string) {
  const levelLower = level?.toLowerCase() || ""
  if (levelLower.includes("nursery")) {
    return "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700/50"
  }
  if (levelLower.includes("primary")) {
    return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50"
  }
  if (levelLower.includes("secondary")) {
    return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50"
  }
  if (levelLower.includes("special")) {
    return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50"
  }
  if (levelLower.includes("practical") || levelLower.includes("instruction")) {
    return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50"
  }
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
}

export default async function SchoolsPage({ searchParams }: SchoolsPageProps) {
  const {
    page: pageParam,
    search: searchParam,
    region: regionParam,
    schoolLevel: schoolLevelParam,
    sortBy: sortByParam,
    sortOrder: sortOrderParam
  } = await searchParams

  const page = Number(pageParam) || 1
  const search = searchParam || ""
  const selectedRegion = regionParam || ""
  const selectedSchoolLevel = schoolLevelParam || ""
  const sortBy = sortByParam || "created_at"
  const sortOrder = sortOrderParam || "desc"
  const limit = 10

  // Check permissions - use actual permission keys from the database
  const [canViewAll, canCreate, canEdit, canDelete] = await Promise.all([
    checkPermission("school_assessments.view_all"),
    checkPermission("permissions.create"),
    checkPermission("permissions.edit"),
    checkPermission("permissions.delete"),
  ])
  const canViewRegional = false // Will add regional permission check if needed

  const canView = canViewAll || canViewRegional

  // If user can't view schools at all, redirect to dashboard
  if (!canView) {
    redirect("/dashboard/admin")
  }

  const [schoolsResult, regionsResult, schoolLevels] = await Promise.all([
    getSchools(page, limit, search, selectedRegion, selectedSchoolLevel, sortBy, sortOrder),
    getRegions(1, 50),
    getSchoolLevels()
  ])

  const { schools, total, error } = schoolsResult
  const regions = regionsResult.regions || []

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Schools</h2>
          {canCreate && (
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
              <Link href="/dashboard/admin/schools/new" className="flex items-center gap-2">
                <School className="h-4 w-4" />
                <span>Add School</span>
              </Link>
            </Button>
          )}
        </div>
        <div className="text-center py-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          Error loading schools: {error}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)
  const hasActiveFilters = selectedRegion || selectedSchoolLevel || search

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5" />
    return sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
  }

  const getSortUrl = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc"
    const params = new URLSearchParams({
      page: "1",
      ...(search && { search }),
      ...(selectedRegion && { region: selectedRegion }),
      ...(selectedSchoolLevel && { schoolLevel: selectedSchoolLevel }),
      sortBy: column,
      sortOrder: newSortOrder
    })
    return `/dashboard/admin/schools?${params.toString()}`
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <School className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Schools
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage all schools in the system
          </p>
        </div>
        {canCreate && (
          <Button asChild size="sm" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
            <Link href="/dashboard/admin/schools/new" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              <span>Add School</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <SearchInput placeholder="Search schools by name..." baseUrl="/dashboard/admin/schools" />
          <SchoolFilters
            regions={regions}
            schoolLevels={schoolLevels}
            selectedRegion={selectedRegion}
            selectedSchoolLevel={selectedSchoolLevel}
            baseUrl="/dashboard/admin/schools"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {total} {hasActiveFilters ? 'filtered' : 'total'} schools
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider min-w-[200px]">
                  <Link
                    href={getSortUrl("name")}
                    className="flex items-center gap-2 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    <School className="h-3.5 w-3.5" />
                    Name
                    {getSortIcon("name")}
                  </Link>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Region
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5" />
                    School Level
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                  <Link
                    href={getSortUrl("created_at")}
                    className="flex items-center gap-2 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                    {getSortIcon("created_at")}
                  </Link>
                </th>
                {(canEdit || canDelete) && (
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-[80px]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={(canEdit || canDelete) ? 5 : 4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <School className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <span>
                        {search || selectedRegion || selectedSchoolLevel
                          ? "No schools found matching your filters"
                          : "No schools found"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                schools.map((school, index) => {
                  const levelName = (school.sms_school_levels as any)?.name || "Not Set"
                  const regionName = (school.sms_regions as any)?.name || "No Region"

                  return (
                    <tr
                      key={school.id}
                      className={`
                        transition-colors duration-150
                        ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/20'}
                        hover:bg-blue-50/50 dark:hover:bg-blue-900/10
                      `}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-800 dark:text-white">{school.name}</div>
                          {/* Mobile: show region and level */}
                          <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {regionName} • {levelName}
                          </div>
                        </div>
                      </td>
                      {/* Region */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{regionName}</span>
                      </td>
                      {/* School Level */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSchoolLevelBadge(levelName)}`}>
                          {levelName}
                        </span>
                      </td>
                      {/* Created */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {school.created_at
                            ? new Date(school.created_at).toLocaleDateString()
                            : "N/A"
                          }
                        </span>
                      </td>
                      {/* Actions */}
                      {(canEdit || canDelete) && (
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
                                  <Link href={`/dashboard/admin/schools/${school.id}`} className="flex items-center">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit School
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canEdit && canDelete && <DropdownMenuSeparator />}
                              {canDelete && <DeleteSchoolDialog schoolId={school.id} schoolName={school.name} />}
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
          baseUrl="/dashboard/admin/schools"
        />
      )}
    </div>
  )
}
