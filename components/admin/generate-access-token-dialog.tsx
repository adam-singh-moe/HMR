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
import { Copy, Key, ExternalLink, Eye, EyeOff, AlertTriangle } from 'lucide-react'
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Access Token</DialogTitle>
          <DialogDescription>
            Create a secure access token to login as {userName} ({userEmail}). 
            This token will be valid for 30 minutes and provides full account access.
          </DialogDescription>
        </DialogHeader>
        
        {!tokenData ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Security Warning</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• This token grants full access to the user's account</li>
                    <li>• Token expires in 30 minutes</li>
                    <li>• Handle with care and share securely</li>
                    <li>• Token cannot be revoked once generated</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerateToken} disabled={loading}>
                {loading ? "Generating..." : "Generate Token"}
              </Button>
            </div>
          </div>
        ) : (
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
                    onClick={() => copyToClipboard(tokenData.token, "Token")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                id="token"
                value={showToken ? tokenData.token : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                readOnly
                className="font-mono text-xs min-h-[100px] resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessUrl">Authentication URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="accessUrl"
                  value={tokenData.accessUrl}
                  readOnly
                  className="text-sm font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(tokenData.accessUrl, "URL")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInNewTab}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                <p><strong>Expires:</strong> {new Date(tokenData.expiresAt).toLocaleString()}</p>
                <p className="mt-1 font-medium">
                  ⚠️ Save this token securely. It cannot be retrieved again.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}