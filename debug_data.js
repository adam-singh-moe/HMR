const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xgzjdebqdsvllrbccsrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnempkZWJxZHN2bGxyYmNjc3JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1OTUwMywiZXhwIjoyMDQ5NDM1NTAzfQ.mere3vUuDIcYTAVBMNKt8UPcgmCq2G3k2zBFL2O5Mb0'
)

async function debug() {
  const { data, error } = await supabase
    .from('sms_regions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Columns in sms_regions:', Object.keys(data[0]))
}

debug()
