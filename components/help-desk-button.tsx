"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { HelpCircle, ExternalLink, X } from "lucide-react"
import Link from "next/link"

interface HelpDeskButtonProps {
  userRole?: string
}

export function HelpDeskButton({ userRole }: HelpDeskButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show for head teachers
  if (userRole !== "Head Teacher") {
    return null
  }

  const helpDeskUrl = "https://education.gov.gy/helpdesk/index.php?a=add&catid=50"

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded state */}
      {isExpanded && (
        <div className="mb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-80 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Need Help?</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Get support with the Monthly Reporting System from the Ministry of Education help desk.
          </p>
          
          <Link 
            href={helpDeskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
              <HelpCircle className="h-4 w-4 mr-2" />
              Open Help Desk
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-3 text-center">
            Opens in a new window
          </p>
        </div>
      )}

      {/* Floating button - hidden when expanded */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          size="lg"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
