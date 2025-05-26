// Script to ensure the stream_sources table exists in Supabase
import { supabase } from './db';

// Function to check if the stream_sources table exists
export async function checkStreamSourcesTable() {
  try {
    console.log('Checking if stream_sources table exists...');
    
    // Check if we can query the table
    const { data, error } = await supabase
      .from('stream_sources')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking stream_sources table:', error.message);
      return false;
    }
    
    console.log('Stream sources table exists with data:', data);
    return true;
  } catch (error) {
    console.error('Exception checking stream_sources table:', error.message);
    return false;
  }
}

// Function to create the table through direct insertion
export async function createTableThroughInsertion() {
  try {
    console.log('Trying to create table by inserting sample data...');
    
    // Sample data to insert
    const sampleData = [
      {
        name: 'Toronto Blue Jays',
        team_name: 'Toronto Blue Jays',
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/64.m3u8',
        league_id: 'mlb',
        is_active: true,
        priority: 1,
        description: 'Toronto Blue Jays stream'
      },
      {
        name: 'New York Yankees',
        team_name: 'New York Yankees',
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/65.m3u8',
        league_id: 'mlb',
        is_active: true,
        priority: 1,
        description: 'New York Yankees stream'
      }
    ];
    
    // Insert the sample data (will create the table if it doesn't exist)
    const { data, error } = await supabase
      .from('stream_sources')
      .insert(sampleData)
      .select();
    
    if (error) {
      console.error('Error creating sample data:', error);
      return false;
    }
    
    console.log('Sample data created successfully:', data);
    return true;
  } catch (error) {
    console.error('Exception creating sample data:', error);
    return false;
  }
}

// Main function to ensure the table exists
export async function ensureStreamSourcesTable() {
  const exists = await checkStreamSourcesTable();
  
  if (!exists) {
    // Try direct insertion to create the table
    const insertSuccess = await createTableThroughInsertion();
    
    if (!insertSuccess) {
      console.error('Failed to create stream_sources table');
      return false;
    }
  }
  
  return true;
}