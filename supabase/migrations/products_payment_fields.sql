-- Add payment tracking fields to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'; -- 'unpaid', 'paid', 'failed', 'refunded'
ALTER TABLE products ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS payer_email TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_error TEXT;

CREATE INDEX IF NOT EXISTS idx_products_payment_status ON products(payment_status);
