-- Create access_tokens table for admin user impersonation
CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES hmr_users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES hmr_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_created_by ON access_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_tokens_is_used ON access_tokens(is_used);

-- Add row level security
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage access tokens
CREATE POLICY "Admins can manage access tokens" ON access_tokens
FOR ALL USING (
    auth.jwt() ->> 'role' = 'authenticated' AND
    EXISTS (
        SELECT 1 FROM hmr_users 
        WHERE id = (auth.jwt() ->> 'sub')::UUID 
        AND hmr_user_roles.name = 'Admin'
        AND hmr_users.role_id = hmr_user_roles.id
    )
);

-- Create policy for service role access (for server actions)
CREATE POLICY "Service role can manage access tokens" ON access_tokens
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE access_tokens IS 'Stores access tokens for admin user impersonation';
COMMENT ON COLUMN access_tokens.user_id IS 'The user account that can be accessed with this token';
COMMENT ON COLUMN access_tokens.token IS 'The unique access token string';
COMMENT ON COLUMN access_tokens.created_by IS 'The admin user who created this token';
COMMENT ON COLUMN access_tokens.expires_at IS 'When the token expires (typically 24 hours)';
COMMENT ON COLUMN access_tokens.is_used IS 'Whether the token has been used (tokens are single-use)';
COMMENT ON COLUMN access_tokens.used_at IS 'When the token was used';