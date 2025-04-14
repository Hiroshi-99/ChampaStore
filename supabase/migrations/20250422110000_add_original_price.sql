-- Add original_price column to products table for discount functionality
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2) DEFAULT NULL;

-- Update existing products (optional comment - only needed if you want to set original prices)
-- UPDATE products SET original_price = price WHERE original_price IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_price_original ON products(price, original_price);

COMMENT ON COLUMN products.original_price IS 'Original price before discount, used for strikethrough pricing display'; 