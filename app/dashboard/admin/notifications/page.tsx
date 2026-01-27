"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  getAllNotifications,
  deleteNotification,
  restoreNotification,
  permanentDeleteNotification,
} from "@/app/actions/notifications"
import { Bell, Plus, Trash2, MessageSquare, Users, X, RotateCcw, Loader2, AlertCircle, Megaphone } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CreateNotificationForm } from "@/components/admin/create-notification-form"
import { useEffect } from "react"

interface NotificationsPageProps {
  searchParams: Promise<{ page?: string; tab?: string }>
}

interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  updated_at?: string
  priority: string
  notification_type: string
  expires_at?: string | null
  target_all_users: boolean
  target_user_roles?: string[]
  target_school_levels?: string[]
  target_regions?: string[]
  target_user_ids?: string[]
  hmr_users?: { name: string }
  is_active?: boolean
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50"
    case "high":
      return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50"
    case "normal":
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50"
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "announcement":
      return <MessageSquare className="h-4 w-4" />
    case "deadline":
      return <Bell className="h-4 w-4" />
    case "alert":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <MessageSquare className="h-4 w-4" />
  }
}

function DeleteNotificationButton({
  notificationId,
  onDelete
}: {
  notificationId: string
  onDelete: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteNotification(notificationId)

      if (result.error) {
        console.error('Delete failed:', result.error)
        alert('Failed to delete notification: ' + result.error)
      } else {
        console.log('Delete successful')
        setShowDeleteModal(false)
        onDelete()
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      alert('An error occurred while deleting the notification')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowDeleteModal(true)}
        variant="ghost"
        size="sm"
        type="button"
        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-white">Move to Trash</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              This notification will be moved to trash. You can restore it later or permanently delete it from the trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Moving to trash...
                </div>
              ) : (
                'Move to Trash'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RestoreNotificationButton({
  notificationId,
  onRestore
}: {
  notificationId: string
  onRestore: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRestore = async () => {
    setIsLoading(true)
    try {
      const result = await restoreNotification(notificationId)
      if (result.error) {
        console.error("Error restoring notification:", result.error)
      } else {
        onRestore()
      }
    } catch (error) {
      console.error("Error restoring notification:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={isLoading}
      className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
      {isLoading ? "Restoring..." : "Restore"}
    </Button>
  )
}

function PermanentDeleteButton({
  notificationId,
  onDelete
}: {
  notificationId: string
  onDelete: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handlePermanentDelete = async () => {
    setIsLoading(true)
    try {
      const result = await permanentDeleteNotification(notificationId)
      if (result.error) {
        console.error("Error permanently deleting notification:", result.error)
      } else {
        onDelete()
        setIsOpen(false)
      }
    } catch (error) {
      console.error("Error permanently deleting notification:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <X className="h-4 w-4 mr-1" />
          Delete Forever
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-800 dark:text-white">Permanently Delete Notification</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            This action cannot be undone. This notification will be permanently deleted from the system.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-slate-200 dark:border-slate-700">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handlePermanentDelete}
            disabled={isLoading}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Delete Forever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [trashedNotifications, setTrashedNotifications] = useState<Notification[]>([])
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("broadcast")
  const [showTrash, setShowTrash] = useState(false)

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true)
      try {
        const result = await getAllNotifications(1, 20)
        if (result.error) {
          setError(result.error)
        } else {
          const allNotifications = result.notifications || []
          const activeNotifications = allNotifications.filter(n => n.is_active !== false)
          const trashedNotifications = allNotifications.filter(n => n.is_active === false)

          setNotifications(activeNotifications)
          setTrashedNotifications(trashedNotifications)
        }
      } catch (err) {
        setError("Failed to fetch notifications")
      } finally {
        setLoading(false)
      }
    }

    if (activeTab === "manage") {
      fetchNotifications()
    }
  }, [activeTab, showTrash])

  const refreshNotifications = async () => {
    setLoading(true)
    try {
      const result = await getAllNotifications(1, 20)
      if (result.error) {
        setError(result.error)
      } else {
        const allNotifications = result.notifications || []
        const activeNotifications = allNotifications.filter(n => n.is_active !== false)
        const trashedNotifications = allNotifications.filter(n => n.is_active === false)

        setNotifications(activeNotifications)
        setTrashedNotifications(trashedNotifications)
      }
    } catch (err) {
      setError("Failed to fetch notifications")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Notification Center
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Broadcast messages and manage notifications
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger
            value="broadcast"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Broadcast
          </TabsTrigger>
          <TabsTrigger
            value="manage"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-4 mt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Create New Broadcast
              </h3>
            </div>
            <div className="p-4 lg:p-6">
              <CreateNotificationForm />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4 mt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  {showTrash ? "Trash" : "Recent Broadcasts"}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTrash(!showTrash)}
                  className={showTrash
                    ? "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/20"
                    : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {showTrash ? "Show Active" : "Show Trash"}
                </Button>
              </div>
            </div>

            <div className="p-4 lg:p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {showTrash ? "Loading trash..." : "Loading notifications..."}
                  </div>
                </div>
              )}

              {error && !loading && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-300">Error: {error}</p>
                  </div>
                </div>
              )}

              {/* Empty State - No broadcasts */}
              {!loading && !showTrash && !notifications.length && !error && (
                <div className="flex flex-col items-center justify-center py-12 lg:py-16">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                    <Bell className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No broadcasts yet</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                    Create your first broadcast message to notify users
                  </p>
                </div>
              )}

              {/* Empty State - Trash empty */}
              {!loading && showTrash && !trashedNotifications.length && !error && (
                <div className="flex flex-col items-center justify-center py-12 lg:py-16">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center mb-4 shadow-lg shadow-slate-500/20">
                    <Trash2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Trash is empty</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                    Deleted notifications will appear here
                  </p>
                </div>
              )}

              {/* Active Notifications List */}
              {!loading && !showTrash && notifications.length > 0 && (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 p-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              {getTypeIcon(notification.notification_type)}
                              <h3 className="font-semibold text-base text-slate-800 dark:text-white">{notification.title}</h3>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                              {notification.notification_type}
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-500">
                            <span>
                              Created {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            <span>
                              By: {notification.hmr_users?.name || 'Unknown'}
                            </span>
                            {notification.expires_at && (
                              <span>
                                Expires: {new Date(notification.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            {notification.target_all_users && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                                All Users
                              </span>
                            )}
                            {notification.target_user_roles?.map((role: string) => (
                              <span key={role} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
                                {role}
                              </span>
                            ))}
                            {notification.target_school_levels?.map((level: string) => (
                              <span key={level} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/50">
                                {level}
                              </span>
                            ))}
                            {notification.target_regions?.map((region: string) => (
                              <span key={region} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                                {region}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <DeleteNotificationButton
                            notificationId={notification.id}
                            onDelete={refreshNotifications}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Trashed Notifications List */}
              {!loading && showTrash && trashedNotifications.length > 0 && (
                <div className="space-y-4">
                  {trashedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 p-4 opacity-75"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                              {getTypeIcon(notification.notification_type)}
                              <h3 className="font-semibold text-base text-slate-600 dark:text-slate-400">{notification.title}</h3>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border opacity-75 ${getPriorityBadge(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/50">
                              Deleted {formatDistanceToNow(new Date(notification.updated_at || notification.created_at))} ago
                            </span>
                          </div>

                          <p className="text-slate-500 dark:text-slate-500 text-sm line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-600">
                            <span>
                              Created {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            <span>
                              By: {notification.hmr_users?.name || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex gap-2">
                          <RestoreNotificationButton
                            notificationId={notification.id}
                            onRestore={refreshNotifications}
                          />
                          <PermanentDeleteButton
                            notificationId={notification.id}
                            onDelete={refreshNotifications}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
