/**
 * Stream Sources Latest Fixed
 * Provides the latest stream sources information with standardized URLs
 * that use the newer vpt.pixelsport.to domain and correct m3u8 path
 * 
 * This consolidated module brings together all stream source management functionality
 * and provides robust fallback mechanisms and standardized URL handling
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { storage } from '../neonStorage';

// Constants for stream URL patterns
export const OLD_DOMAIN = 'vp.pixelsport.to';
export const NEW_DOMAIN = 'vpt.pixelsport.to';
export const PORT = '443';
export const PATH = 'psportsgate/psportsgate100';

// MLB Team IDs version tracking
// Version 1: Original IDs (1-30 range)
// Version 2: Updated IDs (148-177 range) - May 21, 2025
// Version 3: Final IDs (185-214 range) - May 23, 2025
export const MLB_TEAM_IDS_VERSION = 3;

// Mapping of special channels and leagues by ID range - Updated from M3U8 source
export const ID_RANGES = {
  // 1-5: Special channels
  SPECIAL_CHANNELS: { min: 1, max: 5, leagueId: 'special', prefix: 'Special Channel' },
  // 6-35: NHL Teams (Core range)
  NHL_TEAMS: { min: 6, max: 35, leagueId: 'nhl', prefix: 'NHL Team' },
  // 35-63: NFL Teams (Updated range from M3U8)
  NFL_TEAMS: { min: 35, max: 63, leagueId: 'nfl', prefix: 'NFL Team' },
  // 65-95: NBA Teams (Updated range from M3U8)
  NBA_TEAMS: { min: 65, max: 95, leagueId: 'nba', prefix: 'NBA Team' },
  // 96-146: Mixed Special Sports Channels
  SPECIAL_SPORTS: { min: 96, max: 146, leagueId: 'special', prefix: 'Sports Channel' },
  // 185-214: MLB Teams (New range from M3U8)
  MLB_TEAMS: { min: 185, max: 214, leagueId: 'mlb', prefix: 'MLB Team' },
  // 215-218: Extended NHL Teams
  NHL_EXTENDED: { min: 215, max: 218, leagueId: 'nhl', prefix: 'NHL Team' },
  // 219-222: Extended NBA Teams
  NBA_EXTENDED: { min: 219, max: 222, leagueId: 'nba', prefix: 'NBA Team' }
};

// Special channel names mapping
export const SPECIAL_CHANNEL_NAMES: Record<number, string> = {
  1: 'NBA TV',
  2: 'NFL Network',
  3: 'MLB Network',
  4: 'NHL Network',
  5: 'ESPN'
};

const router = express.Router();

// Load stream sources from the local file as a backup
function loadStreamSourcesFromFile() {
  try {
    const streamSourcesPath = path.join(process.cwd(), 'stream-sources-complete.json');
    
    if (fs.existsSync(streamSourcesPath)) {
      const fileData = fs.readFileSync(streamSourcesPath, 'utf8');
      const sources = JSON.parse(fileData);
      return sources;
    }
  } catch (error) {
    console.error('Error loading stream sources from file:', error);
  }
  
  return [];
}

/**
 * Gets the league ID and name information for a given stream ID
 * This helps with categorizing streams correctly by league
 */
export function getStreamIdInfo(id: number): { leagueId: string; name: string; teamName: string } {
  let name = `Stream ${id}`;
  let teamName = `Team ${id}`;
  let leagueId = 'other';
  
  // Check special channels first (1-5)
  if (id >= ID_RANGES.SPECIAL_CHANNELS.min && id <= ID_RANGES.SPECIAL_CHANNELS.max) {
    name = SPECIAL_CHANNEL_NAMES[id as keyof typeof SPECIAL_CHANNEL_NAMES] || `${ID_RANGES.SPECIAL_CHANNELS.prefix} ${id}`;
    teamName = name;
    leagueId = ID_RANGES.SPECIAL_CHANNELS.leagueId;
  }
  // Check NHL Teams (6-35)
  else if (id >= ID_RANGES.NHL_TEAMS.min && id <= ID_RANGES.NHL_TEAMS.max) {
    name = `${ID_RANGES.NHL_TEAMS.prefix} ${id}`;
    teamName = `NHL Team ${id}`;
    leagueId = ID_RANGES.NHL_TEAMS.leagueId;
  }
  // Check NFL Teams (35-63)
  else if (id >= ID_RANGES.NFL_TEAMS.min && id <= ID_RANGES.NFL_TEAMS.max) {
    name = `${ID_RANGES.NFL_TEAMS.prefix} ${id}`;
    teamName = `NFL Team ${id}`;
    leagueId = ID_RANGES.NFL_TEAMS.leagueId;
  }
  // Check NBA Teams (65-95)
  else if (id >= ID_RANGES.NBA_TEAMS.min && id <= ID_RANGES.NBA_TEAMS.max) {
    name = `${ID_RANGES.NBA_TEAMS.prefix} ${id}`;
    teamName = `NBA Team ${id}`;
    leagueId = ID_RANGES.NBA_TEAMS.leagueId;
  }
  // Check Special Sports Channels (96-146)
  else if (id >= ID_RANGES.SPECIAL_SPORTS.min && id <= ID_RANGES.SPECIAL_SPORTS.max) {
    name = `${ID_RANGES.SPECIAL_SPORTS.prefix} ${id}`;
    teamName = `Sports Channel ${id}`;
    leagueId = ID_RANGES.SPECIAL_SPORTS.leagueId;
  }
  // Check MLB Teams (185-214)
  else if (id >= ID_RANGES.MLB_TEAMS.min && id <= ID_RANGES.MLB_TEAMS.max) {
    name = `${ID_RANGES.MLB_TEAMS.prefix} ${id}`;
    teamName = `MLB Team ${id}`;
    leagueId = ID_RANGES.MLB_TEAMS.leagueId;
  }
  // Check Extended NHL Teams (215-218)
  else if (id >= ID_RANGES.NHL_EXTENDED.min && id <= ID_RANGES.NHL_EXTENDED.max) {
    name = `${ID_RANGES.NHL_EXTENDED.prefix} ${id}`;
    teamName = `NHL Team ${id}`;
    leagueId = ID_RANGES.NHL_EXTENDED.leagueId;
  }
  // Check Extended NBA Teams (219-222)
  else if (id >= ID_RANGES.NBA_EXTENDED.min && id <= ID_RANGES.NBA_EXTENDED.max) {
    name = `${ID_RANGES.NBA_EXTENDED.prefix} ${id}`;
    teamName = `NBA Team ${id}`;
    leagueId = ID_RANGES.NBA_EXTENDED.leagueId;
  }
  
  return { leagueId, name, teamName };
}

/**
 * Generates a fallback stream URL when one is not available
 * This helps ensure we always have a valid URL to try
 */
export function getFallbackStreamUrl(id: number): string {
  return `https://${NEW_DOMAIN}:${PORT}/${PATH}/${id}.m3u8`;
}

/**
 * Standardizes a stream URL to ensure it uses the NEW_DOMAIN and correct path pattern
 * Exported for use by other stream-related modules
 */
export function standardizeStreamUrl(url: string): string {
  if (!url) return url;
  
  try {
    // Extract the stream ID using a regex pattern
    const match = url.match(/\/(\d+)\.m3u8$/);
    if (!match) return url;
    
    const streamId = match[1];
    return `https://${NEW_DOMAIN}:${PORT}/${PATH}/${streamId}.m3u8`;
  } catch (error) {
    console.error('Error in standardizeStreamUrl:', error);
    return url;
  }
}

/**
 * CRITICAL FIX: Export function to get updated stream mappings for video player
 * This connects admin panel updates to the actual video player
 */
export function getUpdatedStreamSourceMappings(): any[] {
  try {
    // Get the latest updated stream mappings from the in-memory store
    const { getLatestStreamSources } = require('./streamSourcesLatestFixed');
    const latestSources = getLatestStreamSources ? getLatestStreamSources() : [];
    
    console.log(`🎯 [UpdatedMappings] Returning ${latestSources.length} updated stream mappings for video player`);
    return latestSources || [];
  } catch (error) {
    console.error('Error getting updated stream mappings:', error);
    return [];
  }
}

/**
 * Creates a new stream source with standardized data
 * @param streamId The ID of the stream to create
 * @param url The stream URL
 */
export async function createOrUpdateStreamSource(streamId: number, url: string) {
  try {
    const streamIdInfo = getStreamIdInfo(streamId);
    const standardizedUrl = standardizeStreamUrl(url);
    
    // Prepare stream data for database
    const streamData = {
      id: streamId,
      name: streamIdInfo.name,
      team_name: streamIdInfo.teamName,
      url: standardizedUrl,
      description: `Stream source ID ${streamId}`,
      is_active: true,
      league_id: streamIdInfo.leagueId,
      priority: 1,
      updated_at: new Date()
    };
    
    // Try to update first, if it doesn't exist, it will be created
    const { data, error } = await supabase
      .from('stream_sources')
      .upsert(streamData, { onConflict: 'id' })
      .select();
      
    if (error) {
      console.error('Error creating/updating stream source:', error);
      return null;
    }
    
    // Clear any global cache to ensure fresh data is used
    const globalObj = global as any;
    if (globalObj.cachedStreamSources) {
      console.log('Clearing global stream sources cache');
      globalObj.cachedStreamSources = null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in createOrUpdateStreamSource:', error);
    return null;
  }
}

// Main handler for getting the latest stream sources with standardized URLs
// This endpoint is completely public - NO authentication required
router.get('/', async (req, res) => {
  try {
    // Allow CORS for this specific route to improve access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    
    // Get cache control parameters from query if provided
    // Note: Frontend passes cache buster and MLB version parameters
    const requestedVersion = req.query.v ? Number(req.query.v) : null;
    const cacheControl = req.query.noCache === 'true';
    
    // Log version check information
    if (requestedVersion) {
      console.log(`Stream sources requested with MLB IDs version: ${requestedVersion}, current version: ${MLB_TEAM_IDS_VERSION}`);
    }
    
    // Set cache control headers based on request
    if (cacheControl) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
    }
    
    // Array to hold our merged stream sources
    let sources = [];
    
    // Try to get sources from database first
    try {
      const { data: dbSources, error } = await supabase
        .from('stream_sources')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      if (dbSources && dbSources.length > 0) {
        console.log(`Found ${dbSources.length} stream sources in database (MLB IDs version ${MLB_TEAM_IDS_VERSION})`);
        sources = dbSources;
      }
    } catch (dbError) {
      console.error('Database error when fetching stream sources:', dbError);
    }
    
    // Always include your correct MLB team data regardless of database status
    const correctMLBSources = [
      {
        id: 210,
        team_name: 'Boston Red Sox',
        stream_url: `https://${NEW_DOMAIN}:${PORT}/${PATH}/210.m3u8`,
        league_id: 'mlb',
        stream_id: '210',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 201,
        team_name: 'Baltimore Orioles',
        stream_url: `https://${NEW_DOMAIN}:${PORT}/${PATH}/201.m3u8`,
        league_id: 'mlb',
        stream_id: '201',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Prioritize your correct MLB data
    sources = [...correctMLBSources, ...sources.filter(s => !['210', '201'].includes(s.stream_id?.toString()))];
    
    // If no data from database, try to get from file
    if (sources.length <= 2) {
      const fileSources = loadStreamSourcesFromFile();
      
      if (fileSources && fileSources.length > 0) {
        console.log(`Found ${fileSources.length} stream sources in file (MLB IDs version ${MLB_TEAM_IDS_VERSION})`);
        sources = fileSources.map((source: any) => ({
          id: parseInt(source.id),
          name: source.name || '',
          url: source.url || '',
          description: source.description || '',
          isActive: source.isActive !== false,
          leagueId: source.leagueId || 'unknown',
          priority: source.priority || 0,
          teamName: source.teamName || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }
    }
    
    // Ensure we always return your correct MLB data even if sources is empty
    if (sources.length === 0) {
      sources = [
        {
          id: 210,
          team_name: 'Boston Red Sox',
          stream_url: `https://${NEW_DOMAIN}:${PORT}/${PATH}/210.m3u8`,
          league_id: 'mlb',
          stream_id: '210',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 201,
          team_name: 'Baltimore Orioles',
          stream_url: `https://${NEW_DOMAIN}:${PORT}/${PATH}/201.m3u8`,
          league_id: 'mlb',
          stream_id: '201',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    
    // Standardize all URLs to use the newer domain format
    const standardizedSources = sources.map((source: any) => ({
      ...source,
      stream_url: standardizeStreamUrl(source.stream_url || source.url || `https://${NEW_DOMAIN}:${PORT}/${PATH}/${source.stream_id}.m3u8`)
    }));
    
    res.json({
      success: true,
      count: standardizedSources.length,
      sources: standardizedSources,
      mlbIdsVersion: MLB_TEAM_IDS_VERSION,
      note: 'Red Sox=210, Orioles=201 from your M3U8'
    });
  } catch (error) {
    console.error('Error retrieving latest stream sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stream sources'
    });
  }
});

// Endpoint for updating a stream source URL
router.post('/update/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { url } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid URL is required'
      });
    }
    
    // Use the consolidated createOrUpdateStreamSource function
    const data = await createOrUpdateStreamSource(id, url);
    
    if (!data) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update stream URL'
      });
    }
    
    res.json({
      success: true,
      message: 'Stream URL updated successfully',
      data: {
        id,
        url: standardizeStreamUrl(url)
      }
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error updating stream source URL:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
});

export default router;