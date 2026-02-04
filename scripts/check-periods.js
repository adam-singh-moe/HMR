
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xgzjdebqdsvllrbccsrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPeriods() {
  const { data, error } = await supabase
    .from('hmr_school_assessment_periods')
    .select('*')
    .order('academic_year', { ascending: false })
    .order('sequence_order', { ascending: true });

  if (error) {
    console.error('Error fetching periods:', error);
    return;
  }

  console.log('Assessment Periods:');
  console.table(data.map(p => ({
    id: p.id,
    year: p.academic_year,
    term: p.term_name,
    active: p.is_active,
    start: p.start_date,
    end: p.end_date
  })));
}

checkPeriods();
