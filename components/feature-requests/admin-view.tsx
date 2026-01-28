"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ThumbsUp,
  MessageSquare,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  Inbox,
  Trash2
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { updateFeatureRequestStatus, getFeatureRequestComments, addFeatureRequestComment, deleteFeatureRequest } from "@/app/actions/feature-requests"
import { useRouter } from "next/navigation"

type FeatureRequest = {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  created_at: string
  creator_name: string
  creator_role: string
  upvote_count: number
  comment_count: number
  admin_comment?: string
  reviewer_name?: string
}

export function FeatureRequestsAdminView({
  initialRequests
}: {
  initialRequests: FeatureRequest[]
}) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [adminComment, setAdminComment] = useState("")
  const [newComment, setNewComment] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false
    if (categoryFilter !== "all" && req.category !== categoryFilter) return false
    return true
  })

  const handleViewDetails = async (request: FeatureRequest) => {
    setSelectedRequest(request)
    setAdminComment(request.admin_comment || "")
    setIsDialogOpen(true)

    // Load comments
    const { comments: fetchedComments } = await getFeatureRequestComments(request.id)
    setComments(fetchedComments)
  }

  const handleAddComment = async () => {
    if (!selectedRequest || !newComment.trim()) return

    setIsSubmittingComment(true)
    const result = await addFeatureRequestComment(selectedRequest.id, newComment)

    if (result.success) {
      setNewComment("")
      // Reload comments
      const { comments: fetchedComments } = await getFeatureRequestComments(selectedRequest.id)
      setComments(fetchedComments)

      // Update comment count
      setRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id
            ? { ...req, comment_count: req.comment_count + 1 }
            : req
        )
      )
      router.refresh()
    }

    setIsSubmittingComment(false)
  }

  const initiateStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus)
    setShowConfirmDialog(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedRequest || !pendingStatus) return

    setIsUpdating(true)
    setShowConfirmDialog(false)

    const commentToSave = adminComment.trim()

    const result = await updateFeatureRequestStatus(
      selectedRequest.id,
      pendingStatus,
      commentToSave
    )

    if (result.success) {
      setRequests(prev =>
        prev.map(req =>
          req.id === selectedRequest.id
            ? { ...req, status: pendingStatus, admin_comment: commentToSave }
            : req
        )
      )
      setAdminComment("")
      setPendingStatus(null)
      setIsDialogOpen(false)
      router.refresh()
    }

    setIsUpdating(false)
  }

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return

    setIsDeleting(true)
    const result = await deleteFeatureRequest(selectedRequest.id)

    if (result.success) {
      setRequests(prev => prev.filter(req => req.id !== selectedRequest.id))
      setShowDeleteDialog(false)
      setIsDialogOpen(false)
      router.refresh()
    }

    setIsDeleting(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
      case "under_review": return "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
      case "approved": return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
      case "rejected": return "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30"
      case "implemented": return "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30"
      default: return "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "functionality": return "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
      case "improvement": return "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30"
      case "bug_fix": return "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30"
      case "ui_ux": return "bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30"
      case "reporting": return "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30"
      default: return "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <Label className="text-slate-700 dark:text-slate-300 mb-1.5 block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="implemented">Implemented</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label className="text-slate-700 dark:text-slate-300 mb-1.5 block">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="functionality">Functionality</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
              <SelectItem value="bug_fix">Bug Fix</SelectItem>
              <SelectItem value="ui_ux">UI/UX</SelectItem>
              <SelectItem value="reporting">Reporting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50">
            <Inbox className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No feature requests found</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card
              key={request.id}
              className="p-5 bg-white dark:bg-[hsl(222,47%,9%)] border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {request.title}
                  </h3>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={`border ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={`border ${getCategoryColor(request.category)}`}>
                      {request.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 text-sm">
                  {request.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <div className="p-1 rounded bg-slate-100 dark:bg-slate-800">
                        <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{request.creator_name}</span>
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{request.creator_role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="font-medium">{request.upvote_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">{request.comment_count}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Review Feature Request</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Review and update the status of this feature request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`border ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={`border ${getCategoryColor(selectedRequest.category)}`}>
                    {selectedRequest.category.replace('_', ' ')}
                  </Badge>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedRequest.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{selectedRequest.creator_name} ({selectedRequest.creator_role})</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{selectedRequest.upvote_count} upvotes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Comments */}
              {comments.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">Comments ({comments.length})</h4>
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{comment.user_name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">({comment.user_role})</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Comment */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <Label htmlFor="admin-comment" className="text-slate-700 dark:text-slate-300">Admin Comment</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">This comment will be saved when you update the status</p>
                <Textarea
                  id="admin-comment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Add a comment for the requester..."
                  rows={4}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button
                    onClick={() => initiateStatusChange("under_review")}
                    disabled={isUpdating}
                    variant="outline"
                    className="border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Under Review
                  </Button>
                  <Button
                    onClick={() => initiateStatusChange("approved")}
                    disabled={isUpdating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => initiateStatusChange("rejected")}
                    disabled={isUpdating}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => initiateStatusChange("implemented")}
                    disabled={isUpdating}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Implemented
                  </Button>
                </div>

                {/* Delete Button */}
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isUpdating || isDeleting}
                  variant="outline"
                  className="w-full border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Feature Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Confirm Status Update</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to update the status to <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingStatus?.replace('_', ' ').toUpperCase()}</span>?
              {adminComment.trim() && (
                <span className="block mt-2">Your admin comment will be saved with this update.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setPendingStatus(null)
              }}
              disabled={isUpdating}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? "Updating..." : "Confirm Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-[hsl(222,47%,11%)] border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Delete Feature Request</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this feature request? This action cannot be undone.
              <span className="block mt-2 font-semibold text-red-600 dark:text-red-400">Title: {selectedRequest?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
