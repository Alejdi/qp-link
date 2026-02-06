-- Two-Factor Authentication Schema
-- Implements TOTP-based 2FA for enhanced security

-- Create 2FA settings table
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,

  -- 2FA Configuration
  is_enabled BOOLEAN DEFAULT false,
  secret TEXT, -- TOTP secret (encrypted)
  backup_codes TEXT[], -- Array of backup codes (hashed)

  -- Recovery
  recovery_email TEXT,
  recovery_phone TEXT,

  -- Tracking
  enabled_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON user_2fa(is_enabled);

-- Create 2FA verification log table
CREATE TABLE IF NOT EXISTS two_fa_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,

  -- Verification details
  verification_type TEXT NOT NULL, -- 'totp', 'backup_code', 'recovery'
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,

  -- Failure tracking
  failure_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_2fa_verifications_user_id ON two_fa_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_verifications_created_at ON two_fa_verifications(created_at);

-- Create trusted devices table
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,

  -- Device information
  device_name TEXT,
  device_fingerprint TEXT NOT NULL, -- Hash of user agent + other identifiers
  ip_address TEXT,
  user_agent TEXT,

  -- Trust settings
  is_trusted BOOLEAN DEFAULT true,
  trust_expires_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);

-- Function: Enable 2FA for user
CREATE OR REPLACE FUNCTION enable_2fa(
  p_user_id UUID,
  p_secret TEXT,
  p_backup_codes TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update 2FA settings
  INSERT INTO user_2fa (
    user_id,
    secret,
    backup_codes,
    is_enabled,
    enabled_at
  ) VALUES (
    p_user_id,
    p_secret,
    p_backup_codes,
    true,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    secret = EXCLUDED.secret,
    backup_codes = EXCLUDED.backup_codes,
    is_enabled = true,
    enabled_at = NOW(),
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function: Disable 2FA for user
CREATE OR REPLACE FUNCTION disable_2fa(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_2fa
  SET
    is_enabled = false,
    secret = NULL,
    backup_codes = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function: Verify TOTP code
CREATE OR REPLACE FUNCTION verify_totp(
  p_user_id UUID,
  p_code TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_2fa RECORD;
  v_is_valid BOOLEAN := false;
BEGIN
  -- Get 2FA settings
  SELECT * INTO v_2fa
  FROM user_2fa
  WHERE user_id = p_user_id AND is_enabled = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if locked
  IF v_2fa.locked_until IS NOT NULL AND v_2fa.locked_until > NOW() THEN
    INSERT INTO two_fa_verifications (user_id, verification_type, success, failure_reason, ip_address, user_agent)
    VALUES (p_user_id, 'totp', false, 'Account locked', p_ip_address, p_user_agent);
    RETURN false;
  END IF;

  -- Note: Actual TOTP validation happens in application code
  -- This function just handles the database side
  -- For now, we'll assume validation is done before calling this

  -- Update last used
  UPDATE user_2fa
  SET
    last_used_at = NOW(),
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log successful verification
  INSERT INTO two_fa_verifications (user_id, verification_type, success, ip_address, user_agent)
  VALUES (p_user_id, 'totp', true, p_ip_address, p_user_agent);

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function: Record failed verification
CREATE OR REPLACE FUNCTION record_failed_2fa(
  p_user_id UUID,
  p_verification_type TEXT,
  p_failure_reason TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_failed_attempts INTEGER;
BEGIN
  -- Increment failed attempts
  UPDATE user_2fa
  SET
    failed_attempts = failed_attempts + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING failed_attempts INTO v_failed_attempts;

  -- Lock account after 5 failed attempts
  IF v_failed_attempts >= 5 THEN
    UPDATE user_2fa
    SET
      locked_until = NOW() + INTERVAL '30 minutes',
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Log failed verification
  INSERT INTO two_fa_verifications (user_id, verification_type, success, failure_reason, ip_address, user_agent)
  VALUES (p_user_id, p_verification_type, false, p_failure_reason, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql;

-- Function: Use backup code
CREATE OR REPLACE FUNCTION use_backup_code(
  p_user_id UUID,
  p_code_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_backup_codes TEXT[];
  v_code_found BOOLEAN := false;
BEGIN
  -- Get current backup codes
  SELECT backup_codes INTO v_backup_codes
  FROM user_2fa
  WHERE user_id = p_user_id AND is_enabled = true;

  IF NOT FOUND OR v_backup_codes IS NULL THEN
    RETURN false;
  END IF;

  -- Check if code exists and remove it
  IF p_code_hash = ANY(v_backup_codes) THEN
    v_code_found := true;

    -- Remove used code from array
    UPDATE user_2fa
    SET
      backup_codes = array_remove(backup_codes, p_code_hash),
      last_used_at = NOW(),
      failed_attempts = 0,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log successful verification
    INSERT INTO two_fa_verifications (user_id, verification_type, success)
    VALUES (p_user_id, 'backup_code', true);
  END IF;

  RETURN v_code_found;
END;
$$ LANGUAGE plpgsql;

-- Function: Add trusted device
CREATE OR REPLACE FUNCTION add_trusted_device(
  p_user_id UUID,
  p_device_fingerprint TEXT,
  p_device_name TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_trust_duration_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_device_id UUID;
BEGIN
  INSERT INTO trusted_devices (
    user_id,
    device_fingerprint,
    device_name,
    ip_address,
    user_agent,
    trust_expires_at
  ) VALUES (
    p_user_id,
    p_device_fingerprint,
    p_device_name,
    p_ip_address,
    p_user_agent,
    NOW() + (p_trust_duration_days || ' days')::INTERVAL
  )
  ON CONFLICT (user_id, device_fingerprint) DO UPDATE SET
    last_used_at = NOW(),
    trust_expires_at = NOW() + (p_trust_duration_days || ' days')::INTERVAL
  RETURNING id INTO v_device_id;

  RETURN v_device_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if device is trusted
CREATE OR REPLACE FUNCTION is_device_trusted(
  p_user_id UUID,
  p_device_fingerprint TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_trusted BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM trusted_devices
    WHERE user_id = p_user_id
    AND device_fingerprint = p_device_fingerprint
    AND is_trusted = true
    AND (trust_expires_at IS NULL OR trust_expires_at > NOW())
  ) INTO v_is_trusted;

  RETURN COALESCE(v_is_trusted, false);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own 2FA settings"
  ON user_2fa FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own 2FA settings"
  ON user_2fa FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own 2FA settings"
  ON user_2fa FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER TABLE two_fa_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification logs"
  ON two_fa_verifications FOR SELECT
  USING (user_id = auth.uid());

ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trusted devices"
  ON trusted_devices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own trusted devices"
  ON trusted_devices FOR ALL
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE user_2fa IS 'Two-factor authentication settings for users';
COMMENT ON TABLE two_fa_verifications IS 'Log of 2FA verification attempts';
COMMENT ON TABLE trusted_devices IS 'Devices that are trusted to skip 2FA';
COMMENT ON FUNCTION enable_2fa IS 'Enable 2FA with TOTP secret and backup codes';
COMMENT ON FUNCTION disable_2fa IS 'Disable 2FA for a user';
COMMENT ON FUNCTION verify_totp IS 'Verify a TOTP code (actual validation in app code)';
COMMENT ON FUNCTION use_backup_code IS 'Use and consume a backup code';
COMMENT ON FUNCTION add_trusted_device IS 'Add a device to trusted list';
COMMENT ON FUNCTION is_device_trusted IS 'Check if a device is trusted';
