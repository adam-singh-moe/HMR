'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { getAllNurseryAssessments, getNurseryAssessmentStats, deleteNurseryAssessment, getNurseryAssessmentDetails, updateNurseryAssessmentStatus } from "@/app/actions/admin-nursery-assessments"
import { NurseryAssessmentDetailView } from "@/components/nursery-assessment-detail-view"
import { Baby, Search, Eye, Trash2, Calendar, Users, CheckCircle, Clock, TrendingUp, AlertTriangle, MoreHorizontal, Edit, Settings } from "lucide-react"

// Simple date formatting function
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

interface Assessment {
  id: string
  status: 'draft' | 'completed'
  created_at: string
  updated_at: string
  sms_schools: {
    name: string
    region_id: string
    region_name: string
  }
  users: {
    first_name: string
    last_name: string
    email: string
  }
}

interface AssessmentStats {
  total: number
  completed: number
  submitted: number
  draft: number
  finished: number
  completionRate: number
  monthlyTrend: Array<{
    month: string
    completed: number
    submitted: number
    draft: number
    total: number
  }>
}

export default function AdminNurseryAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [stats, setStats] = useState<AssessmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null)
  const [assessmentDetails, setAssessmentDetails] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<'draft' | 'completed' | 'submitted'>('draft')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [assessmentsResult, statsResult] = await Promise.all([
        getAllNurseryAssessments(),
        getNurseryAssessmentStats()
      ])

      if (assessmentsResult.error) {
        console.error('Error loading assessments:', assessmentsResult.error)
      } else {
        setAssessments(assessmentsResult.assessments)
      }

      if (statsResult.error) {
        console.error('Error loading stats:', statsResult.error)
      } else {
        setStats(statsResult.stats)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!selectedAssessment) return

    setDeletingId(selectedAssessment.id)
    try {
      const result = await deleteNurseryAssessment(selectedAssessment.id)
      
      if (result.success) {
        // Remove from local state
        setAssessments(prev => prev.filter(a => a.id !== selectedAssessment.id))
        // Reload stats
        const statsResult = await getNurseryAssessmentStats()
        if (!statsResult.error) {
          setStats(statsResult.stats)
        }
      } else {
        console.error('Error deleting assessment:', result.error)
        alert('Failed to delete assessment: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting assessment:', error)
      alert('An error occurred while deleting the assessment')
    } finally {
      setDeletingId(null)
      setShowDeleteDialog(false)
      setSelectedAssessment(null)
    }
  }

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setShowDetailsDialog(true)
  }

  const handleStatusChange = async () => {
    if (!selectedAssessment) return

    try {
      const result = await updateNurseryAssessmentStatus(selectedAssessment.id, newStatus)
      
      if (result.success) {
        // Update local state
        setAssessments(prev => prev.map(assessment => 
          assessment.id === selectedAssessment.id 
            ? { ...assessment, status: newStatus, updated_at: new Date().toISOString() }
            : assessment
        ))
        // Reload stats
        const statsResult = await getNurseryAssessmentStats()
        if (!statsResult.error) {
          setStats(statsResult.stats)
        }
        setShowStatusDialog(false)
        setSelectedAssessment(null)
      } else {
        console.error('Error updating status:', result.error)
        alert('Failed to update status: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('An error occurred while updating the status')
    }
  }

  const handleChangeStatus = async (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setNewStatus(assessment.status)
    setShowStatusDialog(true)
  }

  // Filter assessments based on search term and status
  const filteredAssessments = assessments.filter(assessment => {
    const school = assessment.sms_schools || {}
    const user = assessment.users || {}
    
    const matchesSearch = 
      (school.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (school.region_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || assessment.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading && !assessments.length) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Nursery Assessment Management</h2>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Nursery Assessment Management</h2>
        <div className="flex items-center gap-2">
          <Baby className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">All nursery assessments</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.finished}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.completionRate}% completion rate</div>
              <div className="text-xs text-muted-foreground">({stats.completed} completed + {stats.submitted} submitted)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.draft}</div>
              <div className="text-xs text-muted-foreground mt-1">Incomplete assessments</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.monthlyTrend[0]?.total || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">New assessments</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by school or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assessments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">
                    {assessment.sms_schools?.name || 'Unknown School'}
                  </TableCell>
                  <TableCell>{assessment.sms_schools?.region_name || 'Unknown Region'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={assessment.status === 'completed' || assessment.status === 'submitted' ? 'default' : 'secondary'}
                    >
                      {assessment.status === 'completed' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </>
                      ) : assessment.status === 'submitted' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Submitted
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Draft
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(assessment.created_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(assessment.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(assessment.updated_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(assessment.updated_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={deletingId === assessment.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewDetails(assessment)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Assessment
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            // TODO: Implement edit functionality
                            console.log('Edit assessment:', assessment.id)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Assessment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            const nextStatus = assessment.status === 'draft' 
                              ? 'submitted' 
                              : 'draft'
                            handleStatusChange(assessment.id, nextStatus)
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Change Status to {
                            assessment.status === 'draft' 
                              ? 'Submitted' 
                              : 'Draft'
                          }
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(assessment)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Assessment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAssessments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "No assessments match your filters" 
                : "No nursery assessments found"
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this nursery assessment?</p>
            {selectedAssessment && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p><strong>School:</strong> {selectedAssessment.sms_schools?.name || 'Unknown'}</p>
                <p><strong>Region:</strong> {selectedAssessment.sms_schools?.region_name || 'Unknown'}</p>
                <p><strong>Status:</strong> {selectedAssessment.status}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              This action cannot be undone. All assessment data and answers will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId === selectedAssessment?.id}
            >
              {deletingId === selectedAssessment?.id ? "Deleting..." : "Delete Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Change Assessment Status
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedAssessment && (
              <div>
                <div className="mb-4 p-3 bg-muted rounded-md">
                  <p><strong>School:</strong> {selectedAssessment.sms_schools?.name || 'Unknown'}</p>
                  <p><strong>Current Status:</strong> 
                    <Badge 
                      variant={selectedAssessment.status === 'completed' || selectedAssessment.status === 'submitted' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {selectedAssessment.status}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Status:</label>
                  <Select value={newStatus} onValueChange={(value: 'draft' | 'completed' | 'submitted') => setNewStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assessment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-blue-600" />
              Assessment Details - {selectedAssessment?.sms_schools?.name || 'Unknown School'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedAssessment && (
              <NurseryAssessmentDetailView assessmentId={selectedAssessment.id} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}