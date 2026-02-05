"use client"

import { useState, useTransition } from "react"
import { ChevronDown, ChevronRight, Loader2, Check, Plus, Pencil, Trash2, Lock, Unlock, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  toggleRolePermission,
  createPermission,
  updatePermission,
  disablePermission,
  enablePermission,
  createPermissionCategory,
} from "@/app/actions/roles-permissions"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type {
  Role,
  PermissionsGroupedByCategory,
  PermissionCategory,
} from "@/app/actions/roles-permissions"

interface RolesPermissionsMatrixProps {
  roles: Role[]
  permissionsByCategory: PermissionsGroupedByCategory
  categories: PermissionCategory[]
  initialMappings: string[] // Array of "roleId:permissionId" strings
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

// Suggested permission keys based on common patterns
const SUGGESTED_PERMISSION_SUFFIXES = [
  { suffix: "view", name: "View", description: "View items" },
  { suffix: "view_all", name: "View All", description: "View all items across the system" },
  { suffix: "view_regional", name: "View Regional", description: "View items for assigned region" },
  { suffix: "view_own", name: "View Own", description: "View only own items" },
  { suffix: "create", name: "Create", description: "Create new items" },
  { suffix: "edit", name: "Edit", description: "Edit/update items" },
  { suffix: "delete", name: "Delete", description: "Delete items" },
  { suffix: "export", name: "Export", description: "Export data" },
]

export function RolesPermissionsMatrix({
  roles,
  permissionsByCategory,
  categories,
  initialMappings,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: RolesPermissionsMatrixProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // Track which role:permission pairs have the permission granted
  const [mappings, setMappings] = useState<Set<string>>(new Set(initialMappings))

  // Track expanded categories (collapsed by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  // Track which checkboxes are currently loading
  const [loadingCells, setLoadingCells] = useState<Set<string>>(new Set())

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<{
    id: number
    permission_key: string
    name: string
    description: string | null
    category: string
    restricted_roles: string[] | null
  } | null>(null)

  // Form states
  const [newPermission, setNewPermission] = useState({
    permission_key: "",
    name: "",
    description: "",
    category: "",
    display_order: 0,
  })
  const [newCategory, setNewCategory] = useState({
    category_key: "",
    Label: "",
    description: "",
    display_order: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sort categories by display order
  const sortedCategories = Object.entries(permissionsByCategory).sort(
    ([, a], [, b]) => a.displayOrder - b.displayOrder
  )

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryKey)) {
        next.delete(categoryKey)
      } else {
        next.add(categoryKey)
      }
      return next
    })
  }

  const hasPermission = (roleId: string, permissionId: number): boolean => {
    return mappings.has(`${roleId}:${permissionId}`)
  }

  const handleTogglePermission = (roleId: string, permissionId: number) => {
    if (!canEdit) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to modify role permissions.",
        variant: "destructive",
      })
      return
    }

    const key = `${roleId}:${permissionId}`
    const currentlyGranted = mappings.has(key)
    const newGranted = !currentlyGranted

    // Set loading state
    setLoadingCells((prev) => new Set(prev).add(key))

    // Optimistic update
    setMappings((prev) => {
      const next = new Set(prev)
      if (newGranted) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })

    startTransition(async () => {
      const { success, error } = await toggleRolePermission(roleId, permissionId, newGranted)

      // Remove loading state
      setLoadingCells((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })

      if (!success) {
        // Revert optimistic update
        setMappings((prev) => {
          const next = new Set(prev)
          if (currentlyGranted) {
            next.add(key)
          } else {
            next.delete(key)
          }
          return next
        })

        toast({
          title: "Error",
          description: error || "Failed to update permission",
          variant: "destructive",
        })
      } else {
        toast({
          title: newGranted ? "Permission Granted" : "Permission Revoked",
          description: `Successfully ${newGranted ? "granted" : "revoked"} the permission.`,
        })
      }
    })
  }

  const isLoading = (roleId: string, permissionId: number): boolean => {
    return loadingCells.has(`${roleId}:${permissionId}`)
  }

  // Expand/collapse all
  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(permissionsByCategory)))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  // Handle create permission
  const handleCreatePermission = async () => {
    if (!newPermission.permission_key || !newPermission.name || !newPermission.category) {
      toast({
        title: "Validation Error",
        description: "Permission key, name, and category are required.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const result = await createPermission(newPermission)
    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: "Permission Created",
        description: `Successfully created "${newPermission.name}" permission.`,
      })
      setCreateDialogOpen(false)
      setNewPermission({
        permission_key: "",
        name: "",
        description: "",
        category: "",
        display_order: 0,
      })
      // Reload the page to refresh the data
      window.location.reload()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create permission.",
        variant: "destructive",
      })
    }
  }

  // Handle update permission
  const handleUpdatePermission = async () => {
    if (!editingPermission) return

    setIsSubmitting(true)
    const result = await updatePermission(editingPermission.id, {
      name: editingPermission.name,
      description: editingPermission.description || undefined,
      category: editingPermission.category,
      restricted_roles: editingPermission.restricted_roles,
    })
    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: "Permission Updated",
        description: `Successfully updated "${editingPermission.name}" permission.`,
      })
      setEditDialogOpen(false)
      setEditingPermission(null)
      window.location.reload()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update permission.",
        variant: "destructive",
      })
    }
  }

  // Handle disable permission
  const handleDisablePermission = async (permissionId: number, permissionName: string) => {
    setIsSubmitting(true)
    const result = await disablePermission(permissionId)
    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: "Permission Disabled",
        description: `"${permissionName}" has been disabled and is now locked.`,
      })
      window.location.reload()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to disable permission.",
        variant: "destructive",
      })
    }
  }

  // Handle enable permission
  const handleEnablePermission = async (permissionId: number, permissionName: string) => {
    setIsSubmitting(true)
    const result = await enablePermission(permissionId)
    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: "Permission Enabled",
        description: `"${permissionName}" has been enabled and is now unlocked.`,
      })
      window.location.reload()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to enable permission.",
        variant: "destructive",
      })
    }
  }

  // Handle create category
  const handleCreateCategory = async () => {
    if (!newCategory.category_key || !newCategory.Label) {
      toast({
        title: "Validation Error",
        description: "Category key and label are required.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const result = await createPermissionCategory(newCategory)
    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: "Category Created",
        description: `Successfully created "${newCategory.Label}" category.`,
      })
      setCreateCategoryDialogOpen(false)
      setNewCategory({
        category_key: "",
        Label: "",
        description: "",
        display_order: 0,
      })
      window.location.reload()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create category.",
        variant: "destructive",
      })
    }
  }

  // Generate suggested key from category
  const generatePermissionKey = (categoryKey: string, suffix: string) => {
    return `${categoryKey}.${suffix}`
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={expandAll}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        >
          Collapse All
        </button>

        {canCreate && (
          <>
            <div className="flex-1" />
            <Button
              onClick={() => setCreateCategoryDialogOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              New Category
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Permission
            </Button>
          </>
        )}
      </div>

      {/* Matrix Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-slate-200 dark:border-slate-700/50">
                <th className="sticky left-0 z-20 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider min-w-[280px]">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider min-w-[140px]"
                  >
                    {role.name}
                  </th>
                ))}
                {(canEdit || canDelete) && (
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-12">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedCategories.map(([categoryKey, category]) => {
                const isExpanded = expandedCategories.has(categoryKey)

                return (
                  <CategoryRows
                    key={categoryKey}
                    categoryKey={categoryKey}
                    categoryLabel={category.label}
                    permissions={category.permissions}
                    roles={roles}
                    isExpanded={isExpanded}
                    onToggleCategory={() => toggleCategory(categoryKey)}
                    hasPermission={hasPermission}
                    isLoading={isLoading}
                    onTogglePermission={handleTogglePermission}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEditPermission={(perm) => {
                      setEditingPermission(perm)
                      setEditDialogOpen(true)
                    }}
                    onDisablePermission={handleDisablePermission}
                    onEnablePermission={handleEnablePermission}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Permission Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Add a new permission to the system. Choose a category and define the permission details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newPermission.category}
                onValueChange={(value) => setNewPermission({ ...newPermission, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_key} value={cat.category_key}>
                      {cat.Label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newPermission.category && (
              <div className="grid gap-2">
                <Label>Suggested Keys</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PERMISSION_SUFFIXES.map((suggestion) => (
                    <button
                      key={suggestion.suffix}
                      type="button"
                      onClick={() => {
                        const key = generatePermissionKey(newPermission.category, suggestion.suffix)
                        setNewPermission({
                          ...newPermission,
                          permission_key: key,
                          name: `${categories.find(c => c.category_key === newPermission.category)?.Label || ''} - ${suggestion.name}`,
                          description: suggestion.description,
                        })
                      }}
                      className="px-2 py-1 text-xs rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      .{suggestion.suffix}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="permission_key">Permission Key</Label>
              <Input
                id="permission_key"
                placeholder="e.g., category.action"
                value={newPermission.permission_key}
                onChange={(e) => setNewPermission({ ...newPermission, permission_key: e.target.value })}
              />
              <p className="text-xs text-slate-500">Use format: category.action (e.g., users.view, reports.export)</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="e.g., View Users"
                value={newPermission.name}
                onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this permission allows..."
                value={newPermission.description}
                onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePermission} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Permission"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update the permission details. The permission key cannot be changed.
            </DialogDescription>
          </DialogHeader>
          {editingPermission && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Permission Key</Label>
                <div className="px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 font-mono">
                  {editingPermission.permission_key}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_category">Category</Label>
                <Select
                  value={editingPermission.category}
                  onValueChange={(value) => setEditingPermission({ ...editingPermission, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.category_key} value={cat.category_key}>
                        {cat.Label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_name">Display Name</Label>
                <Input
                  id="edit_name"
                  value={editingPermission.name}
                  onChange={(e) => setEditingPermission({ ...editingPermission, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={editingPermission.description || ""}
                  onChange={(e) => setEditingPermission({ ...editingPermission, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label>Restricted Roles</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select roles that should NOT have access to this permission. The checkbox will be disabled for these roles.
                </p>
                <div className="flex flex-wrap gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  {roles.map((role) => {
                    const isRestricted = editingPermission.restricted_roles?.includes(role.name) ?? false
                    return (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`restricted-${role.id}`}
                          checked={isRestricted}
                          onCheckedChange={(checked) => {
                            const currentRestricted = editingPermission.restricted_roles || []
                            if (checked) {
                              setEditingPermission({
                                ...editingPermission,
                                restricted_roles: [...currentRestricted, role.name],
                              })
                            } else {
                              setEditingPermission({
                                ...editingPermission,
                                restricted_roles: currentRestricted.filter((r) => r !== role.name),
                              })
                            }
                          }}
                        />
                        <Label
                          htmlFor={`restricted-${role.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {role.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermission} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category_key">Category Key</Label>
              <Input
                id="category_key"
                placeholder="e.g., reports"
                value={newCategory.category_key}
                onChange={(e) => setNewCategory({ ...newCategory, category_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              />
              <p className="text-xs text-slate-500">Lowercase, no spaces. Used as prefix for permission keys.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category_label">Display Label</Label>
              <Input
                id="category_label"
                placeholder="e.g., Reports"
                value={newCategory.Label}
                onChange={(e) => setNewCategory({ ...newCategory, Label: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category_description">Description (optional)</Label>
              <Textarea
                id="category_description"
                placeholder="Describe this category..."
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CategoryRowsProps {
  categoryKey: string
  categoryLabel: string
  permissions: Array<{
    id: number
    permission_key: string
    name: string
    description: string | null
    is_locked?: boolean | null
    is_system?: boolean | null
    restricted_roles?: string[] | null
  }>
  roles: Role[]
  isExpanded: boolean
  onToggleCategory: () => void
  hasPermission: (roleId: string, permissionId: number) => boolean
  isLoading: (roleId: string, permissionId: number) => boolean
  onTogglePermission: (roleId: string, permissionId: number) => void
  canEdit?: boolean
  canDelete?: boolean
  onEditPermission: (perm: { id: number; permission_key: string; name: string; description: string | null; category: string; restricted_roles?: string[] | null }) => void
  onDisablePermission: (permissionId: number, permissionName: string) => void
  onEnablePermission: (permissionId: number, permissionName: string) => void
}

function CategoryRows({
  categoryKey,
  categoryLabel,
  permissions,
  roles,
  isExpanded,
  onToggleCategory,
  hasPermission,
  isLoading,
  onTogglePermission,
  canEdit,
  canDelete,
  onEditPermission,
  onDisablePermission,
  onEnablePermission,
}: CategoryRowsProps) {
  return (
    <>
      {/* Category Header Row */}
      <tr
        className="bg-slate-100/80 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
        onClick={onToggleCategory}
      >
        <td className="sticky left-0 z-10 bg-slate-100/80 dark:bg-slate-800/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            )}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {categoryLabel}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({permissions.length})
            </span>
          </div>
        </td>
        {roles.map((role) => (
          <td key={role.id} className="px-4 py-2.5 text-center">
            {/* Empty cell for category row */}
          </td>
        ))}
        {(canEdit || canDelete) && (
          <td className="px-2 py-2.5 text-center">
            {/* Empty cell for category row */}
          </td>
        )}
      </tr>

      {/* Permission Rows */}
      {isExpanded &&
        permissions.map((permission, index) => {
          const isLocked = permission.is_locked === true
          const isSystem = permission.is_system === true

          return (
            <tr
              key={permission.id}
              className={cn(
                "transition-colors duration-150",
                index % 2 === 0
                  ? "bg-white dark:bg-transparent"
                  : "bg-slate-50/50 dark:bg-slate-800/20",
                "hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                isLocked && "opacity-50"
              )}
            >
              <td className="sticky left-0 z-10 bg-inherit px-4 py-2 pl-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {permission.name}
                    </span>
                    {isLocked && (
                      <span title="This permission is locked/disabled">
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                    {isSystem && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        System
                      </span>
                    )}
                  </div>
                  {permission.description && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {permission.description}
                    </span>
                  )}
                </div>
              </td>
              {roles.map((role) => {
                const granted = hasPermission(role.id, permission.id)
                const loading = isLoading(role.id, permission.id)
                const isRestricted = permission.restricted_roles?.includes(role.name) ?? false

                return (
                  <td key={role.id} className="px-4 py-2 text-center">
                    <button
                      onClick={() => onTogglePermission(role.id, permission.id)}
                      disabled={loading || !canEdit || isLocked || isRestricted}
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all duration-200",
                        loading
                          ? "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 cursor-wait"
                          : isLocked || isRestricted
                          ? "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 cursor-not-allowed"
                          : granted
                          ? "bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700"
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500",
                        (!canEdit || isRestricted) && "cursor-not-allowed opacity-70"
                      )}
                      title={
                        isRestricted
                          ? `This permission is restricted for ${role.name} role.`
                          : isLocked
                          ? "This permission is disabled. Enable it first to assign to roles."
                          : undefined
                      }
                      aria-label={
                        isRestricted
                          ? `${permission.name} is restricted for ${role.name}`
                          : isLocked
                          ? `${permission.name} is disabled`
                          : `${granted ? "Revoke" : "Grant"} ${permission.name} for ${role.name}`
                      }
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                      ) : granted && !isRestricted ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : null}
                    </button>
                  </td>
                )
              })}
              {(canEdit || canDelete) && (
                <td className="px-2 py-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => onEditPermission({
                            id: permission.id,
                            permission_key: permission.permission_key,
                            name: permission.name,
                            description: permission.description,
                            category: categoryKey,
                            restricted_roles: permission.restricted_roles || null,
                          })}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                      )}
                      {canDelete && !isSystem && (
                        <>
                          <DropdownMenuSeparator />
                          {isLocked ? (
                            <DropdownMenuItem
                              onClick={() => onEnablePermission(permission.id, permission.name)}
                              className="text-green-600 dark:text-green-400"
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Enable Permission
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onDisablePermission(permission.id, permission.name)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Disable Permission
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      {isSystem && canDelete && (
                        <DropdownMenuItem disabled className="text-slate-400">
                          <Lock className="h-4 w-4 mr-2" />
                          System (Cannot Disable)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          )
        })}
    </>
  )
}
