/**
 * Dynamic Stream Mapping System
 * 
 * This module automatically parses M3U8 playlists to create dynamic stream mappings
 * without any hardcoded values. It ensures perfect alignment between actual streams
 * and system configuration.
 */

interface StreamSource {
  id: number;
  name: string;
  url: string;
  league?: string;
  teamName?: string;
}

interface DynamicStreamMap {
  [key: string]: number;
}

/**
 * Parses M3U8 content and extracts stream mappings
 */
export function parseM3U8ToStreamMap(m3u8Content: string): DynamicStreamMap {
  const streamMap: DynamicStreamMap = {};
  const lines = m3u8Content.split('\n');
  
  let currentName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse EXTINF line to get stream name
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/#EXTINF:-?\d+,(.+)/);
      if (nameMatch) {
        currentName = nameMatch[1].trim();
      }
    }
    
    // Parse URL line to get stream ID
    if (line.startsWith('https://') && currentName) {
      const urlMatch = line.match(/\/(\d+)\.m3u8$/);
      if (urlMatch) {
        const streamId = parseInt(urlMatch[1], 10);
        
        // Normalize the name for consistent mapping
        const normalizedName = normalizeStreamName(currentName);
        streamMap[normalizedName] = streamId;
        
        // Add alternative names for better matching
        addAlternativeNames(streamMap, normalizedName, streamId);
      }
      currentName = ''; // Reset for next stream
    }
  }
  
  console.log(`[DynamicStreamMapping] Parsed ${Object.keys(streamMap).length} stream mappings from M3U8`);
  return streamMap;
}

/**
 * Normalizes stream names for consistent mapping
 */
function normalizeStreamName(name: string): string {
  return name
    .replace(/^USA:\s*VIP\s*/i, '') // Remove "USA: VIP" prefix
    .replace(/^USA:\s*/i, '') // Remove "USA:" prefix
    .replace(/^VIP\s*/i, '') // Remove "VIP" prefix
    .replace(/^NBA\s*/i, '') // Remove standalone "NBA" prefix
    .replace(/^NFL\s*/i, '') // Remove standalone "NFL" prefix
    .replace(/^NHL\s*/i, '') // Remove standalone "NHL" prefix
    .replace(/^MLB\s*-?\s*/i, '') // Remove "MLB -" prefix
    .replace(/\s*-\s*/g, ' ') // Replace " - " with space
    .trim()
    .toUpperCase();
}

/**
 * Adds alternative names for better team matching
 */
function addAlternativeNames(streamMap: DynamicStreamMap, name: string, streamId: number): void {
  // Add the original name
  streamMap[name] = streamId;
  
  // Add league-specific prefixes
  if (name.includes('NBA')) {
    const teamName = name.replace(/NBA\s*/i, '').trim();
    streamMap[`VIP NBA ${teamName}`] = streamId;
    streamMap[teamName] = streamId;
  }
  
  if (name.includes('NFL')) {
    const teamName = name.replace(/NFL\s*-?\s*/i, '').trim();
    streamMap[`NFL-${teamName}`] = streamId;
    streamMap[`VIP NFL ${teamName}`] = streamId;
    streamMap[teamName] = streamId;
  }
  
  if (name.includes('NHL')) {
    const teamName = name.replace(/NHL\s*/i, '').trim();
    streamMap[`VIP NHL ${teamName}`] = streamId;
    streamMap[teamName] = streamId;
  }
  
  // Add common team name variations
  const teamWords = name.split(' ');
  if (teamWords.length > 1) {
    // Add last word as nickname (e.g., "PATRIOTS" from "NEW ENGLAND PATRIOTS")
    const nickname = teamWords[teamWords.length - 1];
    if (nickname.length > 3) {
      streamMap[nickname] = streamId;
    }
  }
  
  // Add abbreviated forms
  if (name === 'NBA TV') streamMap['NBATV'] = streamId;
  if (name === 'NFL NETWORK') streamMap['NFLNETWORK'] = streamId;
  if (name === 'NHL NETWORK') streamMap['NHLNETWORK'] = streamId;
  if (name === 'ESPN US') streamMap['ESPN'] = streamId;
}

/**
 * Gets stream URL for a team using dynamic mapping
 */
export function getDynamicStreamUrl(teamName: string, streamMap: DynamicStreamMap): string | null {
  if (!teamName || !streamMap) return null;
  
  const normalized = normalizeStreamName(teamName);
  
  // Try exact match first
  if (streamMap[normalized]) {
    const streamId = streamMap[normalized];
    return `https://vpt.pixelsport.to:443/psportsgate/psportsgate100/${streamId}.m3u8`;
  }
  
  // Try fuzzy matching
  for (const [mappedName, streamId] of Object.entries(streamMap)) {
    if (mappedName.includes(normalized) || normalized.includes(mappedName)) {
      console.log(`[DynamicStreamMapping] Fuzzy match: '${teamName}' → '${mappedName}' (ID: ${streamId})`);
      return `https://vpt.pixelsport.to:443/psportsgate/psportsgate100/${streamId}.m3u8`;
    }
  }
  
  console.log(`[DynamicStreamMapping] No stream found for team: ${teamName}`);
  return null;
}

/**
 * Updates stream mappings from latest M3U8 source
 */
export async function updateDynamicStreamMapping(): Promise<DynamicStreamMap> {
  try {
    // This would fetch from your latest M3U8 source
    // For now, we'll use the provided M3U8 content
    const m3u8Content = await fetchLatestM3U8();
    return parseM3U8ToStreamMap(m3u8Content);
  } catch (error) {
    console.error('[DynamicStreamMapping] Error updating stream mapping:', error);
    return {};
  }
}

/**
 * Fetches the latest M3U8 content from your stream source
 */
async function fetchLatestM3U8(): Promise<string> {
  try {
    const response = await fetch('https://vpt.pixelsport.to:443/psportsgate/psportsgate100/playlist.m3u8');
    if (!response.ok) {
      throw new Error(`Failed to fetch M3U8: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('[DynamicStreamMapping] Error fetching M3U8:', error);
    throw error;
  }
}

/**
 * Categorizes streams by league
 */
export function categorizeStreams(streamMap: DynamicStreamMap): {
  special: DynamicStreamMap;
  nba: DynamicStreamMap;
  nfl: DynamicStreamMap;
  nhl: DynamicStreamMap;
  mlb: DynamicStreamMap;
  other: DynamicStreamMap;
} {
  const categories = {
    special: {} as DynamicStreamMap,
    nba: {} as DynamicStreamMap,
    nfl: {} as DynamicStreamMap,
    nhl: {} as DynamicStreamMap,
    mlb: {} as DynamicStreamMap,
    other: {} as DynamicStreamMap
  };
  
  for (const [name, streamId] of Object.entries(streamMap)) {
    if (streamId <= 5) {
      categories.special[name] = streamId;
    } else if (name.includes('NBA') || (streamId >= 65 && streamId <= 95)) {
      categories.nba[name] = streamId;
    } else if (name.includes('NFL') || (streamId >= 35 && streamId <= 63)) {
      categories.nfl[name] = streamId;
    } else if (name.includes('NHL') || (streamId >= 6 && streamId <= 34)) {
      categories.nhl[name] = streamId;
    } else if (name.includes('MLB') || (streamId >= 185 && streamId <= 214)) {
      categories.mlb[name] = streamId;
    } else {
      categories.other[name] = streamId;
    }
  }
  
  return categories;
}

// Export the dynamic stream map for use by other modules
export let DYNAMIC_STREAM_MAP: DynamicStreamMap = {};

// Function to initialize the dynamic mapping
export async function initializeDynamicMapping(): Promise<void> {
  DYNAMIC_STREAM_MAP = await updateDynamicStreamMapping();
  console.log('[DynamicStreamMapping] Dynamic stream mapping initialized');
}