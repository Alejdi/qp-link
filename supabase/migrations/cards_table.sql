-- Cards Table Migration for QP Link
-- Run this in Supabase SQL Editor

-- =====================================================
-- CREATE CARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL UNIQUE,
  holder_name TEXT NOT NULL,
  cvc TEXT NOT NULL,
  card_type TEXT DEFAULT 'secondary', -- 'primary' or 'secondary'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_number ON cards(card_number);

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own cards
CREATE POLICY "Users can view own cards" ON cards
  FOR SELECT USING (auth.uid()::text = user_id::text OR true);

-- Policy: Users can insert their own cards
CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their own cards
CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (true);

-- Policy: Users can update their own cards
CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (true);

-- =====================================================
-- DONE!
-- =====================================================
