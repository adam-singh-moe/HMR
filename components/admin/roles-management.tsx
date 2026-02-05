"use client"

import { useState, useTransition } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { createRole, updateRole, deleteRole } from "@/app/actions/roles-permissions"

interface Role {
  id: string
  name: string
  created_at: string
  user_count: number
}

interface RolesManagementProps {
  roles: Role[]
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export function RolesManagement({
  roles: initialRoles,
  canCreate,
  canEdit,
  canDelete,
}: RolesManagementProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [isPending, startTransition] = useTransition()

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [showEditConfirm, setShowEditConfirm] = useState(false)

  // Form states
  const [newRoleName, setNewRoleName] = useState("")
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editRoleName, setEditRoleName] = useState("")
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)

  // Loading states
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = async () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required")
      return
    }

    setIsCreating(true)
    startTransition(async () => {
      const result = await createRole({ name: newRoleName.trim() })

      if (result.success && result.role) {
        setRoles([...roles, { ...result.role, user_count: 0 }])
        setNewRoleName("")
        setIsCreateDialogOpen(false)
        toast.success("Role created successfully")
      } else {
        toast.error(result.error || "Failed to create role")
      }
      setIsCreating(false)
    })
  }

  const handleEdit = async () => {
    if (!editingRole || !editRoleName.trim()) {
      toast.error("Role name is required")
      return
    }

    setIsEditing(true)
    startTransition(async () => {
      const result = await updateRole(editingRole.id, { name: editRoleName.trim() })

      if (result.success) {
        setRoles(roles.map(r =>
          r.id === editingRole.id ? { ...r, name: editRoleName.trim() } : r
        ))
        setEditingRole(null)
        setEditRoleName("")
        setShowEditConfirm(false)
        setIsEditDialogOpen(false)
        toast.success("Role updated successfully")
      } else {
        toast.error(result.error || "Failed to update role")
        setShowEditConfirm(false)
      }
      setIsEditing(false)
    })
  }

  const handleDelete = async () => {
    if (!deletingRole) return

    setIsDeleting(true)
    startTransition(async () => {
      const result = await deleteRole(deletingRole.id)

      if (result.success) {
        setRoles(roles.filter(r => r.id !== deletingRole.id))
        setDeletingRole(null)
        setIsDeleteDialogOpen(false)
        toast.success("Role deleted successfully")
      } else {
        toast.error(result.error || "Failed to delete role")
      }
      setIsDeleting(false)
    })
  }

  const openEditDialog = (role: Role) => {
    setEditingRole(role)
    setEditRoleName(role.name)
    setShowEditConfirm(false)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (role: Role) => {
    setDeletingRole(role)
    setIsDeleteDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            System Roles
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage user roles and their permissions
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col items-center transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg"
          >
            {/* Shield icon */}
            <div className="w-14 h-14 rounded-2xl bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-blue-500 dark:text-blue-400" />
            </div>

            {/* Role name */}
            <h4 className="font-semibold text-base text-slate-800 dark:text-white text-center mb-1">
              {role.name}
            </h4>

            {/* Divider */}
            <div className="w-full h-px bg-slate-200 dark:bg-slate-700 my-4" />

            {/* User count */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <Users className="h-4 w-4" />
              <span>{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
            </div>

            {/* Action buttons */}
            {(canEdit || canDelete) && (
              <div className="flex items-center gap-2 w-full">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(role)}
                    className="flex-1 h-9 rounded-full bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(role)}
                    className="flex-1 h-9 rounded-full bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="w-16 h-16 rounded-2xl bg-slate-200/50 dark:bg-slate-700/50 border border-slate-300/50 dark:border-slate-600/50 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No roles found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {canCreate
              ? "Get started by creating your first role."
              : "No roles have been created yet."}
          </p>
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Create New Role
            </DialogTitle>
            <DialogDescription>
              Add a new role to the system. You can assign permissions to this role after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Role Name
            </label>
            <Input
              placeholder="e.g., Department Head"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewRoleName("")
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newRoleName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setShowEditConfirm(false)
          setEditingRole(null)
          setEditRoleName("")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Role
            </DialogTitle>
            <DialogDescription>
              Update the role name. This will apply to all users with this role.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Role Name
            </label>
            <Input
              placeholder="Role name"
              value={editRoleName}
              onChange={(e) => setEditRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isEditing && editRoleName.trim() && setShowEditConfirm(true)}
              className="w-full"
            />
            {editingRole && editingRole.user_count > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                This change will affect {editingRole.user_count} user{editingRole.user_count !== 1 ? "s" : ""} with this role.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingRole(null)
                setEditRoleName("")
              }}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowEditConfirm(true)}
              disabled={isEditing || !editRoleName.trim() || editRoleName.trim() === editingRole?.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Confirm Role Update
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-400">
                  Are you sure you want to rename the role from "{editingRole?.name}" to "{editRoleName}"?
                </p>
                {editingRole && editingRole.user_count > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      This will affect <strong>{editingRole.user_count} user{editingRole.user_count !== 1 ? "s" : ""}</strong> currently assigned to this role.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowEditConfirm(false)}
              disabled={isEditing}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEdit}
              disabled={isEditing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Update
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Role Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deletingRole && deletingRole.user_count > 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      This role cannot be deleted
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                      There {deletingRole.user_count === 1 ? "is" : "are"} currently{" "}
                      <strong>{deletingRole.user_count} user{deletingRole.user_count !== 1 ? "s" : ""}</strong>{" "}
                      assigned to the "{deletingRole.name}" role. Please reassign these users to a different role before deleting.
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">
                    Are you sure you want to delete the role "{deletingRole?.name}"? This action cannot be undone.
                    All permissions assigned to this role will also be removed.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingRole(null)
              }}
              disabled={isDeleting}
            >
              {deletingRole && deletingRole.user_count > 0 ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {deletingRole && deletingRole.user_count === 0 && (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Role
                  </>
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
