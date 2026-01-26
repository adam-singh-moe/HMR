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
    <Card className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
              {showTrash ? (
                <>
                  <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg shadow-red-500/25">
                    <Trash className="h-5 w-5 text-white" />
                  </div>
                  <span>Trash</span>
                  <Badge className="ml-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-base px-3 py-1 border border-red-200 dark:border-red-800">
                    {deletedTeachers.length}
                  </Badge>
                </>
              ) : (
                <>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span>Teachers</span>
                  <Badge className="ml-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-base px-3 py-1 border border-blue-200 dark:border-blue-800">
                    {teachers.length}
                  </Badge>
                </>
              )}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
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
              className={showTrash 
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 border-0" 
                : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }
            >
              <Trash className="h-4 w-4 mr-2" />
              Trash
              {!showTrash && deletedTeachers.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500">
                  {deletedTeachers.length}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => showTrash ? fetchDeletedTeachers(true) : fetchTeachers(true)}
              disabled={loading}
              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {!showTrash && (
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder={showTrash ? "Search deleted teachers..." : "Search teachers by name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-6 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
              </div>
              <span className="text-slate-600 dark:text-slate-400">Loading {showTrash ? "deleted " : ""}teachers...</span>
            </div>
          </div>
        ) : showTrash ? (
          /* Trash View */
          filteredDeletedTeachers.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-800/50 rounded-full w-fit mx-auto mb-4">
                <Trash className="h-12 w-12 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery ? "No deleted teachers found matching your search." : "Trash is empty."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Name</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Status</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Email</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Deleted On</TableHead>
                    <TableHead className="text-right text-slate-600 dark:text-slate-400 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeletedTeachers.map((teacher) => (
                    <TableRow key={teacher.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{teacher.status || '-'}</TableCell>
                      <TableCell>
                        {teacher.email_address ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            <span className="truncate max-w-[150px]" title={teacher.email_address}>
                              {teacher.email_address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {formatDate(teacher.deleted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoringTeacher(teacher)}
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermanentlyDeletingTeacher(teacher)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
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
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                Showing {filteredDeletedTeachers.length} of {deletedTeachers.length} deleted teacher{deletedTeachers.length !== 1 ? 's' : ''}
              </div>
            </div>
          )
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full w-fit mx-auto mb-4">
              <Users className="h-12 w-12 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Teachers Yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {searchQuery ? "No teachers found matching your search." : "Start by adding your first teacher."}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setIsAddModalOpen(true)} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Name</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">MOE Email</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Email</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">CPCE</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">UG</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Current Appt.</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-400 font-semibold">Degrees</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-400 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <React.Fragment key={teacher.id}>
                    <TableRow 
                      className={`cursor-pointer border-b border-slate-100 dark:border-slate-700/50 transition-all duration-200 ${
                        expandedRows.has(teacher.id) 
                          ? 'bg-blue-50/50 dark:bg-blue-900/20' 
                          : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => toggleRow(teacher.id)}
                    >
                      <TableCell className="w-[40px]">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30">
                          {expandedRows.has(teacher.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        <div>
                          {teacher.first_name} {teacher.middle_name} {teacher.last_name}
                        </div>
                      </TableCell>
                    <TableCell>
                      {teacher.has_moe_email ? (
                        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.email_address ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="truncate max-w-[150px]" title={teacher.email_address}>
                            {teacher.email_address}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {teacher.cpce_major && (
                          <div className="text-slate-900 dark:text-white font-medium">{teacher.cpce_major}</div>
                        )}
                        {teacher.cpce_minor && (
                          <div className="text-slate-500 dark:text-slate-400 text-xs">{teacher.cpce_minor}</div>
                        )}
                        {!teacher.cpce_major && !teacher.cpce_minor && <span className="text-slate-400 dark:text-slate-500">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {teacher.ug_major && (
                          <div className="text-slate-900 dark:text-white font-medium">{teacher.ug_major}</div>
                        )}
                        {teacher.ug_minor && (
                          <div className="text-slate-500 dark:text-slate-400 text-xs">{teacher.ug_minor}</div>
                        )}
                        {!teacher.ug_major && !teacher.ug_minor && <span className="text-slate-400 dark:text-slate-500">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(teacher.current_appt_date)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {teacher.has_masters_degree && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                            <GraduationCap className="h-3 w-3" />
                            MA
                          </Badge>
                        )}
                        {(teacher.has_phd === "yes" || teacher.has_phd === "true") && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Award className="h-3 w-3" />
                            PhD
                          </Badge>
                        )}
                        {!teacher.has_masters_degree && teacher.has_phd !== "yes" && teacher.has_phd !== "true" && <span className="text-slate-400 dark:text-slate-500">-</span>}
                      </div>
                    </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            <DropdownMenuItem onClick={() => setConfirmEditTeacher(teacher)} className="text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30">
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingTeacher(teacher)}
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus:bg-red-50 dark:focus:bg-red-900/30"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details Row - Redesigned */}
                    {expandedRows.has(teacher.id) && (
                      <TableRow key={`${teacher.id}-details`} className="bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-slate-800/50">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-6 py-6 border-l-4 border-blue-500 dark:border-blue-400">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Personal Info Card */}
                              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all duration-300">
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                    <Users className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  Personal Information
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Gender</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{teacher.gender || '-'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Date of Birth</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{formatDate(teacher.date_of_birth)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Status</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{teacher.status || '-'}</p>
                                  </div>
                                  {teacher.contact_number && (
                                    <div className="space-y-1">
                                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Contact</span>
                                      <p className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                        {teacher.contact_number}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Education Card */}
                              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-emerald-400/50 dark:hover:border-emerald-500/50 transition-all duration-300">
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                  <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                    <BookOpen className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  Education
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Currently at CPCE</span>
                                    {teacher.currently_at_cpce ? (
                                      <p className="font-medium text-emerald-600 dark:text-emerald-400">Yes</p>
                                    ) : (
                                      <p className="text-slate-500 dark:text-slate-400">No</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">CPCE Major</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{teacher.cpce_major || '-'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">CPCE Minor</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{teacher.cpce_minor || '-'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">UG Major</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{teacher.ug_major || '-'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">UG Minor</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{teacher.ug_minor || '-'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Appointments Card */}
                              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-all duration-300">
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                  <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                                    <Calendar className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  Appointments
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Current Appointment</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{formatDate(teacher.current_appt_date)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Last Appointment</span>
                                    <p className="text-slate-900 dark:text-white font-medium">{formatDate(teacher.last_appt_date)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Advanced Degrees Card */}
                              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-lg hover:border-violet-400/50 dark:hover:border-violet-500/50 transition-all duration-300">
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
                                  <div className="p-1.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                                    <GraduationCap className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  Advanced Degrees
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Master's Degree</span>
                                    {teacher.has_masters_degree ? (
                                      <p className="font-medium text-violet-600 dark:text-violet-400">{teacher.masters_degree || 'Yes'}</p>
                                    ) : (
                                      <p className="text-slate-500 dark:text-slate-400">No</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">PhD</span>
                                    {(teacher.has_phd === "yes" || teacher.has_phd === "true") ? (
                                      <p className="font-medium text-amber-600 dark:text-amber-400">{teacher.phd || 'Yes'}</p>
                                    ) : (
                                      <p className="text-slate-500 dark:text-slate-400">No</p>
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
            {/* Summary */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
              Showing {filteredTeachers.length} of {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}
            </div>
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
