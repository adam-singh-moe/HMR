import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/actions/notifications"
import { Bell, Check, CheckCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface NotificationsPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const { page: pageParam } = await searchParams
  const page = Number.parseInt(pageParam || "1")
  const { notifications, total } = await getNotifications(page, 20)
  const totalPages = Math.ceil(total / 20)
  const currentPage = page

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Notifications</h2>
          <p className="text-sm lg:text-base text-muted-foreground">
            {total} total, {unreadCount} unread
          </p>
        </div>

        {unreadCount > 0 && (
          <form action={markAllNotificationsAsRead}>
            <Button type="submit" variant="outline" size="sm" className="w-full sm:w-auto">
              <CheckCheck className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Mark All Read</span>
              <span className="sm:hidden">Mark Read</span>
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 lg:py-12">
            <Bell className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base lg:text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-sm lg:text-base text-muted-foreground text-center">
              You're all caught up! New notifications will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className={`${!notification.read ? "border-blue-200 bg-blue-50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-full flex-shrink-0 ${
                        notification.type === "user_verification_request"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Bell className="h-3 w-3 lg:h-4 lg:w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <CardTitle className="text-sm lg:text-base truncate">{notification.title}</CardTitle>
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.read && (
                      <form action={markNotificationAsRead.bind(null, notification.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          <Check className="h-3 w-3 lg:h-4 lg:w-4" />
                          <span className="sr-only">Mark as read</span>
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs lg:text-sm leading-relaxed">{notification.message}</p>

                {notification.type === "user_verification_request" && notification.data && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">User Details:</div>
                    <div className="text-xs lg:text-sm">
                      <strong>{notification.data.user_name}</strong> ({notification.data.user_email})
                    </div>
                    <div className="text-xs text-muted-foreground">Role: {notification.data.role}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 lg:gap-2 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Button key={pageNum} variant={pageNum === currentPage ? "default" : "outline"} size="sm" asChild>
              <a href={`/dashboard/admin/notifications?page=${pageNum}`}>{pageNum}</a>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
