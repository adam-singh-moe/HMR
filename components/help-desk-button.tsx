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
        <div className="mb-4 bg-white rounded-lg shadow-lg border p-4 w-80 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Need Help?</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Get support with the Monthly Reporting System from the Ministry of Education help desk.
          </p>
          
          <Link 
            href={helpDeskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <HelpCircle className="h-4 w-4 mr-2" />
              Open Help Desk
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
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
