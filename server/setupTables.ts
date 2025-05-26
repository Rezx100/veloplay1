import { supabase } from './db';
import fs from 'fs';
import path from 'path';

/**
 * Setup required tables if they don't exist
 */
export async function setupRequiredTables() {
  try {
    console.log('Checking if stream_sources table exists...');
    
    // Check if the stream_sources table exists
    const { data, error } = await supabase
      .from('stream_sources')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist, create it
      console.log('Stream sources table does not exist. Creating it...');
      await createStreamSourcesTable();
      
      // After creating the table, populate it with initial data
      await populateStreamSources();
    } else if (error) {
      console.error('Error checking stream_sources table:', error);
    } else {
      console.log('Stream sources table already exists.');
      
      // Check if we need to add more stream sources
      // Get count of records
      const { count: countResult } = await supabase
        .from('stream_sources')
        .select('*', { count: 'exact', head: true });
      
      const count = countResult || 0;
        
      if (count === 0 || count < 5) {
        console.log('Stream sources table exists but is empty or has few records. Adding initial data...');
        await populateStreamSources();
      }
    }
    
    // Check if leagues table needs initialization
    await initializeLeagues();
  } catch (error) {
    console.error('Error setting up tables:', error);
  }
}

/**
 * Initialize leagues table if it doesn't exist
 */
async function initializeLeagues() {
  try {
    console.log('Checking if leagues table exists...');
    
    // Check if the leagues table has data
    const { data, error } = await supabase
      .from('leagues')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking leagues table:', error);
      console.log('Creating leagues table with initial data...');
      
      // Try to create the leagues table with initial data
      const leagues = [
        { id: 'nba', name: 'NBA', description: 'National Basketball Association', is_active: true },
        { id: 'nfl', name: 'NFL', description: 'National Football League', is_active: true },
        { id: 'mlb', name: 'MLB', description: 'Major League Baseball', is_active: true },
        { id: 'nhl', name: 'NHL', description: 'National Hockey League', is_active: true },
        { id: 'special', name: 'Special Channels', description: 'Special sports channels', is_active: true }
      ];
      
      const { error: insertError } = await supabase
        .from('leagues')
        .upsert(leagues, { onConflict: 'id' });
        
      if (insertError) {
        console.error('Error initializing leagues:', insertError);
      } else {
        console.log('Successfully initialized leagues table');
      }
    } else {
      console.log('Leagues already initialized');
    }
  } catch (error) {
    console.error('Error initializing leagues:', error);
  }
}

/**
 * Create stream_sources table
 */
async function createStreamSourcesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS stream_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        league_id VARCHAR NOT NULL,
        priority INTEGER DEFAULT 1,
        team_name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_stream_sources_team_name ON stream_sources(team_name);
      CREATE INDEX IF NOT EXISTS idx_stream_sources_league_id ON stream_sources(league_id);
    `;
    
    // Since we may not have direct SQL access through Supabase's REST API,
    // Let's try a different approach
    try {
      // Use Supabase SQL function if available
      const { error } = await supabase.rpc('exec_sql', { query: createTableSQL });
      
      if (error) {
        console.error('Error creating stream_sources table with SQL RPC:', error);
        
        // If the table doesn't exist, create a manual workaround by creating records that will force table creation
        console.log('Trying to create table by inserting a test record...');
        
        const { error: insertError } = await supabase
          .from('stream_sources')
          .insert({
            name: 'Test Source',
            url: 'https://example.com/test.m3u8',
            description: 'Test source for table creation',
            is_active: true,
            league_id: 'test',
            priority: 1,
            team_name: 'Test Team'
          });
        
        if (insertError && insertError.code === '42P01') {
          console.error('Could not create stream_sources table:', insertError);
          console.log('Please create the table manually in Supabase dashboard');
        } else if (insertError) {
          console.error('Error creating test record:', insertError);
        } else {
          console.log('Successfully created stream_sources table with test record');
          
          // Delete the test record
          await supabase
            .from('stream_sources')
            .delete()
            .eq('name', 'Test Source');
        }
      } else {
        console.log('Successfully created stream_sources table with SQL RPC');
      }
    } catch (error) {
      console.error('Error during table creation attempt:', error);
    }
  } catch (error) {
    console.error('Error creating stream_sources table:', error);
  }
}

/**
 * Populate stream_sources table with initial data
 */
async function populateStreamSources() {
  try {
    console.log('Populating stream_sources table with initial data...');
    
    // Special channels (IDs 1-5)
    const specialChannels = [
      { 
        name: 'NBA TV', 
        team_name: 'NBA TV', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/1.m3u8', 
        league_id: 'special',
        is_active: true,
        priority: 1,
        description: 'NBA TV Network'
      },
      { 
        name: 'NFL Network', 
        team_name: 'NFL Network', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/2.m3u8', 
        league_id: 'special',
        is_active: true,
        priority: 1,
        description: 'NFL Network'
      },
      { 
        name: 'MLB Network', 
        team_name: 'MLB Network', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/3.m3u8', 
        league_id: 'special',
        is_active: true,
        priority: 1,
        description: 'MLB Network'
      },
      { 
        name: 'NHL Network', 
        team_name: 'NHL Network', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/4.m3u8', 
        league_id: 'special',
        is_active: true,
        priority: 1,
        description: 'NHL Network'
      },
      { 
        name: 'ESPN', 
        team_name: 'ESPN', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/5.m3u8', 
        league_id: 'special',
        is_active: true,
        priority: 1,
        description: 'ESPN Network'
      }
    ];
    
    // Insert special channels
    const { error: specialError } = await supabase
      .from('stream_sources')
      .upsert(specialChannels, { onConflict: 'name,team_name' });
      
    if (specialError) {
      console.error('Error inserting special channels:', specialError);
    } else {
      console.log('Successfully added special channels');
    }
    
    // Add some NFL teams 
    const nflTeams = [
      { 
        name: 'Arizona Cardinals', 
        team_name: 'Arizona Cardinals', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/66.m3u8', 
        league_id: 'nfl',
        is_active: true,
        priority: 1,
        description: 'Arizona Cardinals'
      },
      { 
        name: 'Atlanta Falcons', 
        team_name: 'Atlanta Falcons', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/67.m3u8', 
        league_id: 'nfl',
        is_active: true,
        priority: 1,
        description: 'Atlanta Falcons'
      },
      { 
        name: 'Baltimore Ravens', 
        team_name: 'Baltimore Ravens', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/68.m3u8', 
        league_id: 'nfl',
        is_active: true,
        priority: 1,
        description: 'Baltimore Ravens'
      }
    ];
    
    // Insert NFL teams
    const { error: nflError } = await supabase
      .from('stream_sources')
      .upsert(nflTeams, { onConflict: 'name,team_name' });
      
    if (nflError) {
      console.error('Error inserting NFL teams:', nflError);
    } else {
      console.log('Successfully added NFL teams');
    }
    
    // Add some NBA teams
    const nbaTeams = [
      { 
        name: 'Atlanta Hawks', 
        team_name: 'Atlanta Hawks', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/98.m3u8', 
        league_id: 'nba',
        is_active: true,
        priority: 1,
        description: 'Atlanta Hawks'
      },
      { 
        name: 'Boston Celtics', 
        team_name: 'Boston Celtics', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/99.m3u8', 
        league_id: 'nba',
        is_active: true,
        priority: 1,
        description: 'Boston Celtics'
      },
      { 
        name: 'Brooklyn Nets', 
        team_name: 'Brooklyn Nets', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/100.m3u8', 
        league_id: 'nba',
        is_active: true,
        priority: 1,
        description: 'Brooklyn Nets'
      }
    ];
    
    // Insert NBA teams
    const { error: nbaError } = await supabase
      .from('stream_sources')
      .upsert(nbaTeams, { onConflict: 'name,team_name' });
      
    if (nbaError) {
      console.error('Error inserting NBA teams:', nbaError);
    } else {
      console.log('Successfully added NBA teams');
    }
    
    // Add some MLB teams
    const mlbTeams = [
      { 
        name: 'Arizona Diamondbacks', 
        team_name: 'Arizona Diamondbacks', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/36.m3u8', 
        league_id: 'mlb',
        is_active: true,
        priority: 1,
        description: 'Arizona Diamondbacks'
      },
      { 
        name: 'Atlanta Braves', 
        team_name: 'Atlanta Braves', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/37.m3u8', 
        league_id: 'mlb',
        is_active: true,
        priority: 1,
        description: 'Atlanta Braves'
      },
      { 
        name: 'Baltimore Orioles', 
        team_name: 'Baltimore Orioles', 
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/38.m3u8', 
        league_id: 'mlb',
        is_active: true,
        priority: 1,
        description: 'Baltimore Orioles'
      }
    ];
    
    // Insert MLB teams
    const { error: mlbError } = await supabase
      .from('stream_sources')
      .upsert(mlbTeams, { onConflict: 'name,team_name' });
      
    if (mlbError) {
      console.error('Error inserting MLB teams:', mlbError);
    } else {
      console.log('Successfully added MLB teams');
    }
    
    return true;
  } catch (error) {
    console.error('Error populating stream_sources:', error);
    return false;
  }
}