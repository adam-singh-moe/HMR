import { loginWithAccessToken } from '@/app/actions/access-tokens'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyIcon } from 'lucide-react'
import { Suspense } from 'react'

interface AccessTokenPageProps {
  searchParams: Promise<{
    token?: string
    error?: string
  }>
}

function AccessTokenForm({ token, error }: { token?: string; error?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <KeyIcon className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Admin Access Token Login</CardTitle>
          <CardDescription>
            Enter the access token provided by an administrator to access the user account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
            </div>
          )}
          
          <form action={loginWithAccessToken} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <Input
                id="token"
                name="token"
                type="text"
                defaultValue={token || ''}
                placeholder="Enter your access token"
                className="font-mono"
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              Access Account
            </Button>
          </form>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Access tokens are single-use and expire after 24 hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AccessTokenPage({ searchParams }: AccessTokenPageProps) {
  const { token, error } = await searchParams

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccessTokenForm token={token} error={error} />
    </Suspense>
  )
}