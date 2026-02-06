-- Wallet System Schema for QP Link
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE WALLETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 0.00,
  pending_balance DECIMAL(15, 2) DEFAULT 0.00, -- Money waiting to clear
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- =====================================================
-- 2. CREATE TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction type and direction
  type TEXT NOT NULL, -- 'payment_received', 'withdrawal', 'refund', 'fee', 'adjustment'
  direction TEXT NOT NULL, -- 'in' or 'out'

  -- Money details
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) DEFAULT 0.00,
  net_amount DECIMAL(15, 2) NOT NULL, -- amount - fee
  currency TEXT DEFAULT 'USD',

  -- Source/destination info
  source TEXT NOT NULL, -- 'stripe', 'paypal', 'crypto', 'bank_transfer', 'manual'
  source_transaction_id TEXT, -- External transaction ID (Stripe payment intent, PayPal transaction, etc.)

  -- Related entities
  invoice_id UUID REFERENCES products(id) ON DELETE SET NULL, -- If related to an invoice
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL, -- If related to a card

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded', 'cancelled'

  -- Additional info
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Store extra data (payer info, etc.)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);

-- =====================================================
-- 3. CREATE WITHDRAWALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Amount
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) DEFAULT 0.00,
  net_amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Destination
  method TEXT NOT NULL, -- 'bank_transfer', 'paypal', 'crypto'
  destination_details JSONB NOT NULL, -- Bank account info, PayPal email, crypto address

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'

  -- Admin/processing
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- =====================================================
-- 4. CREATE PAYMENT METHODS TABLE (for withdrawals)
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Method type
  type TEXT NOT NULL, -- 'bank_account', 'paypal', 'crypto_wallet'

  -- Details (encrypted in production)
  details JSONB NOT NULL, -- Bank: {bank_name, account_number, routing_number}, PayPal: {email}, Crypto: {address, network}

  -- Display info
  display_name TEXT, -- "Bank of America ****1234", "PayPal: j***@email.com"

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- =====================================================
-- 5. ADD WALLET_ID TO CARDS TABLE
-- =====================================================

ALTER TABLE cards ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

-- =====================================================
-- 6. CREATE STRIPE EVENTS LOG (for webhook idempotency)
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to wallets" ON wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to withdrawals" ON withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to payment_methods" ON payment_methods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to stripe_events" ON stripe_events FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to create wallet for new user
CREATE OR REPLACE FUNCTION create_wallet_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  wallet_id UUID;
BEGIN
  INSERT INTO wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO wallet_id;

  IF wallet_id IS NULL THEN
    SELECT id INTO wallet_id FROM wallets WHERE user_id = p_user_id;
  END IF;

  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add transaction and update balance
CREATE OR REPLACE FUNCTION process_transaction(
  p_wallet_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_direction TEXT,
  p_amount DECIMAL,
  p_fee DECIMAL DEFAULT 0,
  p_source TEXT DEFAULT 'manual',
  p_source_transaction_id TEXT DEFAULT NULL,
  p_invoice_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_net_amount DECIMAL;
BEGIN
  -- Calculate net amount
  v_net_amount := p_amount - p_fee;

  -- Create transaction
  INSERT INTO transactions (
    wallet_id, user_id, type, direction, amount, fee, net_amount,
    source, source_transaction_id, invoice_id, description, metadata, status, completed_at
  )
  VALUES (
    p_wallet_id, p_user_id, p_type, p_direction, p_amount, p_fee, v_net_amount,
    p_source, p_source_transaction_id, p_invoice_id, p_description, p_metadata, 'completed', NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Update wallet balance
  IF p_direction = 'in' THEN
    UPDATE wallets SET balance = balance + v_net_amount, updated_at = NOW() WHERE id = p_wallet_id;
  ELSE
    UPDATE wallets SET balance = balance - v_net_amount, updated_at = NOW() WHERE id = p_wallet_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get wallet balance
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID)
RETURNS TABLE (balance DECIMAL, pending_balance DECIMAL, currency TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT w.balance, w.pending_balance, w.currency
  FROM wallets w
  WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGER: Auto-create wallet on user creation
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS create_wallet_on_user_insert ON users;
CREATE TRIGGER create_wallet_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_wallet();

-- =====================================================
-- 10. CREATE WALLETS FOR EXISTING USERS
-- =====================================================

INSERT INTO wallets (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- DONE!
-- =====================================================
