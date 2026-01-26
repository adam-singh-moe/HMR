"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Shield, User, Mail, Briefcase, Clock, AlertTriangle, ArrowLeft, LogIn } from "lucide-react"
import { authenticateWithToken, verifyAccessToken } from "@/app/actions/admin-access-tokens"
import { toast } from "sonner"

export default function TokenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError("No token provided")
      setVerifying(false)
      return
    }

    verifyToken()
  }, [token])

  const verifyToken = async () => {
    if (!token) return

    try {
      const result = await verifyAccessToken(token)

      if (result.valid && result.user) {
        setTokenValid(true)
        setUserInfo(result.user)
        setError(null)
      } else {
        setTokenValid(false)
        setError(result.error || "Invalid token")
      }
    } catch (err) {
      console.error('Token verification error:', err)
      setTokenValid(false)
      setError("Failed to verify token")
    } finally {
      setVerifying(false)
    }
  }

  const handleAuthenticate = async () => {
    if (!token) return

    setLoading(true)
    try {
      const result = await authenticateWithToken(token)

      if (result.success) {
        toast.success(`Successfully authenticated as ${userInfo?.email}`)

        // Redirect to appropriate dashboard
        if (result.redirectUrl) {
          router.push(result.redirectUrl)
        } else {
          router.push('/dashboard')
        }
      } else {
        toast.error(result.error || "Authentication failed")
        setError(result.error || "Authentication failed")
      }
    } catch (err) {
      console.error('Authentication error:', err)
      toast.error("Authentication failed")
      setError("Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    router.push('/auth')
  }

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="w-full max-w-md px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Verifying Token</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Please wait while we verify your access token...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="w-full max-w-md px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Invalid Token</h2>
              <p className="text-slate-500 dark:text-slate-400">
                The access token is invalid or has expired
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Back Button */}
            <Button
              onClick={handleGoBack}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Valid token state
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
      <div className="w-full max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Token Verified</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Ready to authenticate as the selected user
            </p>
          </div>

          {/* User Info Card */}
          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-slate-800 dark:text-white">Admin Access Mode</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <User className="h-4 w-4" />
                  <span className="text-sm">User</span>
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-white">
                  {userInfo?.name || 'Unknown User'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-white">
                  {userInfo?.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm">Role</span>
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-white capitalize">
                  {userInfo?.roleName || userInfo?.role || 'Unknown Role'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Admin Access Warning</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You are about to authenticate as this user with full account access. This session will expire in 30 minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleGoBack}
              disabled={loading}
              className="flex-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAuthenticate}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Authenticate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
