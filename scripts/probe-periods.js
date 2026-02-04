
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xgzjdebqdsvllrbccsrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probePeriods() {
  const attempts = [
    { term: 'September-December', seq: 1 },
    { term: 'September–December', seq: 1 }, // En dash
    { term: 'September - December', seq: 1 }, // Spaces
    { term: 'First Term', seq: 1 }
  ];

  console.log("Probing...");

  for (const attempt of attempts) {
    console.log(`\nTrying: "${attempt.term}" (Seq: ${attempt.seq})...`);
    
    // Use random academic year
    const year = '2090-2091'; 

    const { data, error } = await supabase
      .from('hmr_school_assessment_periods')
      .insert({
        academic_year: year,
        term_name: attempt.term,
        sequence_order: attempt.seq,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        is_active: false
      })
      .select();

    if (error) {
      console.log(`FAILED. Error Message:`);
      console.log(error.message);
      // Try to print first 100 chars of details if exists
      if (error.details) console.log(`Details: ${error.details.substring(0, 100)}...`);
    } else {
      console.log(`SUCCESS! "${attempt.term}" is valid!`);
      // Clean up
      await supabase.from('hmr_school_assessment_periods').delete().eq('academic_year', year);
      break; 
    }
  }
}

probePeriods();
