-- Add support for multiple images to products/invoices table

-- Add images array column (keeping image_url for backward compatibility)
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Migrate existing single image_url to images array
UPDATE products
SET images = ARRAY[image_url]::TEXT[]
WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN(images);
