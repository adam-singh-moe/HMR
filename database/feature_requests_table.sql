-- Feature Requests Table
CREATE TABLE IF NOT EXISTS hmr_feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('functionality', 'improvement', 'bug_fix', 'ui_ux', 'reporting', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'implemented')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Creator information
  created_by UUID NOT NULL REFERENCES hmr_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Admin actions
  reviewed_by UUID REFERENCES hmr_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_comment TEXT,
  
  -- Tracking
  upvote_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES hmr_users(id)
);

-- Feature Request Upvotes Table (to track who upvoted)
CREATE TABLE IF NOT EXISTS hmr_feature_request_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES hmr_feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hmr_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one upvote per user per request
  UNIQUE(feature_request_id, user_id)
);

-- Feature Request Comments Table
CREATE TABLE IF NOT EXISTS hmr_feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES hmr_feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hmr_users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_by ON hmr_feature_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON hmr_feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON hmr_feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_upvotes_feature_id ON hmr_feature_request_upvotes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_upvotes_user_id ON hmr_feature_request_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_comments_feature_id ON hmr_feature_request_comments(feature_request_id);

-- Row Level Security (RLS)
ALTER TABLE hmr_feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hmr_feature_request_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hmr_feature_request_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Feature Requests: Anyone authenticated can view non-deleted requests
CREATE POLICY "Anyone can view active feature requests" ON hmr_feature_requests
  FOR SELECT USING (is_deleted = FALSE);

-- Feature Requests: Regional Officers and Education Officials can create
CREATE POLICY "Regional Officers and Education Officials can create requests" ON hmr_feature_requests
  FOR INSERT WITH CHECK (
    created_by IN (
      SELECT id FROM hmr_users 
      WHERE role IN (
        SELECT id FROM hmr_user_roles WHERE name IN ('Regional Officer', 'Education Official')
      )
    )
  );

-- Feature Requests: Creators can update their own requests
CREATE POLICY "Users can update their own requests" ON hmr_feature_requests
  FOR UPDATE USING (created_by = auth.uid());

-- Upvotes: Anyone can view
CREATE POLICY "Anyone can view upvotes" ON hmr_feature_request_upvotes
  FOR SELECT USING (TRUE);

-- Upvotes: Authenticated users can upvote
CREATE POLICY "Users can upvote" ON hmr_feature_request_upvotes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Upvotes: Users can remove their own upvotes
CREATE POLICY "Users can remove their upvotes" ON hmr_feature_request_upvotes
  FOR DELETE USING (user_id = auth.uid());

-- Comments: Anyone can view non-deleted comments
CREATE POLICY "Anyone can view comments" ON hmr_feature_request_comments
  FOR SELECT USING (is_deleted = FALSE);

-- Comments: Authenticated users can comment
CREATE POLICY "Users can comment" ON hmr_feature_request_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Comments: Users can update their own comments
CREATE POLICY "Users can update their own comments" ON hmr_feature_request_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Function to automatically update upvote count
CREATE OR REPLACE FUNCTION update_feature_request_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hmr_feature_requests 
    SET upvote_count = upvote_count + 1 
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hmr_feature_requests 
    SET upvote_count = upvote_count - 1 
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update upvote count
CREATE TRIGGER trigger_update_upvote_count
AFTER INSERT OR DELETE ON hmr_feature_request_upvotes
FOR EACH ROW EXECUTE FUNCTION update_feature_request_upvote_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_feature_request_updated_at
BEFORE UPDATE ON hmr_feature_requests
FOR EACH ROW EXECUTE FUNCTION update_feature_request_updated_at();
