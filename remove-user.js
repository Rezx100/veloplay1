import { storage } from './server/storage.ts';

async function removeUserByEmail() {
  try {
    console.log('🔍 Searching for user: pixelpointmedia8@gmail.com');
    
    // First, try to find the user in your custom users table
    const user = await storage.getUserByEmail('pixelpointmedia8@gmail.com');
    
    if (user) {
      console.log('✅ Found user in database:', user.id);
      
      // Delete the user
      await storage.deleteUser(user.id);
      console.log('🗑️ Successfully deleted user from database');
      
      // Also delete any subscriptions for this user
      await storage.deleteSubscriptionsByUserId(user.id);
      console.log('🗑️ Deleted user subscriptions');
      
    } else {
      console.log('❌ User not found in custom users table');
    }
    
    console.log('✅ User removal process completed');
    
  } catch (error) {
    console.error('❌ Error removing user:', error.message);
  }
  
  process.exit(0);
}

removeUserByEmail();