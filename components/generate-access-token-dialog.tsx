"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Button
} from "@/components/ui/button"
import {
  Input
} from "@/components/ui/input"
import {
  Label
} from "@/components/ui/label"
import {
  Textarea
} from "@/components/ui/textarea"
import { Copy, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { generateUserAccessToken } from "@/app/actions/admin-access-tokens"
import { toast } from "sonner"

interface GenerateAccessTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
  }
  adminId: string
}

export function GenerateAccessTokenDialog({
  open,
  onOpenChange,
  user,
  adminId
}: GenerateAccessTokenDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  const handleGenerateToken = async () => {
    setIsGenerating(true)
    try {
      const result = await generateUserAccessToken(user.id, adminId)
      
      if (result.error) {
        toast.error(result.error)
      } else if (result.token) {
        setToken(result.token)
        setExpiresAt(result.expiresAt)
        setShowToken(false)
        toast.success("Access token generated successfully")
      }
    } catch (err) {
      console.error('Error generating token:', err)
      toast.error("Failed to generate access token")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyToken = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token)
        toast.success("Token copied to clipboard")
      } catch (err) {
        toast.error("Failed to copy token")
      }
    }
  }

  const handleCopyAuthUrl = async () => {
    if (token) {
      const authUrl = `${window.location.origin}/auth/token?token=${encodeURIComponent(token)}`
      try {
        await navigator.clipboard.writeText(authUrl)
        toast.success("Authentication URL copied to clipboard")
      } catch (err) {
        toast.error("Failed to copy URL")
      }
    }
  }

  const handleClose = () => {
    setToken(null)
    setExpiresAt(null)
    setShowToken(false)
    onOpenChange(false)
  }

  const formatExpirationTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Access Token</DialogTitle>
          <DialogDescription>
            Generate a temporary access token to authenticate as {userName} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm font-medium">User:</Label>
              <span className="text-sm">{userName}</span>
            </div>
            <div className="flex justify-between">
              <Label className="text-sm font-medium">Email:</Label>
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <Label className="text-sm font-medium">Role:</Label>
              <span className="text-sm capitalize">{user.role.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Security Warning</p>
              <p>This token will expire in 30 minutes and allows full access to the user's account. Handle with care.</p>
            </div>
          </div>

          {/* Generate Token Button */}
          {!token && (
            <Button 
              onClick={handleGenerateToken}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? "Generating..." : "Generate Access Token"}
            </Button>
          )}

          {/* Token Display */}
          {token && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="token">Access Token</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToken}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="token"
                  value={showToken ? token : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                  readOnly
                  className="font-mono text-xs min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-url">Authentication URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="auth-url"
                    value={`${window.location.origin}/auth/token?token=${encodeURIComponent(token)}`}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAuthUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-red-800">Expires:</Label>
                    <span className="text-sm text-red-700">
                      {formatExpirationTime(expiresAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}