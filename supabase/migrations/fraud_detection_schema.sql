-- Fraud Detection System Schema

-- Transaction risk scores and flags
CREATE TABLE IF NOT EXISTS transaction_risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0, -- 0-100 scale
  risk_level TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  flags TEXT[] DEFAULT '{}', -- Array of triggered flags
  reason TEXT,
  is_blocked BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User behavior patterns and anomalies
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  avg_transaction_amount DECIMAL(15, 2) DEFAULT 0,
  max_transaction_amount DECIMAL(15, 2) DEFAULT 0,
  avg_daily_transactions INTEGER DEFAULT 0,
  typical_transaction_hours INTEGER[] DEFAULT '{}', -- Hours of day user typically transacts
  typical_currencies TEXT[] DEFAULT '{}',
  typical_countries TEXT[] DEFAULT '{}',
  suspicious_activity_count INTEGER DEFAULT 0,
  last_suspicious_activity TIMESTAMP WITH TIME ZONE,
  trust_score DECIMAL(5, 2) DEFAULT 50, -- 0-100, starts at 50
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fraud rules configuration
CREATE TABLE IF NOT EXISTS fraud_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL, -- velocity, amount, location, device, pattern
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  risk_points INTEGER NOT NULL DEFAULT 10, -- Points added to risk score when triggered
  action TEXT NOT NULL DEFAULT 'flag', -- flag, review, block, alert
  config JSONB NOT NULL DEFAULT '{}', -- Rule-specific configuration
  times_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked entities (IPs, emails, cards, etc.)
CREATE TABLE IF NOT EXISTS blocked_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- ip, email, card_hash, device_fingerprint
  entity_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN DEFAULT false,
  times_blocked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(entity_type, entity_value)
);

-- Fraud alerts for admin review
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID REFERENCES transactions(id),
  alert_type TEXT NOT NULL, -- high_risk, velocity, amount_anomaly, location_anomaly, etc.
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, investigating, resolved, false_positive
  assigned_to UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device fingerprints for tracking
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  fingerprint_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_count INTEGER DEFAULT 0,
  is_suspicious BOOLEAN DEFAULT false,
  UNIQUE(user_id, fingerprint_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_risk_scores_transaction ON transaction_risk_scores(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_risk_scores_user ON transaction_risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_risk_scores_risk_level ON transaction_risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_user ON user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_type_value ON blocked_entities(entity_type, entity_value);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id);

-- Enable Row Level Security
ALTER TABLE transaction_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view their own data
CREATE POLICY "Users can view own risk scores" ON transaction_risk_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own behavior patterns" ON user_behavior_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own device fingerprints" ON device_fingerprints
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all risk scores" ON transaction_risk_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage fraud rules" ON fraud_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage blocked entities" ON blocked_entities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage fraud alerts" ON fraud_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to calculate transaction risk score
CREATE OR REPLACE FUNCTION calculate_transaction_risk(
  p_user_id UUID,
  p_transaction_id UUID,
  p_amount DECIMAL,
  p_currency TEXT,
  p_ip_address TEXT,
  p_device_fingerprint TEXT
)
RETURNS TABLE(risk_score DECIMAL, risk_level TEXT, flags TEXT[]) AS $$
DECLARE
  v_risk_score DECIMAL := 0;
  v_risk_level TEXT := 'low';
  v_flags TEXT[] := '{}';
  v_behavior user_behavior_patterns%ROWTYPE;
  v_recent_tx_count INTEGER;
  v_recent_tx_amount DECIMAL;
  v_hour INTEGER;
  v_is_blocked BOOLEAN;
BEGIN
  -- Get user behavior pattern
  SELECT * INTO v_behavior FROM user_behavior_patterns WHERE user_id = p_user_id;

  -- Check if entity is blocked
  SELECT EXISTS(
    SELECT 1 FROM blocked_entities
    WHERE (entity_type = 'ip' AND entity_value = p_ip_address)
       OR (entity_type = 'device_fingerprint' AND entity_value = p_device_fingerprint)
       AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    v_risk_score := 100;
    v_risk_level := 'critical';
    v_flags := array_append(v_flags, 'blocked_entity');
    RETURN QUERY SELECT v_risk_score, v_risk_level, v_flags;
    RETURN;
  END IF;

  -- Rule 1: Amount anomaly (transaction >> average)
  IF v_behavior.avg_transaction_amount > 0 AND p_amount > v_behavior.avg_transaction_amount * 5 THEN
    v_risk_score := v_risk_score + 25;
    v_flags := array_append(v_flags, 'amount_anomaly');
  END IF;

  -- Rule 2: Amount exceeds user maximum
  IF v_behavior.max_transaction_amount > 0 AND p_amount > v_behavior.max_transaction_amount * 2 THEN
    v_risk_score := v_risk_score + 20;
    v_flags := array_append(v_flags, 'exceeds_max_amount');
  END IF;

  -- Rule 3: Velocity check - multiple transactions in short time
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_recent_tx_count, v_recent_tx_amount
  FROM transactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_tx_count >= 10 THEN
    v_risk_score := v_risk_score + 30;
    v_flags := array_append(v_flags, 'high_velocity');
  ELSIF v_recent_tx_count >= 5 THEN
    v_risk_score := v_risk_score + 15;
    v_flags := array_append(v_flags, 'moderate_velocity');
  END IF;

  -- Rule 4: Unusual time of day
  v_hour := EXTRACT(HOUR FROM NOW());
  IF v_behavior.typical_transaction_hours IS NOT NULL
     AND array_length(v_behavior.typical_transaction_hours, 1) > 0
     AND NOT (v_hour = ANY(v_behavior.typical_transaction_hours)) THEN
    v_risk_score := v_risk_score + 10;
    v_flags := array_append(v_flags, 'unusual_time');
  END IF;

  -- Rule 5: New currency
  IF v_behavior.typical_currencies IS NOT NULL
     AND array_length(v_behavior.typical_currencies, 1) > 0
     AND NOT (p_currency = ANY(v_behavior.typical_currencies)) THEN
    v_risk_score := v_risk_score + 15;
    v_flags := array_append(v_flags, 'new_currency');
  END IF;

  -- Rule 6: Low trust score user
  IF v_behavior.trust_score < 30 THEN
    v_risk_score := v_risk_score + 20;
    v_flags := array_append(v_flags, 'low_trust_user');
  END IF;

  -- Rule 7: High suspicious activity count
  IF v_behavior.suspicious_activity_count >= 5 THEN
    v_risk_score := v_risk_score + 25;
    v_flags := array_append(v_flags, 'repeat_offender');
  END IF;

  -- Determine risk level
  IF v_risk_score >= 70 THEN
    v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'high';
  ELSIF v_risk_score >= 30 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;

  RETURN QUERY SELECT v_risk_score, v_risk_level, v_flags;
END;
$$ LANGUAGE plpgsql;

-- Function to update user behavior patterns
CREATE OR REPLACE FUNCTION update_user_behavior_pattern(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_avg_amount DECIMAL;
  v_max_amount DECIMAL;
  v_avg_daily_tx INTEGER;
  v_typical_hours INTEGER[];
  v_typical_currencies TEXT[];
BEGIN
  -- Calculate averages from last 90 days
  SELECT
    COALESCE(AVG(amount), 0),
    COALESCE(MAX(amount), 0)
  INTO v_avg_amount, v_max_amount
  FROM transactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '90 days'
    AND status = 'completed';

  -- Calculate average daily transaction count
  SELECT COALESCE(AVG(daily_count), 0)::INTEGER INTO v_avg_daily_tx
  FROM (
    SELECT DATE(created_at) as tx_date, COUNT(*) as daily_count
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '90 days'
    GROUP BY DATE(created_at)
  ) daily_stats;

  -- Get typical transaction hours (mode of hours)
  SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM created_at)::INTEGER)
  INTO v_typical_hours
  FROM transactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Get typical currencies
  SELECT ARRAY_AGG(DISTINCT currency)
  INTO v_typical_currencies
  FROM transactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '90 days';

  -- Insert or update behavior pattern
  INSERT INTO user_behavior_patterns (
    user_id,
    avg_transaction_amount,
    max_transaction_amount,
    avg_daily_transactions,
    typical_transaction_hours,
    typical_currencies,
    updated_at
  ) VALUES (
    p_user_id,
    v_avg_amount,
    v_max_amount,
    v_avg_daily_tx,
    v_typical_hours,
    v_typical_currencies,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    avg_transaction_amount = v_avg_amount,
    max_transaction_amount = v_max_amount,
    avg_daily_transactions = v_avg_daily_tx,
    typical_transaction_hours = v_typical_hours,
    typical_currencies = v_typical_currencies,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert default fraud rules
INSERT INTO fraud_rules (rule_name, rule_type, description, severity, risk_points, action, config) VALUES
  ('High Amount Transaction', 'amount', 'Transaction amount exceeds 5x user average', 'high', 25, 'review', '{"threshold_multiplier": 5}'),
  ('High Velocity', 'velocity', '10+ transactions in 1 hour', 'critical', 30, 'block', '{"max_transactions": 10, "time_window": 3600}'),
  ('Unusual Time Pattern', 'pattern', 'Transaction at unusual time for user', 'low', 10, 'flag', '{}'),
  ('New Currency', 'pattern', 'First time using this currency', 'medium', 15, 'flag', '{}'),
  ('Low Trust Score', 'pattern', 'User has low trust score (<30)', 'high', 20, 'review', '{"threshold": 30}'),
  ('Repeat Suspicious Activity', 'pattern', 'User has 5+ prior suspicious activities', 'critical', 25, 'block', '{"threshold": 5}')
ON CONFLICT (rule_name) DO NOTHING;
