-- User Webhooks Schema
-- Allows users to register webhook endpoints to receive event notifications

-- Create user webhooks table
CREATE TABLE IF NOT EXISTS user_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,

  -- Webhook details
  url TEXT NOT NULL,
  description TEXT,
  secret TEXT NOT NULL, -- HMAC secret for signature verification

  -- Event subscriptions
  events TEXT[] NOT NULL DEFAULT '{}', -- Array of event types to subscribe to
  is_active BOOLEAN DEFAULT true,

  -- Security
  verify_ssl BOOLEAN DEFAULT true,
  custom_headers JSONB DEFAULT '{}',

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMP WITH TIME ZONE,

  -- Status tracking
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,

  -- Health monitoring
  consecutive_failures INTEGER DEFAULT 0,
  disabled_at TIMESTAMP WITH TIME ZONE,
  disabled_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT valid_rate_limit CHECK (rate_limit_per_minute > 0 AND rate_limit_per_minute <= 300)
);

CREATE INDEX IF NOT EXISTS idx_user_webhooks_user_id ON user_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_is_active ON user_webhooks(is_active);

-- Create webhook delivery log table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES user_webhooks(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload JSONB NOT NULL,

  -- Delivery attempt
  attempt_number INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  http_status INTEGER,
  response_body TEXT,
  error_message TEXT,

  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE,
  response_time_ms INTEGER,

  -- Next retry
  next_retry_at TIMESTAMP WITH TIME ZONE,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed';

-- Available webhook events
CREATE TABLE IF NOT EXISTS webhook_event_types (
  event_type TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  example_payload JSONB
);

-- Insert available event types
INSERT INTO webhook_event_types (event_type, category, description) VALUES
  ('invoice.created', 'invoices', 'A new invoice was created'),
  ('invoice.paid', 'invoices', 'An invoice was paid'),
  ('invoice.cancelled', 'invoices', 'An invoice was cancelled'),
  ('payment.succeeded', 'payments', 'A payment was successful'),
  ('payment.failed', 'payments', 'A payment failed'),
  ('escrow.created', 'escrow', 'An escrow was created'),
  ('escrow.released', 'escrow', 'Escrow funds were released'),
  ('escrow.disputed', 'escrow', 'An escrow dispute was opened'),
  ('milestone.approved', 'milestones', 'An escrow milestone was approved'),
  ('milestone.released', 'milestones', 'Milestone funds were released'),
  ('milestone.rejected', 'milestones', 'A milestone was rejected'),
  ('subscription.created', 'subscriptions', 'A new subscription was created'),
  ('subscription.updated', 'subscriptions', 'A subscription was updated'),
  ('subscription.cancelled', 'subscriptions', 'A subscription was cancelled'),
  ('payment_link.paid', 'payment_links', 'A payment link was paid'),
  ('wallet.credited', 'wallet', 'Wallet balance was credited'),
  ('wallet.debited', 'wallet', 'Wallet balance was debited'),
  ('payout.initiated', 'payouts', 'A payout was initiated'),
  ('payout.completed', 'payouts', 'A payout was completed'),
  ('payout.failed', 'payouts', 'A payout failed')
ON CONFLICT (event_type) DO NOTHING;

-- Function: Create webhook
CREATE OR REPLACE FUNCTION create_user_webhook(
  p_user_id UUID,
  p_url TEXT,
  p_description TEXT,
  p_events TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_webhook_id UUID;
  v_secret TEXT;
BEGIN
  -- Generate HMAC secret
  v_secret := encode(gen_random_bytes(32), 'hex');

  -- Create webhook
  INSERT INTO user_webhooks (
    user_id,
    url,
    description,
    secret,
    events,
    is_active
  ) VALUES (
    p_user_id,
    p_url,
    p_description,
    v_secret,
    p_events,
    true
  )
  RETURNING id INTO v_webhook_id;

  RETURN v_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Trigger webhook
CREATE OR REPLACE FUNCTION trigger_user_webhooks(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_id TEXT,
  p_payload JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_webhook RECORD;
  v_delivery_id UUID;
  v_triggered_count INTEGER := 0;
BEGIN
  -- Find active webhooks subscribed to this event
  FOR v_webhook IN
    SELECT * FROM user_webhooks
    WHERE user_id = p_user_id
    AND is_active = true
    AND p_event_type = ANY(events)
    AND consecutive_failures < 5 -- Disable after 5 consecutive failures
  LOOP
    -- Check rate limit
    IF v_webhook.last_triggered_at IS NOT NULL THEN
      IF EXTRACT(EPOCH FROM (NOW() - v_webhook.last_triggered_at)) < 60.0 / v_webhook.rate_limit_per_minute THEN
        -- Skip this webhook due to rate limit
        CONTINUE;
      END IF;
    END IF;

    -- Create delivery record
    INSERT INTO webhook_deliveries (
      webhook_id,
      event_type,
      event_id,
      payload,
      status,
      next_retry_at
    ) VALUES (
      v_webhook.id,
      p_event_type,
      p_event_id,
      p_payload,
      'pending',
      NOW()
    )
    RETURNING id INTO v_delivery_id;

    -- Update webhook last triggered time
    UPDATE user_webhooks
    SET
      last_triggered_at = NOW(),
      total_deliveries = total_deliveries + 1,
      updated_at = NOW()
    WHERE id = v_webhook.id;

    v_triggered_count := v_triggered_count + 1;
  END LOOP;

  RETURN v_triggered_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Record webhook delivery result
CREATE OR REPLACE FUNCTION record_webhook_delivery(
  p_delivery_id UUID,
  p_status TEXT,
  p_http_status INTEGER,
  p_response_body TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_webhook_id UUID;
  v_attempt_number INTEGER;
  v_max_retries INTEGER;
BEGIN
  -- Get delivery details
  SELECT webhook_id, attempt_number, max_retries
  INTO v_webhook_id, v_attempt_number, v_max_retries
  FROM webhook_deliveries
  WHERE id = p_delivery_id;

  -- Update delivery record
  UPDATE webhook_deliveries
  SET
    status = p_status,
    http_status = p_http_status,
    response_body = p_response_body,
    error_message = p_error_message,
    response_time_ms = p_response_time_ms,
    sent_at = NOW(),
    next_retry_at = CASE
      WHEN p_status = 'failed' AND attempt_number < max_retries
      THEN NOW() + (INTERVAL '1 minute' * POWER(2, attempt_number)) -- Exponential backoff
      ELSE NULL
    END
  WHERE id = p_delivery_id;

  -- Update webhook statistics
  IF p_status = 'success' THEN
    UPDATE user_webhooks
    SET
      successful_deliveries = successful_deliveries + 1,
      last_success_at = NOW(),
      consecutive_failures = 0,
      updated_at = NOW()
    WHERE id = v_webhook_id;
  ELSIF p_status = 'failed' THEN
    UPDATE user_webhooks
    SET
      failed_deliveries = failed_deliveries + 1,
      last_failure_at = NOW(),
      last_error = p_error_message,
      consecutive_failures = consecutive_failures + 1,
      updated_at = NOW(),
      -- Disable webhook after 5 consecutive failures
      is_active = CASE
        WHEN consecutive_failures + 1 >= 5 THEN false
        ELSE is_active
      END,
      disabled_at = CASE
        WHEN consecutive_failures + 1 >= 5 THEN NOW()
        ELSE disabled_at
      END,
      disabled_reason = CASE
        WHEN consecutive_failures + 1 >= 5 THEN 'Disabled due to repeated failures'
        ELSE disabled_reason
      END
    WHERE id = v_webhook_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Retry failed delivery
CREATE OR REPLACE FUNCTION retry_webhook_delivery(p_delivery_id UUID)
RETURNS UUID AS $$
DECLARE
  v_delivery RECORD;
  v_new_delivery_id UUID;
BEGIN
  -- Get original delivery
  SELECT * INTO v_delivery
  FROM webhook_deliveries
  WHERE id = p_delivery_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF v_delivery.attempt_number >= v_delivery.max_retries THEN
    RAISE EXCEPTION 'Max retries exceeded';
  END IF;

  -- Create new delivery attempt
  INSERT INTO webhook_deliveries (
    webhook_id,
    event_type,
    event_id,
    payload,
    attempt_number,
    status,
    next_retry_at,
    max_retries
  ) VALUES (
    v_delivery.webhook_id,
    v_delivery.event_type,
    v_delivery.event_id,
    v_delivery.payload,
    v_delivery.attempt_number + 1,
    'pending',
    NOW(),
    v_delivery.max_retries
  )
  RETURNING id INTO v_new_delivery_id;

  RETURN v_new_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhooks"
  ON user_webhooks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own webhooks"
  ON user_webhooks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own webhooks"
  ON user_webhooks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own webhooks"
  ON user_webhooks FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries for their webhooks"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_webhooks
      WHERE user_webhooks.id = webhook_deliveries.webhook_id
      AND user_webhooks.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE user_webhooks IS 'User-registered webhook endpoints for receiving event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts and their results';
COMMENT ON TABLE webhook_event_types IS 'Available webhook event types that users can subscribe to';
COMMENT ON FUNCTION create_user_webhook IS 'Creates a new webhook endpoint with auto-generated HMAC secret';
COMMENT ON FUNCTION trigger_user_webhooks IS 'Triggers all active webhooks subscribed to an event type';
COMMENT ON FUNCTION record_webhook_delivery IS 'Records the result of a webhook delivery attempt';
COMMENT ON FUNCTION retry_webhook_delivery IS 'Creates a retry attempt for a failed webhook delivery';
