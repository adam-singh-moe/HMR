'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Key, ExternalLink, Eye, EyeOff, AlertTriangle, Shield, Clock, Lock, CheckCircle2 } from 'lucide-react'
import { generateUserAccessToken } from '@/app/actions/admin-access-tokens'
import { toast } from 'sonner'

interface GenerateAccessTokenDialogProps {
  userId: string
  userName: string
  userEmail: string
}

export function GenerateAccessTokenDialog({ userId, userName, userEmail }: GenerateAccessTokenDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [tokenData, setTokenData] = useState<{
    token: string
    expiresAt: string
    accessUrl: string
  } | null>(null)

  // Get current admin user ID from your auth context
  // For now using a placeholder - you should implement proper admin user context
  const adminId = "admin-placeholder-id"

  const handleGenerateToken = async () => {
    setLoading(true)
    console.log('Generating token for user:', userId)

    try {
      const result = await generateUserAccessToken(userId, adminId)
      console.log('Token generation result:', result)

      if (result.token && result.expiresAt) {
        const accessUrl = `${window.location.origin}/auth/token?token=${encodeURIComponent(result.token)}`

        const newTokenData = {
          token: result.token,
          expiresAt: result.expiresAt,
          accessUrl
        }

        console.log('Setting token data:', newTokenData)
        setTokenData(newTokenData)

        toast.success(`Access token generated for ${userName}. Valid for 30 minutes.`)
      } else {
        console.error('Token generation failed:', result.error)
        toast.error(result.error || "Failed to generate access token.")
      }
    } catch (error) {
      console.error('Error generating token:', error)
      toast.error("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard.`)
    } catch (error) {
      toast.error("Failed to copy to clipboard.")
    }
  }

  const openInNewTab = () => {
    if (tokenData?.accessUrl) {
      window.open(tokenData.accessUrl, '_blank')
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTokenData(null)
    setShowToken(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
          className="flex items-center"
        >
          <Key className="h-4 w-4 mr-2" />
          Generate Access Token
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Key className="h-4 w-4 text-white" />
            </div>
            Generate Access Token
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Create a secure access token to login as <span className="font-medium text-slate-700 dark:text-slate-300">{userName}</span> ({userEmail}).
            This token will be valid for 30 minutes.
          </DialogDescription>
        </DialogHeader>

        {!tokenData ? (
          <div className="space-y-4">
            {/* Security Warning */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Security Warning</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Full access to the user's account</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Token expires in 30 minutes</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Handle with care and share securely</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateToken}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Generate Token
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success indicator */}
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Token generated successfully!</span>
            </div>

            {/* Token field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="token" className="text-slate-700 dark:text-slate-300">Access Token</Label>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                    className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(tokenData.token, "Token")}
                    className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Textarea
                id="token"
                value={showToken ? tokenData.token : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                readOnly
                className="font-mono text-xs min-h-[80px] resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* URL field */}
            <div className="space-y-2">
              <Label htmlFor="accessUrl" className="text-slate-700 dark:text-slate-300">Authentication URL</Label>
              <div className="flex gap-2">
                <Input
                  id="accessUrl"
                  value={tokenData.accessUrl}
                  readOnly
                  className="text-xs font-mono bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(tokenData.accessUrl, "URL")}
                  className="h-9 w-9 p-0 flex-shrink-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInNewTab}
                  title="Open in new tab"
                  className="h-9 w-9 p-0 flex-shrink-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Expiry warning */}
            <div className="rounded-xl border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-700 dark:text-red-300">
                    <span className="font-medium">Expires:</span> {new Date(tokenData.expiresAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-red-600 dark:text-red-400 font-medium">
                    Save this token securely. It cannot be retrieved again.
                  </p>
                </div>
              </div>
            </div>

            {/* Done button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
