/*
  # Fix storage permissions for anonymous uploads
  
  This migration updates the RLS policies for storage to allow anonymous uploads
  to the payment-proofs bucket.
*/

-- 1. Remove existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;

-- 2. Create new policy for anonymous uploads
CREATE POLICY "Anyone can upload payment proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-proofs'
  -- No owner check as anonymous users don't have auth.uid()
);

-- 3. Create new policy for updating objects (allows object owners to update their files)
CREATE POLICY "Anyone can update their own payment proofs"
ON storage.objects
FOR UPDATE 
TO public
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');

-- 4. Create new policy for deleting objects (allows object owners to delete their files)
CREATE POLICY "Anyone can delete their own payment proofs"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'payment-proofs');

-- 5. Make sure orders table allows anonymous inserts too
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 6. Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 7. Add policy to allow anyone to read orders (for receipt display)
DROP POLICY IF EXISTS "Anyone can read their own orders" ON orders;
CREATE POLICY "Anyone can read their own orders"
  ON orders
  FOR SELECT
  TO public
  USING (true); 