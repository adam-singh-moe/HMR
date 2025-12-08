import { Suspense } from 'react'
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import TokenContent from './TokenContent'

export default function TokenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading</span>
            </CardTitle>
            <CardDescription>
              Please wait while we load the token verification...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <TokenContent />
    </Suspense>
  )
}