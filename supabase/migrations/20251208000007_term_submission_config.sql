-- Migration: Create term_submission_config table
-- Description: Stores recurring submission windows for each term
-- These are month/day pairs that automatically apply every year

-- Drop the old table and related objects if transitioning to new system
-- (keeping school_assessment_periods for historical data)

-- Create the term submission configuration table
CREATE TABLE IF NOT EXISTS term_submission_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Term identifier (1, 2, or 3)
    term_number INTEGER NOT NULL CHECK (term_number BETWEEN 1 AND 3),
    
    -- Term display name
    term_name VARCHAR(20) NOT NULL CHECK (term_name IN ('September-December', 'January-March', 'April-July')),
    
    -- Submission window start (month and day)
    start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
    start_day INTEGER NOT NULL CHECK (start_day BETWEEN 1 AND 31),
    
    -- Submission window end (month and day)
    end_month INTEGER NOT NULL CHECK (end_month BETWEEN 1 AND 12),
    end_day INTEGER NOT NULL CHECK (end_day BETWEEN 1 AND 31),
    
    -- Whether this term config is active/enabled
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES hmr_users(id),
    
    -- Only one config per term
    CONSTRAINT unique_term_number UNIQUE (term_number)
);

-- Insert default term configurations based on Guyana school calendar
-- These can be adjusted by admins
INSERT INTO term_submission_config (term_number, term_name, start_month, start_day, end_month, end_day)
VALUES 
    -- Term 1: September-December - submissions open December 1-15
    (1, 'September-December', 12, 1, 12, 15),
    -- Term 2: January-March - submissions open March 15-31
    (2, 'January-March', 3, 15, 3, 31),
    -- Term 3: April-July - submissions open July 1-15
    (3, 'April-July', 7, 1, 7, 15)
ON CONFLICT (term_number) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_term_submission_config_enabled ON term_submission_config(is_enabled) WHERE is_enabled = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_term_submission_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_term_submission_config_updated_at ON term_submission_config;
CREATE TRIGGER trigger_update_term_submission_config_updated_at
    BEFORE UPDATE ON term_submission_config
    FOR EACH ROW
    EXECUTE FUNCTION update_term_submission_config_updated_at();

-- Enable Row Level Security
ALTER TABLE term_submission_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read term configs
CREATE POLICY "Anyone can view term submission config" ON term_submission_config
    FOR SELECT USING (true);

-- Only admins can update term configs
-- Using service role for updates since term config is admin-only
CREATE POLICY "Admins can update term submission config" ON term_submission_config
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Function to check if submissions are currently open for any term
-- This calculates based on current date and the recurring config
CREATE OR REPLACE FUNCTION get_current_submission_term()
RETURNS TABLE (
    term_number INTEGER,
    term_name VARCHAR(20),
    submission_start DATE,
    submission_end DATE,
    is_open BOOLEAN,
    academic_year VARCHAR(9)
) AS $$
DECLARE
    current_date_val DATE := CURRENT_DATE;
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    academic_year_val VARCHAR(9);
BEGIN
    -- Determine current academic year
    -- Academic year starts in September
    IF current_month >= 9 THEN
        academic_year_val := current_year || '-' || (current_year + 1);
    ELSE
        academic_year_val := (current_year - 1) || '-' || current_year;
    END IF;
    
    RETURN QUERY
    SELECT 
        tc.term_number,
        tc.term_name,
        -- Calculate actual dates for current year cycle
        CASE 
            WHEN tc.term_number = 1 THEN 
                -- Term 1 (Sept-Dec) submission window is in the same year as academic start
                MAKE_DATE(
                    CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END,
                    tc.start_month,
                    LEAST(tc.start_day, 28)  -- Safe day handling
                )
            WHEN tc.term_number = 2 THEN 
                -- Term 2 (Jan-Mar) submission window is in the following year
                MAKE_DATE(
                    CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
                    tc.start_month,
                    LEAST(tc.start_day, 28)
                )
            ELSE 
                -- Term 3 (Apr-Jul) submission window is in the following year
                MAKE_DATE(
                    CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
                    tc.start_month,
                    LEAST(tc.start_day, 28)
                )
        END AS submission_start,
        CASE 
            WHEN tc.term_number = 1 THEN 
                MAKE_DATE(
                    CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END,
                    tc.end_month,
                    LEAST(tc.end_day, 28)
                )
            WHEN tc.term_number = 2 THEN 
                MAKE_DATE(
                    CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
                    tc.end_month,
                    LEAST(tc.end_day, 28)
                )
            ELSE 
                MAKE_DATE(
                    CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
                    tc.end_month,
                    LEAST(tc.end_day, 28)
                )
        END AS submission_end,
        -- Check if current date falls within submission window
        CASE 
            WHEN tc.term_number = 1 THEN 
                current_date_val BETWEEN 
                    MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END, tc.start_month, LEAST(tc.start_day, 28))
                    AND MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END, tc.end_month, LEAST(tc.end_day, 28))
            WHEN tc.term_number = 2 THEN 
                current_date_val BETWEEN 
                    MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.start_month, LEAST(tc.start_day, 28))
                    AND MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.end_month, LEAST(tc.end_day, 28))
            ELSE 
                current_date_val BETWEEN 
                    MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.start_month, LEAST(tc.start_day, 28))
                    AND MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.end_month, LEAST(tc.end_day, 28))
        END AS is_open,
        academic_year_val AS academic_year
    FROM term_submission_config tc
    WHERE tc.is_enabled = true
    ORDER BY tc.term_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get the currently active/open term (if any)
CREATE OR REPLACE FUNCTION get_active_submission_term()
RETURNS TABLE (
    term_number INTEGER,
    term_name VARCHAR(20),
    submission_start DATE,
    submission_end DATE,
    academic_year VARCHAR(9),
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.term_number,
        t.term_name,
        t.submission_start,
        t.submission_end,
        t.academic_year,
        (t.submission_end - CURRENT_DATE)::INTEGER AS days_remaining
    FROM get_current_submission_term() t
    WHERE t.is_open = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_submission_term() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_submission_term() TO authenticated;

COMMENT ON TABLE term_submission_config IS 'Stores recurring submission window configurations for each term. Dates are stored as month/day pairs that automatically apply every academic year.';
COMMENT ON FUNCTION get_current_submission_term() IS 'Returns all term submission windows for the current academic year with their open/closed status';
COMMENT ON FUNCTION get_active_submission_term() IS 'Returns the currently open submission term, if any';
