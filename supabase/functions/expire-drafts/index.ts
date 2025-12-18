// Supabase Edge Function: expire-drafts
// This function runs on a schedule (cron) to expire draft reports when submission windows close
//
// Deploy command: supabase functions deploy expire-drafts
// Enable cron: Set up via Supabase Dashboard or pg_cron extension
//
// Recommended schedule: Daily at midnight or hourly during window close periods

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Period {
  id: string
  academic_year: string
  term_name: string
  submission_end: string
  is_active: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find periods where submission window has ended but hasn't been processed
    const now = new Date().toISOString()
    
    const { data: expiredPeriods, error: periodsError } = await supabase
      .from('school_assessment_periods')
      .select('id, academic_year, term_name, submission_end, is_active')
      .lt('submission_end', now)
      .eq('is_active', true)

    if (periodsError) {
      console.error('Error fetching expired periods:', periodsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch periods', details: periodsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiredPeriods || expiredPeriods.length === 0) {
      console.log('No expired periods found')
      return new Response(
        JSON.stringify({ message: 'No expired periods to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalExpiredDrafts = 0
    const processedPeriods: string[] = []

    for (const period of expiredPeriods as Period[]) {
      console.log(`Processing period: ${period.academic_year} - ${period.term_name}`)

      // Find all draft reports for this period
      const { data: drafts, error: draftsError } = await supabase
        .from('school_assessment_reports')
        .select('id')
        .eq('period_id', period.id)
        .eq('status', 'draft')

      if (draftsError) {
        console.error(`Error fetching drafts for period ${period.id}:`, draftsError)
        continue
      }

      if (drafts && drafts.length > 0) {
        // Update all drafts to expired_draft status
        const { error: updateError, count } = await supabase
          .from('school_assessment_reports')
          .update({ 
            status: 'expired_draft',
            updated_at: now 
          })
          .eq('period_id', period.id)
          .eq('status', 'draft')

        if (updateError) {
          console.error(`Error expiring drafts for period ${period.id}:`, updateError)
        } else {
          console.log(`Expired ${drafts.length} drafts for period ${period.id}`)
          totalExpiredDrafts += drafts.length
        }
      }

      // Deactivate the period
      const { error: deactivateError } = await supabase
        .from('school_assessment_periods')
        .update({ is_active: false })
        .eq('id', period.id)

      if (deactivateError) {
        console.error(`Error deactivating period ${period.id}:`, deactivateError)
      } else {
        processedPeriods.push(`${period.academic_year} - ${period.term_name}`)
      }
    }

    // Log the operation
    console.log(`Expire drafts completed: ${totalExpiredDrafts} drafts expired, ${processedPeriods.length} periods closed`)

    return new Response(
      JSON.stringify({
        message: 'Expire drafts completed',
        processedPeriods,
        expiredDraftsCount: totalExpiredDrafts,
        timestamp: now,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in expire-drafts function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/* 
SETUP INSTRUCTIONS:

1. Deploy the function:
   npx supabase functions deploy expire-drafts

2. Set up the cron schedule using pg_cron extension in Supabase:

   -- Enable pg_cron extension (run once)
   CREATE EXTENSION IF NOT EXISTS pg_cron;

   -- Schedule the function to run daily at midnight
   SELECT cron.schedule(
     'expire-assessment-drafts',
     '0 0 * * *',  -- Every day at midnight
     $$
     SELECT net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/expire-drafts',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     );
     $$
   );

   -- Or use Supabase Dashboard:
   -- Go to Database > Extensions > Enable pg_cron
   -- Go to Database > Cron Jobs > Add new job

3. Alternative: Use Supabase Edge Function Schedules (if available):
   Configure in supabase/config.toml:
   
   [functions.expire-drafts]
   schedule = "0 0 * * *"  # Daily at midnight

4. Test the function manually:
   curl -X POST https://<project-ref>.supabase.co/functions/v1/expire-drafts \
     -H "Authorization: Bearer <service-role-key>" \
     -H "Content-Type: application/json"
*/
