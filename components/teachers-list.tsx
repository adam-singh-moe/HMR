"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Users,
  Loader2,
  GraduationCap,
  Award,
  RefreshCw,
  Mail,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Phone,
  Calendar,
  BookOpen,
  Trash,
  RotateCcw,
  AlertTriangle
} from "lucide-react"
import { getTeachers, deleteTeacher, getDeletedTeachers, restoreTeacher, permanentlyDeleteTeacher, Teacher } from "@/app/actions/teachers"
import { AddTeacherModal } from "@/components/add-teacher-modal"

// Simple date formatter
const formatDate = (dateString?: string) => {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch {
    return dateString
  }
}

export function TeachersList({ 
  initialTeachers,
  initialDeletedTeachers,
  onDataLoaded
}: { 
  initialTeachers?: Teacher[]
  initialDeletedTeachers?: Teacher[]
  onDataLoaded?: (teachers: Teacher[], deletedTeachers: Teacher[]) => void
} = {}) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers || [])
  const [deletedTeachers, setDeletedTeachers] = useState<Teacher[]>(initialDeletedTeachers || [])
  const [showTrash, setShowTrash] = useState(false)
  const [loading, setLoading] = useState(!initialTeachers)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [confirmEditTeacher, setConfirmEditTeacher] = useState<Teacher | null>(null)
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [restoringTeacher, setRestoringTeacher] = useState<Teacher | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [permanentlyDeletingTeacher, setPermanentlyDeletingTeacher] = useState<Teacher | null>(null)
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(!!initialTeachers)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const fetchTeachers = async (forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (hasLoadedOnce && !forceRefresh) return
    
    setLoading(true)
    setError(null)
    try {
      const result = await getTeachers()
      if (result.error) {
        setError(result.error)
      } else {
        const loadedTeachers = result.teachers as Teacher[]
        setTeachers(loadedTeachers)
        setHasLoadedOnce(true)
        // Notify parent of loaded data for caching
        if (onDataLoaded) {
          onDataLoaded(loadedTeachers, deletedTeachers)
        }
      }
    } catch (err) {
      setError("Failed to load teachers")
    } finally {
      setLoading(false)
    }
  }

  const fetchDeletedTeachers = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDeletedTeachers()
      if (result.error) {
        setError(result.error)
      } else {
        const loadedDeleted = result.teachers as Teacher[]
        setDeletedTeachers(loadedDeleted)
        // Notify parent of loaded data for caching
        if (onDataLoaded) {
          onDataLoaded(teachers, loadedDeleted)
        }
      }
    } catch (err) {
      setError("Failed to load deleted teachers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showTrash) {
      fetchDeletedTeachers()
    } else {
      fetchTeachers()
    }
  }, [showTrash])

  // Also fetch deleted teachers count on initial load (only if not provided)
  useEffect(() => {
    if (initialDeletedTeachers) return
    
    const fetchDeletedCount = async () => {
      const result = await getDeletedTeachers()
      if (!result.error) {
        setDeletedTeachers(result.teachers as Teacher[])
      }
    }
    fetchDeletedCount()
  }, [])

  const handleDelete = async () => {
    if (!deletingTeacher) return

    setIsDeleting(true)
    try {
      const result = await deleteTeacher(deletingTeacher.id)
      if (result.success) {
        setTeachers(prev => prev.filter(t => t.id !== deletingTeacher.id))
        setDeletingTeacher(null)
        // Refresh deleted teachers count
        fetchDeletedTeachers()
      } else {
        setError(result.error || "Failed to delete teacher")
      }
    } catch (err) {
      setError("Failed to delete teacher")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRestore = async () => {
    if (!restoringTeacher) return

    setIsRestoring(true)
    try {
      const result = await restoreTeacher(restoringTeacher.id)
      if (result.success) {
        setDeletedTeachers(prev => prev.filter(t => t.id !== restoringTeacher.id))
        setRestoringTeacher(null)
      } else {
        setError(result.error || "Failed to restore teacher")
      }
    } catch (err) {
      setError("Failed to restore teacher")
    } finally {
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!permanentlyDeletingTeacher) return

    setIsPermanentlyDeleting(true)
    try {
      const result = await permanentlyDeleteTeacher(permanentlyDeletingTeacher.id)
      if (result.success) {
        setDeletedTeachers(prev => prev.filter(t => t.id !== permanentlyDeletingTeacher.id))
        setPermanentlyDeletingTeacher(null)
      } else {
        setError(result.error || "Failed to permanently delete teacher")
      }
    } catch (err) {
      setError("Failed to permanently delete teacher")
    } finally {
      setIsPermanentlyDeleting(false)
    }
  }

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const filteredDeletedTeachers = deletedTeachers.filter(teacher => {
    const fullName = `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {showTrash ? (
                <>
                  <Trash className="h-5 w-5 text-red-500" />
                  Trash
                  <Badge className="ml-2 bg-red-100 text-red-700 text-base px-3 py-1">
                    {deletedTeachers.length}
                  </Badge>
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Teachers
                  <Badge className="ml-2 bg-primary text-primary-foreground text-base px-3 py-1">
                    {teachers.length}
                  </Badge>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {showTrash 
                ? "Deleted teachers can be restored or permanently removed"
                : "Manage your school's teaching staff information"
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showTrash ? "default" : "outline"}
              size="sm" 
              onClick={() => setShowTrash(!showTrash)}
              className={showTrash ? "bg-red-500 hover:bg-red-600" : ""}
            >
              <Trash className="h-4 w-4 mr-2" />
              Trash
              {!showTrash && deletedTeachers.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {deletedTeachers.length}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => showTrash ? fetchDeletedTeachers(true) : fetchTeachers(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {!showTrash && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={showTrash ? "Search deleted teachers..." : "Search teachers by name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading {showTrash ? "deleted " : ""}teachers...</span>
          </div>
        ) : showTrash ? (
          /* Trash View */
          filteredDeletedTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Trash className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No deleted teachers found matching your search." : "Trash is empty."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Deleted On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeletedTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                      </TableCell>
                      <TableCell>{teacher.status || '-'}</TableCell>
                      <TableCell>
                        {teacher.email_address ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="truncate max-w-[150px]" title={teacher.email_address}>
                              {teacher.email_address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(teacher.deleted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoringTeacher(teacher)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermanentlyDeletingTeacher(teacher)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Forever
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Trash Summary */}
              <div className="mt-4 text-sm text-gray-500">
                Showing {filteredDeletedTeachers.length} of {deletedTeachers.length} deleted teacher{deletedTeachers.length !== 1 ? 's' : ''}
              </div>
            </div>
          )
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? "No teachers found matching your search." : "No teachers added yet."}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setIsAddModalOpen(true)} 
                className="mt-4"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>MOE Email</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPCE</TableHead>
                  <TableHead>UG</TableHead>
                  <TableHead>Current Appt.</TableHead>
                  <TableHead>Degrees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <React.Fragment key={teacher.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleRow(teacher.id)}
                    >
                      <TableCell className="w-[40px]">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {expandedRows.has(teacher.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                        </div>
                      </TableCell>
                    <TableCell>
                      {teacher.has_moe_email ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.email_address ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[150px]" title={teacher.email_address}>
                            {teacher.email_address}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {teacher.cpce_major && (
                          <div className="text-gray-900">{teacher.cpce_major}</div>
                        )}
                        {teacher.cpce_minor && (
                          <div className="text-gray-500 text-xs">{teacher.cpce_minor}</div>
                        )}
                        {!teacher.cpce_major && !teacher.cpce_minor && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {teacher.ug_major && (
                          <div className="text-gray-900">{teacher.ug_major}</div>
                        )}
                        {teacher.ug_minor && (
                          <div className="text-gray-500 text-xs">{teacher.ug_minor}</div>
                        )}
                        {!teacher.ug_major && !teacher.ug_minor && "-"}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(teacher.current_appt_date)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {teacher.has_masters_degree && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            MA
                          </Badge>
                        )}
                        {(teacher.has_phd === "yes" || teacher.has_phd === "true") && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            PhD
                          </Badge>
                        )}
                        {!teacher.has_masters_degree && teacher.has_phd !== "yes" && teacher.has_phd !== "true" && "-"}
                      </div>
                    </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setConfirmEditTeacher(teacher)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingTeacher(teacher)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details Row */}
                    {expandedRows.has(teacher.id) && (
                      <TableRow key={`${teacher.id}-details`} className="bg-gray-50/30 hover:bg-gray-50/30">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-6 py-5 border-l-4 border-primary/30 bg-gradient-to-r from-blue-50/30 to-transparent">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              {/* Personal Info */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                  <Users className="h-4 w-4 text-primary" />
                                  Personal Information
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-500 block text-xs">Gender</span>
                                    <span className="font-medium">{teacher.gender || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">Date of Birth</span>
                                    <span className="font-medium">{formatDate(teacher.date_of_birth)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">Status</span>
                                    <span className="font-medium">{teacher.status || '-'}</span>
                                  </div>
                                  {teacher.contact_number && (
                                    <div className="col-span-2">
                                      <span className="text-gray-500 block text-xs">Contact</span>
                                      <span className="font-medium flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-gray-400" />
                                        {teacher.contact_number}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Education */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                  <BookOpen className="h-4 w-4 text-primary" />
                                  Education
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-500 block text-xs">Currently at CPCE</span>
                                    {teacher.currently_at_cpce ? (
                                      <span className="font-medium text-green-600">Yes</span>
                                    ) : (
                                      <span className="text-gray-400">No</span>
                                    )}
                                  </div>
                                  {teacher.currently_at_cpce && teacher.cpce_expected_graduation_date && (
                                    <div>
                                      <span className="text-gray-500 block text-xs">Expected Graduation</span>
                                      <span className="font-medium">{formatDate(teacher.cpce_expected_graduation_date)}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-500 block text-xs">CPCE Major</span>
                                    <span className="font-medium">{teacher.cpce_major || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">CPCE Minor</span>
                                    <span className="font-medium">{teacher.cpce_minor || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">UG Major</span>
                                    <span className="font-medium">{teacher.ug_major || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">UG Minor</span>
                                    <span className="font-medium">{teacher.ug_minor || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Appointments */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  Appointments
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-500 block text-xs">Current Appointment</span>
                                    <span className="font-medium">{formatDate(teacher.current_appt_date)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">Last Appointment</span>
                                    <span className="font-medium">{formatDate(teacher.last_appt_date)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Advanced Degrees */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-200">
                                  <GraduationCap className="h-4 w-4 text-primary" />
                                  Advanced Degrees
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-500 block text-xs">Master's Degree</span>
                                    {teacher.has_masters_degree ? (
                                      <span className="font-medium text-green-600">{teacher.masters_degree || 'Yes'}</span>
                                    ) : (
                                      <span className="text-gray-400">No</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-xs">PhD</span>
                                    {(teacher.has_phd === "yes" || teacher.has_phd === "true") ? (
                                      <span className="font-medium text-green-600">{teacher.phd || 'Yes'}</span>
                                    ) : (
                                      <span className="text-gray-400">No</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary */}
        {!loading && filteredTeachers.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredTeachers.length} of {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Modal */}
      <AddTeacherModal
        open={isAddModalOpen || !!editingTeacher}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false)
            setEditingTeacher(null)
          }
        }}
        teacher={editingTeacher}
        onSuccess={fetchTeachers}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTeacher} onOpenChange={() => setDeletingTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingTeacher?.first_name} {deletingTeacher?.last_name}? 
              The teacher will be moved to trash and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
                "Move to Trash"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={!!confirmEditTeacher} onOpenChange={() => setConfirmEditTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to edit the details for {confirmEditTeacher?.first_name} {confirmEditTeacher?.last_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEditingTeacher(confirmEditTeacher)
                setConfirmEditTeacher(null)
              }}
            >
              Edit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoringTeacher} onOpenChange={() => setRestoringTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-600" />
              Restore Teacher
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {restoringTeacher?.first_name} {restoringTeacher?.last_name}? 
              The teacher will be moved back to the active teachers list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!permanentlyDeletingTeacher} onOpenChange={() => setPermanentlyDeletingTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Teacher
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {permanentlyDeletingTeacher?.first_name} {permanentlyDeletingTeacher?.last_name}? 
              <span className="block mt-2 font-semibold text-red-600">
                This action cannot be undone. The teacher record will be permanently removed from the database.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPermanentlyDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isPermanentlyDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPermanentlyDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
