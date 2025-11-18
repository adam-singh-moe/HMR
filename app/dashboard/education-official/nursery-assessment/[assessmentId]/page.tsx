import { getNurseryAssessmentDetails } from "@/app/actions/nursery-assessment"
import { NurseryAssessmentDetailView } from "@/components/nursery-assessment-detail-view"
import { redirect } from "next/navigation"

interface NurseryAssessmentDetailPageProps {
  params: {
    assessmentId: string
  }
}

export default async function NurseryAssessmentDetailPage({ 
  params 
}: NurseryAssessmentDetailPageProps) {
  const { assessment, responses, error } = await getNurseryAssessmentDetails(params.assessmentId)

  if (error || !assessment) {
    redirect('/dashboard/education-official/nursery-assessment')
  }

  return (
    <div className="space-y-6">
      <NurseryAssessmentDetailView assessmentId={params.assessmentId} />
    </div>
  )
}
