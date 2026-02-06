-- Smart Notifications System Schema

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  -- Email notifications
  email_enabled BOOLEAN DEFAULT true,
  email_transaction_received BOOLEAN DEFAULT true,
  email_transaction_sent BOOLEAN DEFAULT true,
  email_payment_received BOOLEAN DEFAULT true,
  email_invoice_created BOOLEAN DEFAULT true,
  email_invoice_paid BOOLEAN DEFAULT true,
  email_invoice_overdue BOOLEAN DEFAULT true,
  email_subscription_renewed BOOLEAN DEFAULT true,
  email_subscription_cancelled BOOLEAN DEFAULT true,
  email_escrow_created BOOLEAN DEFAULT true,
  email_escrow_released BOOLEAN DEFAULT true,
  email_security_alerts BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  -- SMS notifications
  sms_enabled BOOLEAN DEFAULT false,
  sms_phone_number TEXT,
  sms_phone_verified BOOLEAN DEFAULT false,
  sms_high_value_transactions BOOLEAN DEFAULT false, -- Only for transactions > threshold
  sms_security_alerts BOOLEAN DEFAULT true,
  sms_threshold_amount DECIMAL(15, 2) DEFAULT 1000,
  -- Push notifications
  push_enabled BOOLEAN DEFAULT false,
  push_tokens TEXT[] DEFAULT '{}', -- Array of FCM/APNS tokens
  push_transaction_received BOOLEAN DEFAULT true,
  push_payment_received BOOLEAN DEFAULT true,
  push_invoice_paid BOOLEAN DEFAULT true,
  -- Digest settings
  daily_digest_enabled BOOLEAN DEFAULT false,
  daily_digest_time TEXT DEFAULT '09:00', -- HH:MM format
  weekly_digest_enabled BOOLEAN DEFAULT false,
  weekly_digest_day TEXT DEFAULT 'monday',
  -- Other settings
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification queue/history
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- email, sms, push
  category TEXT NOT NULL, -- transaction, invoice, security, etc.
  subject TEXT,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional data for the notification
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  channel_status JSONB DEFAULT '{}', -- Status per channel: {email: 'sent', sms: 'failed'}
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subject_template TEXT, -- For email
  message_template TEXT NOT NULL, -- Supports {{variables}}
  sms_template TEXT, -- Shorter version for SMS
  default_channels TEXT[] DEFAULT '{"email"}', -- email, sms, push
  priority TEXT DEFAULT 'normal',
  variables TEXT[] DEFAULT '{}', -- List of supported variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS verification codes
CREATE TABLE IF NOT EXISTS sms_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_user ON sms_verifications(user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active templates" ON notification_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON notification_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_template_key TEXT,
  p_variables JSONB DEFAULT '{}'::JSONB,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_template notification_templates%ROWTYPE;
  v_prefs notification_preferences%ROWTYPE;
  v_subject TEXT;
  v_message TEXT;
  v_sms_message TEXT;
  v_key TEXT;
  v_value TEXT;
  v_channels TEXT[] := '{}';
BEGIN
  -- Get template
  SELECT * INTO v_template FROM notification_templates
  WHERE template_key = p_template_key AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_key;
  END IF;

  -- Get user preferences
  SELECT * INTO v_prefs FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences, create default ones
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  -- Replace variables in templates
  v_subject := v_template.subject_template;
  v_message := v_template.message_template;
  v_sms_message := v_template.sms_template;

  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
    v_message := REPLACE(v_message, '{{' || v_key || '}}', v_value);
    IF v_sms_message IS NOT NULL THEN
      v_sms_message := REPLACE(v_sms_message, '{{' || v_key || '}}', v_value);
    END IF;
  END LOOP;

  -- Determine which channels to use based on user preferences
  IF v_prefs.email_enabled THEN
    v_channels := array_append(v_channels, 'email');
  END IF;

  IF v_prefs.sms_enabled AND v_prefs.sms_phone_verified THEN
    v_channels := array_append(v_channels, 'sms');
  END IF;

  IF v_prefs.push_enabled AND array_length(v_prefs.push_tokens, 1) > 0 THEN
    v_channels := array_append(v_channels, 'push');
  END IF;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type, -- Use first enabled channel as primary type
    category,
    subject,
    message,
    data,
    priority,
    status
  ) VALUES (
    p_user_id,
    COALESCE(v_channels[1], 'email'),
    v_template.category,
    v_subject,
    v_message,
    jsonb_build_object(
      'template_key', p_template_key,
      'variables', p_variables,
      'channels', v_channels,
      'sms_message', v_sms_message,
      'push_tokens', v_prefs.push_tokens
    ),
    p_priority,
    'pending'
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Insert default notification templates
INSERT INTO notification_templates (template_key, name, description, category, subject_template, message_template, sms_template, default_channels, priority, variables) VALUES
  (
    'transaction_received',
    'Transaction Received',
    'Notify when user receives a payment',
    'transaction',
    'Payment Received: {{amount}} {{currency}}',
    'You have received a payment of {{amount}} {{currency}} from {{sender}}. Transaction ID: {{transaction_id}}',
    'Received {{amount}} {{currency}} from {{sender}}',
    '{"email", "push"}',
    'normal',
    '{"amount", "currency", "sender", "transaction_id"}'
  ),
  (
    'invoice_paid',
    'Invoice Paid',
    'Notify when an invoice is paid',
    'invoice',
    'Invoice #{{invoice_number}} Paid',
    'Your invoice #{{invoice_number}} for {{amount}} {{currency}} has been paid by {{payer}}.',
    'Invoice #{{invoice_number}} paid: {{amount}} {{currency}}',
    '{"email", "push"}',
    'normal',
    '{"invoice_number", "amount", "currency", "payer"}'
  ),
  (
    'invoice_overdue',
    'Invoice Overdue',
    'Notify when an invoice becomes overdue',
    'invoice',
    'Invoice #{{invoice_number}} is Overdue',
    'Your invoice #{{invoice_number}} for {{amount}} {{currency}} is now overdue. Due date was {{due_date}}.',
    'Invoice #{{invoice_number}} overdue: {{amount}} {{currency}}',
    '{"email"}',
    'high',
    '{"invoice_number", "amount", "currency", "due_date"}'
  ),
  (
    'security_alert',
    'Security Alert',
    'Notify on security-related events',
    'security',
    'Security Alert: {{alert_type}}',
    'Security alert: {{message}}. If this wasn''t you, please secure your account immediately.',
    'Security alert: {{message}}',
    '{"email", "sms", "push"}',
    'urgent',
    '{"alert_type", "message"}'
  ),
  (
    'escrow_released',
    'Escrow Released',
    'Notify when escrow funds are released',
    'escrow',
    'Escrow Released: {{amount}} {{currency}}',
    'Escrow funds of {{amount}} {{currency}} have been released for transaction {{transaction_id}}.',
    'Escrow released: {{amount}} {{currency}}',
    '{"email", "push"}',
    'normal',
    '{"amount", "currency", "transaction_id"}'
  ),
  (
    'subscription_renewed',
    'Subscription Renewed',
    'Notify when subscription is renewed',
    'subscription',
    'Subscription Renewed',
    'Your {{subscription_name}} subscription has been renewed for {{amount}} {{currency}}. Next billing date: {{next_billing_date}}.',
    'Subscription renewed: {{subscription_name}}',
    '{"email"}',
    'normal',
    '{"subscription_name", "amount", "currency", "next_billing_date"}'
  ),
  (
    'high_value_transaction',
    'High Value Transaction',
    'Notify on high value transactions',
    'transaction',
    'High Value Transaction: {{amount}} {{currency}}',
    'A high value transaction of {{amount}} {{currency}} was {{action}} on your account.',
    'High value: {{amount}} {{currency}} {{action}}',
    '{"email", "sms"}',
    'high',
    '{"amount", "currency", "action"}'
  )
ON CONFLICT (template_key) DO NOTHING;
