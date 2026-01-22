"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getUserNotifications } from "@/app/actions/notifications"
import { formatDistanceToNow } from "date-fns"

type Notification = {
  id: string
  title: string
  message: string
  priority: string
  notification_type: string
  created_at: string
  expires_at?: string | null
  hmr_users?: {
    id: string
    name: string
    email: string
  } | {
    id: string
    name: string
    email: string
  }[]
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastReadTime, setLastReadTime] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      const result = await getUserNotifications(1, 10) // Get first 10 notifications

      if (!result.error) {
        const newNotifications = result.notifications || []
        setNotifications(newNotifications)
        
        // Calculate unread count based on last read time
        const lastRead = lastReadTime || localStorage.getItem('notifications_last_read')
        if (lastRead) {
          const unreadNotifications = newNotifications.filter(
            notification => new Date(notification.created_at) > new Date(lastRead)
          )
          setUnreadCount(unreadNotifications.length)
        } else {
          // If no last read time, all are considered unread
          setUnreadCount(newNotifications.length)
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = () => {
    const now = new Date().toISOString()
    setLastReadTime(now)
    localStorage.setItem('notifications_last_read', now)
    setUnreadCount(0)
  }

  const handleDropdownOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && unreadCount > 0) {
      // Mark as read when dropdown is opened
      markAsRead()
    }
  }

  const openNotificationModal = (notification: Notification) => {
    setSelectedNotification(notification)
    setIsModalOpen(true)
    setIsOpen(false) // Close the dropdown
  }

  useEffect(() => {
    // Initialize last read time from localStorage
    const storedLastRead = localStorage.getItem('notifications_last_read')
    if (storedLastRead) {
      setLastReadTime(storedLastRead)
    }
    
    fetchNotifications()
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "announcement":
        return "Announcement"
      case "deadline":
        return "Deadline"
      case "alert":
        return "Alert"
      case "update":
        return "Update"
      default:
        return "General"
    }
  }

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          border: "border-l-red-500",
          bg: "bg-red-50 dark:bg-red-900/30",
          text: "text-red-700 dark:text-red-400",
          badge: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
        }
      case "high":
        return {
          border: "border-l-orange-500", 
          bg: "bg-orange-50 dark:bg-orange-900/30",
          text: "text-orange-700 dark:text-orange-400",
          badge: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300"
        }
      case "normal":
        return {
          border: "border-l-blue-500",
          bg: "bg-blue-50 dark:bg-blue-900/30", 
          text: "text-blue-700 dark:text-blue-400",
          badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
        }
      case "low":
        return {
          border: "border-l-slate-500",
          bg: "bg-slate-50 dark:bg-slate-800/50",
          text: "text-slate-700 dark:text-slate-400", 
          badge: "bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300"
        }
      default:
        return {
          border: "border-l-slate-500",
          bg: "bg-slate-50 dark:bg-slate-800/50",
          text: "text-slate-700 dark:text-slate-400",
          badge: "bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300"
        }
    }
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={handleDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all duration-300 border border-slate-200 dark:border-slate-600/50 shadow-sm dark:shadow-slate-900/20"
        >
          <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 md:w-96 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {notifications.length} total
              </Badge>
            </div>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((notification) => {
                const priorityColors = getPriorityColors(notification.priority)
                return (
                  <div
                    key={notification.id}
                    onClick={() => openNotificationModal(notification)}
                    className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 cursor-pointer transition-colors ${priorityColors.border} ${priorityColors.bg}`}
                  >
                    <div className="space-y-2">
                      {/* Type and Priority on same line, better spaced */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${priorityColors.badge}`}
                        >
                          {getTypeDisplay(notification.notification_type)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${priorityColors.text} border-current`}
                        >
                          {notification.priority.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {/* Title */}
                      <h4 className={`font-semibold text-sm ${priorityColors.text} line-clamp-1`}>
                        {notification.title}
                      </h4>
                      
                      {/* Message body - truncated with click to expand hint */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                        Click to read full message
                      </p>
                      
                      {/* Footer with time and creator */}
                      <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        <span>
                          Sent by: {
                            Array.isArray(notification.hmr_users) 
                              ? notification.hmr_users[0]?.name || 'System Administrator'
                              : notification.hmr_users?.name || 'System Administrator'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

      {/* Notification Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-6 pb-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader className="pr-8 space-y-3">
            {selectedNotification && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getPriorityColors(selectedNotification.priority).badge}`}
                  >
                    {getTypeDisplay(selectedNotification.notification_type)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPriorityColors(selectedNotification.priority).text} border-current`}
                  >
                    {selectedNotification.priority.toUpperCase()}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-semibold pr-4 leading-relaxed text-slate-900 dark:text-white">
                  {selectedNotification.title}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-6 mt-4">
                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedNotification.message}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {formatDistanceToNow(new Date(selectedNotification.created_at), { addSuffix: true })}
                      </span>
                      <span>
                        Sent by: {
                          Array.isArray(selectedNotification.hmr_users) 
                            ? (selectedNotification.hmr_users as any)[0]?.name || 'System Administrator'
                            : (selectedNotification.hmr_users as any)?.name || 'System Administrator'
                        }
                      </span>
                    </div>
                  </div>
                </DialogDescription>
              </>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}