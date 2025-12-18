-- Migration: Add TAPS (Termly Accountability Performance for Secondary Schools) columns
-- Description: Adds columns for secondary school TAPS metrics (419 max points, A-E grades)
-- This supports the official TAPS scoring system used by the Ministry of Education

-- Add TAPS rating grade enum (A-E scale)
DO $$ BEGIN
    CREATE TYPE taps_rating_grade AS ENUM ('A', 'B', 'C', 'D', 'E');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add TAPS category score columns to school_assessment_reports table
-- Each category stores JSONB data with individual metrics and totals

ALTER TABLE school_assessment_reports
ADD COLUMN IF NOT EXISTS taps_school_inputs_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS taps_leadership_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS taps_academics_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS taps_teacher_development_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS taps_health_safety_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS taps_school_culture_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS taps_rating_grade VARCHAR(1) DEFAULT NULL;

-- Add constraint for TAPS rating grade values
ALTER TABLE school_assessment_reports
DROP CONSTRAINT IF EXISTS valid_taps_rating_grade;

ALTER TABLE school_assessment_reports
ADD CONSTRAINT valid_taps_rating_grade 
CHECK (taps_rating_grade IS NULL OR taps_rating_grade IN ('A', 'B', 'C', 'D', 'E'));

-- Update total_score constraint to allow TAPS max score (419) as well as demo (1000)
ALTER TABLE school_assessment_reports
DROP CONSTRAINT IF EXISTS school_assessment_reports_total_score_check;

ALTER TABLE school_assessment_reports
ADD CONSTRAINT school_assessment_reports_total_score_check 
CHECK (total_score >= 0 AND total_score <= 1000);

-- Create index for TAPS rating grade queries
CREATE INDEX IF NOT EXISTS idx_assessment_reports_taps_grade 
ON school_assessment_reports(taps_rating_grade) 
WHERE taps_rating_grade IS NOT NULL;

-- Add comment explaining TAPS scoring system
COMMENT ON COLUMN school_assessment_reports.taps_rating_grade IS 
'TAPS Grade for secondary schools: A (357-419 Outstanding), B (294-356 High Achieving), C (210-293 Standard), D (84-209 Struggling), E (0-83 Critical Support)';

COMMENT ON COLUMN school_assessment_reports.taps_school_inputs_scores IS 
'TAPS School Inputs & Operations category (max 80 points): Working computers, student textbooks, library, internet access, timetable, assembly';

COMMENT ON COLUMN school_assessment_reports.taps_leadership_scores IS 
'TAPS Leadership category (max 30 points): School plan implementation, department meetings, SIP activities, staff meetings, PTA meetings, board meetings';

COMMENT ON COLUMN school_assessment_reports.taps_academics_scores IS 
'TAPS Academics category (max 200 points): Pass rates for Grades 7-11 (overall, English, Math, STEM) and 70%+ achievers';

COMMENT ON COLUMN school_assessment_reports.taps_teacher_development_scores IS 
'TAPS Teacher Development category (max 20 points): Teacher attendance increase, learners attendance increase, classroom observations';

COMMENT ON COLUMN school_assessment_reports.taps_health_safety_scores IS 
'TAPS Health & Safety category (max 50 points): Nurse/medic availability, counselor availability, guidance interventions, emergency drills, incident records';

COMMENT ON COLUMN school_assessment_reports.taps_school_culture_scores IS 
'TAPS School Culture category (max 70 points): Extracurricular activities, discipline/climate rating, parental participation';
