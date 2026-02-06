-- Admin Schema Migration for QP Link
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. ADD ADMIN FIELDS TO USERS TABLE
-- =====================================================

-- Add role field (user, admin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Add ban-related fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Add activity tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_page TEXT;

-- Add subscription fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Add login tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- =====================================================
-- 2. CREATE BANNED IPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_address ON banned_ips(ip_address);

-- =====================================================
-- 3. CREATE ACTIVITY LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  page TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- =====================================================
-- 4. CREATE ADMIN ACTIONS LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT, -- 'user', 'ip', 'product', etc.
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

-- =====================================================
-- 5. CREATE PLATFORM STATS TABLE (for caching)
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_stats (
  id TEXT PRIMARY KEY DEFAULT 'main',
  total_users INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  users_today INTEGER DEFAULT 0,
  revenue_today DECIMAL(15, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO platform_stats (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. CREATE USER SESSIONS TABLE (for real-time tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  city TEXT,
  current_page TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role has full access to banned_ips" ON banned_ips
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to activity_logs" ON activity_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to admin_actions" ON admin_actions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to platform_stats" ON platform_stats
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to user_sessions" ON user_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to update last_active on user
CREATE OR REPLACE FUNCTION update_user_last_active(p_user_id UUID, p_page TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    last_active = NOW(),
    current_page = COALESCE(p_page, current_page)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_page TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, page)
  VALUES (p_user_id, p_action, p_details, p_ip, p_user_agent, p_page)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if IP is banned
CREATE OR REPLACE FUNCTION is_ip_banned(p_ip TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM banned_ips WHERE ip_address = p_ip);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE!
-- Remember to set your email as admin in the users table:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
-- =====================================================
