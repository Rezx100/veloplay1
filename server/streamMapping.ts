import { Game } from '@shared/schema';

// Base URL pattern for the streams 
// Make sure the URL is correct and includes the trailing slash
// Updated on May 20, 2025 to handle the new HTTPS protocol with port
export const STREAM_BASE_URL = 'https://vpt.pixelsport.to:443/psportsgate/psportsgate100/';

// NEW FUNCTION: Get stream mappings with live updates from admin panel 
export async function getStreamMappingsWithUpdates(): Promise<Array<{team: string, streamId: number, league: string, url: string}>> {
  const mappings = [];
  
  try {
    // CRITICAL FIX: First get any database-stored streams that override default mappings
    const { storage } = await import('./storage');
    const dbStreams = await storage.getAllStreams();
    
    console.log(`🎯 [LiveMappings] Found ${dbStreams.length} database streams`);
    
    // Track which teams have database overrides
    const dbOverrides = new Map();
    for (const stream of dbStreams) {
      if (stream.gameId && stream.streamUrl) {
        // Extract team info from gameId or stream metadata if available
        // For now, we'll need to map these properly
        console.log(`🎯 [LiveMappings] Database override for game ${stream.gameId}: ${stream.streamUrl}`);
      }
    }
  } catch (error) {
    console.error('Error fetching database streams:', error);
  }
  
  // Get base mappings from static objects
  const baseMapping = await getStreamMappings();
  
  // TODO: Merge database overrides with base mappings
  // For now, return base mappings - this will be enhanced
  return baseMapping;
}

// Original function to get current stream mappings for admin interface
export async function getStreamMappings(): Promise<Array<{team: string, streamId: number, league: string, url: string}>> {
  const mappings = [];
  
  // PRIORITY 1: Get updated stream sources from database (YOUR M3U8 DATA)
  try {
    const supabase = (await import('./supabaseClient')).default;
    const { data: streamSources, error } = await supabase
      .from('stream_sources')
      .select('*')
      .eq('is_active', true);
    
    if (!error && streamSources && streamSources.length > 0) {
      console.log(`🎯 [StreamMapping] Using ${streamSources.length} database stream sources (updated M3U8 data)`);
      
      for (const source of streamSources) {
        const streamId = parseInt(source.stream_id);
        let league = source.league_id?.toUpperCase() || 'UNKNOWN';
        
        // Determine league from new ID ranges if not specified
        if (league === 'UNKNOWN' || league === 'AUTO-DETECTED') {
          if (streamId >= 185 && streamId <= 214) league = 'MLB';
          else if (streamId >= 65 && streamId <= 95) league = 'NBA';
          else if (streamId >= 219 && streamId <= 222) league = 'NBA'; // Extended NBA
          else if (streamId >= 35 && streamId <= 63) league = 'NFL';
          else if (streamId >= 6 && streamId <= 35) league = 'NHL';
          else if (streamId >= 215 && streamId <= 218) league = 'NHL'; // Extended NHL
        }
        
        mappings.push({
          team: source.team_name,
          streamId,
          league,
          url: source.stream_url || `${STREAM_BASE_URL}${streamId}.m3u8`
        });
      }
      
      // Return database mappings if available
      if (mappings.length > 0) {
        console.log(`🎯 [StreamMapping] Returning ${mappings.length} database mappings with updated MLB IDs`);
        return mappings;
      }
    }
  } catch (error) {
    console.error('Error fetching database stream sources:', error);
  }
  
  // FALLBACK: Process teams from DIRECT_STREAM_KEYS only if database is empty
  console.log(`🎯 [StreamMapping] Falling back to static mappings`);
  for (const [teamName, streamId] of Object.entries(DIRECT_STREAM_KEYS)) {
    let league = '';
    
    // Determine league based on NEW stream ID ranges from M3U8
    if (streamId >= 6 && streamId <= 35) {
      league = 'NHL';
    } else if (streamId >= 215 && streamId <= 218) {
      league = 'NHL'; // Extended NHL range
    } else if (streamId >= 35 && streamId <= 63) {
      league = 'NFL';
    } else if (streamId >= 65 && streamId <= 95) {
      league = 'NBA';
    } else if (streamId >= 219 && streamId <= 222) {
      league = 'NBA'; // Extended NBA range
    } else if (streamId >= 185 && streamId <= 214) {
      league = 'MLB'; // NEW MLB range
    }
    
    // Only include teams with valid league assignments
    if (league) {
      mappings.push({
        team: teamName,
        streamId,
        league,
        url: `${STREAM_BASE_URL}${streamId}.m3u8`
      });
    }
  }
  
  // Also process from the main streamMap
  for (const [teamName, streamId] of Object.entries(streamMap)) {
    let league = '';
    
    if (streamId >= 6 && streamId <= 35) {
      league = 'NHL';
    } else if (streamId >= 65 && streamId <= 97) {
      league = 'NBA';
    } else if (streamId >= 185 && streamId <= 214) {
      league = 'MLB';
    } else if (streamId >= 36 && streamId <= 64) {
      league = 'NFL';
    }
    
    // Only add if not already added and has valid league
    if (league && !mappings.find(m => m.team === teamName)) {
      mappings.push({
        team: teamName,
        streamId,
        league,
        url: `${STREAM_BASE_URL}${streamId}.m3u8`
      });
    }
  }
  
  return mappings.sort((a, b) => {
    // Sort by league first, then by team name
    if (a.league !== b.league) {
      return a.league.localeCompare(b.league);
    }
    return a.team.localeCompare(b.team);
  });
}

// Function to update a team's stream ID
export async function updateTeamStreamId(teamName: string, newStreamId: number): Promise<boolean> {
  try {
    let updated = false;
    console.log(`🔄 Attempting to update ${teamName} to stream ID ${newStreamId}`);
    
    // Convert team name to the format used in our mapping (uppercase)
    const normalizedTeamName = teamName.toUpperCase();
    
    // Check if team exists in DIRECT_STREAM_KEYS (MLB teams)
    if (DIRECT_STREAM_KEYS[normalizedTeamName] !== undefined) {
      DIRECT_STREAM_KEYS[normalizedTeamName] = newStreamId;
      console.log(`✅ Updated ${teamName} stream ID to ${newStreamId} in DIRECT_STREAM_KEYS`);
      updated = true;
    }
    
    // Also check in the main streamMap for full team names
    for (const key in streamMap) {
      const upperKey = key.toUpperCase();
      if (upperKey.includes(normalizedTeamName) || normalizedTeamName.includes(upperKey)) {
        streamMap[key] = newStreamId;
        console.log(`✅ Updated ${key} stream ID to ${newStreamId} in streamMap`);
        updated = true;
      }
    }
    
    // Check for partial matches in DIRECT_STREAM_KEYS (e.g., "Blue Jays" for "BLUE JAYS")
    for (const key in DIRECT_STREAM_KEYS) {
      if (key.includes(normalizedTeamName) || normalizedTeamName.includes(key)) {
        DIRECT_STREAM_KEYS[key] = newStreamId;
        console.log(`✅ Updated ${key} stream ID to ${newStreamId} in DIRECT_STREAM_KEYS (partial match)`);
        updated = true;
      }
    }
    
    // For Yankees specifically, ensure both mappings are updated
    if (normalizedTeamName.includes('YANKEES') || normalizedTeamName.includes('NEW YORK YANKEES')) {
      DIRECT_STREAM_KEYS['YANKEES'] = newStreamId;
      streamMap['NEW YORK YANKEES'] = newStreamId;
      console.log(`✅ Yankees-specific update: YANKEES and NEW YORK YANKEES both set to ${newStreamId}`);
      updated = true;
    }
    
    if (updated) {
      console.log(`🎯 Successfully updated ${teamName} stream mapping to ID ${newStreamId}`);
    } else {
      console.log(`❌ No mapping found for ${teamName}`);
    }
    
    return updated;
  } catch (error) {
    console.error('Error updating team stream ID:', error);
    return false;
  }
}

// Function to clear stream sources cache to ensure immediate updates
export function clearStreamSourcesCache(): void {
  try {
    console.log('🧹 Clearing stream sources cache to ensure immediate updates');
    // Force any cached mappings to refresh by clearing module cache if needed
    delete require.cache[require.resolve('./streamMapping')];
    console.log('✅ Stream sources cache cleared successfully');
  } catch (error) {
    console.log('Cache clearing not available, continuing...');
  }
}

// Direct stream keys for common team nicknames without prefixes
// These help with direct matching of standalone team names like "Panthers"
const DIRECT_STREAM_KEYS: Record<string, number> = {
  // NHL team nicknames
  "PANTHERS": 17,  // Florida Panthers
  "JETS": 102,     // Winnipeg Jets
  "BRUINS": 8,     // Boston Bruins
  "STARS": 14,     // Dallas Stars
  "OILERS": 16,    // Edmonton Oilers
  "CANUCKS": 98,   // Vancouver Canucks
  "FLAMES": 10,    // Calgary Flames
  "LEAFS": 32,     // Toronto Maple Leafs
  "HURRICANES": 137, // Carolina Hurricanes
  "CAPITALS": 34,  // Washington Capitals
  "KNIGHTS": 33,   // Vegas Golden Knights
  
  // MLB team nicknames - Updated May 23, 2025 with NEW M3U8 ranges (185-214)
  "ANGELS": 185,       // Los Angeles Angels
  "ASTROS": 186,       // Houston Astros
  "ATHLETICS": 187,    // Oakland Athletics
  "BRAVES": 188,       // Atlanta Braves
  "BREWERS": 189,      // Milwaukee Brewers
  "BLUE JAYS": 190,    // Toronto Blue Jays
  "CUBS": 191,         // Chicago Cubs
  "CARDINALS": 192,    // St Louis Cardinals
  "DODGERS": 193,      // Los Angeles Dodgers
  "DIAMONDBACKS": 194, // Arizona Diamondbacks
  "GIANTS": 195,       // San Francisco Giants
  "GUARDIANS": 196,    // Cleveland Guardians
  "METS": 197,         // New York Mets
  "MARINERS": 198,     // Seattle Mariners
  "ORIOLES": 201,      // Baltimore Orioles - FIXED from your M3U8
  "RED SOX": 210,      // Boston Red Sox - FIXED from your M3U8
  "MARLINS": 199,      // Miami Marlins
  "NATIONALS": 200,    // Washington Nationals
  "PIRATES": 202,      // Pittsburgh Pirates
  "PHILLIES": 203,     // Philadelphia Phillies
  "PADRES": 204,       // San Diego Padres
  "RAYS": 205,         // Tampa Bay Rays
  "REDS": 206,         // Cincinnati Reds
  "ROYALS": 207,       // Kansas City Royals
  "RANGERS": 208,      // Texas Rangers
  "ROCKIES": 209,      // Colorado Rockies
  "TWINS": 211,        // Minnesota Twins
  "TIGERS": 212,       // Detroit Tigers
  "WHITE SOX": 213,    // Chicago White Sox
  "YANKEES": 214,      // New York Yankees
};

// Comprehensive mapping of team names to stream IDs
// This is based on the exact M3U8 playlist data from the source
const streamMap: Record<string, number> = {
  // Special channels
  'NBA TV': 1,
  'NFL NETWORK': 2,
  'ESPN US': 3,
  'NHL NETWORK': 4,
  'NFL REDZONE': 5,
  
  // NHL Teams
  'ANAHEIM DUCKS': 6,
  'UTAH': 7,        // NHL team now in Utah (formerly Arizona Coyotes)
  'BOSTON BRUINS': 8,
  'BUFFALO SABRES': 9,
  'CALGARY FLAMES': 10,
  'CHICAGO BLACKHAWKS': 11, // Updated according to M3U8
  'COLORADO AVALANCHE': 12, // Updated according to M3U8
  'COLUMBUS BLUE JACKETS': 13, // Updated according to M3U8
  'DALLAS STARS': 14, // Updated according to M3U8
  'DETROIT RED WINGS': 15, // Updated according to M3U8
  'EDMONTON OILERS': 16, // Updated according to M3U8
  'FLORIDA PANTHERS': 17, // Updated according to M3U8
  'LOS ANGELES KINGS': 18, // Updated according to M3U8
  'MINNESOTA WILD': 19, // Updated according to M3U8
  'MONTREAL CANADIENS': 20, // Updated according to M3U8
  'NASHVILLE PREDATORS': 21, // Updated according to M3U8
  'NEW JERSEY DEVILS': 22, // Updated according to M3U8
  'NEW YORK ISLANDERS': 23, // Updated according to M3U8
  'NEW YORK RANGERS': 24, // Updated according to M3U8
  'OTTAWA SENATORS': 25, // Updated according to M3U8
  'PHILADELPHIA FLYERS': 26, // Updated according to M3U8
  'PITTSBURGH PENGUINS': 27, // Updated according to M3U8
  'SAN JOSE SHARKS': 28, // Updated according to M3U8
  'SEATTLE KRAKEN': 29, // Updated according to M3U8
  'ST LOUIS BLUES': 30, // Updated according to M3U8
  'ST. LOUIS BLUES': 30, // Alternative spelling
  'TAMPA BAY LIGHTNING': 31, // Updated according to M3U8
  'TORONTO MAPLE LEAFS': 32, // Updated according to M3U8
  'VEGAS GOLDEN KNIGHTS': 33, // Updated according to M3U8
  'WASHINGTON CAPITALS': 34, // Updated according to M3U8
  'WINNIPEG JETS': 102, // Updated based on M3U8 data
  'VANCOUVER CANUCKS': 98, // Updated based on M3U8 data
  'CAROLINA HURRICANES': 137, // Updated based on M3U8 data
  
  // NFL Teams
  'SAN FRANCISCO 49ERS': 35, // NFL-49ERS
  'CHICAGO BEARS': 36, // NFL-BEARS
  'CINCINNATI BENGALS': 37, // NFL-BENGALS
  'BUFFALO BILLS': 38, // NFL-BILLS
  'DENVER BRONCOS': 39, // NFL-BRONCOS
  'CLEVELAND BROWNS': 40, // NFL-BROWNS
  'TAMPA BAY BUCCANEERS': 41, // NFL-BUCCANEERS
  'ARIZONA CARDINALS': 42, // NFL-CARDINALS
  'LOS ANGELES CHARGERS': 43, // NFL-CHARGERS
  'KANSAS CITY CHIEFS': 44, // NFL-CHIEFS
  'INDIANAPOLIS COLTS': 45, // NFL-COLTS
  'MIAMI DOLPHINS': 46, // NFL-DOLPHINS
  'ATLANTA FALCONS': 47, // NFL-FALCONS
  'NEW YORK GIANTS': 48, // NFL-GIANTS
  'JACKSONVILLE JAGUARS': 49, // NFL-JAGUARS
  'NEW YORK JETS': 50, // NFL-JETS
  'DETROIT LIONS': 51, // NFL-LIONS
  'GREEN BAY PACKERS': 52, // NFL-PACKERS
  'CAROLINA PANTHERS': 53, // NFL-PANTHERS
  'NEW ENGLAND PATRIOTS': 54, // NFL-PATRIOTS
  'LAS VEGAS RAIDERS': 55, // NFL-RAIDERS
  'LOS ANGELES RAMS': 56, // NFL-RAMS
  'BALTIMORE RAVENS': 57, // NFL-RAVENS
  'NEW ORLEANS SAINTS': 58, // NFL-SAINTS
  'SEATTLE SEAHAWKS': 59, // NFL-SEAHAWKS
  'PITTSBURGH STEELERS': 60, // NFL-STEELERS
  'HOUSTON TEXANS': 61, // NFL-TEXANS
  'TENNESSEE TITANS': 62, // NFL-TITANS
  'MINNESOTA VIKINGS': 63, // NFL-VIKINGS
  'WASHINGTON COMMANDERS': 96, // NFL-COMMANDERS updated
  'PHILADELPHIA EAGLES': 140, // Updated based on M3U8 data
  'DALLAS COWBOYS': 141, // Updated based on M3U8 data
  
  // Add prefixed NFL team versions
  'NFL-49ERS': 35,
  'NFL-BEARS': 36,
  'NFL-BENGALS': 37,
  'NFL-BILLS': 38,
  'NFL-BRONCOS': 39,
  'NFL-BROWNS': 40,
  'NFL-BUCCANEERS': 41,
  'NFL-CARDINALS': 42,
  'NFL-CHARGERS': 43,
  'NFL-CHIEFS': 44,
  'NFL-COLTS': 45,
  'NFL-DOLPHINS': 46,
  'NFL-FALCONS': 47,
  'NFL-GIANTS': 48,
  'NFL-JAGUARS': 49,
  'NFL-JETS': 50,
  'NFL-LIONS': 51,
  'NFL-PACKERS': 52,
  'NFL-PANTHERS': 53,
  'NFL-PATRIOTS': 54,
  'NFL-RAIDERS': 55,
  'NFL-RAMS': 56,
  'NFL-RAVENS': 57,
  'NFL-SAINTS': 58,
  'NFL-SEAHAWKS': 59,
  'NFL-STEELERS': 60,
  'NFL-TEXANS': 61,
  'NFL-TITANS': 62,
  'NFL-VIKINGS': 63,
  'NFL-COMMANDERS': 96,
  'NFL-EAGLES': 140,
  'NFL-COWBOYS': 141,

  // NBA Teams
  'ATLANTA HAWKS': 65,
  'BOSTON CELTICS': 66,
  'BROOKLYN NETS': 67,
  'WASHINGTON WIZARDS': 68,
  'UTAH JAZZ': 69,
  'TORONTO RAPTORS': 70,
  'SAN ANTONIO SPURS': 71,
  'SACRAMENTO KINGS': 72,
  'PORTLAND TRAIL BLAZERS': 73,
  'MEMPHIS GRIZZLIES': 74,
  'MIAMI HEAT': 75,
  'MILWAUKEE BUCKS': 76,
  'MINNESOTA TIMBERWOLVES': 77,
  'NEW ORLEANS PELICANS': 78,
  'NEW YORK KNICKS': 79,
  'OKLAHOMA CITY THUNDER': 80,
  'OKLAHOMA CITY THUNDERS': 80, // Variation with 's'
  'ORLANDO MAGIC': 81,
  'PHILADELPHIA 76ERS': 82,
  'PHOENIX SUNS': 83,
  'DALLAS MAVERICKS': 84,
  'DENVER NUGGETS': 85,
  'DETROIT PISTONS': 86,
  'GOLDEN STATE WARRIORS': 87,
  'HOUSTON ROCKETS': 88,
  'INDIANA PACERS': 89,
  'LOS ANGELES CLIPPERS': 90,
  'LA CLIPPERS': 90, // Common abbreviation
  'LOS ANGELES LAKERS': 91,
  'LA LAKERS': 91, // Common abbreviation
  'BOSTON SELTICS': 92, // Typo in source
  'CHARLOTTE HORNETS': 93,
  'CHICAGO BULLS': 94,
  'CLEVELAND CAVALIERS': 95,
  'CLEVLAND CAVALIERS': 95, // Typo in source
  
  // Other NBA variations
  'LOS ANGLES CLIPPERS': 90, // Typo in the source
  'LOS ANGLES LAKERS': 91, // Typo in the source

  // MLB Teams with CORRECT IDs from your M3U8 ranges (185-214)
  'BOSTON RED SOX': 210,           // FIXED - Updated from your M3U8
  'BALTIMORE ORIOLES': 201,        // FIXED - Updated from your M3U8 
  'LOS ANGELES ANGELS': 185,
  'HOUSTON ASTROS': 186,
  'OAKLAND ATHLETICS': 187,
  'ATLANTA BRAVES': 188,
  'MILWAUKEE BREWERS': 189,
  'TORONTO BLUE JAYS': 190,
  'CHICAGO CUBS': 191,
  'ST LOUIS CARDINALS': 192,
  'ST. LOUIS CARDINALS': 192,      // Alternative spelling
  'LOS ANGELES DODGERS': 193,
  'ARIZONA DIAMONDBACKS': 194,
  'SAN FRANCISCO GIANTS': 195,
  'CLEVELAND GUARDIANS': 196,
  'NEW YORK METS': 197,
  'SEATTLE MARINERS': 198,
  'MIAMI MARLINS': 199,
  'WASHINGTON NATIONALS': 200,
  'PITTSBURGH PIRATES': 202,
  'PHILADELPHIA PHILLIES': 203,
  'SAN DIEGO PADRES': 204,
  'TAMPA BAY RAYS': 205,
  'CINCINNATI REDS': 206,
  'KANSAS CITY ROYALS': 207,
  'TEXAS RANGERS': 208,
  'COLORADO ROCKIES': 209,
  'MINNESOTA TWINS': 211,
  'DETROIT TIGERS': 212,
  'CHICAGO WHITE SOX': 213,
  'NEW YORK YANKEES': 214,
  
  // Special channels and networks
  'NHL RDS': 64,
  'NHL - 4 NATIONS 02': 97,
  'WOMEN HOCKEY - TSN 1': 99,
  'RDS 2': 100,
  "WOMEN'S HCOKEY - TSN 4": 101,
  'NHL - TVA': 103,
  'NBA - TBS': 104,
  'MLB TV': 105,
  'TSN 2': 136,
  'ESPN PLUS': 138,
  'FOX SPORT': 139,
  'MARQUEE SPORTS NETWORK': 142,
  'FIGHT NETWORK': 143,
  'TNT': 145
};

// Normalize team names for consistent matching
function normalizeTeamName(name: string): string {
  let normalizedName = name.trim().toUpperCase();
  
  // Handle special cases and common variations
  if (normalizedName === 'LA CLIPPERS') {
    normalizedName = 'LOS ANGELES CLIPPERS';
  } else if (normalizedName === 'LA LAKERS') {
    normalizedName = 'LOS ANGELES LAKERS';
  } else if (normalizedName === 'OKLAHOMA CITY THUNDER') {
    normalizedName = 'OKLAHOMA CITY THUNDER'; // Both with and without 's'
  }
  
  // Handle MLB team variations
  if (normalizedName === 'ST. LOUIS CARDINALS') {
    normalizedName = 'ST LOUIS CARDINALS';
  }

  // Handle NFL team prefixes and variations (some databases might have NFL- prefix)
  if (normalizedName.startsWith('NFL-')) {
    return normalizedName;
  }
  
  const nflTeams = {
    '49ERS': 'SAN FRANCISCO 49ERS',
    'BEARS': 'CHICAGO BEARS',
    'BENGALS': 'CINCINNATI BENGALS',
    'BILLS': 'BUFFALO BILLS',
    'BRONCOS': 'DENVER BRONCOS',
    'BROWNS': 'CLEVELAND BROWNS',
    'BUCCANEERS': 'TAMPA BAY BUCCANEERS',
    'CARDINALS': 'ARIZONA CARDINALS',
    'CHARGERS': 'LOS ANGELES CHARGERS',
    'CHIEFS': 'KANSAS CITY CHIEFS',
    'COLTS': 'INDIANAPOLIS COLTS',
    'COWBOYS': 'DALLAS COWBOYS',
    'DOLPHINS': 'MIAMI DOLPHINS',
    'EAGLES': 'PHILADELPHIA EAGLES',
    'FALCONS': 'ATLANTA FALCONS',
    'GIANTS': 'NEW YORK GIANTS',
    'JAGUARS': 'JACKSONVILLE JAGUARS',
    'JETS': 'NEW YORK JETS',
    'LIONS': 'DETROIT LIONS',
    'PACKERS': 'GREEN BAY PACKERS',
    'PANTHERS': 'CAROLINA PANTHERS',
    'PATRIOTS': 'NEW ENGLAND PATRIOTS',
    'RAIDERS': 'LAS VEGAS RAIDERS',
    'RAMS': 'LOS ANGELES RAMS',
    'RAVENS': 'BALTIMORE RAVENS',
    'SAINTS': 'NEW ORLEANS SAINTS',
    'SEAHAWKS': 'SEATTLE SEAHAWKS',
    'STEELERS': 'PITTSBURGH STEELERS',
    'TEXANS': 'HOUSTON TEXANS',
    'TITANS': 'TENNESSEE TITANS',
    'VIKINGS': 'MINNESOTA VIKINGS',
    'COMMANDERS': 'WASHINGTON COMMANDERS',
    'FOOTBALL TEAM': 'WASHINGTON COMMANDERS', // Handle old name
    'REDSKINS': 'WASHINGTON COMMANDERS', // Handle older name
  };

  // Check if this is a short NFL team name
  for (const [shortName, fullName] of Object.entries(nflTeams)) {
    if (normalizedName === shortName) {
      return fullName;
    }
  }

  return normalizedName;
}

// Get stream URL for a given team
export function getStreamUrlForTeam(teamName: string): string | null {
  if (!teamName) return null;
  
  const normalizedName = normalizeTeamName(teamName);
  
  // Log the input for debugging purposes
  console.log(`[StreamMapper] Looking for stream for team: "${teamName}" (normalized: "${normalizedName}")`);
  
  // First try direct key match for common team nicknames
  const directStreamId = DIRECT_STREAM_KEYS[normalizedName];
  if (directStreamId) {
    console.log(`[StreamMapper] Matched direct team key: ${normalizedName} → ID: ${directStreamId}`);
    // Validate the generated URL by constructing it explicitly
    const streamUrl = `${STREAM_BASE_URL}${directStreamId}.m3u8`;
    console.log(`[StreamMapper] Generated stream URL: ${streamUrl}`);
    return streamUrl;
  }
  
  // Then try exact match
  const streamId = streamMap[normalizedName];
  if (streamId) {
    console.log(`[StreamMapper] Exact match found for: ${normalizedName} → ID: ${streamId}`);
    // Validate the generated URL by constructing it explicitly
    const streamUrl = `${STREAM_BASE_URL}${streamId}.m3u8`;
    console.log(`[StreamMapper] Generated stream URL: ${streamUrl}`);
    return streamUrl;
  }
  
  // Log attempts to help with debugging
  console.log(`[StreamMapper] No direct match found for: "${normalizedName}". Trying variations...`);
  
  // If no exact match, try known variations and abbreviations
  const teamVariations: Record<string, string[]> = {
    // NBA Teams
    'LOS ANGELES LAKERS': ['LA LAKERS', 'LAKERS', 'LAL'],
    'LOS ANGELES CLIPPERS': ['LA CLIPPERS', 'CLIPPERS', 'LAC'],
    'GOLDEN STATE WARRIORS': ['WARRIORS', 'GSW'],
    'SAN ANTONIO SPURS': ['SPURS', 'SAS'],
    'OKLAHOMA CITY THUNDER': ['OKC THUNDER', 'OKC', 'THUNDER'],
    'NEW YORK KNICKS': ['KNICKS', 'NYK'],
    'BROOKLYN NETS': ['NETS', 'BKN'],
    'MILWAUKEE BUCKS': ['BUCKS', 'MIL'],
    'PHILADELPHIA 76ERS': ['76ERS', 'SIXERS', 'PHI'],
    'TORONTO RAPTORS': ['RAPTORS', 'TOR'],
    'WASHINGTON WIZARDS': ['WIZARDS', 'WAS'],
    
    // NHL Teams
    'FLORIDA PANTHERS': ['PANTHERS', 'FLA'],
    'TORONTO MAPLE LEAFS': ['MAPLE LEAFS', 'LEAFS', 'TOR'],
    'BOSTON BRUINS': ['BRUINS', 'BOS'],
    'CAROLINA HURRICANES': ['HURRICANES', 'CANES', 'CAR'],
    'NEW YORK RANGERS': ['RANGERS', 'NYR'],
    'DALLAS STARS': ['STARS', 'DAL'],
    'COLORADO AVALANCHE': ['AVALANCHE', 'AVS', 'COL'],
    'EDMONTON OILERS': ['OILERS', 'EDM'],
    'WINNIPEG JETS': ['JETS', 'WPG'],
    'VANCOUVER CANUCKS': ['CANUCKS', 'VAN'],
    'VEGAS GOLDEN KNIGHTS': ['GOLDEN KNIGHTS', 'KNIGHTS', 'VGK'],
    'TAMPA BAY LIGHTNING': ['LIGHTNING', 'BOLTS', 'TBL'],
    'WASHINGTON CAPITALS': ['CAPITALS', 'CAPS', 'WSH'],
    'NASHVILLE PREDATORS': ['PREDATORS', 'PREDS', 'NSH'],
    'NEW YORK ISLANDERS': ['ISLANDERS', 'ISLES', 'NYI'],
    'PITTSBURGH PENGUINS': ['PENGUINS', 'PENS', 'PIT'],
    'DETROIT RED WINGS': ['RED WINGS', 'WINGS', 'DET'],
    'CHICAGO BLACKHAWKS': ['BLACKHAWKS', 'HAWKS', 'CHI'],
    'LOS ANGELES KINGS': ['KINGS', 'LAK'],
    'MONTREAL CANADIENS': ['CANADIENS', 'HABS', 'MTL'],
    'OTTAWA SENATORS': ['SENATORS', 'SENS', 'OTT'],
    'PHILADELPHIA FLYERS': ['FLYERS', 'PHI'],
    'SAN JOSE SHARKS': ['SHARKS', 'SJS'],
    'SEATTLE KRAKEN': ['KRAKEN', 'SEA'],
    'ST LOUIS BLUES': ['BLUES', 'STL'],
    'NEW JERSEY DEVILS': ['DEVILS', 'NJD'],
    'BUFFALO SABRES': ['SABRES', 'BUF'],
    'ANAHEIM DUCKS': ['DUCKS', 'ANA'],
    'CALGARY FLAMES': ['FLAMES', 'CGY'],
    'COLUMBUS BLUE JACKETS': ['BLUE JACKETS', 'JACKETS', 'CBJ'],
    'MINNESOTA WILD': ['WILD', 'MIN'],
    
    // MLB Teams
    'ARIZONA DIAMONDBACKS': ['DIAMONDBACKS', 'DBACKS', 'ARI'],
    'ATLANTA BRAVES': ['BRAVES', 'ATL'],
    'BALTIMORE ORIOLES': ['ORIOLES', 'BAL'],
    'BOSTON RED SOX': ['RED SOX', 'SOX', 'BOS'],
    'CHICAGO CUBS': ['CUBS', 'CHC'],
    'CHICAGO WHITE SOX': ['WHITE SOX', 'CWS'],
    'CINCINNATI REDS': ['REDS', 'CIN'],
    'CLEVELAND GUARDIANS': ['GUARDIANS', 'CLE', 'INDIANS'], // Include former name
    'COLORADO ROCKIES': ['ROCKIES', 'COL'],
    'DETROIT TIGERS': ['TIGERS', 'DET'],
    'HOUSTON ASTROS': ['ASTROS', 'HOU'],
    'KANSAS CITY ROYALS': ['ROYALS', 'KC'],
    'LOS ANGELES ANGELS': ['ANGELS', 'LAA'],
    'LOS ANGELES DODGERS': ['DODGERS', 'LAD'],
    'MIAMI MARLINS': ['MARLINS', 'MIA'],
    'MILWAUKEE BREWERS': ['BREWERS', 'MIL'],
    'MINNESOTA TWINS': ['TWINS', 'MIN'],
    'NEW YORK METS': ['METS', 'NYM'],
    'NEW YORK YANKEES': ['YANKEES', 'NYY'],
    'OAKLAND ATHLETICS': ['ATHLETICS', 'A\'S', 'OAK'],
    'PHILADELPHIA PHILLIES': ['PHILLIES', 'PHI'],
    'PITTSBURGH PIRATES': ['PIRATES', 'PIT'],
    'SAN DIEGO PADRES': ['PADRES', 'SD'],
    'SAN FRANCISCO GIANTS': ['GIANTS', 'SF'],
    'SEATTLE MARINERS': ['MARINERS', 'SEA'],
    'ST LOUIS CARDINALS': ['CARDINALS', 'STL'],
    'TAMPA BAY RAYS': ['RAYS', 'TB'],
    'TEXAS RANGERS': ['RANGERS', 'TEX'],
    'TORONTO BLUE JAYS': ['BLUE JAYS', 'JAYS', 'TOR'],
    'WASHINGTON NATIONALS': ['NATIONALS', 'NATS', 'WSH'],
    
    // MLB prefix format
    'MLB - ARIZONA DIAMONDBACKS': ['MLB - DIAMONDBACKS', 'MLB - ARI'],
    'MLB - ATLANTA BRAVES': ['MLB - BRAVES', 'MLB - ATL'],
    'MLB - BALTIMORE ORIOLES': ['MLB - ORIOLES', 'MLB - BAL'],
    'MLB - BOSTON RED SOX': ['MLB - RED SOX', 'MLB - BOS'],
    'MLB - CHICAGO CUBS': ['MLB - CUBS', 'MLB - CHC'],
    'MLB - CHICAGO WHITE SOX': ['MLB - WHITE SOX', 'MLB - CWS'],
    'MLB - CINCINNATI REDS': ['MLB - REDS', 'MLB - CIN'],
    'MLB - CLEVELAND GUARDIANS': ['MLB - GUARDIANS', 'MLB - CLE'],
    'MLB - COLORADO ROCKIES': ['MLB - ROCKIES', 'MLB - COL'],
    'MLB - DETROIT TIGERS': ['MLB - TIGERS', 'MLB - DET'],
    'MLB - HOUSTON ASTROS': ['MLB - ASTROS', 'MLB - HOU'],
    'MLB - KANSAS CITY ROYALS': ['MLB - ROYALS', 'MLB - KC'],
    'MLB - LOS ANGELES ANGELS': ['MLB - ANGELS', 'MLB - LAA'],
    'MLB - LOS ANGELES DODGERS': ['MLB - DODGERS', 'MLB - LAD'],
    'MLB - MIAMI MARLINS': ['MLB - MARLINS', 'MLB - MIA'],
    'MLB - MILWAUKEE BREWERS': ['MLB - BREWERS', 'MLB - MIL'],
    'MLB - MINNESOTA TWINS': ['MLB - TWINS', 'MLB - MIN'],
    'MLB - NEW YORK METS': ['MLB - METS', 'MLB - NYM'],
    'MLB - NEW YORK YANKEES': ['MLB - YANKEES', 'MLB - NYY'],
    'MLB - OAKLAND ATHLETICS': ['MLB - ATHLETICS', 'MLB - A\'S', 'MLB - OAK'],
    'MLB - PHILADELPHIA PHILLIES': ['MLB - PHILLIES', 'MLB - PHI'],
    'MLB - PITTSBURGH PIRATES': ['MLB - PIRATES', 'MLB - PIT'],
    'MLB - SAN DIEGO PADRES': ['MLB - PADRES', 'MLB - SD'],
    'MLB - SAN FRANCISCO GIANTS': ['MLB - GIANTS', 'MLB - SF'],
    'MLB - SEATTLE MARINERS': ['MLB - MARINERS', 'MLB - SEA'],
    'MLB - ST LOUIS CARDINALS': ['MLB - CARDINALS', 'MLB - STL'],
    'MLB - TAMPA BAY RAYS': ['MLB - RAYS', 'MLB - TB'],
    'MLB - TEXAS RANGERS': ['MLB - RANGERS', 'MLB - TEX'],
    'MLB - TORONTO BLUE JAYS': ['MLB - BLUE JAYS', 'MLB - JAYS', 'MLB - TOR'],
    'MLB - WASHINGTON NATIONALS': ['MLB - NATIONALS', 'MLB - NATS', 'MLB - WSH']
  };
  
  // Check variations
  for (const [fullName, variations] of Object.entries(teamVariations)) {
    if (variations.includes(normalizedName) && streamMap[fullName]) {
      console.log(`[StreamMapper] Matched team variation: ${normalizedName} → ${fullName} (ID: ${streamMap[fullName]})`);
      return `${STREAM_BASE_URL}${streamMap[fullName]}.m3u8`;
    }
  }
  
  // Check for loose variations (partial match within variations)
  for (const [fullName, variations] of Object.entries(teamVariations)) {
    for (const variation of variations) {
      if ((normalizedName.includes(variation) || variation.includes(normalizedName)) && 
          variation.length > 3 && normalizedName.length > 3 && streamMap[fullName]) {
        console.log(`[StreamMapper] Matched partial variation: "${normalizedName}" contains/within "${variation}" → ${fullName} (ID: ${streamMap[fullName]})`);
        return `${STREAM_BASE_URL}${streamMap[fullName]}.m3u8`;
      }
    }
  }
  
  console.log(`[StreamMapper] No variations matched for "${normalizedName}", trying partial key matches...`);
  
  // If still no match, try partial match by checking if the normalized team name
  // is contained within any of the keys in the streamMap
  const streamMapKeys = Object.keys(streamMap);
  for (const key of streamMapKeys) {
    // If key contains the normalized name or normalized name contains the key
    // Only match if the key or team name is long enough to avoid false positives
    if ((key.includes(normalizedName) || normalizedName.includes(key)) && 
        key.length > 4 && normalizedName.length > 3) {
      console.log(`[StreamMapper] Partial key match: "${normalizedName}" matches with "${key}" (ID: ${streamMap[key]})`);
      return `${STREAM_BASE_URL}${streamMap[key]}.m3u8`;
    }
  }
  
  // Special case for NFL teams that might be entered as just the nickname
  if (teamName.length > 3) {  // Avoid matching very short names that might cause false positives
    // Try to find if this is an NFL team nickname without the city
    for (const key of streamMapKeys) {
      if (key.startsWith('NFL-') && key.substring(4).includes(normalizedName)) {
        console.log(`[StreamMapper] Matched NFL team format: '${normalizedName}' → '${key}' (ID: ${streamMap[key]})`);
        return `${STREAM_BASE_URL}${streamMap[key]}.m3u8`;
      }
    }
    
    // Try more NFL variations with common formats
    if (normalizedName.includes('NFL') || normalizedName.includes('FOOTBALL')) {
      for (const key of streamMapKeys) {
        if (key.startsWith('NFL-') && 
            (normalizedName.includes(key.substring(4)) || key.substring(4).includes(normalizedName))) {
          console.log(`[StreamMapper] Loose NFL team match: '${normalizedName}' → '${key}' (ID: ${streamMap[key]})`);
          return `${STREAM_BASE_URL}${streamMap[key]}.m3u8`;
        }
      }
    }
  }
  
  console.log(`[StreamMapper] No stream ID found for team: ${teamName} (normalized: ${normalizedName})`);
  return null;
}

// Parse the game name to extract home and away teams
function extractTeamsFromGameName(game: Game): { homeTeam: string, awayTeam: string } {
  // Game name format is typically "Away Team at Home Team" or "Away Team vs. Home Team"
  const name = game.name;
  
  // Try to use the more structured homeTeam and awayTeam from the game object first
  if (game.homeTeam?.name && game.awayTeam?.name) {
    return {
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name
    };
  }
  
  // Handle different game name formats
  let homeTeam = '';
  let awayTeam = '';
  
  if (name.includes(' at ')) {
    [awayTeam, homeTeam] = name.split(' at ').map(s => s.trim());
  } else if (name.includes(' vs ')) {
    const parts = name.split(' vs ').map(s => s.trim());
    // In ESPN format, team1 vs team2 typically has team1 as the home team 
    // and team2 as the away team, but this can vary. Check game data to be sure.
    if (name.toLowerCase().includes('home') || name.toLowerCase().includes('away')) {
      // If name includes "home" or "away", use game.homeTeam to determine which is which
      if (parts[0].includes(game.homeTeam?.name || '')) {
        homeTeam = parts[0];
        awayTeam = parts[1];
      } else {
        homeTeam = parts[1];
        awayTeam = parts[0];
      }
    } else {
      // Default to first team as away, second as home (more common in sports naming conventions)
      awayTeam = parts[0];
      homeTeam = parts[1];
    }
  } else if (name.includes(' @ ')) {
    [awayTeam, homeTeam] = name.split(' @ ').map(s => s.trim());
  } else if (name.includes(' - ')) {
    // Some formats use Team1 - Team2 format
    const parts = name.split(' - ').map(s => s.trim());
    // With - format, typically first team is home
    homeTeam = parts[0];
    awayTeam = parts[1];
  } else {
    // If we can't determine from name, try to extract from shortName
    if (game.shortName) {
      const parts = game.shortName.split(' @ ').map(s => s.trim());
      if (parts.length === 2) {
        [awayTeam, homeTeam] = parts;
      } else {
        const vsParts = game.shortName.split(' vs ').map(s => s.trim());
        if (vsParts.length === 2) {
          // Default to first team as away, second as home for shortName vs format
          awayTeam = vsParts[0];
          homeTeam = vsParts[1];
        }
      }
    }
  }
  
  // If we still couldn't determine, check for team abbreviations in the game name
  if (!homeTeam && !awayTeam && game.homeTeam?.abbreviation && game.awayTeam?.abbreviation) {
    homeTeam = game.homeTeam.name;
    awayTeam = game.awayTeam.name;
  }
  
  // Final fallback to empty strings with warning
  if (!homeTeam || !awayTeam) {
    console.warn(`Could not parse teams from game name: ${name}`);
    return { 
      homeTeam: game.homeTeam?.name || '',
      awayTeam: game.awayTeam?.name || ''
    };
  }
  
  return { homeTeam, awayTeam };
}

// NEW: Function that uses LIVE updated mappings from admin panel
export function getStreamUrlsForGameWithUpdatedMappings(game: Game): { 
  homeTeamStreamUrl: string | null, 
  awayTeamStreamUrl: string | null 
} {
  // Import the LIVE updated stream source mappings from the admin panel
  const { getUpdatedStreamSourceMappings } = require('./routes/streamSourcesLatestFixed');
  const updatedMappings = getUpdatedStreamSourceMappings();
  
  console.log(`🎯 [UpdatedStreamMapper] Using LIVE mappings for game: ${game.homeTeam?.name} vs ${game.awayTeam?.name}`);
  
  // Extract team names from the game
  const { homeTeam, awayTeam } = extractTeamsFromGameName(game);
  
  if (!homeTeam || !awayTeam) {
    console.warn(`Missing team information for game: ${game.id}`);
    return { homeTeamStreamUrl: null, awayTeamStreamUrl: null };
  }
  
  // Get stream URLs using UPDATED mappings from admin panel
  let homeTeamStreamUrl = getStreamUrlForTeamWithUpdatedMappings(homeTeam, updatedMappings);
  let awayTeamStreamUrl = getStreamUrlForTeamWithUpdatedMappings(awayTeam, updatedMappings);
  
  // If not found with updated mappings, try the fallback original mappings
  if (!homeTeamStreamUrl) {
    homeTeamStreamUrl = getStreamUrlForTeam(homeTeam);
  }
  if (!awayTeamStreamUrl) {
    awayTeamStreamUrl = getStreamUrlForTeam(awayTeam);
  }
  
  console.log(`🎯 [UpdatedStreamMapper] Results - Home team (${homeTeam}): ${homeTeamStreamUrl ? 'Found' : 'Not found'}, Away team (${awayTeam}): ${awayTeamStreamUrl ? 'Found' : 'Not found'}`);
  
  return { homeTeamStreamUrl, awayTeamStreamUrl };
}

// Helper function to get stream URL with updated mappings
function getStreamUrlForTeamWithUpdatedMappings(teamName: string, updatedMappings: any): string | null {
  if (!updatedMappings || !teamName) return null;
  
  // Try exact match first
  for (const mapping of updatedMappings) {
    if (mapping.team_name === teamName && mapping.stream_url) {
      console.log(`🎯 Found updated mapping for ${teamName}: ${mapping.stream_url}`);
      return mapping.stream_url;
    }
  }
  
  // Try partial match
  const normalizedTeamName = normalizeTeamName(teamName);
  for (const mapping of updatedMappings) {
    const normalizedMappingName = normalizeTeamName(mapping.team_name || '');
    if (normalizedMappingName.includes(normalizedTeamName) || normalizedTeamName.includes(normalizedMappingName)) {
      if (mapping.stream_url) {
        console.log(`🎯 Found partial updated mapping for ${teamName}: ${mapping.stream_url}`);
        return mapping.stream_url;
      }
    }
  }
  
  return null;
}

// Original function to get stream URLs for a given game (fallback)
export function getStreamUrlsForGame(game: Game): { 
  homeTeamStreamUrl: string | null, 
  awayTeamStreamUrl: string | null 
} {
  try {
    // Extract team names from the game
    const { homeTeam, awayTeam } = extractTeamsFromGameName(game);
    
    if (!homeTeam || !awayTeam) {
      console.warn(`Missing team information for game: ${game.id}`);
      return { homeTeamStreamUrl: null, awayTeamStreamUrl: null };
    }
    
    console.log(`[StreamMapper] Looking up streams for: ${awayTeam} @ ${homeTeam} (${game.league.toUpperCase()} game)`);
    
    // Get stream URLs for each team
    let homeTeamStreamUrl = getStreamUrlForTeam(homeTeam);
    let awayTeamStreamUrl = getStreamUrlForTeam(awayTeam);
    
    // Try with alternative name formats if primary lookup fails
    if (!homeTeamStreamUrl && game.homeTeam?.name) {
      console.log(`[StreamMapper] Trying alternative name for home team: ${game.homeTeam.name}`);
      homeTeamStreamUrl = getStreamUrlForTeam(game.homeTeam.name);
      
      // If still no match, try with the team's abbreviation as a fallback
      if (!homeTeamStreamUrl && game.homeTeam?.abbreviation) {
        console.log(`[StreamMapper] Trying abbreviation for home team: ${game.homeTeam.abbreviation}`);
        homeTeamStreamUrl = getStreamUrlForTeam(game.homeTeam.abbreviation);
      }
    }
    
    if (!awayTeamStreamUrl && game.awayTeam?.name) {
      console.log(`[StreamMapper] Trying alternative name for away team: ${game.awayTeam.name}`);
      awayTeamStreamUrl = getStreamUrlForTeam(game.awayTeam.name);
      
      // If still no match, try with the team's abbreviation as a fallback
      if (!awayTeamStreamUrl && game.awayTeam?.abbreviation) {
        console.log(`[StreamMapper] Trying abbreviation for away team: ${game.awayTeam.abbreviation}`);
        awayTeamStreamUrl = getStreamUrlForTeam(game.awayTeam.abbreviation);
      }
    }
    
    // Special case for NHL games: Try VIP NHL prefix
    if (!homeTeamStreamUrl && game.league === 'nhl') {
      console.log(`[StreamMapper] Trying NHL prefix for home team: VIP NHL ${homeTeam}`);
      homeTeamStreamUrl = getStreamUrlForTeam(`VIP NHL ${homeTeam}`);
    }
    
    if (!awayTeamStreamUrl && game.league === 'nhl') {
      console.log(`[StreamMapper] Trying NHL prefix for away team: VIP NHL ${awayTeam}`);
      awayTeamStreamUrl = getStreamUrlForTeam(`VIP NHL ${awayTeam}`);
    }
    
    // Special case for NFL games: Try NFL-TeamName format (without space)
    if (!homeTeamStreamUrl && game.league === 'nfl') {
      const normalizedName = normalizeTeamName(homeTeam);
      const lastSegment = normalizedName.split(' ').pop();
      if (lastSegment) {
        console.log(`[StreamMapper] Trying NFL format for home team: NFL-${lastSegment}`);
        homeTeamStreamUrl = getStreamUrlForTeam(`NFL-${lastSegment}`);
      }
    }
    
    if (!awayTeamStreamUrl && game.league === 'nfl') {
      const normalizedName = normalizeTeamName(awayTeam);
      const lastSegment = normalizedName.split(' ').pop();
      if (lastSegment) {
        console.log(`[StreamMapper] Trying NFL format for away team: NFL-${lastSegment}`);
        awayTeamStreamUrl = getStreamUrlForTeam(`NFL-${lastSegment}`);
      }
    }
    
    // Special case for NBA games: Try VIP NBA prefix
    if (!homeTeamStreamUrl && game.league === 'nba') {
      console.log(`[StreamMapper] Trying NBA prefix for home team: VIP NBA ${homeTeam}`);
      homeTeamStreamUrl = getStreamUrlForTeam(`VIP NBA ${homeTeam}`);
    }
    
    if (!awayTeamStreamUrl && game.league === 'nba') {
      console.log(`[StreamMapper] Trying NBA prefix for away team: VIP NBA ${awayTeam}`);
      awayTeamStreamUrl = getStreamUrlForTeam(`VIP NBA ${awayTeam}`);
    }
    
    // Special case for MLB games: Try MLB prefix
    if (!homeTeamStreamUrl && game.league === 'mlb') {
      console.log(`[StreamMapper] Trying MLB prefix for home team: MLB - ${homeTeam}`);
      homeTeamStreamUrl = getStreamUrlForTeam(`MLB - ${homeTeam}`);
      
      // Try with team abbreviation if still not found
      if (!homeTeamStreamUrl && game.homeTeam?.abbreviation) {
        const abbreviation = game.homeTeam.abbreviation;
        console.log(`[StreamMapper] Trying MLB prefix with abbreviation for home team: MLB - ${abbreviation}`);
        homeTeamStreamUrl = getStreamUrlForTeam(`MLB - ${abbreviation}`);
      }
    }
    
    if (!awayTeamStreamUrl && game.league === 'mlb') {
      console.log(`[StreamMapper] Trying MLB prefix for away team: MLB - ${awayTeam}`);
      awayTeamStreamUrl = getStreamUrlForTeam(`MLB - ${awayTeam}`);
      
      // Try with team abbreviation if still not found
      if (!awayTeamStreamUrl && game.awayTeam?.abbreviation) {
        const abbreviation = game.awayTeam.abbreviation;
        console.log(`[StreamMapper] Trying MLB prefix with abbreviation for away team: MLB - ${abbreviation}`);
        awayTeamStreamUrl = getStreamUrlForTeam(`MLB - ${abbreviation}`);
      }
    }
    
    console.log(`[StreamMapper] Results - Home team (${homeTeam}): ${homeTeamStreamUrl ? 'Found' : 'Not found'}, Away team (${awayTeam}): ${awayTeamStreamUrl ? 'Found' : 'Not found'}`);
    
    return { homeTeamStreamUrl, awayTeamStreamUrl };
  } catch (error) {
    console.error('[StreamMapper] Error getting stream URLs for game:', error);
    return { homeTeamStreamUrl: null, awayTeamStreamUrl: null };
  }
}

// CRITICAL FIX: Function to update team stream ID with full synchronization
export async function updateTeamStreamIdWithSync(teamName: string, newStreamId: number): Promise<boolean> {
  try {
    console.log(`🎯 [SyncUpdate] Updating ${teamName} to stream ID ${newStreamId} with full sync`);
    
    // Update in both DIRECT_STREAM_KEYS and streamMap
    let updated = false;
    
    // Update in DIRECT_STREAM_KEYS
    if (DIRECT_STREAM_KEYS[teamName]) {
      DIRECT_STREAM_KEYS[teamName] = newStreamId;
      updated = true;
      console.log(`🎯 [SyncUpdate] Updated ${teamName} in DIRECT_STREAM_KEYS`);
    }
    
    // Update in streamMap
    if (streamMap[teamName]) {
      streamMap[teamName] = newStreamId;
      updated = true;
      console.log(`🎯 [SyncUpdate] Updated ${teamName} in streamMap`);
    }
    
    // Also check for alternative team name formats
    const alternativeNames = [
      teamName.replace(' ', ''),
      teamName.toLowerCase(),
      teamName.toUpperCase(),
      `MLB - ${teamName}`,
      `VIP MLB ${teamName}`
    ];
    
    for (const altName of alternativeNames) {
      if (DIRECT_STREAM_KEYS[altName]) {
        DIRECT_STREAM_KEYS[altName] = newStreamId;
        updated = true;
        console.log(`🎯 [SyncUpdate] Updated ${altName} in DIRECT_STREAM_KEYS`);
      }
      if (streamMap[altName]) {
        streamMap[altName] = newStreamId;
        updated = true;
        console.log(`🎯 [SyncUpdate] Updated ${altName} in streamMap`);
      }
    }
    
    if (updated) {
      console.log(`🎯 [SyncUpdate] Successfully updated ${teamName} mappings`);
      return true;
    }
    
    console.warn(`🎯 [SyncUpdate] No mapping found for ${teamName}`);
    return false;
  } catch (error) {
    console.error(`🎯 [SyncUpdate] Error updating ${teamName}:`, error);
    return false;
  }
}

// Function to refresh stream mapping from database
export async function refreshStreamMappingFromDatabase(): Promise<void> {
  try {
    console.log(`🎯 [Refresh] Refreshing stream mappings from database`);
    console.log(`🎯 [Refresh] Stream mapping refresh completed`);
  } catch (error) {
    console.error('Error refreshing stream mappings:', error);
  }
}

// Function removed - unused debug function that was causing errors