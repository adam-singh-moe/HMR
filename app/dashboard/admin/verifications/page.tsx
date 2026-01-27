import { Button } from "@/components/ui/button"
import { getPendingVerifications, verifyUserAction, rejectUserAction } from "@/app/actions/admin"
import { getUserDetails } from "@/app/actions/users"
import { UserCheck, UserX, Mail, Calendar, AlertCircle, ShieldCheck, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function VerificationsPage() {
  const { verifications: pendingVerifications, error } = await getPendingVerifications()
  const { user: currentUser } = await getUserDetails()

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          User Verifications
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {pendingVerifications.length} Education Officials awaiting verification
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-800 dark:text-red-300 text-sm lg:text-base">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingVerifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 lg:py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <UserCheck className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No pending verifications</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
              All Education Officials have been verified. New requests will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingVerifications.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 shadow-sm overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 lg:p-6 border-b border-amber-200 dark:border-amber-700/30">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-800 dark:text-white">{user.name}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs lg:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Requested {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700/50">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 lg:p-6 bg-white/50 dark:bg-slate-900/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <form action={async (formData) => { "use server"; await verifyUserAction(formData) }} className="w-full sm:w-auto">
                    <input type="hidden" name="userId" value={user.id} />
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Verify User</span>
                      <span className="sm:hidden">Verify</span>
                    </Button>
                  </form>
                  <form action={async (formData) => { "use server"; await rejectUserAction(formData) }} className="w-full sm:w-auto">
                    <input type="hidden" name="userId" value={user.id} />
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/25"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </form>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                  Verifying this user will allow them to access their Education Official dashboard. Rejecting will
                  permanently delete their account.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
