-- Migration: Create hmr_export_jobs table
-- Description: Tracks background export tasks for reports

CREATE TABLE IF NOT EXISTS hmr_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES hmr_users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES hmr_school_assessment_reports(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    export_type TEXT, -- pdf, excel
    settings JSONB,
    download_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hmr_export_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
    CREATE POLICY "Users can view their own export jobs"
        ON hmr_export_jobs FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_hmr_export_jobs_updated_at ON hmr_export_jobs;
CREATE TRIGGER update_hmr_export_jobs_updated_at
    BEFORE UPDATE ON hmr_export_jobs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
