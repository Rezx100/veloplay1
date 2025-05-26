// Simple script to test the Supabase database connection
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly in this file
const SUPABASE_URL = 'https://cozhbakfzyykdcmccxnb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemhiYWtmenl5a2RjbWNjeG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg4OTYsImV4cCI6MjA2MjQxNDg5Nn0.K9KyGR1p4qMek3-MdqZLyu0tMd24fuolcGdJNuWVY1w';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function testDatabaseConnection() {
  console.log('Testing Supabase database connection...');
  
  try {
    // Try a simple query to check if the database is accessible
    const { data, error } = await supabase
      .from('stream_sources')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Failed to connect to Supabase database:');
      console.error(error);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase database!');
    console.log('Database response:', data);
    return true;
  } catch (err) {
    console.error('❌ Exception connecting to Supabase database:');
    console.error(err);
    return false;
  }
}

// Run the test
testDatabaseConnection().then((success) => {
  console.log(`Database connection test ${success ? 'PASSED' : 'FAILED'}`);
});