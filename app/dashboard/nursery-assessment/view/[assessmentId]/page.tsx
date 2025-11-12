import { NurseryAssessmentDetailView } from "@/components/nursery-assessment-detail-view"

interface PageProps {
  params: Promise<{
    assessmentId: string
  }>
}

export default async function NurseryAssessmentViewPage({ params }: PageProps) {
  const { assessmentId } = await params
  return <NurseryAssessmentDetailView assessmentId={assessmentId} />
}