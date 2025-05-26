import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../supabaseAuth';
import { isAdmin } from '../adminMiddleware';
import { STREAM_BASE_URL } from '@shared/constants';
import { supabase } from '../db';

// Create a router
const router = Router();

// Stream mapping from team names to IDs
const streamMap = {
  // Special channels
  'NBA TV': 1,
  'NFL NETWORK': 2,
  'ESPN US': 3,
  'NHL NETWORK': 4,
  'NFL REDZONE': 5,
  
  // NHL Teams
  'ANAHEIM DUCKS': 6,
  'UTAH': 7,
  'BOSTON BRUINS': 8,
  'BUFFALO SABRES': 9,
  'CALGARY FLAMES': 10,
  'CHICAGO BLACKHAWKS': 11,
  'COLORADO AVALANCHE': 12,
  'COLUMBUS BLUE JACKETS': 13,
  'DALLAS STARS': 14,
  'DETROIT RED WINGS': 15,
  'EDMONTON OILERS': 16,
  'FLORIDA PANTHERS': 17,
  'LOS ANGELES KINGS': 18,
  'MINNESOTA WILD': 19,
  'MONTREAL CANADIENS': 20,
  'NASHVILLE PREDATORS': 21,
  'NEW JERSEY DEVILS': 22,
  'NEW YORK ISLANDERS': 23,
  'NEW YORK RANGERS': 24,
  'OTTAWA SENATORS': 25,
  'PHILADELPHIA FLYERS': 26,
  'PITTSBURGH PENGUINS': 27,
  'SAN JOSE SHARKS': 28,
  'SEATTLE KRAKEN': 29,
  'ST LOUIS BLUES': 30,
  'TAMPA BAY LIGHTNING': 31,
  'TORONTO MAPLE LEAFS': 32,
  'VEGAS GOLDEN KNIGHTS': 33,
  'WASHINGTON CAPITALS': 34,
  'WINNIPEG JETS': 35,
  
  // MLB Teams
  'MLB - ARIZONA DIAMONDBACKS': 36,
  'MLB - ATLANTA BRAVES': 37,
  'MLB - BALTIMORE ORIOLES': 201,
  'MLB - BOSTON RED SOX': 210,
  'MLB - CHICAGO CUBS': 40,
  'MLB - CHICAGO WHITE SOX': 41,
  'MLB - CINCINNATI REDS': 42,
  'MLB - CLEVELAND GUARDIANS': 43,
  'MLB - COLORADO ROCKIES': 44,
  'MLB - DETROIT TIGERS': 45,
  'MLB - HOUSTON ASTROS': 46,
  'MLB - KANSAS CITY ROYALS': 47,
  'MLB - LOS ANGELES ANGELS': 48,
  'MLB - LOS ANGELES DODGERS': 49,
  'MLB - MIAMI MARLINS': 50,
  'MLB - MILWAUKEE BREWERS': 51,
  'MLB - MINNESOTA TWINS': 52,
  'MLB - NEW YORK METS': 53,
  'MLB - NEW YORK YANKEES': 54,
  'MLB - OAKLAND ATHLETICS': 55,
  'MLB - PHILADELPHIA PHILLIES': 56,
  'MLB - PITTSBURGH PIRATES': 57,
  'MLB - SAN DIEGO PADRES': 58,
  'MLB - SAN FRANCISCO GIANTS': 59,
  'MLB - SEATTLE MARINERS': 60,
  'MLB - ST LOUIS CARDINALS': 61,
  'MLB - TAMPA BAY RAYS': 62,
  'MLB - TEXAS RANGERS': 63,
  'MLB - TORONTO BLUE JAYS': 64,
  'MLB - WASHINGTON NATIONALS': 65,
  
  // NFL Teams
  'NFL-ARIZONACARDINALS': 66,
  'NFL-ATLANTAFALCONS': 67,
  'NFL-BALTIMORERAVENS': 68,
  'NFL-BUFFALOBILLS': 69,
  'NFL-CAROLINAPANTHERS': 70,
  'NFL-CHICAGOBEARS': 71,
  'NFL-CINCINNATIBENGALS': 72,
  'NFL-CLEVELANDBROWNS': 73,
  'NFL-DALLASCOWBOYS': 74,
  'NFL-DENVERBRONCOS': 75,
  'NFL-DETROITLIONS': 76,
  'NFL-GREENBAYPACKERS': 77,
  'NFL-HOUSTONTEXANS': 78,
  'NFL-INDIANAPOLISCOLTS': 79,
  'NFL-JACKSONVILLEJAGUARS': 80,
  'NFL-KANSASCITYCHIEFS': 81,
  'NFL-LASVEGASRAIDERS': 82,
  'NFL-LOSANGELESCHARGERS': 83,
  'NFL-LOSANGELESRAMS': 84,
  'NFL-MIAMIDOLPHINS': 85,
  'NFL-MINNESOTAVIKINGS': 86,
  'NFL-NEWENGLANDPATRIOTS': 87,
  'NFL-NEWORLEANSSAINTS': 88,
  'NFL-NEWYORKGIANTS': 89,
  'NFL-NEWYORKJETS': 90,
  'NFL-PHILADELPHIAEAGLES': 91,
  'NFL-PITTSBURGHSTEELERS': 92,
  'NFL-SANFRANCISCO49ERS': 93,
  'NFL-SEATTLESEAHAWKS': 94,
  'NFL-TAMPABAYBUCCANEERS': 95,
  'NFL-TENNESSEETITANS': 96,
  'NFL-WASHINGTONCOMMANDERS': 97,
  
  // NBA Teams
  'VIP NBA ATLANTA HAWKS': 98,
  'VIP NBA BOSTON CELTICS': 99,
  'VIP NBA BROOKLYN NETS': 100,
  'VIP NBA CHARLOTTE HORNETS': 101,
  'VIP NBA CHICAGO BULLS': 102,
  'VIP NBA CLEVELAND CAVALIERS': 103,
  'VIP NBA DALLAS MAVERICKS': 104,
  'VIP NBA DENVER NUGGETS': 105,
  'VIP NBA DETROIT PISTONS': 106,
  'VIP NBA GOLDEN STATE WARRIORS': 107,
  'VIP NBA HOUSTON ROCKETS': 108,
  'VIP NBA INDIANA PACERS': 109,
  'VIP NBA LOS ANGELES CLIPPERS': 110,
  'VIP NBA LOS ANGELES LAKERS': 111,
  'VIP NBA MEMPHIS GRIZZLIES': 112,
  'VIP NBA MIAMI HEAT': 113,
  'VIP NBA MILWAUKEE BUCKS': 114,
  'VIP NBA MINNESOTA TIMBERWOLVES': 115,
  'VIP NBA NEW ORLEANS PELICANS': 116,
  'VIP NBA NEW YORK KNICKS': 117,
  'VIP NBA OKLAHOMA CITY THUNDER': 118,
  'VIP NBA ORLANDO MAGIC': 119,
  'VIP NBA PHILADELPHIA 76ERS': 120,
  'VIP NBA PHOENIX SUNS': 121,
  'VIP NBA PORTLAND TRAIL BLAZERS': 122,
  'VIP NBA SACRAMENTO KINGS': 123,
  'VIP NBA SAN ANTONIO SPURS': 124,
  'VIP NBA TORONTO RAPTORS': 125,
  'VIP NBA UTAH JAZZ': 126,
  'VIP NBA WASHINGTON WIZARDS': 127,
  
  // Other
  'NCAA BASKETBALL': 128,
  
  // MLB Team Nicknames
  'RED SOX': 39,
  'TIGERS': 45,
  'YANKEES': 54,
  'BLUE JAYS': 64,
  'RAYS': 62,
  'ORIOLES': 38,
  'GUARDIANS': 43,
  'TWINS': 52,
  'WHITE SOX': 41,
  'ROYALS': 47,
  'ASTROS': 46,
  'RANGERS': 63,
  'ATHLETICS': 55,
  'MARINERS': 60,
  'ANGELS': 48,
  'METS': 53,
  'BRAVES': 37,
  'PHILLIES': 56,
  'MARLINS': 50,
  'NATIONALS': 65,
  'CUBS': 40,
  'BREWERS': 51,
  'REDS': 42,
  'PIRATES': 57,
  'CARDINALS': 61,
  'DIAMONDBACKS': 36,
  'ROCKIES': 44,
  'DODGERS': 49,
  'PADRES': 58,
  'GIANTS': 59,
};

// Determine which league a team belongs to based on the name format
function getLeagueFromTeamName(teamName: string): string {
  if (teamName.startsWith('VIP NBA')) return 'nba';
  if (teamName.startsWith('NFL-')) return 'nfl';
  if (teamName.startsWith('MLB -')) return 'mlb';
  if (teamName === 'NCAA BASKETBALL') return 'ncaa';
  
  // For MLB team nicknames, return MLB
  const mlbNicknames = ['RED SOX', 'TIGERS', 'YANKEES', 'BLUE JAYS', 'RAYS', 'ORIOLES', 
                        'GUARDIANS', 'TWINS', 'WHITE SOX', 'ROYALS', 'ASTROS', 'RANGERS', 
                        'ATHLETICS', 'MARINERS', 'ANGELS', 'METS', 'BRAVES', 'PHILLIES', 
                        'MARLINS', 'NATIONALS', 'CUBS', 'BREWERS', 'REDS', 'PIRATES', 
                        'CARDINALS', 'DIAMONDBACKS', 'ROCKIES', 'DODGERS', 'PADRES', 'GIANTS'];
  if (mlbNicknames.includes(teamName)) return 'mlb';
  
  // Check for special channels
  const specialChannels = ['NBA TV', 'NFL NETWORK', 'ESPN US', 'NHL NETWORK', 'NFL REDZONE'];
  if (specialChannels.includes(teamName)) return 'special';
  
  // Default to NHL for remaining teams
  return 'nhl';
}

// Initialize stream sources route
router.post('/initialize', async (req, res) => {
  try {
    console.log('Initializing stream sources from mapping...');
    
    // Set headers to ensure proper JSON response
    res.setHeader('Content-Type', 'application/json');
    
    // Check if the streams table exists by retrieving existing entries
    const { data: existingStreams, error: checkError } = await supabase
      .from('streams')
      .select('id, game_id, stream_url')
      .limit(5);
    
    if (checkError) {
      console.error('Error checking streams table:', checkError);
      return res.status(500).json({
        message: 'Could not access streams table',
        error: checkError.message
      });
    }
    
    // If there are already streams, confirm if we should replace them
    if (existingStreams && existingStreams.length > 0) {
      const { force } = req.body;
      
      if (!force) {
        return res.status(409).json({
          message: 'Stream sources already exist',
          count: existingStreams.length,
          requiresForce: true
        });
      }
      
      // If force is true, we'll delete all existing streams and re-create
      console.log('Force flag set. Deleting all existing streams...');
      const { error: deleteError } = await supabase
        .from('streams')
        .delete()
        .gte('id', 0);
      
      if (deleteError) {
        console.error('Error deleting existing streams:', deleteError);
        return res.status(500).json({
          message: 'Failed to delete existing streams',
          error: deleteError.message
        });
      }
    }
    
    console.log('Creating new stream sources...');
    
    // Current admin user ID for the added_by_id field
    const adminUserId = "be62b1e0-2628-4b18-b09f-44637a0dbad2"; // Using existing ID from the system
    
    // Create all stream sources from the mapping and insert them into the streams table
    const streamRows = Object.entries(streamMap).map(([teamName, id]) => {
      const streamUrl = `${STREAM_BASE_URL}${id}.m3u8`;
      
      // Generate a unique game_id for each stream based on team name
      // Using a simple format like team-{id} as a placeholder
      const gameId = `team-${id}`;
      
      return {
        game_id: gameId,
        stream_url: streamUrl,
        away_stream_url: null, // Can be populated later if needed
        is_active: true,
        added_by_id: adminUserId
      };
    });
    
    // Insert the streams in batches of 100 to avoid request size limits
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < streamRows.length; i += batchSize) {
      const batch = streamRows.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('streams')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting stream batch ${i}:`, error);
        return res.status(500).json({
          message: 'Failed to initialize stream sources',
          error: error.message
        });
      }
      
      insertedCount += (data || []).length;
    }
    
    console.log(`Successfully initialized ${insertedCount} stream sources`);
    
    // Make sure we're explicitly returning JSON
    return res.status(200).json({
      message: 'Stream sources initialized successfully',
      count: insertedCount
    });
  } catch (error) {
    console.error('Error initializing stream sources:', error);
    return res.status(500).json({ error: 'Failed to initialize stream sources' });
  }
});

export default router;