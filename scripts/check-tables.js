
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xgzjdebqdsvllrbccsrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase
    .rpc('list_tables_debug_helper') // This likely doesn't exist
    .select('*'); 

  // Since I can't query information_schema directly with supabase-js easily unless exposed,
  // I will try to select from 'school_assessment_periods' and 'hmr_school_assessment_periods' and see which one exists.
  
  console.log("Checking 'hmr_school_assessment_periods'...");
  const { error: error1 } = await supabase.from('hmr_school_assessment_periods').select('count', { count: 'exact', head: true });
  console.log(error1 ? "Error (likely table missing): " + error1.message : "Exists.");

  console.log("Checking 'school_assessment_periods'...");
  const { error: error2 } = await supabase.from('school_assessment_periods').select('count', { count: 'exact', head: true });
  console.log(error2 ? "Error (likely table missing): " + error2.message : "Exists.");
}

listTables();
