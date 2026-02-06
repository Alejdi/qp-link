-- Invoice Templates Schema for QP Link
-- Allows users to save and reuse invoice configurations

-- =====================================================
-- 1. CREATE INVOICE TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL, -- Template name (e.g., "Standard Consulting Invoice")
  description TEXT,

  -- Product/Service details (pre-filled)
  product_name TEXT NOT NULL,
  product_description TEXT,
  default_price DECIMAL(15, 2),
  currency TEXT DEFAULT 'EUR' REFERENCES currencies(code),

  -- Settings
  payment_terms_days INTEGER DEFAULT 7, -- Days until payment due
  late_fee_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Customization
  custom_fields JSONB DEFAULT '{}', -- Additional fields like PO number, project code, etc.
  notes TEXT, -- Default notes/terms
  footer_text TEXT, -- Footer message

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#21255B',

  -- Email settings
  default_email_subject TEXT,
  default_email_body TEXT,
  send_reminder BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  is_default BOOLEAN DEFAULT false, -- User's default template
  tags TEXT[] DEFAULT '{}', -- For categorization

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_user ON invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_default ON invoice_templates(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_invoice_templates_tags ON invoice_templates USING GIN(tags);

-- =====================================================
-- 2. CREATE TEMPLATE LINE ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS template_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,

  -- Line item details
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  unit TEXT DEFAULT 'item', -- 'item', 'hour', 'day', 'month', etc.

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_line_items_template ON template_line_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_line_items_order ON template_line_items(template_id, sort_order);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to invoice_templates" ON invoice_templates;
DROP POLICY IF EXISTS "Service role full access to template_line_items" ON template_line_items;

CREATE POLICY "Service role full access to invoice_templates" ON invoice_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to template_line_items" ON template_line_items
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to create invoice from template
CREATE OR REPLACE FUNCTION create_invoice_from_template(
  p_template_id UUID,
  p_customer_email TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_override_price DECIMAL DEFAULT NULL,
  p_custom_values JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_invoice_id UUID;
  v_short_code TEXT;
  v_line_item RECORD;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM invoice_templates WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Generate short code
  v_short_code := substring(md5(random()::text) from 1 for 8);

  -- Create invoice
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
    v_template.product_name,
    v_template.product_description,
    COALESCE(p_override_price, v_template.default_price),
    v_template.currency,
    'unpaid',
    true,
    v_short_code,
    jsonb_build_object(
      'template_id', p_template_id,
      'template_name', v_template.name,
      'customer_email', p_customer_email,
      'customer_name', p_customer_name,
      'custom_values', p_custom_values,
      'payment_terms_days', v_template.payment_terms_days,
      'notes', v_template.notes
    )
  )
  RETURNING id INTO v_invoice_id;

  -- Update template usage
  UPDATE invoice_templates
  SET
    times_used = times_used + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_template_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to duplicate template
CREATE OR REPLACE FUNCTION duplicate_template(
  p_template_id UUID,
  p_new_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_new_template_id UUID;
  v_line_item RECORD;
BEGIN
  -- Get original template
  SELECT * INTO v_template FROM invoice_templates WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Create duplicate
  INSERT INTO invoice_templates (
    user_id, name, description, product_name, product_description,
    default_price, currency, payment_terms_days, late_fee_percentage,
    tax_percentage, custom_fields, notes, footer_text, logo_url,
    primary_color, default_email_subject, default_email_body,
    send_reminder, reminder_days_before, tags
  )
  VALUES (
    v_template.user_id, p_new_name, v_template.description,
    v_template.product_name, v_template.product_description,
    v_template.default_price, v_template.currency, v_template.payment_terms_days,
    v_template.late_fee_percentage, v_template.tax_percentage,
    v_template.custom_fields, v_template.notes, v_template.footer_text,
    v_template.logo_url, v_template.primary_color, v_template.default_email_subject,
    v_template.default_email_body, v_template.send_reminder,
    v_template.reminder_days_before, v_template.tags
  )
  RETURNING id INTO v_new_template_id;

  -- Copy line items
  FOR v_line_item IN
    SELECT * FROM template_line_items WHERE template_id = p_template_id
  LOOP
    INSERT INTO template_line_items (
      template_id, description, quantity, unit_price, unit, sort_order
    )
    VALUES (
      v_new_template_id, v_line_item.description, v_line_item.quantity,
      v_line_item.unit_price, v_line_item.unit, v_line_item.sort_order
    );
  END LOOP;

  RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate template total (with line items and tax)
CREATE OR REPLACE FUNCTION calculate_template_total(p_template_id UUID)
RETURNS TABLE(
  subtotal DECIMAL,
  tax DECIMAL,
  total DECIMAL
) AS $$
DECLARE
  v_template RECORD;
  v_subtotal DECIMAL := 0;
  v_tax DECIMAL := 0;
  v_total DECIMAL := 0;
BEGIN
  SELECT * INTO v_template FROM invoice_templates WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  INTO v_subtotal
  FROM template_line_items
  WHERE template_id = p_template_id;

  -- If no line items, use default price
  IF v_subtotal = 0 AND v_template.default_price IS NOT NULL THEN
    v_subtotal := v_template.default_price;
  END IF;

  -- Calculate tax
  v_tax := v_subtotal * (v_template.tax_percentage / 100);

  -- Calculate total
  v_total := v_subtotal + v_tax;

  RETURN QUERY SELECT v_subtotal, v_tax, v_total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONE!
-- =====================================================
