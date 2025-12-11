"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Bell, Plus, Trash2, MessageSquare, Users, X, RotateCcw, Loader2, Info, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
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

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-500"
    case "high":
      return "bg-orange-500"
    case "normal":
      return "bg-blue-500"
    default:
      return "bg-gray-500"
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "announcement":
      return <MessageSquare className="h-4 w-4" />
    case "deadline":
      return <Bell className="h-4 w-4" />
    case "alert":
      return <Bell className="h-4 w-4" />
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
        onDelete() // Refresh the notifications list
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
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Trash</DialogTitle>
            <DialogDescription>
              This notification will be moved to trash. You can restore it later or permanently delete it from the trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
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
      // For now, we'll use a simple update - you might need to create a specific restore action
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
      className="text-green-600 border-green-200 hover:bg-green-50"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
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
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
          Delete Forever
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently Delete Notification</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This notification will be permanently deleted from the system.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handlePermanentDelete}
            disabled={isLoading}
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
          // Filter active and trashed notifications
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
        // Filter active and trashed notifications
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Notification Center</h2>
          <p className="text-sm lg:text-base text-muted-foreground">
            Broadcast messages and manage notifications
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcast">
            <Plus className="h-4 w-4 mr-2" />
            Create Broadcast
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Users className="h-4 w-4 mr-2" />
            Manage Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Create New Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateNotificationForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {showTrash ? "Trash" : "Recent Broadcasts"}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTrash(!showTrash)}
                  className={showTrash ? "text-blue-600 border-blue-200 bg-blue-50" : "text-gray-600 border-gray-200"}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {showTrash ? "Show Active" : "Show Trash"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">{showTrash ? "Loading trash..." : "Loading notifications..."}</div>
                </div>
              )}
              
              {error && !loading && (
                <div className="text-red-600 bg-red-50 p-3 rounded mb-4">
                  Error: {error}
                </div>
              )}
              
              {!loading && !showTrash && !notifications.length && !error && (
                <div className="flex flex-col items-center justify-center py-8 lg:py-12">
                  <Bell className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mb-4" />
                  <h3 className="text-base lg:text-lg font-semibold mb-2">No broadcasts yet</h3>
                  <p className="text-sm lg:text-base text-muted-foreground text-center">
                    Create your first broadcast message to notify users
                  </p>
                </div>
              )}
              
              {!loading && showTrash && !trashedNotifications.length && !error && (
                <div className="flex flex-col items-center justify-center py-8 lg:py-12">
                  <Trash2 className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mb-4" />
                  <h3 className="text-base lg:text-lg font-semibold mb-2">Trash is empty</h3>
                  <p className="text-sm lg:text-base text-muted-foreground text-center">
                    Deleted notifications will appear here
                  </p>
                </div>
              )}
              
              {!loading && !showTrash && notifications.length > 0 && (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(notification.notification_type)}
                              <h3 className="font-semibold text-lg">{notification.title}</h3>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`${getPriorityColor(notification.priority)} text-white border-0`}
                            >
                              {notification.priority}
                            </Badge>
                            <Badge variant="secondary">
                              {notification.notification_type}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm line-clamp-3">
                            {notification.message}
                          </p>
                          
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
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
                              <Badge variant="outline">All Users</Badge>
                            )}
                            {notification.target_user_roles?.map((role: string) => (
                              <Badge key={role} variant="outline">Sent to: {role}</Badge>
                            ))}
                            {notification.target_school_levels?.map((level: string) => (
                              <Badge key={level} variant="outline">Sent to: {level}</Badge>
                            ))}
                            {notification.target_regions?.map((region: string) => (
                              <Badge key={region} variant="outline">Sent to: {region}</Badge>
                            ))}
                            {notification.target_user_ids?.length && (
                              <Badge variant="outline">
                                Sent to: {notification.target_user_ids.length} specific users
                              </Badge>
                            )}
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
              
              {!loading && showTrash && trashedNotifications.length > 0 && (
                <div className="space-y-4">
                  {trashedNotifications.map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(notification.notification_type)}
                              <h3 className="font-semibold text-lg text-gray-700">{notification.title}</h3>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`${getPriorityColor(notification.priority)} text-white border-0 opacity-75`}
                            >
                              {notification.priority}
                            </Badge>
                            <Badge variant="secondary" className="opacity-75">
                              {notification.notification_type}
                            </Badge>
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              Deleted {formatDistanceToNow(new Date(notification.updated_at || notification.created_at))} ago
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm line-clamp-3">
                            {notification.message}
                          </p>
                          
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
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
                              <Badge variant="outline" className="opacity-75">All Users</Badge>
                            )}
                            {notification.target_user_roles?.map((role: string) => (
                              <Badge key={role} variant="outline" className="opacity-75">Sent to: {role}</Badge>
                            ))}
                            {notification.target_school_levels?.map((level: string) => (
                              <Badge key={level} variant="outline" className="opacity-75">Sent to: {level}</Badge>
                            ))}
                            {notification.target_regions?.map((region: string) => (
                              <Badge key={region} variant="outline" className="opacity-75">Sent to: {region}</Badge>
                            ))}
                            {notification.target_user_ids?.length && (
                              <Badge variant="outline" className="opacity-75">
                                Sent to: {notification.target_user_ids.length} specific users
                              </Badge>
                            )}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
