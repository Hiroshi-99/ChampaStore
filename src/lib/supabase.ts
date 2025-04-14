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

// Attempt to create a storage bucket if none exist
export async function createStorageBucket(bucketName = 'storage') {
  try {
    // First check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error checking existing buckets:', listError);
      return false;
    }
    
    // If the bucket already exists, no need to create it
    if (buckets && buckets.some(bucket => bucket.name === bucketName)) {
      console.log(`Bucket '${bucketName}' already exists`);
      return true;
    }
    
    // Try to create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
    });
    
    if (error) {
      // Most likely because user doesn't have permission
      console.error(`Failed to create bucket '${bucketName}':`, error);
      return false;
    }
    
    console.log(`Successfully created storage bucket '${bucketName}'`);
    return true;
  } catch (error) {
    console.error('Error creating storage bucket:', error);
    return false;
  }
}

// Initialize storage on app start
async function initializeStorage() {
  const hasBuckets = await checkSupabaseBuckets();
  
  if (!hasBuckets) {
    console.warn('⚠️ No Supabase storage buckets detected. Attempting to create some...');
    
    // Define possible bucket names to try
    const bucketNames = ['storage', 'public', 'images', 'uploads', 'media', 'payment-proofs'];
    let successCount = 0;
    
    // Try to create multiple buckets (we'll try all of them to maximize chances)
    for (const bucket of bucketNames) {
      const created = await createStorageBucket(bucket);
      if (created) {
        successCount++;
        console.info(`✅ Successfully created '${bucket}' bucket.`);
      }
    }
    
    if (successCount > 0) {
      console.info(`✅ Created ${successCount} storage buckets successfully.`);
      return true;
    } else {
      console.warn('⚠️ Could not create any storage buckets. File uploads will fall back to data URLs.');
      console.info('💡 Please create a bucket manually in your Supabase dashboard or check your permissions.');
      return false;
    }
  }
  
  return true;
}

// Auto-initialize storage when in development mode
if (import.meta.env.DEV) {
  initializeStorage();
}

export default supabase;