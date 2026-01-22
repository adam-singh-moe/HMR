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
  Send
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { 
  upvoteFeatureRequest,
  addFeatureRequestComment,
  getFeatureRequestComments 
} from "@/app/actions/feature-requests"
import { useRouter } from "next/navigation"

type FeatureRequest = {
  id: string
  title: string
  description: string
  category: string
  status: string
  created_at: string
  creator_name: string
  creator_role: string
  upvote_count: number
  comment_count: number
  has_upvoted: boolean
  admin_comment?: string
  reviewer_name?: string
}

export function FeatureRequestsList({ 
  initialRequests,
  userRole,
  userId
}: { 
  initialRequests: FeatureRequest[]
  userRole: string
  userId: string
}) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState<any[]>([])

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false
    return true
  })

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === "popular") {
      return b.upvote_count - a.upvote_count
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleUpvote = async (requestId: string) => {
    const result = await upvoteFeatureRequest(requestId)
    
    if (result.success) {
      setRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? {
                ...req,
                upvote_count: result.upvoted ? req.upvote_count + 1 : req.upvote_count - 1,
                has_upvoted: result.upvoted
              }
            : req
        )
      )
      router.refresh()
    }
  }

  const handleViewDetails = async (request: FeatureRequest) => {
    setSelectedRequest(request)
    setIsDialogOpen(true)
    
    // Load comments
    const { comments: fetchedComments } = await getFeatureRequestComments(request.id)
    setComments(fetchedComments)
  }

  const handleAddComment = async () => {
    if (!selectedRequest || !newComment.trim()) return

    setIsSubmitting(true)
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

    setIsSubmitting(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
      case "under_review": return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
      case "approved": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
      case "rejected": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
      case "implemented": return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "functionality": return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300"
      case "improvement": return "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300"
      case "bug_fix": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
      case "ui_ux": return "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300"
      case "reporting": return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <Label className="text-slate-700 dark:text-slate-300">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
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
          <Label className="text-slate-700 dark:text-slate-300">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {sortedRequests.length === 0 ? (
          <Card className="p-8 text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
            <p className="text-slate-500 dark:text-slate-400">No feature requests found</p>
          </Card>
        ) : (
          sortedRequests.map((request) => (
            <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 
                    className="text-xl font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    onClick={() => handleViewDetails(request)}
                  >
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
                
                <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {request.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                      <Button
                        variant={request.has_upvoted ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpvote(request.id)}
                        className="h-8"
                      >
                        <ThumbsUp className={`h-4 w-4 mr-1.5 ${request.has_upvoted ? 'fill-current' : ''}`} />
                        <span className="font-medium">{request.upvote_count}</span>
                        <span className="ml-1 hidden sm:inline">Upvote{request.upvote_count !== 1 ? 's' : ''}</span>
                      </Button>
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">{request.comment_count}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Feature Request Details</DialogTitle>
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
                
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{selectedRequest.title}</h3>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
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

              {/* Admin Comment */}
              {selectedRequest.admin_comment && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-blue-900 dark:text-blue-300">Admin Response</span>
                    {selectedRequest.reviewer_name && (
                      <span className="text-sm text-blue-700 dark:text-blue-400">by {selectedRequest.reviewer_name}</span>
                    )}
                  </div>
                  <p className="text-blue-800 dark:text-blue-300">{selectedRequest.admin_comment}</p>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">Comments ({comments.length})</h4>
                
                {comments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">{comment.user_name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">({comment.user_role})</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment - Only for Regional Officers, Education Officials, and Admins */}
                {(userRole === "Regional Officer" || userRole === "Education Official" || userRole === "Admin") && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Add a comment</Label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={3}
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={isSubmitting || !newComment.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
