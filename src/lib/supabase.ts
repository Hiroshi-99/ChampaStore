import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check available buckets
export async function checkSupabaseBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing Supabase buckets:', error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('Available Supabase buckets:', data.map(bucket => bucket.name));
      return true;
    } else {
      console.warn('No Supabase buckets found. You may need to create one in the Supabase dashboard.');
      return false;
    }
  } catch (error) {
    console.error('Failed to check Supabase buckets:', error);
    return false;
  }
}

// Auto-check buckets when in development mode
if (import.meta.env.DEV) {
  checkSupabaseBuckets().then(hasStorageBuckets => {
    if (!hasStorageBuckets) {
      console.warn('⚠️ No Supabase storage buckets detected. File uploads may fail.');
      console.info('💡 Create a bucket named "storage" or "public" in your Supabase dashboard.');
    }
  });
}

export default supabase;