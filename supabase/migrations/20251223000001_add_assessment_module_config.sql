-- Migration: Add hmr_assessment_module_config table
-- Description: Stores feature toggles for the assessment module by school type.

CREATE TABLE IF NOT EXISTS hmr_assessment_module_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_type VARCHAR(20) NOT NULL UNIQUE CHECK (school_type IN ('nursery', 'primary', 'secondary')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES hmr_users(id)
);

-- Insert default configurations (all enabled by default)
INSERT INTO hmr_assessment_module_config (school_type, is_enabled)
VALUES 
    ('nursery', true),
    ('primary', true),
    ('secondary', true)
ON CONFLICT (school_type) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE hmr_assessment_module_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read module config
CREATE POLICY "Anyone can view assessment module config" ON hmr_assessment_module_config
    FOR SELECT USING (true);

-- Only admins can update module config
CREATE POLICY "Admins can update assessment module config" ON hmr_assessment_module_config
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_hmr_assessment_module_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hmr_assessment_module_config_updated_at
    BEFORE UPDATE ON hmr_assessment_module_config
    FOR EACH ROW
    EXECUTE FUNCTION update_hmr_assessment_module_config_updated_at();
