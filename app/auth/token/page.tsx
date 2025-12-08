"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Shield } from "lucide-react"
import { authenticateWithToken, verifyAccessToken } from "@/app/actions/admin-access-tokens"
import { toast } from "sonner"

export default function TokenAuthPage() {
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

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Verifying Token</span>
            </CardTitle>
            <CardDescription>
              Please wait while we verify your access token...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!token || tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2 text-red-600">
              <XCircle className="h-6 w-6" />
              <span>Invalid Token</span>
            </CardTitle>
            <CardDescription>
              The access token is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={handleGoBack} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <span>Token Verified</span>
          </CardTitle>
          <CardDescription>
            Ready to authenticate as the selected user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Info */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Admin Access Mode</span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User:</span>
                <span className="font-medium">
                  {userInfo?.name || 'Unknown User'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{userInfo?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium capitalize">
                  {userInfo?.roleName || userInfo?.role || 'Unknown Role'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You are about to authenticate as this user with full account access. 
              This session will expire in 30 minutes.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleGoBack}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAuthenticate}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                "Authenticate"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}