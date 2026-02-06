-- Fix RLS policies to allow user signup
-- Run this in your Supabase SQL Editor

-- Drop existing policies for users table
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Add new policies for users table
-- Allow anyone to create a user account (for signup)
CREATE POLICY "Allow public user signup" ON users
  FOR INSERT WITH CHECK (true);

-- Users can view their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- Users can update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow service role full access (for system operations)
CREATE POLICY "Service role has full access" ON users
  FOR ALL USING (auth.role() = 'service_role');
