-- ============================================
-- Complete Verification System Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add missing columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS id_front_url TEXT,
  ADD COLUMN IF NOT EXISTS id_back_url TEXT;

-- 2. Create verification_codes table for phone OTP
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- 3. Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email verification
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- 4. Update existing users to have email_verified = true for Google OAuth users
-- (Users with null password are OAuth users)
UPDATE users
SET email_verified = true
WHERE password IS NULL;

-- 5. Create storage bucket for ID documents (run this separately in Supabase Dashboard)
-- Go to Storage → Create bucket → Name: "id-documents" → Make it private
-- Then run this to set up policies:

-- Storage policies for id-documents bucket
-- Note: You need to create the bucket first in Supabase Dashboard
-- Storage → Create new bucket → name: "id-documents" → Private

-- Allow authenticated users to upload their own ID documents
-- CREATE POLICY "Users can upload their ID documents"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'id-documents');

-- Allow service role to read all ID documents (for admin verification)
-- CREATE POLICY "Service role can read all ID documents"
-- ON storage.objects FOR SELECT
-- TO service_role
-- USING (bucket_id = 'id-documents');

-- 6. Add comment to track migration
COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens with 24-hour expiry';
COMMENT ON TABLE verification_codes IS 'Stores phone verification OTP codes with 10-minute expiry';

-- 7. Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('email_verified', 'phone_verified', 'id_verified', 'kyc_status', 'id_front_url', 'id_back_url')
ORDER BY column_name;
