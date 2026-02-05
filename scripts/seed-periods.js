
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xgzjdebqdsvllrbccsrj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPeriods() {
  console.log('Starting period seed...');

  // Map "App Term Name" to "DB Term Name"
  const termMapping = {
    'First Term': 'September-December',
    'Second Term': 'January-March',
    'Third Term': 'April-July'
  };

  const periods = [
    {
      academic_year: '2025-2026',
      term_name: 'First Term', // Used for report lookup
      db_term_name: 'September-December', // Used for period insertion
      sequence_order: 1,
      start_date: '2025-09-01T00:00:00Z',
      end_date: '2025-12-15T23:59:59Z',
      is_active: false
    },
    {
      academic_year: '2025-2026',
      term_name: 'Second Term',
      db_term_name: 'January-March',
      sequence_order: 2,
      start_date: '2026-01-05T00:00:00Z',
      end_date: '2026-04-10T23:59:59Z',
      is_active: true // Currently active
    },
    {
      academic_year: '2025-2026',
      term_name: 'Third Term',
      db_term_name: 'April-July',
      sequence_order: 3,
      start_date: '2026-04-20T00:00:00Z',
      end_date: '2026-07-10T23:59:59Z',
      is_active: false
    }
  ];

  for (const p of periods) {
    // Check if exists
    const { data: existing } = await supabase
      .from('hmr_school_assessment_periods')
      .select('id')
      .eq('academic_year', p.academic_year)
      .eq('term_name', p.db_term_name)
      .maybeSingle();

    let periodId = existing?.id;

    if (!periodId) {
      console.log(`Creating period: ${p.academic_year} ${p.db_term_name}`);
      const { data: created, error } = await supabase
        .from('hmr_school_assessment_periods')
        .insert({
          academic_year: p.academic_year,
          term_name: p.db_term_name,
          sequence_order: p.sequence_order,
          start_date: p.start_date,
          end_date: p.end_date,
          is_active: p.is_active
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating period:', error);
        continue;
      }
      periodId = created.id;
    } else {
      console.log(`Period exists: ${p.academic_year} ${p.db_term_name} (${periodId})`);
    }

    // Link reports (Reports use 'First Term' etc.)
    console.log(`Linking reports for ${p.term_name} -> Period ${periodId}`);
    const { error: updateError } = await supabase
      .from('hmr_school_assessment_reports')
      .update({ period_id: periodId })
      .eq('academic_year', p.academic_year)
      .eq('term_name', p.term_name);

    if (updateError) {
      console.error('Error updating reports:', updateError);
    } else {
      console.log('Reports updated successfully.');
    }
  }

  console.log('Seed completed.');
}

seedPeriods();
