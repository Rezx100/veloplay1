import { Request, Response } from 'express';
import { storage } from '../neonStorage';

/**
 * Create the stream_sources table if it doesn't exist
 */
export async function createStreamSourcesTable(): Promise<boolean> {
  try {
    // Check if table already exists
    const { data: tableExists, error: tableExistsError } = await supabase
      .from('stream_sources')
      .select('id')
      .limit(1);
    
    // If we can query the table, it exists
    if (!tableExistsError) {
      console.log('Stream sources table already exists');
      return true;
    }
    
    // Create the table using raw SQL through Supabase
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS stream_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        team_name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        league_id VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        description TEXT
      );
    `;
    
    const { error: createTableError } = await supabase.rpc('exec', { query: createTableQuery });
    
    if (createTableError) {
      console.error('Error creating stream sources table:', createTableError);
      return false;
    }
    
    console.log('Stream sources table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating stream sources table:', error);
    return false;
  }
}

/**
 * Populate the stream_sources table with initial data
 */
export async function populateStreamSources(): Promise<boolean> {
  try {
    // Check if table already has data
    const { data: existingData, error: countError } = await supabase
      .from('stream_sources')
      .select('id')
      .limit(1);
    
    if (existingData && existingData.length > 0) {
      console.log('Stream sources table already has data');
      return true;
    }

    // Initialize leagues first (if needed)
    await initializeLeagues();

    // Define the base URL pattern for streams
    const baseUrl = 'https://vpt.pixelsport.to:443/psportsgate/psportsgate100/';

    // Generate batch insert query for stream sources
    // Special Channels (IDs 1-5)
    const specialChannels = [
      { id: 1, name: 'NBA TV', teamName: 'NBA TV Network', url: `${baseUrl}1.m3u8`, leagueId: 'other', priority: 1 },
      { id: 2, name: 'NFL Network', teamName: 'NFL Network', url: `${baseUrl}2.m3u8`, leagueId: 'other', priority: 1 },
      { id: 3, name: 'ESPN', teamName: 'ESPN Network', url: `${baseUrl}3.m3u8`, leagueId: 'other', priority: 1 },
      { id: 4, name: 'ESPN2', teamName: 'ESPN2 Network', url: `${baseUrl}4.m3u8`, leagueId: 'other', priority: 1 },
      { id: 5, name: 'MLB Network', teamName: 'MLB Network', url: `${baseUrl}5.m3u8`, leagueId: 'other', priority: 1 },
    ];

    // NHL Teams (IDs 6-35)
    const nhlTeams = [
      { id: 6, name: 'Anaheim Ducks', teamName: 'Anaheim Ducks', url: `${baseUrl}6.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 7, name: 'Arizona Coyotes', teamName: 'Arizona Coyotes', url: `${baseUrl}7.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 8, name: 'Boston Bruins', teamName: 'Boston Bruins', url: `${baseUrl}8.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 9, name: 'Buffalo Sabres', teamName: 'Buffalo Sabres', url: `${baseUrl}9.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 10, name: 'Calgary Flames', teamName: 'Calgary Flames', url: `${baseUrl}10.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 11, name: 'Carolina Hurricanes', teamName: 'Carolina Hurricanes', url: `${baseUrl}11.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 12, name: 'Chicago Blackhawks', teamName: 'Chicago Blackhawks', url: `${baseUrl}12.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 13, name: 'Colorado Avalanche', teamName: 'Colorado Avalanche', url: `${baseUrl}13.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 14, name: 'Columbus Blue Jackets', teamName: 'Columbus Blue Jackets', url: `${baseUrl}14.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 15, name: 'Dallas Stars', teamName: 'Dallas Stars', url: `${baseUrl}15.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 16, name: 'Detroit Red Wings', teamName: 'Detroit Red Wings', url: `${baseUrl}16.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 17, name: 'Edmonton Oilers', teamName: 'Edmonton Oilers', url: `${baseUrl}17.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 18, name: 'Florida Panthers', teamName: 'Florida Panthers', url: `${baseUrl}18.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 19, name: 'Los Angeles Kings', teamName: 'Los Angeles Kings', url: `${baseUrl}19.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 20, name: 'Minnesota Wild', teamName: 'Minnesota Wild', url: `${baseUrl}20.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 21, name: 'Montreal Canadiens', teamName: 'Montreal Canadiens', url: `${baseUrl}21.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 22, name: 'Nashville Predators', teamName: 'Nashville Predators', url: `${baseUrl}22.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 23, name: 'New Jersey Devils', teamName: 'New Jersey Devils', url: `${baseUrl}23.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 24, name: 'New York Islanders', teamName: 'New York Islanders', url: `${baseUrl}24.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 25, name: 'New York Rangers', teamName: 'New York Rangers', url: `${baseUrl}25.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 26, name: 'Ottawa Senators', teamName: 'Ottawa Senators', url: `${baseUrl}26.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 27, name: 'Philadelphia Flyers', teamName: 'Philadelphia Flyers', url: `${baseUrl}27.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 28, name: 'Pittsburgh Penguins', teamName: 'Pittsburgh Penguins', url: `${baseUrl}28.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 29, name: 'San Jose Sharks', teamName: 'San Jose Sharks', url: `${baseUrl}29.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 30, name: 'Seattle Kraken', teamName: 'Seattle Kraken', url: `${baseUrl}30.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 31, name: 'St. Louis Blues', teamName: 'St. Louis Blues', url: `${baseUrl}31.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 32, name: 'Tampa Bay Lightning', teamName: 'Tampa Bay Lightning', url: `${baseUrl}32.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 33, name: 'Toronto Maple Leafs', teamName: 'Toronto Maple Leafs', url: `${baseUrl}33.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 34, name: 'Vancouver Canucks', teamName: 'Vancouver Canucks', url: `${baseUrl}34.m3u8`, leagueId: 'nhl', priority: 2 },
      { id: 35, name: 'Vegas Golden Knights', teamName: 'Vegas Golden Knights', url: `${baseUrl}35.m3u8`, leagueId: 'nhl', priority: 2 },
    ];

    // MLB Teams (IDs 36-65)
    const mlbTeams = [
      { id: 36, name: 'Arizona Diamondbacks', teamName: 'Arizona Diamondbacks', url: `${baseUrl}36.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 37, name: 'Atlanta Braves', teamName: 'Atlanta Braves', url: `${baseUrl}37.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 38, name: 'Baltimore Orioles', teamName: 'Baltimore Orioles', url: `${baseUrl}38.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 39, name: 'Boston Red Sox', teamName: 'Boston Red Sox', url: `${baseUrl}39.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 40, name: 'Chicago Cubs', teamName: 'Chicago Cubs', url: `${baseUrl}40.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 41, name: 'Chicago White Sox', teamName: 'Chicago White Sox', url: `${baseUrl}41.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 42, name: 'Cincinnati Reds', teamName: 'Cincinnati Reds', url: `${baseUrl}42.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 43, name: 'Cleveland Guardians', teamName: 'Cleveland Guardians', url: `${baseUrl}43.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 44, name: 'Colorado Rockies', teamName: 'Colorado Rockies', url: `${baseUrl}44.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 45, name: 'Detroit Tigers', teamName: 'Detroit Tigers', url: `${baseUrl}45.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 46, name: 'Houston Astros', teamName: 'Houston Astros', url: `${baseUrl}46.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 47, name: 'Kansas City Royals', teamName: 'Kansas City Royals', url: `${baseUrl}47.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 48, name: 'Los Angeles Angels', teamName: 'Los Angeles Angels', url: `${baseUrl}48.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 49, name: 'Los Angeles Dodgers', teamName: 'Los Angeles Dodgers', url: `${baseUrl}49.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 50, name: 'Miami Marlins', teamName: 'Miami Marlins', url: `${baseUrl}50.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 51, name: 'Milwaukee Brewers', teamName: 'Milwaukee Brewers', url: `${baseUrl}51.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 52, name: 'Minnesota Twins', teamName: 'Minnesota Twins', url: `${baseUrl}52.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 53, name: 'New York Mets', teamName: 'New York Mets', url: `${baseUrl}53.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 54, name: 'New York Yankees', teamName: 'New York Yankees', url: `${baseUrl}54.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 55, name: 'Oakland Athletics', teamName: 'Oakland Athletics', url: `${baseUrl}55.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 56, name: 'Philadelphia Phillies', teamName: 'Philadelphia Phillies', url: `${baseUrl}56.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 57, name: 'Pittsburgh Pirates', teamName: 'Pittsburgh Pirates', url: `${baseUrl}57.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 58, name: 'San Diego Padres', teamName: 'San Diego Padres', url: `${baseUrl}58.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 59, name: 'San Francisco Giants', teamName: 'San Francisco Giants', url: `${baseUrl}59.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 60, name: 'Seattle Mariners', teamName: 'Seattle Mariners', url: `${baseUrl}60.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 61, name: 'St. Louis Cardinals', teamName: 'St. Louis Cardinals', url: `${baseUrl}61.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 62, name: 'Tampa Bay Rays', teamName: 'Tampa Bay Rays', url: `${baseUrl}62.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 63, name: 'Texas Rangers', teamName: 'Texas Rangers', url: `${baseUrl}63.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 64, name: 'Toronto Blue Jays', teamName: 'Toronto Blue Jays', url: `${baseUrl}64.m3u8`, leagueId: 'mlb', priority: 2 },
      { id: 65, name: 'Washington Nationals', teamName: 'Washington Nationals', url: `${baseUrl}65.m3u8`, leagueId: 'mlb', priority: 2 },
    ];

    // NFL Teams (IDs 66-97)
    const nflTeams = [
      { id: 66, name: 'Arizona Cardinals', teamName: 'Arizona Cardinals', url: `${baseUrl}66.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 67, name: 'Atlanta Falcons', teamName: 'Atlanta Falcons', url: `${baseUrl}67.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 68, name: 'Baltimore Ravens', teamName: 'Baltimore Ravens', url: `${baseUrl}68.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 69, name: 'Buffalo Bills', teamName: 'Buffalo Bills', url: `${baseUrl}69.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 70, name: 'Carolina Panthers', teamName: 'Carolina Panthers', url: `${baseUrl}70.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 71, name: 'Chicago Bears', teamName: 'Chicago Bears', url: `${baseUrl}71.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 72, name: 'Cincinnati Bengals', teamName: 'Cincinnati Bengals', url: `${baseUrl}72.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 73, name: 'Cleveland Browns', teamName: 'Cleveland Browns', url: `${baseUrl}73.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 74, name: 'Dallas Cowboys', teamName: 'Dallas Cowboys', url: `${baseUrl}74.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 75, name: 'Denver Broncos', teamName: 'Denver Broncos', url: `${baseUrl}75.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 76, name: 'Detroit Lions', teamName: 'Detroit Lions', url: `${baseUrl}76.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 77, name: 'Green Bay Packers', teamName: 'Green Bay Packers', url: `${baseUrl}77.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 78, name: 'Houston Texans', teamName: 'Houston Texans', url: `${baseUrl}78.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 79, name: 'Indianapolis Colts', teamName: 'Indianapolis Colts', url: `${baseUrl}79.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 80, name: 'Jacksonville Jaguars', teamName: 'Jacksonville Jaguars', url: `${baseUrl}80.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 81, name: 'Kansas City Chiefs', teamName: 'Kansas City Chiefs', url: `${baseUrl}81.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 82, name: 'Las Vegas Raiders', teamName: 'Las Vegas Raiders', url: `${baseUrl}82.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 83, name: 'Los Angeles Chargers', teamName: 'Los Angeles Chargers', url: `${baseUrl}83.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 84, name: 'Los Angeles Rams', teamName: 'Los Angeles Rams', url: `${baseUrl}84.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 85, name: 'Miami Dolphins', teamName: 'Miami Dolphins', url: `${baseUrl}85.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 86, name: 'Minnesota Vikings', teamName: 'Minnesota Vikings', url: `${baseUrl}86.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 87, name: 'New England Patriots', teamName: 'New England Patriots', url: `${baseUrl}87.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 88, name: 'New Orleans Saints', teamName: 'New Orleans Saints', url: `${baseUrl}88.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 89, name: 'New York Giants', teamName: 'New York Giants', url: `${baseUrl}89.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 90, name: 'New York Jets', teamName: 'New York Jets', url: `${baseUrl}90.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 91, name: 'Philadelphia Eagles', teamName: 'Philadelphia Eagles', url: `${baseUrl}91.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 92, name: 'Pittsburgh Steelers', teamName: 'Pittsburgh Steelers', url: `${baseUrl}92.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 93, name: 'San Francisco 49ers', teamName: 'San Francisco 49ers', url: `${baseUrl}93.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 94, name: 'Seattle Seahawks', teamName: 'Seattle Seahawks', url: `${baseUrl}94.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 95, name: 'Tampa Bay Buccaneers', teamName: 'Tampa Bay Buccaneers', url: `${baseUrl}95.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 96, name: 'Tennessee Titans', teamName: 'Tennessee Titans', url: `${baseUrl}96.m3u8`, leagueId: 'nfl', priority: 2 },
      { id: 97, name: 'Washington Commanders', teamName: 'Washington Commanders', url: `${baseUrl}97.m3u8`, leagueId: 'nfl', priority: 2 },
    ];

    // NBA Teams (IDs 98-127)
    const nbaTeams = [
      { id: 98, name: 'Atlanta Hawks', teamName: 'Atlanta Hawks', url: `${baseUrl}98.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 99, name: 'Boston Celtics', teamName: 'Boston Celtics', url: `${baseUrl}99.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 100, name: 'Brooklyn Nets', teamName: 'Brooklyn Nets', url: `${baseUrl}100.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 101, name: 'Charlotte Hornets', teamName: 'Charlotte Hornets', url: `${baseUrl}101.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 102, name: 'Chicago Bulls', teamName: 'Chicago Bulls', url: `${baseUrl}102.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 103, name: 'Cleveland Cavaliers', teamName: 'Cleveland Cavaliers', url: `${baseUrl}103.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 104, name: 'Dallas Mavericks', teamName: 'Dallas Mavericks', url: `${baseUrl}104.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 105, name: 'Denver Nuggets', teamName: 'Denver Nuggets', url: `${baseUrl}105.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 106, name: 'Detroit Pistons', teamName: 'Detroit Pistons', url: `${baseUrl}106.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 107, name: 'Golden State Warriors', teamName: 'Golden State Warriors', url: `${baseUrl}107.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 108, name: 'Houston Rockets', teamName: 'Houston Rockets', url: `${baseUrl}108.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 109, name: 'Indiana Pacers', teamName: 'Indiana Pacers', url: `${baseUrl}109.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 110, name: 'LA Clippers', teamName: 'LA Clippers', url: `${baseUrl}110.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 111, name: 'Los Angeles Lakers', teamName: 'Los Angeles Lakers', url: `${baseUrl}111.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 112, name: 'Memphis Grizzlies', teamName: 'Memphis Grizzlies', url: `${baseUrl}112.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 113, name: 'Miami Heat', teamName: 'Miami Heat', url: `${baseUrl}113.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 114, name: 'Milwaukee Bucks', teamName: 'Milwaukee Bucks', url: `${baseUrl}114.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 115, name: 'Minnesota Timberwolves', teamName: 'Minnesota Timberwolves', url: `${baseUrl}115.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 116, name: 'New Orleans Pelicans', teamName: 'New Orleans Pelicans', url: `${baseUrl}116.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 117, name: 'New York Knicks', teamName: 'New York Knicks', url: `${baseUrl}117.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 118, name: 'Oklahoma City Thunder', teamName: 'Oklahoma City Thunder', url: `${baseUrl}118.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 119, name: 'Orlando Magic', teamName: 'Orlando Magic', url: `${baseUrl}119.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 120, name: 'Philadelphia 76ers', teamName: 'Philadelphia 76ers', url: `${baseUrl}120.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 121, name: 'Phoenix Suns', teamName: 'Phoenix Suns', url: `${baseUrl}121.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 122, name: 'Portland Trail Blazers', teamName: 'Portland Trail Blazers', url: `${baseUrl}122.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 123, name: 'Sacramento Kings', teamName: 'Sacramento Kings', url: `${baseUrl}123.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 124, name: 'San Antonio Spurs', teamName: 'San Antonio Spurs', url: `${baseUrl}124.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 125, name: 'Toronto Raptors', teamName: 'Toronto Raptors', url: `${baseUrl}125.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 126, name: 'Utah Jazz', teamName: 'Utah Jazz', url: `${baseUrl}126.m3u8`, leagueId: 'nba', priority: 2 },
      { id: 127, name: 'Washington Wizards', teamName: 'Washington Wizards', url: `${baseUrl}127.m3u8`, leagueId: 'nba', priority: 2 },
    ];

    // Combine all teams and channels
    const allStreamSources = [
      ...specialChannels,
      ...nhlTeams,
      ...mlbTeams,
      ...nflTeams,
      ...nbaTeams
    ];

    // Convert to proper format for Supabase insert
    const formattedSources = allStreamSources.map(source => ({
      id: source.id,
      name: source.name,
      team_name: source.teamName,
      url: source.url,
      league_id: source.leagueId,
      is_active: true,
      priority: source.priority,
      description: `${source.leagueId.toUpperCase()} ${source.name} stream`
    }));

    // Insert stream sources using Supabase
    // Since there are many records, we'll split them into batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < formattedSources.length; i += BATCH_SIZE) {
      const batch = formattedSources.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('stream_sources')
        .upsert(batch, { onConflict: 'id' });
      
      if (insertError) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
        return false;
      }
    }

    console.log(`Successfully inserted ${allStreamSources.length} stream sources`);
    return true;
  } catch (error) {
    console.error('Error populating stream sources:', error);
    return false;
  }
}

/**
 * Initialize leagues table if it doesn't exist
 */
async function initializeLeagues(): Promise<boolean> {
  try {
    // Check if leagues table exists
    const { data: tableExists, error: tableExistsError } = await supabase
      .from('leagues')
      .select('id')
      .limit(1);
    
    if (!tableExistsError) {
      console.log('Leagues table already exists');
      
      // Check if we need to populate the table
      if (tableExists && tableExists.length > 0) {
        console.log('Leagues table already has data');
        return true;
      }
    } else {
      // Create leagues table using raw SQL
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS leagues (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          icon_url TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createTableError } = await supabase.rpc('exec', { query: createTableQuery });
      
      if (createTableError) {
        console.error('Error creating leagues table:', createTableError);
        return false;
      }
      
      console.log('Leagues table created successfully');
    }
    
    // Insert league data
    const leagueData = [
      { id: 'nba', name: 'NBA', description: 'National Basketball Association', icon_url: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png', is_active: true },
      { id: 'nfl', name: 'NFL', description: 'National Football League', icon_url: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png', is_active: true },
      { id: 'mlb', name: 'MLB', description: 'Major League Baseball', icon_url: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mlb.png', is_active: true },
      { id: 'nhl', name: 'NHL', description: 'National Hockey League', icon_url: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nhl.png', is_active: true },
      { id: 'other', name: 'Special Channels', description: 'Network and special channels', icon_url: 'https://a.espncdn.com/combiner/i?img=/i/espn/espn_logos/espn_red.png', is_active: true }
    ];
    
    // Use Supabase upsert to insert leagues
    const { error: insertError } = await supabase
      .from('leagues')
      .upsert(leagueData, { onConflict: 'id' });
    
    if (insertError) {
      console.error('Error inserting leagues data:', insertError);
      return false;
    }
    
    console.log('Leagues data inserted successfully');
    return true;
  } catch (error) {
    console.error('Error initializing leagues table:', error);
    return false;
  }
}

/**
 * Initialize stream sources endpoint handler
 */
// Express router for handling init stream sources requests
import express from 'express';
const router = express.Router();

// POST and GET routes for initializing stream sources
router.post('/', async (req: Request, res: Response) => {
  return await handleInitStreamSources(req, res);
});

// Also support GET requests for easier testing
router.get('/', async (req: Request, res: Response) => {
  return await handleInitStreamSources(req, res);
});

// Default export for router
export default router;

// Handler for initializing stream sources
async function handleInitStreamSources(req: Request, res: Response) {
  try {
    // Step 1: Create the stream_sources table
    const tableCreated = await createStreamSourcesTable();
    
    if (!tableCreated) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create stream sources table' 
      });
    }
    
    // Step 2: Populate the table with initial data
    const dataPopulated = await populateStreamSources();
    
    if (!dataPopulated) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to populate stream sources table with data' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Stream sources initialized successfully' 
    });
  } catch (error) {
    console.error('Error handling init stream sources request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize stream sources', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}