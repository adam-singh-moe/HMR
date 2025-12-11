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
  Send
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
    console.log('Saving status:', pendingStatus, 'with comment:', commentToSave)
    
    const result = await updateFeatureRequestStatus(
      selectedRequest.id,
      pendingStatus,
      commentToSave
    )

    console.log('Update result:', result)

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
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "under_review": return "bg-blue-100 text-blue-800"
      case "approved": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      case "implemented": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "functionality": return "bg-indigo-100 text-indigo-800"
      case "improvement": return "bg-teal-100 text-teal-800"
      case "bug_fix": return "bg-red-100 text-red-800"
      case "ui_ux": return "bg-pink-100 text-pink-800"
      case "reporting": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
          <Label>Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
          <Card className="p-8 text-center">
            <p className="text-gray-500">No feature requests found</p>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                    {request.title}
                  </h3>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge className={getCategoryColor(request.category)}>
                      {request.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {request.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-700">{request.creator_name}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-xs text-gray-500">{request.creator_role}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="font-medium">{request.upvote_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">{request.comment_count}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Feature Request</DialogTitle>
            <DialogDescription>
              Review and update the status of this feature request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getCategoryColor(selectedRequest.category)}>
                    {selectedRequest.category.replace('_', ' ')}
                  </Badge>
                </div>
                
                <h3 className="text-2xl font-bold mb-2">{selectedRequest.title}</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600">
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
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Comments ({comments.length})</h4>
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.user_name}</span>
                          <span className="text-xs text-gray-500">({comment.user_role})</span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Comment */}
              <div className="border-t pt-4">
                <Label htmlFor="admin-comment">Admin Comment</Label>
                <p className="text-xs text-gray-500 mb-2">This comment will be saved when you update the status</p>
                <Textarea
                  id="admin-comment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Add a comment for the requester..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex gap-3">
                  <Button
                    onClick={() => initiateStatusChange("under_review")}
                    disabled={isUpdating}
                    variant="outline"
                    className="flex-1"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Under Review
                  </Button>
                <Button
                  onClick={() => initiateStatusChange("approved")}
                  disabled={isUpdating}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => initiateStatusChange("rejected")}
                  disabled={isUpdating}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                  <Button
                    onClick={() => initiateStatusChange("implemented")}
                    disabled={isUpdating}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Implemented
                  </Button>
                </div>
                
                {/* Delete Button */}
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isUpdating || isDeleting}
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete Feature Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Status Update</DialogTitle>
            <DialogDescription>
              Are you sure you want to update the status to <span className="font-semibold">{pendingStatus?.replace('_', ' ').toUpperCase()}</span>?
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Confirm Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Feature Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature request? This action cannot be undone.
              <span className="block mt-2 font-semibold text-red-600">Title: {selectedRequest?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
