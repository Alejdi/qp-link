-- Comprehensive Setup Script for All Features
-- This applies all migrations in the correct order

-- 1. Add multiple images support to products/invoices
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Migrate existing single image_url to images array
UPDATE products
SET images = ARRAY[image_url]::TEXT[]
WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN(images);

-- 2. Verify invoice templates tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoice_templates') THEN
        -- Create invoice templates table
        CREATE TABLE invoice_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          default_due_days INTEGER DEFAULT 30,
          tax_rate DECIMAL(5, 2) DEFAULT 0,
          notes TEXT,
          terms TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE invoice_template_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          template_id UUID NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          quantity DECIMAL(10, 2) DEFAULT 1,
          unit_price DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_invoice_templates_user ON invoice_templates(user_id);
        CREATE INDEX idx_invoice_template_items_template ON invoice_template_items(template_id);
    END IF;
END $$;

-- 3. Verify notification preferences table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
        CREATE TABLE notification_preferences (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL UNIQUE REFERENCES users(id),
          email_enabled BOOLEAN DEFAULT true,
          email_transaction_received BOOLEAN DEFAULT true,
          email_payment_received BOOLEAN DEFAULT true,
          email_invoice_paid BOOLEAN DEFAULT true,
          email_security_alerts BOOLEAN DEFAULT true,
          sms_enabled BOOLEAN DEFAULT false,
          sms_phone_number TEXT,
          sms_phone_verified BOOLEAN DEFAULT false,
          sms_security_alerts BOOLEAN DEFAULT true,
          daily_digest_enabled BOOLEAN DEFAULT false,
          daily_digest_time TEXT DEFAULT '09:00',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
    END IF;
END $$;

-- 4. Verify 2FA tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_2fa') THEN
        CREATE TABLE user_2fa (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL UNIQUE REFERENCES users(id),
          is_enabled BOOLEAN DEFAULT false,
          secret TEXT,
          backup_codes TEXT[],
          failed_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_user_2fa_user ON user_2fa(user_id);
    END IF;
END $$;

-- 5. Add API endpoint to get invoice with images
-- This is handled in the application code

-- 6. Ensure products API returns images array
-- Update is handled in API routes

-- Summary
SELECT
    'Setup Complete!' as status,
    (SELECT COUNT(*) FROM invoice_templates) as invoice_templates_count,
    (SELECT COUNT(*) FROM notification_preferences) as notification_prefs_count,
    (SELECT COUNT(*) FROM user_2fa) as user_2fa_count,
    (SELECT COUNT(*) FROM products WHERE images IS NOT NULL AND array_length(images, 1) > 0) as products_with_images;
