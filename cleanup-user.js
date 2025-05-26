import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cozhbakfzyykdcmccxnb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemhiYWtmenlra2RjbWNjeG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQyMjc0NCwiZXhwIjoyMDYyOTk4NzQ0fQ.ktJKlB1u5s7RjA7mL8gqDMhNKVqpwMZrDLLzgI6HT6o';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function removePixelPointUser() {
  try {
    console.log('🔍 Searching for pixelpointmedia8@gmail.com...');
    
    // List all users to find the one with this email
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth error:', authError.message);
      return;
    }
    
    const targetUser = authData.users.find(user => user.email === 'pixelpointmedia8@gmail.com');
    
    if (targetUser) {
      console.log('✅ Found user:', targetUser.id);
      
      // Delete the user from Supabase auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id);
      
      if (deleteError) {
        console.log('❌ Error deleting user:', deleteError.message);
      } else {
        console.log('🗑️ Successfully removed pixelpointmedia8@gmail.com from Supabase auth');
        console.log('✅ You can now signup with this email again!');
      }
    } else {
      console.log('❌ User not found in Supabase auth');
    }
    
  } catch (error) {
    console.log('❌ Script error:', error.message);
  }
}

removePixelPointUser();