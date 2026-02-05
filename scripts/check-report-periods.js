
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xgzjdebqdsvllrbccsrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReportPeriods() {
  const { data, error } = await supabase
    .from('hmr_school_assessment_reports')
    .select('id, academic_year, term_name, period_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Reports Period Data:');
  console.table(data);
}

checkReportPeriods();
