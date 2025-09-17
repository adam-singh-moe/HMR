import { getUsers } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserPlus, MoreHorizontal, Pencil } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { SearchInput } from "@/components/admin/search-input"

interface UsersPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
  }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { page: pageParam, search: searchParam } = await searchParams
  const page = Number(pageParam) || 1
  const search = searchParam || ""
  const limit = 10

  const { users, total, error } = await getUsers(page, limit, search)

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Users</h2>
          <Button asChild>
            <Link href="/dashboard/admin/users/new" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </Link>
          </Button>
        </div>
        <div className="text-center py-8 text-red-600">
          Error loading users: {error}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl lg:text-2xl font-bold">Users</h2>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard/admin/users/new" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <SearchInput placeholder="Search users..." baseUrl="/dashboard/admin/users" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">School/Region</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? `No users found matching "${search}"` : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{user.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{user.role}</div>
                        <div className="text-xs text-muted-foreground lg:hidden">
                          {user.role === "Head Teacher" ? user.school_name : user.region_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.role === "Head Teacher" ? user.school_name : user.region_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.created_at && formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
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
                            <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center">
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DeleteUserDialog userId={user.id} userName={user.name} />
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
          baseUrl="/dashboard/admin/users"
        />
      )}
    </div>
  )
}
