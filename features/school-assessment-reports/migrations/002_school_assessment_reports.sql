-- Migration: Create school_assessment_reports table
-- Description: Main table storing school assessment reports with 7 category scores
-- Total score out of 1000 points across all categories

-- Create enum type for report status
DO $$ BEGIN
    CREATE TYPE assessment_report_status AS ENUM ('draft', 'submitted', 'expired_draft');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum type for rating levels
DO $$ BEGIN
    CREATE TYPE assessment_rating_level AS ENUM (
        'outstanding',      -- 850-1000 points (85-100%)
        'very_good',        -- 700-849 points (70-84%)
        'good',             -- 550-699 points (55-69%)
        'satisfactory',     -- 400-549 points (40-54%)
        'needs_improvement' -- Below 400 points (<40%)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the school_assessment_reports table
CREATE TABLE IF NOT EXISTS school_assessment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    school_id UUID NOT NULL REFERENCES sms_schools(id),
    headteacher_id UUID NOT NULL REFERENCES hmr_users(id),
    period_id UUID NOT NULL REFERENCES school_assessment_periods(id),
    
    -- Report status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'expired_draft')),
    submitted_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    
    -- Category scores stored as JSONB for flexibility
    -- Each category contains sub-metrics with earned points
    
    -- Academic Performance (max 300 points)
    -- Metrics: pass_rates, internal_assessments, subject_diversity, grade_6_results, csec_results
    academic_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Attendance (max 150 points)
    -- Metrics: student_attendance_rate, teacher_attendance_rate, punctuality
    attendance_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Infrastructure (max 150 points)
    -- Metrics: classrooms, sanitation, library, technology, safety
    infrastructure_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Teaching Quality (max 150 points)
    -- Metrics: qualified_teachers, professional_development, lesson_planning, teaching_methods
    teaching_quality_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Management (max 100 points)
    -- Metrics: sba_meetings, parent_engagement, budget_management, record_keeping
    management_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Student Welfare (max 100 points)
    -- Metrics: guidance_services, extracurricular, discipline, special_needs_support
    student_welfare_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Community (max 50 points)
    -- Metrics: community_involvement, external_partnerships
    community_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Calculated totals
    total_score INTEGER CHECK (total_score >= 0 AND total_score <= 1000),
    rating_level VARCHAR(20) CHECK (rating_level IN ('outstanding', 'very_good', 'good', 'satisfactory', 'needs_improvement')),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one report per school per period
    CONSTRAINT unique_school_period_report UNIQUE (school_id, period_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_assessment_reports_school ON school_assessment_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_period ON school_assessment_reports(period_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_headteacher ON school_assessment_reports(headteacher_id);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_status ON school_assessment_reports(status);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_rating ON school_assessment_reports(rating_level);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_total_score ON school_assessment_reports(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_reports_submitted ON school_assessment_reports(submitted_at) WHERE submitted_at IS NOT NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessment_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assessment_reports_updated_at ON school_assessment_reports;
CREATE TRIGGER trigger_update_assessment_reports_updated_at
    BEFORE UPDATE ON school_assessment_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_reports_updated_at();

-- Function to set locked_at when status changes to submitted or expired_draft
CREATE OR REPLACE FUNCTION set_report_locked_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('submitted', 'expired_draft') AND OLD.status = 'draft' THEN
        NEW.locked_at = NOW();
        IF NEW.status = 'submitted' THEN
            NEW.submitted_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_report_locked_at ON school_assessment_reports;
CREATE TRIGGER trigger_set_report_locked_at
    BEFORE UPDATE OF status ON school_assessment_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_report_locked_at();

-- Enable Row Level Security
ALTER TABLE school_assessment_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Head Teachers can view their own school's reports
CREATE POLICY "Head Teachers can view own school reports" ON school_assessment_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'Head Teacher'
            AND u.school_id = school_assessment_reports.school_id
        )
    );

-- Head Teachers can insert/update drafts for their own school
CREATE POLICY "Head Teachers can manage own school draft reports" ON school_assessment_reports
    FOR ALL USING (
        status = 'draft' AND
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() 
            AND r.name = 'Head Teacher'
            AND u.school_id = school_assessment_reports.school_id
        )
    );

-- Regional Officers can view reports from their region
CREATE POLICY "Regional Officers can view regional reports" ON school_assessment_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            JOIN sms_schools s ON s.id = school_assessment_reports.school_id
            JOIN sms_regions reg ON reg.id = s.region_id
            WHERE u.id = auth.uid() 
            AND r.name = 'Regional Officer'
            AND u.region = reg.id
        )
    );

-- Education Officials can view all reports
CREATE POLICY "Education Officials can view all reports" ON school_assessment_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() AND r.name = 'Education Official'
        )
    );

-- Admins have full access
CREATE POLICY "Admins have full access to reports" ON school_assessment_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Comments for documentation
COMMENT ON TABLE school_assessment_reports IS 'Stores school assessment reports with scores across 7 categories (max 1000 points)';
COMMENT ON COLUMN school_assessment_reports.academic_scores IS 'Academic Performance scores (max 300 points): pass_rates, assessments, subject_diversity';
COMMENT ON COLUMN school_assessment_reports.attendance_scores IS 'Attendance scores (max 150 points): student_attendance, teacher_attendance, punctuality';
COMMENT ON COLUMN school_assessment_reports.infrastructure_scores IS 'Infrastructure scores (max 150 points): classrooms, sanitation, library, technology, safety';
COMMENT ON COLUMN school_assessment_reports.teaching_quality_scores IS 'Teaching Quality scores (max 150 points): qualified_teachers, professional_dev, lesson_planning';
COMMENT ON COLUMN school_assessment_reports.management_scores IS 'Management scores (max 100 points): sba_meetings, parent_engagement, budget, records';
COMMENT ON COLUMN school_assessment_reports.student_welfare_scores IS 'Student Welfare scores (max 100 points): guidance, extracurricular, discipline, special_needs';
COMMENT ON COLUMN school_assessment_reports.community_scores IS 'Community scores (max 50 points): community_involvement, external_partnerships';
COMMENT ON COLUMN school_assessment_reports.status IS 'Report status: draft (editable), submitted (locked), expired_draft (locked, never submitted)';
