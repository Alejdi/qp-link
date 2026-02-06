-- Add new fields to products table for invoice functionality
ALTER TABLE products
ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS upi_id TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing short_id column to short_code if needed
ALTER TABLE products RENAME COLUMN short_id TO short_code;

-- Create index for short_code
CREATE INDEX IF NOT EXISTS idx_products_short_code ON products(short_code);

-- Create product_analytics table for detailed analytics
CREATE TABLE IF NOT EXISTS product_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for product_analytics
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON product_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_product_analytics_event_type ON product_analytics(event_type);

-- Enable RLS on product_analytics
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_analytics
CREATE POLICY "Users can view analytics for their products" ON product_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_analytics.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert analytics" ON product_analytics
  FOR INSERT WITH CHECK (true);
