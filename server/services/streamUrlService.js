// Direct Stream URL Management Service
import { supabase } from '../db';
import { persistentStorage } from './persistentStorage';
import streamSources from './loadStreamSources.js';

/**
 * Service to directly manage stream URLs in Supabase with file-based persistence
 */
class StreamUrlService {
  /**
   * Ensure the stream_sources table exists
   * @returns {Promise<boolean>} Whether the table exists
   */
  async ensureTableExists() {
    try {
      console.log('Checking if stream_sources table exists...');
      
      // Try to select from the table to see if it exists
      const { data, error } = await supabase
        .from('stream_sources')
        .select('id')
        .limit(1);
      
      // If there's a table not found error, create the table
      if (error && error.code === '42P01') {
        console.log('Table not found, creating it directly');
        
        // Use the streams table that already exists as a base for URLs
        const { data: streams, error: streamsError } = await supabase
          .from('streams')
          .select('*')
          .limit(20);
          
        if (streamsError) {
          console.error('Error fetching streams:', streamsError);
          return false;
        }
        
        // Create stream sources from existing streams
        if (streams && streams.length > 0) {
          console.log(`Creating stream_sources from ${streams.length} existing streams`);
          
          // Create sample sources based on existing streams
          const sourcesToInsert = streams.map((stream, index) => ({
            name: `Stream Source ${index + 1}`,
            team_name: `Team ${index + 1}`,
            url: stream.stream_url || 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/1.m3u8',
            league_id: 'nba',
            is_active: true,
            priority: 1,
            description: `Stream source created from stream ID ${stream.id}`
          }));
          
          // Insert the initial stream sources
          const { error: insertError } = await supabase
            .from('stream_sources')
            .insert(sourcesToInsert);
            
          if (insertError) {
            console.error('Error inserting initial stream sources:', insertError);
            return false;
          }
          
          console.log('Successfully created stream_sources table with initial data');
          return true;
        } else {
          // Create a few default stream sources if no streams exist
          const defaultSources = [
            {
              name: 'NBA TV',
              team_name: 'NBA TV',
              url: 'https://vpt.pixelsport.to:443/psportsgate/psportsgate100/1.m3u8',
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
            }
          ];
          
          const { error: insertError } = await supabase
            .from('stream_sources')
            .insert(defaultSources);
            
          if (insertError) {
            console.error('Error inserting default stream sources:', insertError);
            return false;
          }
          
          console.log('Successfully created stream_sources table with default data');
          return true;
        }
      }
      
      // Table already exists
      console.log('stream_sources table already exists');
      return true;
    } catch (error) {
      console.error('Error ensuring table exists:', error);
      return false;
    }
  }
  /**
   * Update a stream URL by ID using streams table instead of stream_sources
   * @param {number} id - Stream source ID
   * @param {string} url - New stream URL
   * @returns {Promise<Object|null>} Updated stream source or null if failed
   */
  async updateStreamUrl(id, url) {
    try {
      console.log(`StreamUrlService: Updating stream URL for ID ${id} to ${url}`);
      
      if (!id || !url) {
        console.error('Invalid ID or URL provided');
        return null;
      }

      // Use a naming scheme for determining team/league info based on ID ranges
      let name = `Stream ${id}`;
      let teamName = `Team ${id}`;
      let leagueId = 'other';
      
      // 1-5: Special channels
      if (id >= 1 && id <= 5) {
        const specialNames = {
          1: 'NBA TV',
          2: 'NFL Network',
          3: 'MLB Network',
          4: 'NHL Network',
          5: 'ESPN'
        };
        name = specialNames[id] || `Special Channel ${id}`;
        teamName = name;
        leagueId = 'special';
      }
      // 6-35: NHL Teams
      else if (id >= 6 && id <= 35) {
        name = `NHL - Team ${id}`;
        teamName = `NHL Team ${id}`;
        leagueId = 'nhl';
      }
      // 185-214: MLB Teams (Updated from M3U8 source - May 23, 2025)
      else if (id >= 185 && id <= 214) {
        name = `MLB - Team ${id}`;
        teamName = `MLB Team ${id}`;
        leagueId = 'mlb';
      }
      // 66-97: NFL Teams
      else if (id >= 66 && id <= 97) {
        name = `NFL - Team ${id}`;
        teamName = `NFL Team ${id}`;
        leagueId = 'nfl';
      }
      // 98-127: NBA Teams
      else if (id >= 98 && id <= 127) {
        name = `NBA - Team ${id}`;
        teamName = `NBA Team ${id}`;
        leagueId = 'nba';
      }
      
      // Get existing source from memory first, fallback to persistent storage
      const existingSource = this.inMemoryStreamUrls?.[id] || 
         (persistentStorage.has(`stream_source_${id}`) ? persistentStorage.get(`stream_source_${id}`) : null);
      
      // If we still don't have data, look for this source in our predefined list
      let predefinedTeam = null;
      if (!existingSource) {
        // Find this team in the predefined sources
        const allPredefinedSources = this.getPredefinedStreamSources();
        predefinedTeam = allPredefinedSources.find(source => source.id === id);
      }
      
      // Create the updated source, preserving existing data if available
      const updatedSource = {
        id: id,
        name: existingSource?.name || predefinedTeam?.name || name,
        url: url, // Always use the new URL
        description: existingSource?.description || predefinedTeam?.description || `Stream source ID ${id}`,
        isActive: existingSource?.isActive !== undefined ? existingSource.isActive : predefinedTeam?.isActive || true,
        leagueId: existingSource?.leagueId || predefinedTeam?.leagueId || leagueId,
        priority: existingSource?.priority || predefinedTeam?.priority || 1,
        teamName: existingSource?.teamName || predefinedTeam?.teamName || teamName,
        createdAt: existingSource?.createdAt || predefinedTeam?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString() // Always update the timestamp
      };

      console.log(`Successfully processed stream URL update for ID ${id}`);
      
      // Store in persistent storage system for retrieval after server restart
      const storageKey = `stream_source_${id}`;
      persistentStorage.set(storageKey, updatedSource);
      console.log(`Stream source ${id} saved to persistent storage`);
      
      // CRITICAL FIX: Save the stream-url-storage.json file to disk immediately
      persistentStorage.saveToDiskSync();
      console.log('Force-saved all stream sources to disk to prevent data loss');
      
      // Also keep in memory for fast access
      if (!this.inMemoryStreamUrls) {
        this.inMemoryStreamUrls = {};
      }
      this.inMemoryStreamUrls[id] = updatedSource;
      
      // CRITICAL FIX: Also update the database to ensure changes are persistent
      try {
        console.log(`Updating stream source in database for ID ${id}`);
        // Convert to database schema format (snake_case)
        const dbRecord = {
          id: id,
          name: updatedSource.name,
          team_name: updatedSource.teamName,
          url: updatedSource.url,
          description: updatedSource.description || '',
          is_active: updatedSource.isActive,
          league_id: updatedSource.leagueId,
          priority: updatedSource.priority || 1,
          updated_at: new Date()
        };
        
        const { error } = await supabase
          .from('stream_sources')
          .upsert(dbRecord, { onConflict: 'id' });
          
        if (error) {
          console.error('Error updating stream source in database:', error);
          console.log('Continuing with local cache update only. Changes will be temporary until database is synced.');
        } else {
          console.log(`Successfully updated stream source ${id} in database`);
        }
      } catch (dbError) {
        console.error('Database update failed, but local cache is updated:', dbError);
      }
      
      return updatedSource;
    } catch (error) {
      console.error('Exception in updateStreamUrl:', error);
      return null;
    }
  }

  /**
   * Delete a stream source by ID
   * @param {number} id - The ID of the stream source to delete
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async deleteStreamSource(id) {
    try {
      console.log('Deleting stream source with ID:', id);
      
      // Delete the stream source from the database
      const { error } = await supabase
        .from('stream_sources')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting stream source from database:', error);
        return false;
      }
      
      // Also remove from persistent storage to keep everything in sync
      persistentStorage.remove(id.toString());
      
      // Remove from in-memory cache if it exists
      if (this.inMemoryStreamUrls && this.inMemoryStreamUrls[id]) {
        delete this.inMemoryStreamUrls[id];
      }
      
      console.log('Successfully deleted stream source with ID:', id);
      return true;
    } catch (error) {
      console.error('Exception in deleteStreamSource:', error);
      return false;
    }
  }
  
  /**
   * Create a new stream source
   * This can be used to ensure the table exists
   */
  async createStreamSource(streamSource) {
    try {
      const { data, error } = await supabase
        .from('stream_sources')
        .insert({
          name: streamSource.name,
          url: streamSource.url,
          description: streamSource.description || '',
          is_active: streamSource.isActive !== undefined ? streamSource.isActive : true,
          league_id: streamSource.leagueId,
          priority: streamSource.priority || 1,
          team_name: streamSource.teamName
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating stream source:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in createStreamSource:', error);
      return null;
    }
  }

  /**
   * Get all stream sources - returns predefined sources plus any updates
   * with robust handling of data merging and validation
   */
  async getAllStreamSources() {
    try {
      console.log('Loading stream sources from local file first');
      
      // CRITICAL IMPROVEMENT: Always prioritize the local file first
      // This ensures Pittsburgh Pirates and other teams have the correct mapping
      const localSources = streamSources.loadStreamSources();
      
      // If we have local sources, use them
      if (localSources && localSources.length > 0) {
        console.log(`Using ${localSources.length} stream sources from local file`);
        return localSources;
      }
      
      // Fallback to database if local file is empty/missing
      try {
        // Check if we can get real data from the database
        const { data, error } = await supabase
          .from('stream_sources')
          .select('*')
          .limit(1);

        // If the stream_sources table exists and has data, use it
        if (!error && data && data.length > 0) {
          console.log('Using stream_sources table data as fallback');
          
          const { data: allData, error: fetchError } = await supabase
            .from('stream_sources')
            .select('*')
            .order('id', { ascending: true });
            
          if (fetchError) {
            console.error('Error fetching stream sources from database:', fetchError);
            return this.getStreamSourcesWithFallback();
          }
          
          // Convert to camelCase for frontend
          return allData.map(source => ({
            id: source.id,
            name: source.name,
            url: source.url,
            description: source.description,
            isActive: source.is_active,
            leagueId: source.league_id,
            priority: source.priority,
            teamName: source.team_name,
            createdAt: source.created_at,
            updatedAt: source.updated_at
          }));
        }
      } catch (dbError) {
        console.error('Database error, using fallback:', dbError);
      }

      // Use our highly reliable fallback system as last resort
      return this.getStreamSourcesWithFallback();
    } catch (error) {
      console.error('Exception in getAllStreamSources:', error);
      return this.getStreamSourcesWithFallback();
    }
  }
  
  /**
   * Advanced stream sources retrieval with multiple fallback mechanisms
   * to ensure all 159 stream sources are always available
   */
  getStreamSourcesWithFallback() {
    console.log('Using enhanced stream sources retrieval with fallbacks');
    
    // Step 1: Get base predefined sources
    const predefinedSources = this.getPredefinedStreamSources();
    
    // Step 2: Create a map of all predefined sources by ID for quick lookup
    const completeSourcesById = {};
    predefinedSources.forEach(source => {
      completeSourcesById[source.id] = { ...source };
    });
    
    // Step 3: CRITICAL FIX - Give the predefined sources the highest priority for team names
    // This ensures Colorado Avalanche and other teams are always correctly named
    const predefinedTeamNames = {};
    const predefinedNames = {};
    
    // Save original predefined names for reference
    predefinedSources.forEach(source => {
      if (source.teamName) {
        predefinedTeamNames[source.id] = source.teamName;
      }
      if (source.name) {
        predefinedNames[source.id] = source.name;
      }
    });
    
    // Step 4: Apply updates from in-memory cache, but preserve predefined team names
    if (this.inMemoryStreamUrls) {
      Object.values(this.inMemoryStreamUrls).forEach(source => {
        if (source && source.id) {
          if (completeSourcesById[source.id]) {
            // Merge, but ensure predefined team names are preserved
            completeSourcesById[source.id] = {
              ...completeSourcesById[source.id],
              ...source,
              // Ensure these critical fields use predefined values when available
              name: predefinedNames[source.id] || source.name || completeSourcesById[source.id].name,
              teamName: predefinedTeamNames[source.id] || source.teamName || completeSourcesById[source.id].teamName
            };
          } else {
            // It's a new source not in predefined list
            completeSourcesById[source.id] = { ...source };
          }
        }
      });
    }
    
    // Step 5: Apply any updates from persistent storage (but preserve predefined names)
    const storedKeys = persistentStorage.getKeys().filter(key => key.startsWith('stream_source_'));
    if (storedKeys.length > 0) {
      console.log(`Applying ${storedKeys.length} persistent updates to stream sources, preserving predefined team names`);
      
      storedKeys.forEach(key => {
        const storedSource = persistentStorage.get(key);
        if (storedSource && storedSource.id) {
          const id = storedSource.id;
          if (completeSourcesById[id]) {
            // Update source but GUARANTEE predefined team names are preserved
            completeSourcesById[id] = {
              ...completeSourcesById[id], 
              ...storedSource,
              // Always use predefined team names when available
              name: predefinedNames[id] || storedSource.name || completeSourcesById[id].name,
              teamName: predefinedTeamNames[id] || storedSource.teamName || completeSourcesById[id].teamName
            };
          } else {
            // It's a new source not in predefined list
            completeSourcesById[id] = { ...storedSource };
          }
        }
      });
    }
    
    // Step 5: Convert back to array and ensure all 159 sources are present
    let resultSources = Object.values(completeSourcesById);
    
    // Step 6: Safety check - make sure we have ALL expected stream IDs (1-159)
    const expectedIds = Array.from({ length: 159 }, (_, i) => i + 1);
    const missingIds = expectedIds.filter(id => !completeSourcesById[id]);
    
    if (missingIds.length > 0) {
      console.warn(`Found ${missingIds.length} missing stream sources, restoring from defaults`);
      
      // Create missing sources from defaults
      missingIds.forEach(id => {
        // Find the default source definition based on ID ranges
        let name = `Stream ${id}`;
        let teamName = `Team ${id}`;
        let leagueId = 'other';
        
        // 1-5: Special channels
        if (id >= 1 && id <= 5) {
          const specialNames = {
            1: 'NBA TV',
            2: 'NFL Network',
            3: 'MLB Network',
            4: 'NHL Network',
            5: 'ESPN'
          };
          name = specialNames[id] || `Special Channel ${id}`;
          teamName = name;
          leagueId = 'special';
        }
        // 6-35: NHL Teams
        else if (id >= 6 && id <= 35) {
          name = `NHL - Team ${id}`;
          teamName = `NHL Team ${id}`;
          leagueId = 'nhl';
        }
        // 36-65: MLB Teams
        else if (id >= 36 && id <= 65) {
          name = `MLB - Team ${id}`;
          teamName = `MLB Team ${id}`;
          leagueId = 'mlb';
        }
        // 66-97: NFL Teams
        else if (id >= 66 && id <= 97) {
          name = `NFL - Team ${id}`;
          teamName = `NFL Team ${id}`;
          leagueId = 'nfl';
        }
        // 98-127: NBA Teams
        else if (id >= 98 && id <= 127) {
          name = `NBA - Team ${id}`;
          teamName = `NBA Team ${id}`;
          leagueId = 'nba';
        }
        // 128-159: Additional channels
        else {
          name = `Additional Channel ${id}`;
          teamName = name;
          leagueId = 'other';
        }
        
        // Create a default source and add it to the results
        resultSources.push({
          id,
          name,
          teamName,
          leagueId,
          url: `https://vp.pixelsport.to:443/psportsgate/psportsgate100/${id}.m3u8`,
          isActive: true,
          priority: 1,
          description: `Stream source ${id}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      // Sort by ID
      resultSources.sort((a, b) => a.id - b.id);
    }
    
    console.log(`Returning ${resultSources.length} total stream sources`);
    return resultSources;
  }
  
  /**
   * Get predefined stream sources with any persistent updates applied
   */
  getPredefinedStreamSources() {
    // Generate base stream sources
    const streamSources = [];
    
    // Special channels (1-5)
    const specialChannels = [
      { id: 1, name: 'NBA TV', teamName: 'NBA TV', leagueId: 'special' },
      { id: 2, name: 'NFL Network', teamName: 'NFL Network', leagueId: 'special' },
      { id: 3, name: 'MLB Network', teamName: 'MLB Network', leagueId: 'special' },
      { id: 4, name: 'NHL Network', teamName: 'NHL Network', leagueId: 'special' },
      { id: 5, name: 'ESPN', teamName: 'ESPN', leagueId: 'special' }
    ];
    
    // NHL Teams (6-35)
    const nhlTeams = [];
    for (let i = 6; i <= 35; i++) {
      nhlTeams.push({
        id: i,
        name: `NHL - Team ${i}`,
        teamName: `NHL Team ${i}`,
        leagueId: 'nhl'
      });
    }
    
    // Complete list of all 32 NHL teams
    const realNhlTeams = [
      { id: 6, name: 'NHL - Anaheim Ducks', teamName: 'Anaheim Ducks', leagueId: 'nhl' },
      { id: 7, name: 'NHL - Arizona Coyotes', teamName: 'Arizona Coyotes', leagueId: 'nhl' },
      { id: 8, name: 'NHL - Boston Bruins', teamName: 'Boston Bruins', leagueId: 'nhl' },
      { id: 9, name: 'NHL - Buffalo Sabres', teamName: 'Buffalo Sabres', leagueId: 'nhl' },
      { id: 10, name: 'NHL - Calgary Flames', teamName: 'Calgary Flames', leagueId: 'nhl' },
      { id: 11, name: 'NHL - Carolina Hurricanes', teamName: 'Carolina Hurricanes', leagueId: 'nhl' },
      { id: 12, name: 'NHL - Chicago Blackhawks', teamName: 'Chicago Blackhawks', leagueId: 'nhl' },
      { id: 13, name: 'NHL - Colorado Avalanche', teamName: 'Colorado Avalanche', leagueId: 'nhl' },
      { id: 14, name: 'NHL - Columbus Blue Jackets', teamName: 'Columbus Blue Jackets', leagueId: 'nhl' },
      { id: 15, name: 'NHL - Dallas Stars', teamName: 'Dallas Stars', leagueId: 'nhl' },
      { id: 16, name: 'NHL - Detroit Red Wings', teamName: 'Detroit Red Wings', leagueId: 'nhl' },
      { id: 17, name: 'NHL - Edmonton Oilers', teamName: 'Edmonton Oilers', leagueId: 'nhl' },
      { id: 18, name: 'NHL - Florida Panthers', teamName: 'Florida Panthers', leagueId: 'nhl' },
      { id: 19, name: 'NHL - Los Angeles Kings', teamName: 'Los Angeles Kings', leagueId: 'nhl' },
      { id: 20, name: 'NHL - Minnesota Wild', teamName: 'Minnesota Wild', leagueId: 'nhl' },
      { id: 21, name: 'NHL - Montreal Canadiens', teamName: 'Montreal Canadiens', leagueId: 'nhl' },
      { id: 22, name: 'NHL - Nashville Predators', teamName: 'Nashville Predators', leagueId: 'nhl' },
      { id: 23, name: 'NHL - New Jersey Devils', teamName: 'New Jersey Devils', leagueId: 'nhl' },
      { id: 24, name: 'NHL - New York Islanders', teamName: 'New York Islanders', leagueId: 'nhl' },
      { id: 25, name: 'NHL - New York Rangers', teamName: 'New York Rangers', leagueId: 'nhl' },
      { id: 26, name: 'NHL - Ottawa Senators', teamName: 'Ottawa Senators', leagueId: 'nhl' },
      { id: 27, name: 'NHL - Philadelphia Flyers', teamName: 'Philadelphia Flyers', leagueId: 'nhl' },
      { id: 28, name: 'NHL - Pittsburgh Penguins', teamName: 'Pittsburgh Penguins', leagueId: 'nhl' },
      { id: 29, name: 'NHL - San Jose Sharks', teamName: 'San Jose Sharks', leagueId: 'nhl' },
      { id: 30, name: 'NHL - Seattle Kraken', teamName: 'Seattle Kraken', leagueId: 'nhl' },
      { id: 31, name: 'NHL - St. Louis Blues', teamName: 'St. Louis Blues', leagueId: 'nhl' },
      { id: 32, name: 'NHL - Tampa Bay Lightning', teamName: 'Tampa Bay Lightning', leagueId: 'nhl' },
      { id: 33, name: 'NHL - Toronto Maple Leafs', teamName: 'Toronto Maple Leafs', leagueId: 'nhl' },
      { id: 34, name: 'NHL - Vancouver Canucks', teamName: 'Vancouver Canucks', leagueId: 'nhl' },
      { id: 35, name: 'NHL - Vegas Golden Knights', teamName: 'Vegas Golden Knights', leagueId: 'nhl' },
      { id: 21, name: 'NHL - Washington Capitals', teamName: 'Washington Capitals', leagueId: 'nhl' },
      { id: 22, name: 'NHL - Winnipeg Jets', teamName: 'Winnipeg Jets', leagueId: 'nhl' }
    ];
    
    // Replace generic NHL teams with real ones where available
    realNhlTeams.forEach(team => {
      const index = nhlTeams.findIndex(t => t.id === team.id);
      if (index !== -1) {
        nhlTeams[index] = team;
      }
    });
    
    // MLB Teams (36-65)
    const mlbTeams = [];
    for (let i = 36; i <= 65; i++) {
      mlbTeams.push({
        id: i,
        name: `MLB - Team ${i}`,
        teamName: `MLB Team ${i}`,
        leagueId: 'mlb'
      });
    }
    
    // Add some real MLB teams
    const realMlbTeams = [
      { id: 36, name: 'MLB - Atlanta Braves', teamName: 'Atlanta Braves', leagueId: 'mlb' },
      { id: 37, name: 'MLB - Boston Red Sox', teamName: 'Boston Red Sox', leagueId: 'mlb' },
      { id: 38, name: 'MLB - Chicago Cubs', teamName: 'Chicago Cubs', leagueId: 'mlb' },
      { id: 39, name: 'MLB - Chicago White Sox', teamName: 'Chicago White Sox', leagueId: 'mlb' },
      { id: 40, name: 'MLB - Cleveland Guardians', teamName: 'Cleveland Guardians', leagueId: 'mlb' },
      { id: 41, name: 'MLB - Colorado Rockies', teamName: 'Colorado Rockies', leagueId: 'mlb' },
      { id: 42, name: 'MLB - Detroit Tigers', teamName: 'Detroit Tigers', leagueId: 'mlb' },
      { id: 43, name: 'MLB - Houston Astros', teamName: 'Houston Astros', leagueId: 'mlb' },
      { id: 44, name: 'MLB - Kansas City Royals', teamName: 'Kansas City Royals', leagueId: 'mlb' },
      { id: 45, name: 'MLB - Los Angeles Angels', teamName: 'Los Angeles Angels', leagueId: 'mlb' }
    ];
    
    // Replace generic MLB teams with real ones where available
    realMlbTeams.forEach(team => {
      const index = mlbTeams.findIndex(t => t.id === team.id);
      if (index !== -1) {
        mlbTeams[index] = team;
      }
    });
    
    // NFL Teams (66-97)
    const nflTeams = [];
    for (let i = 66; i <= 97; i++) {
      nflTeams.push({
        id: i,
        name: `NFL - Team ${i}`,
        teamName: `NFL Team ${i}`,
        leagueId: 'nfl'
      });
    }
    
    // Add some real NFL teams
    const realNflTeams = [
      { id: 66, name: 'NFL - Arizona Cardinals', teamName: 'Arizona Cardinals', leagueId: 'nfl' },
      { id: 67, name: 'NFL - Atlanta Falcons', teamName: 'Atlanta Falcons', leagueId: 'nfl' },
      { id: 68, name: 'NFL - Baltimore Ravens', teamName: 'Baltimore Ravens', leagueId: 'nfl' },
      { id: 69, name: 'NFL - Buffalo Bills', teamName: 'Buffalo Bills', leagueId: 'nfl' },
      { id: 70, name: 'NFL - Carolina Panthers', teamName: 'Carolina Panthers', leagueId: 'nfl' },
      { id: 71, name: 'NFL - Chicago Bears', teamName: 'Chicago Bears', leagueId: 'nfl' },
      { id: 72, name: 'NFL - Cincinnati Bengals', teamName: 'Cincinnati Bengals', leagueId: 'nfl' },
      { id: 73, name: 'NFL - Cleveland Browns', teamName: 'Cleveland Browns', leagueId: 'nfl' },
      { id: 74, name: 'NFL - Dallas Cowboys', teamName: 'Dallas Cowboys', leagueId: 'nfl' },
      { id: 75, name: 'NFL - Denver Broncos', teamName: 'Denver Broncos', leagueId: 'nfl' }
    ];
    
    // Replace generic NFL teams with real ones where available
    realNflTeams.forEach(team => {
      const index = nflTeams.findIndex(t => t.id === team.id);
      if (index !== -1) {
        nflTeams[index] = team;
      }
    });
    
    // NBA Teams (98-127)
    const nbaTeams = [];
    for (let i = 98; i <= 127; i++) {
      nbaTeams.push({
        id: i,
        name: `NBA - Team ${i}`,
        teamName: `NBA Team ${i}`,
        leagueId: 'nba'
      });
    }
    
    // Add some real NBA teams
    const realNbaTeams = [
      { id: 98, name: 'NBA - Atlanta Hawks', teamName: 'Atlanta Hawks', leagueId: 'nba' },
      { id: 99, name: 'NBA - Boston Celtics', teamName: 'Boston Celtics', leagueId: 'nba' },
      { id: 100, name: 'NBA - Brooklyn Nets', teamName: 'Brooklyn Nets', leagueId: 'nba' },
      { id: 101, name: 'NBA - Charlotte Hornets', teamName: 'Charlotte Hornets', leagueId: 'nba' },
      { id: 102, name: 'NBA - Chicago Bulls', teamName: 'Chicago Bulls', leagueId: 'nba' },
      { id: 103, name: 'NBA - Cleveland Cavaliers', teamName: 'Cleveland Cavaliers', leagueId: 'nba' },
      { id: 104, name: 'NBA - Dallas Mavericks', teamName: 'Dallas Mavericks', leagueId: 'nba' },
      { id: 105, name: 'NBA - Denver Nuggets', teamName: 'Denver Nuggets', leagueId: 'nba' },
      { id: 106, name: 'NBA - Detroit Pistons', teamName: 'Detroit Pistons', leagueId: 'nba' },
      { id: 107, name: 'NBA - Golden State Warriors', teamName: 'Golden State Warriors', leagueId: 'nba' }
    ];
    
    // Replace generic NBA teams with real ones where available
    realNbaTeams.forEach(team => {
      const index = nbaTeams.findIndex(t => t.id === team.id);
      if (index !== -1) {
        nbaTeams[index] = team;
      }
    });
    
    // Add the predefined sources to our list
    [...specialChannels, ...nhlTeams, ...mlbTeams, ...nflTeams, ...nbaTeams].forEach(team => {
      streamSources.push({
        id: team.id,
        name: team.name,
        teamName: team.teamName,
        url: `https://vp.pixelsport.to:443/psportsgate/psportsgate100/${team.id}.m3u8`,
        description: `${team.teamName} stream`,
        isActive: true,
        leagueId: team.leagueId,
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    
    // Add additional channels with IDs 128-159
    for (let i = 128; i <= 159; i++) {
      if (!streamSources.find(s => s.id === i)) {
        streamSources.push({
          id: i,
          name: `Additional Channel ${i}`,
          teamName: `Channel ${i}`,
          leagueId: 'misc',
          url: `https://vp.pixelsport.to:443/psportsgate/psportsgate100/${i}.m3u8`,
          description: `Miscellaneous Channel ${i}`,
          isActive: true,
          priority: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    // Initialize in-memory cache if it doesn't exist
    if (!this.inMemoryStreamUrls) {
      this.inMemoryStreamUrls = {};
      
      // Load any stored stream URLs from persistent storage
      const storedKeys = persistentStorage.getKeys().filter(key => key.startsWith('stream_source_'));
      if (storedKeys.length > 0) {
        console.log(`Loading ${storedKeys.length} stream sources from persistent storage`);
        
        storedKeys.forEach(key => {
          const storedSource = persistentStorage.get(key);
          if (storedSource && storedSource.id) {
            this.inMemoryStreamUrls[storedSource.id] = storedSource;
          }
        });
      }
    }
    
    // Apply any stored/in-memory updates
    if (this.inMemoryStreamUrls) {
      Object.values(this.inMemoryStreamUrls).forEach(updatedSource => {
        // Find if this source already exists in our array
        const existingIndex = streamSources.findIndex(s => s.id === updatedSource.id);
        
        if (existingIndex >= 0) {
          // Replace with the updated source
          streamSources[existingIndex] = updatedSource;
        } else {
          // Add new source
          streamSources.push(updatedSource);
        }
      });
    }
    
    // Sort by ID
    return streamSources.sort((a, b) => a.id - b.id);
  }
}

export const streamUrlService = new StreamUrlService();