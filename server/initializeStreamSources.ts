/**
 * Initialize the centralized stream sources table in Supabase
 * This replaces all hardcoded mappings with a single source of truth
 */

import { initializeDefaultStreamSources } from './centralizedStreamManager';

async function initializeStreamSystem() {
  try {
    console.log('🎯 Initializing centralized stream mapping system...');
    
    const success = await initializeDefaultStreamSources();
    
    if (success) {
      console.log('✅ Centralized stream mapping system initialized successfully!');
      console.log('🎯 Yankees entry and all teams will now persist after updates');
      console.log('🎯 Admin panel updates will directly affect video player streams');
    } else {
      console.log('ℹ️  Stream sources table already exists with data');
    }
  } catch (error) {
    console.error('❌ Error initializing stream system:', error);
  }
}

// Run initialization
initializeStreamSystem();