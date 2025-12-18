-- Migration: Create report_audit_log table
-- Description: Tracks all admin edits to submitted assessment reports
-- Provides accountability and change history for compliance

-- Create the school_assessment_audit_log table
CREATE TABLE IF NOT EXISTS school_assessment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    report_id UUID NOT NULL REFERENCES school_assessment_reports(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES hmr_users(id),
    
    -- Action performed
    action VARCHAR(20) NOT NULL CHECK (action IN ('edit', 'status_change', 'score_recalculation')),
    
    -- What was changed
    field_changed VARCHAR(100) NOT NULL,
    
    -- Old and new values stored as JSONB for flexibility
    old_value JSONB,
    new_value JSONB,
    
    -- Reason for the change (required for accountability)
    reason TEXT NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_log_report ON school_assessment_audit_log(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON school_assessment_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON school_assessment_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON school_assessment_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE school_assessment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON school_assessment_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Education Officials can view audit logs (for oversight)
CREATE POLICY "Education Officials can view audit logs" ON school_assessment_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() AND r.name = 'Education Official'
        )
    );

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON school_assessment_audit_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM hmr_users u
            JOIN hmr_user_roles r ON u.role = r.id
            WHERE u.id = auth.uid() AND r.name = 'Admin'
        )
    );

-- No one can update or delete audit logs (immutable)
-- This is enforced by not having UPDATE or DELETE policies

-- Function to create audit entry when admin updates a report
CREATE OR REPLACE FUNCTION create_assessment_audit_entry(
    p_report_id UUID,
    p_admin_id UUID,
    p_action VARCHAR(20),
    p_field_changed VARCHAR(100),
    p_old_value JSONB,
    p_new_value JSONB,
    p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO school_assessment_audit_log (
        report_id,
        admin_id,
        action,
        field_changed,
        old_value,
        new_value,
        reason
    ) VALUES (
        p_report_id,
        p_admin_id,
        p_action,
        p_field_changed,
        p_old_value,
        p_new_value,
        p_reason
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE school_assessment_audit_log IS 'Immutable audit log tracking all admin changes to assessment reports';
COMMENT ON COLUMN school_assessment_audit_log.action IS 'Type of change: edit, status_change, or score_recalculation';
COMMENT ON COLUMN school_assessment_audit_log.field_changed IS 'Name of the field or category that was modified';
COMMENT ON COLUMN school_assessment_audit_log.old_value IS 'Previous value before the change (JSONB for flexibility)';
COMMENT ON COLUMN school_assessment_audit_log.new_value IS 'New value after the change (JSONB for flexibility)';
COMMENT ON COLUMN school_assessment_audit_log.reason IS 'Required explanation for why the change was made';
