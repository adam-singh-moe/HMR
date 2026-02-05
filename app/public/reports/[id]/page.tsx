import { getPublicReportDetails } from "@/app/actions/public-reports"
import { PublicReportView } from "@/features/school-assessment-reports/components/public-report-view"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function PublicReportPage(props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params
    console.log("Fetching public report for ID:", id);
    const result = await getPublicReportDetails(id)

    if (!result || !result.report) {
      console.log("Report not found for ID:", id);
      notFound()
    }
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Simple Header */}
        <div className="border-b bg-white dark:bg-slate-900 px-4 py-4 md:px-8 shadow-sm">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
              <span className="text-blue-600">MOE</span>
              <span className="text-slate-700 dark:text-slate-300">Public Reports</span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
  
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <div className="mb-6">
             <Link href="/" className="text-sm text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 mb-4 w-fit">
               <ArrowLeft className="h-3.5 w-3.5" /> Back to top schools
             </Link>
          </div>
          
          <PublicReportView 
            report={result.report}
            schoolTrends={result.schoolTrends}
          />
        </main>
      </div>
    )
  } catch (error) {
    console.error("Error in PublicReportPage:", error);
    return (
       <div className="p-10 text-center">
         <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
         <p className="text-slate-600">We couldn't load this report. Please try again later.</p>
         <pre className="mt-4 p-4 bg-slate-100 rounded text-left text-xs overflow-auto max-w-2xl mx-auto">
           {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
         </pre>
       </div>
    )
  }
}
