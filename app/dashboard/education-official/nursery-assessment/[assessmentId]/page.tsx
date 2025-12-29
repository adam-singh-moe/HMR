import { getNurseryAssessmentDetails } from "@/app/actions/nursery-assessment"
import { NurseryAssessmentDetailView } from "@/components/nursery-assessment-detail-view"
import { redirect } from "next/navigation"

interface NurseryAssessmentDetailPageProps {
  params: Promise<{
    assessmentId: string
  }>
}

export default async function NurseryAssessmentDetailPage({ 
  params 
}: NurseryAssessmentDetailPageProps) {
  const { assessmentId } = await params
  const { assessment, responses, error } = await getNurseryAssessmentDetails(assessmentId)

  if (error || !assessment) {
    redirect('/dashboard/education-official/nursery-assessment')
  }

  return (
    <div className="space-y-6">
      <NurseryAssessmentDetailView assessmentId={assessmentId} />
    </div>
  )
}
