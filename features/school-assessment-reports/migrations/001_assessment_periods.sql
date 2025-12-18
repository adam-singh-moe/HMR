-- Migration: Create assessment_periods table
-- Description: Stores termly assessment submission windows for academic years
-- Academic years span two calendar years (e.g., "2024-2025")
-- Terms follow Guyana school calendar: September-December, January-March, April-July

-- Create enum type for term names
DO $$ BEGIN
    CREATE TYPE assessment_term_name AS ENUM ('September-December', 'January-March', 'April-July');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the assessment_periods table
CREATE TABLE IF NOT EXISTS school_assessment_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Academic year in "YYYY-YYYY" format (e.g., "2024-2025")
    academic_year VARCHAR(9) NOT NULL CHECK (academic_year ~ '^\d{4}-\d{4}$'),
    
    -- Term name following Guyana school calendar
    term_name VARCHAR(20) NOT NULL CHECK (term_name IN ('September-December', 'January-March', 'April-July')),
    
    -- Submission window dates
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Sequence order within academic year (1 = Sept-Dec, 2 = Jan-Mar, 3 = Apr-Jul)
    sequence_order INTEGER NOT NULL CHECK (sequence_order BETWEEN 1 AND 3),
    
    -- Whether this period is currently active for submissions
    is_active BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES hmr_users(id),
    
    -- Ensure only one period per term per academic year
    CONSTRAINT unique_academic_year_term UNIQUE (academic_year, term_name),
    
    -- Ensure end_date is after start_date
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    
    -- Ensure sequence_order matches term_name
    CONSTRAINT valid_sequence_term CHECK (
        (term_name = 'September-December' AND sequence_order = 1) OR
        (term_name = 'January-March' AND sequence_order = 2) OR
        (term_name = 'April-July' AND sequence_order = 3)
    )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_periods_active ON school_assessment_periods(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assessment_periods_academic_year ON school_assessment_periods(academic_year);
CREATE INDEX IF NOT EXISTS idx_assessment_periods_dates ON school_assessment_periods(start_date, end_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessment_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assessment_periods_updated_at ON school_assessment_periods;
CREATE TRIGGER trigger_update_assessment_periods_updated_at
    BEFORE UPDATE ON school_assessment_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_periods_updated_at();

-- Function to ensure only one active period at a time
CREATE OR REPLACE FUNCTION ensure_single_active_period()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE school_assessment_periods 
        SET is_active = false 
        WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_period ON school_assessment_periods;
CREATE TRIGGER trigger_ensure_single_active_period
    BEFORE INSERT OR UPDATE OF is_active ON school_assessment_periods
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_period();

-- Enable Row Level Security
ALTER TABLE school_assessment_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read periods
CREATE POLICY "Anyone can view assessment periods" ON school_assessment_periods
    FOR SELECT USING (true);

-- Only admins can insert/update/delete periods
CREATE POLICY "Admins can manage assessment periods" ON school_assessment_periods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Comments for documentation
COMMENT ON TABLE school_assessment_periods IS 'Stores assessment submission periods for each term in an academic year';
COMMENT ON COLUMN school_assessment_periods.academic_year IS 'Academic year in YYYY-YYYY format (e.g., 2024-2025)';
COMMENT ON COLUMN school_assessment_periods.term_name IS 'Term name following Guyana school calendar';
COMMENT ON COLUMN school_assessment_periods.sequence_order IS 'Order within academic year: 1=Sept-Dec, 2=Jan-Mar, 3=Apr-Jul';
COMMENT ON COLUMN school_assessment_periods.is_active IS 'Whether submissions are currently open for this period';
