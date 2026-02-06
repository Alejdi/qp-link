-- Recurring Invoices & Subscriptions Schema for QP Link
-- Enables recurring billing and subscription management via Stripe

-- =====================================================
-- 1. CREATE SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If customer has account

  -- Subscription details
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR' REFERENCES currencies(code),

  -- Billing interval
  interval TEXT NOT NULL, -- 'day', 'week', 'month', 'year'
  interval_count INTEGER DEFAULT 1, -- Every X intervals (e.g., every 2 months)

  -- Stripe details
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  stripe_product_id TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'paused', 'trialing'

  -- Dates
  trial_end_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Billing
  next_billing_date TIMESTAMP WITH TIME ZONE,
  last_billing_date TIMESTAMP WITH TIME ZONE,

  -- Settings
  auto_renew BOOLEAN DEFAULT true,
  send_invoice_reminder BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date) WHERE status = 'active';

-- =====================================================
-- 2. CREATE SUBSCRIPTION INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',

  -- Stripe
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'open', 'paid', 'uncollectible', 'void'

  -- Dates
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_stripe ON subscription_invoices(stripe_invoice_id);

-- =====================================================
-- 3. CREATE RECURRING INVOICE TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR' REFERENCES currencies(code),

  -- Recurrence settings
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  interval_count INTEGER DEFAULT 1,

  -- Settings
  is_active BOOLEAN DEFAULT true,
  auto_send BOOLEAN DEFAULT true,

  -- Invoice settings
  payment_terms_days INTEGER DEFAULT 7, -- Days until due
  late_fee_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Next generation
  next_generation_date TIMESTAMP WITH TIME ZONE,
  last_generated_at TIMESTAMP WITH TIME ZONE,

  -- Recipients (can be multiple)
  recipients JSONB DEFAULT '[]', -- Array of {email, name}

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_user ON recurring_invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_active ON recurring_invoice_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_gen ON recurring_invoice_templates(next_generation_date) WHERE is_active = true;

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access to subscription_invoices" ON subscription_invoices;
DROP POLICY IF EXISTS "Service role full access to recurring_invoice_templates" ON recurring_invoice_templates;

CREATE POLICY "Service role full access to subscriptions" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to subscription_invoices" ON subscription_invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to recurring_invoice_templates" ON recurring_invoice_templates
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to generate subscription invoice number
CREATE OR REPLACE FUNCTION generate_subscription_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_number TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM subscription_invoices;
  v_number := 'SUB-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next billing date
CREATE OR REPLACE FUNCTION calculate_next_billing_date(
  p_current_date TIMESTAMP WITH TIME ZONE,
  p_interval TEXT,
  p_interval_count INTEGER
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  CASE p_interval
    WHEN 'day' THEN
      RETURN p_current_date + (p_interval_count || ' days')::INTERVAL;
    WHEN 'week' THEN
      RETURN p_current_date + (p_interval_count || ' weeks')::INTERVAL;
    WHEN 'month' THEN
      RETURN p_current_date + (p_interval_count || ' months')::INTERVAL;
    WHEN 'year' THEN
      RETURN p_current_date + (p_interval_count || ' years')::INTERVAL;
    ELSE
      RETURN p_current_date + (p_interval_count || ' months')::INTERVAL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(
  p_subscription_id UUID,
  p_cancel_immediately BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription FROM subscriptions WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_cancel_immediately THEN
    -- Cancel immediately
    UPDATE subscriptions
    SET
      status = 'canceled',
      canceled_at = NOW(),
      ended_at = NOW(),
      updated_at = NOW()
    WHERE id = p_subscription_id;
  ELSE
    -- Cancel at period end
    UPDATE subscriptions
    SET
      cancel_at = current_period_end,
      auto_renew = false,
      updated_at = NOW()
    WHERE id = p_subscription_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process recurring template generation
CREATE OR REPLACE FUNCTION process_recurring_templates()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_template RECORD;
  v_invoice_id UUID;
BEGIN
  FOR v_template IN
    SELECT * FROM recurring_invoice_templates
    WHERE is_active = true
    AND next_generation_date <= NOW()
  LOOP
    -- Create invoice from template
    INSERT INTO products (
      user_id,
      name,
      description,
      price,
      currency,
      payment_status,
      is_active,
      short_code,
      metadata
    )
    VALUES (
      v_template.user_id,
      v_template.name,
      v_template.description,
      v_template.amount,
      v_template.currency,
      'unpaid',
      true,
      substring(md5(random()::text) from 1 for 8),
      jsonb_build_object(
        'recurring_template_id', v_template.id,
        'auto_send', v_template.auto_send,
        'recipients', v_template.recipients
      )
    )
    RETURNING id INTO v_invoice_id;

    -- Update template
    UPDATE recurring_invoice_templates
    SET
      last_generated_at = NOW(),
      next_generation_date = CASE v_template.frequency
        WHEN 'daily' THEN NOW() + (v_template.interval_count || ' days')::INTERVAL
        WHEN 'weekly' THEN NOW() + (v_template.interval_count || ' weeks')::INTERVAL
        WHEN 'monthly' THEN NOW() + (v_template.interval_count || ' months')::INTERVAL
        WHEN 'quarterly' THEN NOW() + ((v_template.interval_count * 3) || ' months')::INTERVAL
        WHEN 'yearly' THEN NOW() + (v_template.interval_count || ' years')::INTERVAL
        ELSE NOW() + (v_template.interval_count || ' months')::INTERVAL
      END,
      updated_at = NOW()
    WHERE id = v_template.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE!
-- =====================================================
