import { Suspense } from 'react'
import { Loader2 } from "lucide-react"
import TokenContent from './TokenContent'

export default function TokenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[hsl(222,47%,6%)]">
        <div className="w-full max-w-md px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Loading</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Please wait while we load the token verification...
            </p>
          </div>
        </div>
      </div>
    }>
      <TokenContent />
    </Suspense>
  )
}
