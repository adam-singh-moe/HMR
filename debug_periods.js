const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xgzjdebqdsvllrbccsrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0'
)

async function debug() {
  const { data: periods, error: pError } = await supabase
    .from('hmr_school_assessment_periods')
    .select('*')
  
  console.log('Periods Error:', pError)
  console.log('Periods Count:', periods?.length)
  console.table(periods)

  const { data: reports } = await supabase
    .from('hmr_school_assessment_reports')
    .select('id, period_id, status')
  
  console.log('Reports with Period ID:', reports.map(r => ({ id: r.id, period_id: r.period_id, status: r.status })))
}

debug()
