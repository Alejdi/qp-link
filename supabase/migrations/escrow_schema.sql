-- Escrow System Schema for QP Link
-- Run this in Supabase SQL Editor
-- This enables holding funds until both parties agree

-- =====================================================
-- 1. CREATE ESCROW TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties involved
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_email TEXT NOT NULL, -- Buyer might not have an account
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional if buyer has account

  -- Related entities
  invoice_id UUID REFERENCES products(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Money details
  amount DECIMAL(15, 2) NOT NULL,
  platform_fee DECIMAL(15, 2) DEFAULT 0.00,
  payment_processor_fee DECIMAL(15, 2) DEFAULT 0.00,
  net_amount DECIMAL(15, 2) NOT NULL, -- What seller receives after all fees
  currency TEXT DEFAULT 'EUR',

  -- Payment source
  payment_source TEXT NOT NULL, -- 'stripe', 'paypal', 'crypto', 'bank_transfer'
  payment_reference TEXT, -- External payment ID

  -- Status flow: pending -> held -> (released | refunded | disputed)
  status TEXT DEFAULT 'pending',
  -- pending: waiting for payment
  -- held: money received, waiting for delivery confirmation
  -- released: money sent to seller
  -- refunded: money returned to buyer
  -- disputed: under review

  -- Confirmation tracking
  seller_confirmed BOOLEAN DEFAULT false,
  seller_confirmed_at TIMESTAMP WITH TIME ZONE,
  buyer_confirmed BOOLEAN DEFAULT false,
  buyer_confirmed_at TIMESTAMP WITH TIME ZONE,

  -- Auto-release settings
  auto_release_at TIMESTAMP WITH TIME ZONE, -- Auto-release if buyer doesn't respond
  auto_release_days INTEGER DEFAULT 14, -- Days until auto-release

  -- Shipping/delivery tracking
  tracking_number TEXT,
  tracking_carrier TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,

  -- Dispute info
  dispute_reason TEXT,
  dispute_opened_at TIMESTAMP WITH TIME ZONE,
  dispute_resolved_at TIMESTAMP WITH TIME ZONE,
  dispute_resolution TEXT, -- 'released_to_seller', 'refunded_to_buyer', 'split'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_escrows_seller ON escrows(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON escrows(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrows_invoice ON escrows(invoice_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrows_auto_release ON escrows(auto_release_at) WHERE status = 'held';

-- =====================================================
-- 2. UPDATE WALLETS TABLE - Add frozen balance
-- =====================================================

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(15, 2) DEFAULT 0.00;
-- frozen_balance: Money in escrow, not yet available

-- Now wallet has:
-- balance: Available to withdraw
-- pending_balance: Processing (not confirmed yet)
-- frozen_balance: In escrow (confirmed but held)

-- =====================================================
-- 3. CREATE ESCROW EVENTS TABLE (audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'payment_received', 'shipped', 'delivered', 'buyer_confirmed', 'seller_confirmed', 'released', 'refunded', 'disputed', 'resolved'
  actor_type TEXT, -- 'buyer', 'seller', 'system', 'admin'
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_events_escrow ON escrow_events(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_events_created ON escrow_events(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Service role full access to escrows" ON escrows;
DROP POLICY IF EXISTS "Service role full access to escrow_events" ON escrow_events;

CREATE POLICY "Service role full access to escrows" ON escrows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to escrow_events" ON escrow_events FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to create escrow when payment is received
CREATE OR REPLACE FUNCTION create_escrow(
  p_seller_id UUID,
  p_buyer_email TEXT,
  p_invoice_id UUID,
  p_amount DECIMAL,
  p_platform_fee DECIMAL DEFAULT 0,
  p_processor_fee DECIMAL DEFAULT 0,
  p_payment_source TEXT DEFAULT 'stripe',
  p_payment_reference TEXT DEFAULT NULL,
  p_auto_release_days INTEGER DEFAULT 14
)
RETURNS UUID AS $$
DECLARE
  v_escrow_id UUID;
  v_net_amount DECIMAL;
  v_auto_release TIMESTAMP;
BEGIN
  v_net_amount := p_amount - p_platform_fee - p_processor_fee;
  v_auto_release := NOW() + (p_auto_release_days || ' days')::INTERVAL;

  -- Create escrow record
  INSERT INTO escrows (
    seller_id, buyer_email, invoice_id, amount, platform_fee,
    payment_processor_fee, net_amount, payment_source, payment_reference,
    status, auto_release_at, auto_release_days
  )
  VALUES (
    p_seller_id, p_buyer_email, p_invoice_id, p_amount, p_platform_fee,
    p_processor_fee, v_net_amount, p_payment_source, p_payment_reference,
    'held', v_auto_release, p_auto_release_days
  )
  RETURNING id INTO v_escrow_id;

  -- Update seller's frozen balance
  UPDATE wallets
  SET frozen_balance = frozen_balance + v_net_amount, updated_at = NOW()
  WHERE user_id = p_seller_id;

  -- Log event
  INSERT INTO escrow_events (escrow_id, event_type, actor_type, details)
  VALUES (v_escrow_id, 'payment_received', 'system', jsonb_build_object(
    'amount', p_amount,
    'net_amount', v_net_amount,
    'source', p_payment_source
  ));

  RETURN v_escrow_id;
END;
$$ LANGUAGE plpgsql;

-- Function to release escrow to seller
CREATE OR REPLACE FUNCTION release_escrow(
  p_escrow_id UUID,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_escrow RECORD;
BEGIN
  -- Get escrow details
  SELECT * INTO v_escrow FROM escrows WHERE id = p_escrow_id AND status = 'held';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update escrow status
  UPDATE escrows
  SET status = 'released', released_at = NOW(), updated_at = NOW()
  WHERE id = p_escrow_id;

  -- Move from frozen to available balance
  UPDATE wallets
  SET
    frozen_balance = frozen_balance - v_escrow.net_amount,
    balance = balance + v_escrow.net_amount,
    updated_at = NOW()
  WHERE user_id = v_escrow.seller_id;

  -- Update existing pending transaction to completed (instead of creating duplicate)
  UPDATE transactions
  SET
    status = 'completed',
    completed_at = NOW(),
    description = 'Payment released from escrow'
  WHERE invoice_id = v_escrow.invoice_id
    AND user_id = v_escrow.seller_id
    AND status = 'pending'
    AND type = 'payment_received';

  -- If no pending transaction found (shouldn't happen), create one
  INSERT INTO transactions (
    wallet_id, user_id, type, direction, amount, fee, net_amount,
    source, invoice_id, status, description, completed_at
  )
  SELECT
    w.id, v_escrow.seller_id, 'escrow_release', 'in', v_escrow.amount,
    v_escrow.platform_fee + v_escrow.payment_processor_fee, v_escrow.net_amount,
    v_escrow.payment_source, v_escrow.invoice_id, 'completed',
    'Payment released from escrow (recovery)', NOW()
  FROM wallets w
  WHERE w.user_id = v_escrow.seller_id
    AND NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE invoice_id = v_escrow.invoice_id
        AND user_id = v_escrow.seller_id
        AND type = 'payment_received'
    );

  -- Log event
  INSERT INTO escrow_events (escrow_id, event_type, actor_type, actor_id)
  VALUES (p_escrow_id, 'released', p_actor_type, p_actor_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to refund escrow to buyer
CREATE OR REPLACE FUNCTION refund_escrow(
  p_escrow_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_escrow RECORD;
BEGIN
  -- Get escrow details
  SELECT * INTO v_escrow FROM escrows WHERE id = p_escrow_id AND status = 'held';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update escrow status
  UPDATE escrows
  SET status = 'refunded', refunded_at = NOW(), updated_at = NOW()
  WHERE id = p_escrow_id;

  -- Remove from frozen balance (refund goes back to buyer via payment processor)
  UPDATE wallets
  SET frozen_balance = frozen_balance - v_escrow.net_amount, updated_at = NOW()
  WHERE user_id = v_escrow.seller_id;

  -- Log event
  INSERT INTO escrow_events (escrow_id, event_type, actor_type, actor_id, details)
  VALUES (p_escrow_id, 'refunded', p_actor_type, p_actor_id, jsonb_build_object('reason', p_reason));

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. AUTO-RELEASE JOB (run via cron or edge function)
-- =====================================================

-- This function should be called periodically (e.g., daily via Supabase Edge Function)
CREATE OR REPLACE FUNCTION process_auto_releases()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_escrow RECORD;
BEGIN
  -- Find escrows ready for auto-release
  FOR v_escrow IN
    SELECT id FROM escrows
    WHERE status = 'held'
    AND auto_release_at <= NOW()
    AND seller_confirmed = true -- Seller must have confirmed shipping
  LOOP
    PERFORM release_escrow(v_escrow.id, 'system', NULL);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE!
-- =====================================================
