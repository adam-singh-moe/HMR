"use client"

import { Button } from "@/components/ui/button"
import { Lightbulb, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getPendingFeatureRequestsCount } from "@/app/actions/feature-requests"

export function FeatureRequestButton() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await getPendingFeatureRequestsCount()
      setCount(count)
    }
    
    fetchCount()
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="relative h-9 w-9 rounded-full p-0 hover:bg-orange-50"
      title="Feature Requests"
    >
      <Link href="/dashboard/feature-requests" className="flex items-center justify-center">
        <div className="relative">
          <Lightbulb className="h-5 w-5 text-orange-500" />
          <Plus className="absolute -top-1 -right-1 h-3 w-3 text-orange-500 bg-white rounded-full" />
          {count > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
      </Link>
    </Button>
  )
}
