import { getSchools, getRegions, getSchoolLevels } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SchoolIcon, MoreHorizontal, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { DeleteSchoolDialog } from "@/components/admin/delete-school-dialog"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { SearchInput } from "@/components/admin/search-input"
import { SchoolFilters } from "@/components/admin/school-filters"

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

  const [schoolsResult, regionsResult, schoolLevels] = await Promise.all([
    getSchools(page, limit, search, selectedRegion, selectedSchoolLevel, sortBy, sortOrder),
    getRegions(),
    getSchoolLevels()
  ])

  const { schools, total, error } = schoolsResult
  const regions = regionsResult.regions || []

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Schools</h2>
          <Button asChild>
            <Link href="/dashboard/admin/schools/new" className="flex items-center gap-2">
              <SchoolIcon className="h-4 w-4" />
              <span>Add School</span>
            </Link>
          </Button>
        </div>
        <div className="text-center py-8 text-red-600">
          Error loading schools: {error}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getSortUrl = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc"
    const params = new URLSearchParams({
      page: "1", // Reset to first page when sorting
      ...(search && { search }),
      ...(selectedRegion && { region: selectedRegion }),
      ...(selectedSchoolLevel && { schoolLevel: selectedSchoolLevel }),
      sortBy: column,
      sortOrder: newSortOrder
    })
    return `/dashboard/admin/schools?${params.toString()}`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Schools</h2>
        <Button asChild size="sm" className="sm:size-default">
          <Link href="/dashboard/admin/schools/new" className="flex items-center gap-2">
            <SchoolIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Add School</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <SearchInput placeholder="Search schools by name..." baseUrl="/dashboard/admin/schools" />
        
        {/* Filters */}
        <SchoolFilters
          regions={regions}
          schoolLevels={schoolLevels}
          selectedRegion={selectedRegion}
          selectedSchoolLevel={selectedSchoolLevel}
          baseUrl="/dashboard/admin/schools"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">
                  <Link 
                    href={getSortUrl("name")} 
                    className="flex items-center gap-2 hover:text-foreground"
                  >
                    Name
                    {getSortIcon("name")}
                  </Link>
                </TableHead>
                <TableHead className="hidden sm:table-cell min-w-[120px]">Region</TableHead>
                <TableHead className="hidden md:table-cell min-w-[120px]">School Level</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[100px]">
                  <Link 
                    href={getSortUrl("created_at")} 
                    className="flex items-center gap-2 hover:text-foreground"
                  >
                    Created
                    {getSortIcon("created_at")}
                  </Link>
                </TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search || selectedRegion || selectedSchoolLevel 
                    ? "No schools found matching your filters" 
                    : "No schools found"
                  }
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{school.name}</span>
                      {/* Show region and level on mobile */}
                      <div className="sm:hidden text-xs text-muted-foreground mt-1">
                        {(school.sms_regions as any)?.name || "No Region"} • {(school.sms_school_levels as any)?.name || "Not Set"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{(school.sms_regions as any)?.name || "No Region"}</TableCell>
                  <TableCell className="hidden md:table-cell">{(school.sms_school_levels as any)?.name || "Not Set"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {school.created_at 
                      ? new Date(school.created_at).toLocaleDateString()
                      : "N/A"
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/admin/schools/${school.id}`} className="flex items-center">
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DeleteSchoolDialog schoolId={school.id} schoolName={school.name} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

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
