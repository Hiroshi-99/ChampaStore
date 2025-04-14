/*
  # Set up storage for payment proofs
  
  1. Storage
    - Create schema and tables for storage
    - Set up security policies for file access
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create buckets table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create objects table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);

-- Create payment-proofs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remove old policy if it exists
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;

-- Allow both anonymous and authenticated users to upload files
CREATE POLICY "Anyone can upload payment proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-proofs'
  -- No owner check as anonymous users don't have auth.uid()
);

-- Remove old policy if it exists
DROP POLICY IF EXISTS "Payment proofs are publicly accessible" ON storage.objects;

-- Allow public access to view payment proofs
CREATE POLICY "Payment proofs are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS objects_path_tokens_idx ON storage.objects USING GIN (path_tokens);