-- Migration: Create hmr_user_preferences and hmr_regional_top_performers_cache tables
-- Description: Stores user-specific dashboard preferences and caches regional performance analytics

-- Create hmr_user_preferences table
CREATE TABLE IF NOT EXISTS hmr_user_preferences (
    user_id UUID PRIMARY KEY REFERENCES hmr_users(id) ON DELETE CASCADE,
    default_comparison_school_id UUID REFERENCES sms_schools(id),
    export_settings JSONB DEFAULT '{"include_ai_insights": true, "include_comparison": true, "include_trends": true}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on hmr_user_preferences
ALTER TABLE hmr_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hmr_user_preferences
DO $$ BEGIN
    CREATE POLICY "Users can view their own preferences"
        ON hmr_user_preferences FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own preferences"
        ON hmr_user_preferences FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own preferences"
        ON hmr_user_preferences FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create hmr_regional_top_performers_cache table
CREATE TABLE IF NOT EXISTS hmr_regional_top_performers_cache (
    region TEXT,
    period_id UUID REFERENCES hmr_school_assessment_periods(id) ON DELETE CASCADE,
    school_id UUID REFERENCES sms_schools(id) ON DELETE CASCADE,
    highest_average_score NUMERIC,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (region, period_id)
);

-- Enable RLS on hmr_regional_top_performers_cache
ALTER TABLE hmr_regional_top_performers_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hmr_regional_top_performers_cache
DO $$ BEGIN
    CREATE POLICY "Everyone can view regional top performers cache"
        ON hmr_regional_top_performers_cache FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Function to update updated_at timestamp (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for hmr_user_preferences
DROP TRIGGER IF EXISTS update_hmr_user_preferences_updated_at ON hmr_user_preferences;
CREATE TRIGGER update_hmr_user_preferences_updated_at
    BEFORE UPDATE ON hmr_user_preferences
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
