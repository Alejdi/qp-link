-- Multi-Currency Support Schema for QP Link
-- Allows invoices, payment links, and transactions in multiple currencies

-- =====================================================
-- 1. CREATE CURRENCIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY, -- ISO 4217 currency code (USD, EUR, GBP, etc.)
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  exchange_rate_to_eur DECIMAL(15, 6) DEFAULT 1.0, -- Rate to convert to EUR
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active) WHERE is_active = true;

-- Insert supported currencies
INSERT INTO currencies (code, name, symbol, decimal_places, exchange_rate_to_eur) VALUES
  ('EUR', 'Euro', '€', 2, 1.0),
  ('USD', 'US Dollar', '$', 2, 0.92),
  ('GBP', 'British Pound', '£', 2, 1.17),
  ('JPY', 'Japanese Yen', '¥', 0, 0.0062),
  ('CAD', 'Canadian Dollar', 'C$', 2, 0.68),
  ('AUD', 'Australian Dollar', 'A$', 2, 0.60),
  ('CHF', 'Swiss Franc', 'CHF', 2, 1.05),
  ('CNY', 'Chinese Yuan', '¥', 2, 0.13),
  ('INR', 'Indian Rupee', '₹', 2, 0.011),
  ('BRL', 'Brazilian Real', 'R$', 2, 0.18),
  ('MXN', 'Mexican Peso', '$', 2, 0.053),
  ('SGD', 'Singapore Dollar', 'S$', 2, 0.68),
  ('NZD', 'New Zealand Dollar', 'NZ$', 2, 0.55),
  ('SEK', 'Swedish Krona', 'kr', 2, 0.087),
  ('NOK', 'Norwegian Krone', 'kr', 2, 0.086),
  ('DKK', 'Danish Krone', 'kr', 2, 0.13),
  ('PLN', 'Polish Zloty', 'zł', 2, 0.23),
  ('CZK', 'Czech Koruna', 'Kč', 2, 0.039),
  ('HUF', 'Hungarian Forint', 'Ft', 2, 0.0026),
  ('TRY', 'Turkish Lira', '₺', 2, 0.029)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. ADD CURRENCY COLUMNS TO EXISTING TABLES
-- =====================================================

-- Update products table (invoices)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR' REFERENCES currencies(code);

-- Update payment_links table
-- Already has currency column

-- Update transactions table
-- Already has currency column in metadata, but let's add proper column
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR' REFERENCES currencies(code);

-- Update wallets table - add multi-currency balances
CREATE TABLE IF NOT EXISTS wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  currency TEXT NOT NULL REFERENCES currencies(code),
  balance DECIMAL(15, 2) DEFAULT 0.00,
  frozen_balance DECIMAL(15, 2) DEFAULT 0.00,
  pending_balance DECIMAL(15, 2) DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallet_balances_wallet ON wallet_balances(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_currency ON wallet_balances(currency);

-- =====================================================
-- 3. CURRENCY CONVERSION FUNCTIONS
-- =====================================================

-- Function to convert amount from one currency to another
CREATE OR REPLACE FUNCTION convert_currency(
  p_amount DECIMAL,
  p_from_currency TEXT,
  p_to_currency TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_from_rate DECIMAL;
  v_to_rate DECIMAL;
  v_eur_amount DECIMAL;
  v_result DECIMAL;
BEGIN
  -- If same currency, no conversion needed
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;

  -- Get exchange rates
  SELECT exchange_rate_to_eur INTO v_from_rate
  FROM currencies
  WHERE code = p_from_currency AND is_active = true;

  SELECT exchange_rate_to_eur INTO v_to_rate
  FROM currencies
  WHERE code = p_to_currency AND is_active = true;

  IF v_from_rate IS NULL OR v_to_rate IS NULL THEN
    RAISE EXCEPTION 'Invalid currency codes or inactive currencies';
  END IF;

  -- Convert to EUR first, then to target currency
  v_eur_amount := p_amount * v_from_rate;
  v_result := v_eur_amount / v_to_rate;

  RETURN ROUND(v_result, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get wallet balance in specific currency
CREATE OR REPLACE FUNCTION get_wallet_balance(
  p_wallet_id UUID,
  p_currency TEXT DEFAULT 'EUR'
)
RETURNS TABLE(
  balance DECIMAL,
  frozen_balance DECIMAL,
  pending_balance DECIMAL,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(wb.balance, 0.00) as balance,
    COALESCE(wb.frozen_balance, 0.00) as frozen_balance,
    COALESCE(wb.pending_balance, 0.00) as pending_balance,
    p_currency as currency
  FROM wallet_balances wb
  WHERE wb.wallet_id = p_wallet_id AND wb.currency = p_currency;

  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0.00::DECIMAL, 0.00::DECIMAL, 0.00::DECIMAL, p_currency;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet balance (multi-currency)
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_wallet_id UUID,
  p_currency TEXT,
  p_amount DECIMAL,
  p_balance_type TEXT DEFAULT 'balance' -- 'balance', 'frozen', 'pending'
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update wallet balance
  INSERT INTO wallet_balances (wallet_id, currency, balance, frozen_balance, pending_balance)
  VALUES (
    p_wallet_id,
    p_currency,
    CASE WHEN p_balance_type = 'balance' THEN p_amount ELSE 0 END,
    CASE WHEN p_balance_type = 'frozen' THEN p_amount ELSE 0 END,
    CASE WHEN p_balance_type = 'pending' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (wallet_id, currency) DO UPDATE SET
    balance = CASE
      WHEN p_balance_type = 'balance' THEN wallet_balances.balance + p_amount
      ELSE wallet_balances.balance
    END,
    frozen_balance = CASE
      WHEN p_balance_type = 'frozen' THEN wallet_balances.frozen_balance + p_amount
      ELSE wallet_balances.frozen_balance
    END,
    pending_balance = CASE
      WHEN p_balance_type = 'pending' THEN wallet_balances.pending_balance + p_amount
      ELSE wallet_balances.pending_balance
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to currencies" ON currencies;
DROP POLICY IF EXISTS "Service role full access to currencies" ON currencies;
DROP POLICY IF EXISTS "Service role full access to wallet_balances" ON wallet_balances;

-- Anyone can read active currencies
CREATE POLICY "Public read access to currencies" ON currencies
  FOR SELECT USING (is_active = true);

-- Service role full access
CREATE POLICY "Service role full access to currencies" ON currencies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to wallet_balances" ON wallet_balances
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. MIGRATE EXISTING WALLET BALANCES
-- =====================================================

-- Migrate existing wallet balances to multi-currency table (EUR only initially)
INSERT INTO wallet_balances (wallet_id, currency, balance, frozen_balance, pending_balance, created_at)
SELECT
  id as wallet_id,
  'EUR' as currency,
  COALESCE(balance, 0) as balance,
  COALESCE(frozen_balance, 0) as frozen_balance,
  COALESCE(pending_balance, 0) as pending_balance,
  created_at
FROM wallets
ON CONFLICT (wallet_id, currency) DO NOTHING;

-- =====================================================
-- 6. EXCHANGE RATE UPDATE FUNCTION (for admin/cron)
-- =====================================================

-- This function should be called periodically to update exchange rates
-- You would integrate with an API like exchangerate-api.com or fixer.io
CREATE OR REPLACE FUNCTION update_exchange_rates(
  p_rates JSONB -- { "USD": 0.92, "GBP": 1.17, ... }
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_currency TEXT;
  v_rate DECIMAL;
BEGIN
  -- Loop through provided rates
  FOR v_currency, v_rate IN SELECT * FROM jsonb_each_text(p_rates)
  LOOP
    UPDATE currencies
    SET
      exchange_rate_to_eur = v_rate::DECIMAL,
      last_updated = NOW()
    WHERE code = v_currency AND is_active = true;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE!
-- =====================================================
