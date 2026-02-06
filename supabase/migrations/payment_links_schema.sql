-- Payment Links Schema for QP Link
-- Allows users to create simple payment links without full invoices

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Link details
  title TEXT NOT NULL,
  description TEXT,
  short_code TEXT UNIQUE NOT NULL, -- e.g., "donate-coffee", "tip-jar-1"

  -- Pricing
  amount DECIMAL(15, 2), -- NULL for custom amount
  min_amount DECIMAL(15, 2) DEFAULT 1.00,
  max_amount DECIMAL(15, 2),
  currency TEXT DEFAULT 'EUR',
  allow_custom_amount BOOLEAN DEFAULT false,

  -- Link type
  link_type TEXT DEFAULT 'one_time', -- 'one_time', 'donation', 'tip_jar'

  -- Status
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER, -- NULL for unlimited
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Settings
  require_email BOOLEAN DEFAULT true,
  require_name BOOLEAN DEFAULT false,
  success_message TEXT,
  redirect_url TEXT,

  -- QR Code
  qr_code_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payment_links_user ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_short_code ON payment_links(short_code);
CREATE INDEX IF NOT EXISTS idx_payment_links_active ON payment_links(is_active) WHERE is_active = true;

-- Payment Link Payments (track individual payments)
CREATE TABLE IF NOT EXISTS payment_link_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'

  -- Payer info
  payer_email TEXT,
  payer_name TEXT,
  payer_message TEXT,

  -- Stripe/payment processor
  payment_intent_id TEXT,
  checkout_session_id TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payment_link_payments_link ON payment_link_payments(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_link_payments_status ON payment_link_payments(status);

-- RLS
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_link_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to payment_links" ON payment_links;
DROP POLICY IF EXISTS "Service role full access to payment_link_payments" ON payment_link_payments;

CREATE POLICY "Service role full access to payment_links" ON payment_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to payment_link_payments" ON payment_link_payments FOR ALL USING (true) WITH CHECK (true);

-- Function to generate unique short code
CREATE OR REPLACE FUNCTION generate_payment_link_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Done!
