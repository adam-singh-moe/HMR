import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPendingVerifications, verifyUserAction, rejectUserAction } from "@/app/actions/admin"
import { getUserDetails } from "@/app/actions/users"
import { UserCheck, UserX, Mail, Calendar, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function VerificationsPage() {
  const { verifications: pendingVerifications, error } = await getPendingVerifications()
  const { user: currentUser } = await getUserDetails()

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold">User Verifications</h2>
        <p className="text-sm lg:text-base text-muted-foreground">
          {pendingVerifications.length} Education Officials awaiting verification
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm lg:text-base">{error}</p>
          </CardContent>
        </Card>
      )}

      {pendingVerifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 lg:py-12">
            <UserCheck className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base lg:text-lg font-semibold mb-2">No pending verifications</h3>
            <p className="text-sm lg:text-base text-muted-foreground text-center">
              All Education Officials have been verified. New requests will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 lg:space-y-4">
          {pendingVerifications.map((user) => (
            <Card key={user.id} className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3 lg:pb-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-full bg-orange-100 text-orange-600 flex-shrink-0">
                      <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base lg:text-lg">{user.name}</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs lg:text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                          <span>Requested {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs lg:text-sm flex-shrink-0">
                    {user.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <form action={verifyUserAction} className="w-full sm:w-auto">
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                      <UserCheck className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Verify User</span>
                      <span className="sm:hidden">Verify</span>
                    </Button>
                  </form>
                  <form action={rejectUserAction} className="w-full sm:w-auto">
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" variant="destructive" size="sm" className="w-full sm:w-auto">
                      <UserX className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </form>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  Verifying this user will allow them to access their Education Official dashboard. Rejecting will
                  permanently delete their account.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
