-- Remove the discounts table since we now use original_price in products table
-- for showing discount pricing with strikethrough display

-- Only drop if exists to prevent errors
DROP TABLE IF EXISTS discounts;

-- Add comment about migration
COMMENT ON TABLE products IS 'Products table with support for discount pricing via original_price field'; 