-- Migration: Add academic_year and term_name columns to school_assessment_reports
-- This allows reports to be created without depending on the legacy period_id system
-- Part of the transition to the term_submission_config system

-- Add academic_year column
ALTER TABLE school_assessment_reports
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9);

-- Add term_name column
ALTER TABLE school_assessment_reports
ADD COLUMN IF NOT EXISTS term_name VARCHAR(20);

-- Make period_id nullable (for backwards compatibility and transition)
ALTER TABLE school_assessment_reports
ALTER COLUMN period_id DROP NOT NULL;

-- Add index for new columns
CREATE INDEX IF NOT EXISTS idx_assessment_reports_academic_year 
ON school_assessment_reports(academic_year);

CREATE INDEX IF NOT EXISTS idx_assessment_reports_term_name 
ON school_assessment_reports(term_name);

CREATE INDEX IF NOT EXISTS idx_assessment_reports_year_term 
ON school_assessment_reports(academic_year, term_name);

-- Add a unique constraint for school + academic_year + term_name
-- This ensures one report per school per term (using the new system)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_school_year_term_report'
    ) THEN
        ALTER TABLE school_assessment_reports
        ADD CONSTRAINT unique_school_year_term_report 
        UNIQUE (school_id, academic_year, term_name);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- Migrate existing reports to populate academic_year and term_name
-- This copies values from the linked period if available
UPDATE school_assessment_reports r
SET 
    academic_year = p.academic_year,
    term_name = p.term_name
FROM school_assessment_periods p
WHERE r.period_id = p.id
AND r.academic_year IS NULL;

-- Add school_type column to track what type of school submitted the report
ALTER TABLE school_assessment_reports
ADD COLUMN IF NOT EXISTS school_type VARCHAR(20) CHECK (school_type IN ('nursery', 'primary', 'secondary'));

-- Create index for school_type
CREATE INDEX IF NOT EXISTS idx_assessment_reports_school_type 
ON school_assessment_reports(school_type);

COMMENT ON COLUMN school_assessment_reports.academic_year IS 'Academic year for the report (e.g., 2024-2025)';
COMMENT ON COLUMN school_assessment_reports.term_name IS 'Term name (First Term, Second Term, Third Term)';
COMMENT ON COLUMN school_assessment_reports.school_type IS 'Type of school: nursery, primary, or secondary';
