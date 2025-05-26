import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cozhbakfzyykdcmccxnb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemhiYWtmenlra2RjbWNjeG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQyMjc0NCwiZXhwIjoyMDYyOTk4NzQ0fQ.ktJKlB1u5s7RjA7mL8gqDMhNKVqpwMZrDLLzgI6HT6o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndRemoveUser() {
  try {
    console.log('Searching for user: pixelpointmedia8@gmail.com');
    
    // Check in auth.users (Supabase auth table)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('Auth error:', authError.message);
      return;
    }
    
    const targetUser = authUsers.users.find(user => user.email === 'pixelpointmedia8@gmail.com');
    
    if (targetUser) {
      console.log('Found user in auth.users:', targetUser.id);
      
      // Delete from auth
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUser.id);
      
      if (deleteAuthError) {
        console.log('Error deleting from auth:', deleteAuthError.message);
      } else {
        console.log('✅ Successfully deleted user from auth.users');
      }
      
      // Also check if user exists in your custom users table
      const { data: customUsers, error: customError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'pixelpointmedia8@gmail.com');
        
      if (!customError && customUsers && customUsers.length > 0) {
        console.log('Found user in custom users table');
        
        // Delete from custom users table
        const { error: deleteCustomError } = await supabase
          .from('users')
          .delete()
          .eq('email', 'pixelpointmedia8@gmail.com');
          
        if (deleteCustomError) {
          console.log('Error deleting from users table:', deleteCustomError.message);
        } else {
          console.log('✅ Successfully deleted user from users table');
        }
      }
      
    } else {
      console.log('❌ User not found in database');
    }
    
  } catch (error) {
    console.log('Script error:', error.message);
  }
}

checkAndRemoveUser();