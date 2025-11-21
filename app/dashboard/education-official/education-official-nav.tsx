'use client';

import { Button } from "@/components/ui/button"
import { BarChart3, FileText, School, Activity, Brain, BookOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function EducationOfficialNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center px-2">
      <div className="flex flex-wrap gap-1 sm:gap-2 p-1 bg-white rounded-lg w-fit shadow-sm border max-w-full overflow-x-auto">
        <Button asChild variant="ghost" className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${pathname === '/dashboard/education-official' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} size="sm">
          <Link href="/dashboard/education-official">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Dashboard Overview</span>
            <span className="xs:hidden sm:hidden">Dash</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${pathname === '/dashboard/education-official/schools' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} size="sm">
          <Link href="/dashboard/education-official/schools">
            <School className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Schools Overview</span>
            <span className="xs:hidden sm:hidden">Sch</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${pathname === '/dashboard/education-official/reports' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} size="sm">
          <Link href="/dashboard/education-official/reports">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Monthly Reports</span>
            <span className="xs:hidden sm:hidden">Rep</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${pathname === '/dashboard/education-official/nursery-assessment' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} size="sm">
          <Link href="/dashboard/education-official/nursery-assessment">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Nursery Assessment</span>
            <span className="xs:hidden sm:hidden">NA</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${pathname === '/dashboard/education-official/physical-education-reports' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} size="sm">
          <Link href="/dashboard/education-official/physical-education-reports">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">PE Reports</span>
            <span className="xs:hidden sm:hidden">PE</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${pathname === '/dashboard/education-official/ai-reports' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} size="sm">
          <Link href="/dashboard/education-official/ai-reports">
            <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">AI Insights</span>
            <span className="xs:hidden sm:hidden">AI</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
