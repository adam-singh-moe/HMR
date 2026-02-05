"use client"

import { useTransition } from "react"
import { LogOut, Loader2 } from "lucide-react"
import { signOut } from "@/app/actions/auth"

interface SignOutButtonProps {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <div className="px-2 2xl:px-3 py-1.5 2xl:py-2 border-t border-slate-200/80 dark:border-slate-700/50 flex-shrink-0">
      <button
        onClick={handleSignOut}
        disabled={isPending}
        className="w-full flex items-center gap-2 2xl:gap-3 px-2 2xl:px-3 py-1.5 2xl:py-2.5 rounded-lg 2xl:rounded-xl transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 group"
      >
        <div className="w-6 h-6 2xl:w-8 2xl:h-8 rounded-md 2xl:rounded-lg flex items-center justify-center transition-all bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50">
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 animate-spin text-red-500" />
          ) : (
            <LogOut className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-red-500" />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[10px] 2xl:text-[13px] font-semibold truncate text-red-600 dark:text-red-400">
            {isPending ? "Signing out..." : "Sign Out"}
          </p>
          <p className="hidden 2xl:block text-[11px] truncate text-red-500/70 dark:text-red-500/70">
            End your session
          </p>
        </div>
      </button>
    </div>
  )
}
