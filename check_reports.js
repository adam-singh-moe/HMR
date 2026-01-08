
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReports() {
  const { data, error } = await supabase
    .from('hmr_school_assessment_reports')
    .select('id, status, sms_schools(id, name, region_id)')
    .limit(10);
    
  if (error) {
    console.error('Error fetching reports:', error);
  } else {
    console.log('Sample reports from database:');
    data.forEach(r => {
      console.log(`Report ID: ${r.id}, Status: ${r.status}, School: ${r.sms_schools?.name}, Region ID: ${r.sms_schools?.region_id}`);
    });
  }
}

checkReports();
