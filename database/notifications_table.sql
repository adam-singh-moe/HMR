-- Create notifications table for broadcast messaging system

-- Clean up any old triggers and functions first
DROP TRIGGER IF EXISTS trigger_create_notification_recipients ON hmr_notifications;
DROP FUNCTION IF EXISTS create_notification_recipients();

CREATE TABLE IF NOT EXISTS hmr_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES hmr_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Targeting options (at least one must be specified)
    target_all_users BOOLEAN DEFAULT FALSE,
    target_user_roles TEXT[], -- Array of role names like ['Head Teacher', 'Regional Officer']
    target_school_levels TEXT[], -- Array of school levels like ['Primary', 'Secondary', 'Nursery']
    target_regions TEXT[], -- Array of region names
    target_user_ids UUID[], -- Array of specific user IDs
    
    -- Priority and type
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    notification_type VARCHAR(50) DEFAULT 'general' CHECK (notification_type IN ('general', 'announcement', 'deadline', 'update', 'alert')),
    
    -- Auto-expiry
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_created_by ON hmr_notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_created_at ON hmr_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_target_user_roles ON hmr_notifications USING GIN(target_user_roles);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_target_school_levels ON hmr_notifications USING GIN(target_school_levels);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_target_regions ON hmr_notifications USING GIN(target_regions);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_target_user_ids ON hmr_notifications USING GIN(target_user_ids);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_expires_at ON hmr_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_is_active ON hmr_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_priority ON hmr_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_hmr_notifications_type ON hmr_notifications(notification_type);

-- Add comments for documentation
COMMENT ON TABLE hmr_notifications IS 'Stores broadcast notifications from admins to users';
COMMENT ON COLUMN hmr_notifications.title IS 'Short title for the notification';
COMMENT ON COLUMN hmr_notifications.message IS 'Full notification message content';
COMMENT ON COLUMN hmr_notifications.created_by IS 'Admin user who created the notification';
COMMENT ON COLUMN hmr_notifications.target_all_users IS 'If true, notification targets all users';
COMMENT ON COLUMN hmr_notifications.target_user_roles IS 'Array of user role names to target';
COMMENT ON COLUMN hmr_notifications.target_school_levels IS 'Array of school levels to target';
COMMENT ON COLUMN hmr_notifications.target_regions IS 'Array of region names to target';
COMMENT ON COLUMN hmr_notifications.target_user_ids IS 'Array of specific user IDs to target';
COMMENT ON COLUMN hmr_notifications.priority IS 'Notification priority: low, normal, high, urgent';
COMMENT ON COLUMN hmr_notifications.notification_type IS 'Type: general, announcement, deadline, update, alert';
COMMENT ON COLUMN hmr_notifications.expires_at IS 'Optional expiry date for the notification';