-- Create the site configuration table
CREATE TABLE IF NOT EXISTS site_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  percentage INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add initial site configuration
INSERT INTO site_config (key, value) VALUES
  ('site_title', 'CHAMPA STORE'),
  ('logo_image', 'https://i.imgur.com/ArKEQz1.png'),
  ('banner_image', '/images/banner.gif'),
  ('background_video_url', '/videos/background.mp4'),
  ('maintenance_mode', 'false');

-- Add sample products
INSERT INTO products (name, description, price, image_url) VALUES
  ('VIP Rank', 'Exclusive access to VIP room and special commands', 9.99, ''),
  ('MVP Rank', 'All VIP features plus priority support', 19.99, ''),
  ('Admin Rank', 'Full access to all features and commands', 29.99, '');

-- Add security policies
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

-- Create policies that only allow authenticated users to modify data
CREATE POLICY "Allow authenticated users to read site_config" ON site_config
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to modify site_config" ON site_config
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read products" ON products
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to modify products" ON products
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read discounts" ON discounts
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to modify discounts" ON discounts
FOR ALL USING (auth.role() = 'authenticated');

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_site_config_timestamp
BEFORE UPDATE ON site_config
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_products_timestamp
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_discounts_timestamp
BEFORE UPDATE ON discounts
FOR EACH ROW EXECUTE PROCEDURE update_modified_column(); 