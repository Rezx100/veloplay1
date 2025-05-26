import { Game } from "@shared/schema";
import fetch from "node-fetch";
import { format } from "date-fns";
import { supabase } from "./db";
import { RedisCache } from "./redis";

const ESPN_API_BASE = "https://site.api.espn.com/apis/v2/scoreboard/header";

// League sport and name mapping
const LEAGUES = {
  nhl: { sport: "hockey", league: "nhl" },
  nba: { sport: "basketball", league: "nba" },
  nfl: { sport: "football", league: "nfl" },
  mlb: { sport: "baseball", league: "mlb" },
};

type LeagueId = keyof typeof LEAGUES;

// Previously, there was a cache to store recently completed games here.
// This has been removed as we no longer need to display completed games.

// Helper function to format date as YYYYMMDD for ESPN API
function formatDateForESPN(date: Date): string {
  // Convert to Eastern Time for consistency with ESPN's schedule
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Get date components in Eastern Time
  const year = etDate.getFullYear();
  const month = etDate.getMonth() + 1; // JavaScript months are 0-based
  const day = etDate.getDate();
  
  // Format as YYYYMMDD
  const dateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  console.log(`Formatting date ${date.toISOString()} to ESPN format: ${dateStr} (ET: ${month}/${day}/${year})`);
  return dateStr;
}

// Helper function to get current date/time in U.S. Eastern Time
export function getCurrentEasternTime(): Date {
  // Create a date object for the current time
  const now = new Date();
  
  // This is a more accurate way to convert to Eastern Time
  // First get the ISO string of the time in the Eastern timezone
  const etDateString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  
  // Parse that back into a date object that has the correct time
  // but with the local timezone of the server
  const etDate = new Date(etDateString);
  
  console.log(`Time conversion: UTC ${now.toISOString()} → Eastern Time ${etDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  
  return etDate;
}

// Helper to determine if a game is in warmup phase
// Game is in warmup if it's within 30 minutes of the start time
function isGameInWarmup(gameDate: string): boolean {
  try {
    // Ensure we're working with UTC timestamps consistently
    const gameTime = new Date(gameDate);
    const now = new Date();
    
    // Calculate time difference in minutes
    const timeDiffMs = gameTime.getTime() - now.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    
    // Log detailed information for debugging
    console.log(`Game warmup check: 
      - Game time (UTC): ${gameTime.toISOString()}
      - Current time (UTC): ${now.toISOString()}
      - Time difference: ${Math.round(timeDiffMinutes)} minutes
      - Warmup status: ${timeDiffMinutes <= 30 && timeDiffMinutes > 0 ? 'In warmup' : 'Not in warmup'}`
    );
    
    // Game is in warmup if it's between 30 minutes before start and start time
    return timeDiffMinutes <= 30 && timeDiffMinutes > 0;
  } catch (error) {
    console.error("Error calculating warmup status:", error);
    return false;
  }
}

// Helper to determine accurate game state based on time and status
function determineGameState(espnGame: ESPNGameResponse): { 
  // Add delayed and postponed to possible states
  state: "pre" | "in" | "post" | "delayed" | "postponed", 
  isWarmup: boolean,
  statusDetail: string 
} {
  // Default values
  let state: "pre" | "in" | "post" | "delayed" | "postponed" = "pre";
  let statusDetail = espnGame.note || "";
  let isWarmup = false;
  
  try {
    // First use API's status if available (most accurate)
    if (espnGame.statusType) {
      if (espnGame.statusType.state === "in" || espnGame.statusType.state === "live") {
        state = "in";
      } else if (espnGame.statusType.completed === true || espnGame.statusType.state === "post") {
        state = "post";
      }
      
      // Use the most detailed status information available
      statusDetail = espnGame.statusType.detail || 
                    espnGame.statusType.shortDetail || 
                    espnGame.statusType.description || 
                    statusDetail;
      
      // Check status text for warmup
      isWarmup = (typeof statusDetail === 'string' && statusDetail.toLowerCase().includes('warmup')) || 
                !!(espnGame.statusType.description && 
                 typeof espnGame.statusType.description === 'string' &&
                 espnGame.statusType.description.toLowerCase().includes('warmup'));
    } 
    // Fall back to simple status field (older API format)
    else {
      if (espnGame.status === "in" || espnGame.status === "live" || espnGame.status === "in_progress") {
        state = "in";
      } else if (
        espnGame.status === "post" || 
        espnGame.status === "final" || 
        espnGame.status === "complete" || 
        espnGame.status === "completed" ||
        espnGame.status.toLowerCase().includes("final") ||
        espnGame.status.toLowerCase().includes("complet")
      ) {
        state = "post";
      }
      
      // Check if status text indicates warmup
      isWarmup = (typeof espnGame.status === 'string' && espnGame.status.toLowerCase().includes('warmup')) || 
                (typeof statusDetail === 'string' && statusDetail.toLowerCase().includes('warmup'));
    }
    
    // If API doesn't clearly indicate state, use time-based calculation as backup
    if (state === "pre" && !isWarmup && espnGame.date) {
      // Check if we should be in warmup based on current time
      isWarmup = isGameInWarmup(espnGame.date);
      
      // If the game start time has passed but ESPN still shows "pre" (delayed/not started),
      // check how much time has passed since scheduled start
      const now = new Date();
      const gameTime = new Date(espnGame.date);
      
      // Calculate time difference in minutes for logging
      const timeDiffMs = now.getTime() - gameTime.getTime();
      const timeDiffMinutes = timeDiffMs / (1000 * 60);
      
      // Log detailed time information for debugging
      console.log(`Game ${espnGame.id} time check: 
          - Game at: ${gameTime.toISOString()} 
          - Current: ${now.toISOString()}
          - Minutes since scheduled start: ${Math.round(timeDiffMinutes)}`);
      
      // Check if game should have started (more than 5 minutes past scheduled start)
      if (timeDiffMinutes > 5) {
        // If game is more than 5 minutes past start time, mark as in progress
        state = "in";
        console.log(`Game ${espnGame.id} should have started ${Math.round(timeDiffMinutes)} minutes ago - marking as in progress`);
      } else if (timeDiffMinutes > 0) {
        // If game is past start time but less than 5 minutes, assume it's starting
        state = "in";
        console.log(`Game ${espnGame.id} is starting now (${Math.round(timeDiffMinutes)} minutes past scheduled time)`);
      }
      
      // Only add "Delayed" to the status detail for games that are specifically marked as delayed
      if (state === "delayed" && statusDetail && !statusDetail.toLowerCase().includes("delay")) {
        statusDetail = `Delayed - ${statusDetail}`;
      } else if (state === "delayed" && !statusDetail) {
        statusDetail = "Delayed";
      }
      
      // If game should be well underway (more than 3 hours past scheduled start) and still shows "pre",
      // it might be postponed or ESPN hasn't updated the status
      if (now.getTime() > gameTime.getTime() + 3 * 60 * 60 * 1000) {
        // Change status to "postponed" for proper UI handling
        state = "postponed";
        if (!statusDetail.toLowerCase().includes("postpon") && !statusDetail.toLowerCase().includes("cancel")) {
          statusDetail = statusDetail ? `Possible Postponement - ${statusDetail}` : "Possible Postponement";
        }
        console.log(`Game ${espnGame.id} marked as POSTPONED - ${Math.floor((now.getTime() - gameTime.getTime()) / (60 * 60 * 1000))} hours past scheduled start`);
      }
    }
    
    // If game is completed but we're well past game end (24+ hours), add "Final" explicitly
    if (state === "post" && !statusDetail.toLowerCase().includes("final")) {
      statusDetail = statusDetail ? `Final - ${statusDetail}` : "Final";
    }
    
    // Add warmup status to detail if needed
    if (isWarmup && typeof statusDetail === 'string' && !statusDetail.toLowerCase().includes('warmup')) {
      statusDetail = `Warmup - ${statusDetail}`;
    }
    
    return { state, isWarmup, statusDetail };
  } catch (error) {
    console.error("Error determining game state:", error);
    return { state, isWarmup, statusDetail };
  }
}

// Updated interface for ESPN API response based on actual structure
interface ESPNGameResponse {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: string;
  period: number;
  clock: string;
  // Arena/Stadium name
  location?: string;
  venue?: {
    fullName?: string;
    name?: string;
    address?: {
      city?: string;
      state?: string;
    };
  };
  competitors: {
    id: string;
    homeAway: "home" | "away";
    displayName: string;
    name: string;
    abbreviation: string;
    score: string;
    logo: string;
    logoDark?: string;
    // City/location of the team
    location?: string;
  }[];
  note?: string;
  // Extended fields to capture the full ESPN status structure
  statusType?: {
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
}

// Add a debug function to examine the raw ESPN API response
export async function getRawESPNData(leagueId: LeagueId, date?: Date): Promise<any> {
  try {
    const { sport, league } = LEAGUES[leagueId];
    let url = `${ESPN_API_BASE}?sport=${sport}&league=${league}`;
    
    // Add date parameter if provided
    if (date) {
      url += `&date=${formatDateForESPN(date)}`;
    }
    
    console.log(`Fetching ESPN API URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status} - ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching raw ${leagueId} data:`, error);
    throw error;
  }
}

export async function getLeagueGames(leagueId: LeagueId, date?: Date): Promise<Game[]> {
  try {
    const { sport, league } = LEAGUES[leagueId];
    
    // Always use a date parameter - default to today if not provided
    const dateToUse = date || new Date();
    const formattedDate = formatDateForESPN(dateToUse);
    
    // Build URL with dates parameter (note: it's 'dates' plural in ESPN API)
    const url = `${ESPN_API_BASE}?sport=${sport}&league=${league}&dates=${formattedDate}`;
    
    // Log the exact URL for debugging
    console.log(`Fetching games for date: ${dateToUse.toISOString()}, formatted as: ${formattedDate}`);
    console.log(`ESPN API URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json() as { sports: { leagues: { events: ESPNGameResponse[] }[] }[] };
    
    if (!data.sports?.[0]?.leagues?.[0]?.events) {
      console.log(`No events found for ${leagueId} on ${formattedDate}`);
      return [];
    }
    
    const espnGames = data.sports[0].leagues[0].events;
    console.log(`Found ${espnGames.length} games for ${leagueId} on ${formattedDate}`);
    
    // Map the API games to our model
    let apiGames = mapESPNGamesToGameModel(espnGames, leagueId);
    
    // No longer adding hardcoded test data
    // Instead, we rely entirely on the ESPN API for real game data
    
    // No longer caching completed games - just return the games from the API
    console.log(`Returning ${apiGames.length} games for ${leagueId}`);
    
    return apiGames;
  } catch (error) {
    console.error(`Error fetching ${leagueId} games:`, error);
    return [];
  }
}

export async function getAllGames(date?: Date, includeTomorrow: boolean = false): Promise<Game[]> {
  try {
    const leagues = Object.keys(LEAGUES) as LeagueId[];
    
    // Always use a date parameter - default to today if not provided
    const dateToUse = date || new Date();
    const formattedDate = formatDateForESPN(dateToUse);
    const cacheKey = `all-games:${formattedDate}:${includeTomorrow}`;
    
    // Try to get from Redis cache first
    const cachedGames = await RedisCache.get(cacheKey);
    if (cachedGames) {
      console.log(`⚡ Retrieved ${cachedGames.length} games from Redis cache for ${formattedDate}`);
      return cachedGames;
    }
    
    console.log(`Fetching games for date: ${dateToUse.toISOString()}`);
    
    // Make sure all league calls use the same date parameter
    const allGamesPromises = leagues.map(leagueId => getLeagueGames(leagueId, dateToUse));
    
    // If includeTomorrow is true, also fetch tomorrow's games
    if (includeTomorrow) {
      // Create tomorrow's date by adding one day to dateToUse
      const tomorrow = new Date(dateToUse);
      tomorrow.setDate(tomorrow.getDate() + 1);
      console.log(`Also fetching games for tomorrow: ${tomorrow.toISOString()}`);
      
      // Add promises for tomorrow's games
      const tomorrowGamesPromises = leagues.map(leagueId => getLeagueGames(leagueId, tomorrow));
      allGamesPromises.push(...tomorrowGamesPromises);
    }
    
    const results = await Promise.all(allGamesPromises);
    let allGames = results.flat();
    
    // Check if we have any upcoming games in our current set
    const upcomingGames = allGames.filter(game => game.state === 'pre');
    
    // If we don't have any upcoming games, search ahead for them 
    if (upcomingGames.length === 0) {
      console.log("No upcoming games found for current dates. Searching for upcoming games in next 7 days.");
      
      // Look ahead up to 7 days to find upcoming games
      let foundUpcomingGames: Game[] = [];
      
      for (let i = 1; i <= 7; i++) {
        // If we already tried today and tomorrow (when includeTomorrow is true),
        // start from day 2 or 3 respectively
        const startDay = includeTomorrow ? 2 : 1;
        if (i < startDay) continue;
        
        const futureDate = new Date(dateToUse);
        futureDate.setDate(futureDate.getDate() + i);
        
        const futureDateFormatted = format(futureDate, 'M/d/yyyy');
        console.log(`Looking for upcoming games on: ${futureDateFormatted}`);
        
        // Try all leagues for this date
        const futurePromises = leagues.map(leagueId => getLeagueGames(leagueId, futureDate));
        const futureResults = await Promise.all(futurePromises);
        const futureGames = futureResults.flat();
        
        // Filter to only get upcoming (pre-game) games
        const upcomingFutureGames = futureGames.filter(game => game.state === 'pre');
        
        // Tag these games as future games for UI handling
        upcomingFutureGames.forEach(game => {
          game.isFuture = true;
        });
        
        // If we found upcoming games, add them and stop looking further
        if (upcomingFutureGames.length > 0) {
          console.log(`Found ${upcomingFutureGames.length} upcoming games for ${futureDateFormatted}`);
          foundUpcomingGames = upcomingFutureGames;
          break;
        }
      }
      
      // If we found upcoming games in the future, add them to our allGames array
      if (foundUpcomingGames.length > 0) {
        console.log(`Adding ${foundUpcomingGames.length} upcoming future games to the results`);
        allGames = [...allGames, ...foundUpcomingGames];
      }
    }
    
    console.log(`🟢 FINAL: Total games loaded: ${allGames.length}`);
    
    // Cache the results for 2 minutes (games data changes frequently during live games)
    await RedisCache.set(cacheKey, allGames, 120);
    console.log(`💾 Cached ${allGames.length} games for ${formattedDate}`);
    
    return allGames;
  } catch (error) {
    console.error("Error fetching all league games:", error);
    return [];
  }
}

// Function to add test games (upcoming, delayed, postponed) for UI testing
// Export this function so it can be used by other modules
// Test function removed for production

export async function getGameById(gameId: string): Promise<Game | null> {
  try {
    console.log(`Fetching game by ID: ${gameId}`);
    
    // Try the standard approach of finding among already fetched games
    // First, try finding the game in today's games
    const todayGames = await getAllGames();
    const game = todayGames.find(game => game.id === gameId);
    
    if (game) {
      console.log(`Found game in today's games: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      return game;
    }
    
    // If not found, check tomorrow's games
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowGames = await getAllGames(tomorrow, false);
    const gameTomorrow = tomorrowGames.find(game => game.id === gameId);
    
    if (gameTomorrow) {
      console.log(`Found game in tomorrow's games: ${gameTomorrow.homeTeam.name} vs ${gameTomorrow.awayTeam.name}`);
      return gameTomorrow;
    }
    
    // If not found, try looking for games on May 10 through May 14, 2025 (our demo dates)
    const demoDateRange = [
      new Date(2025, 4, 10), // May is month 4 (0-based)
      new Date(2025, 4, 11),
      new Date(2025, 4, 12),
      new Date(2025, 4, 13),
      new Date(2025, 4, 14)
    ];
    
    // Try all demo dates
    for (const demoDate of demoDateRange) {
      const formattedDate = `${demoDate.getFullYear()}-${String(demoDate.getMonth() + 1).padStart(2, '0')}-${String(demoDate.getDate()).padStart(2, '0')}`;
      console.log(`Checking games on ${formattedDate} for game ID ${gameId}`);
      
      const gamesOnDate = await getAllGames(demoDate);
      const gameOnDate = gamesOnDate.find(game => game.id === gameId);
      
      if (gameOnDate) {
        console.log(`Found game on ${formattedDate}: ${gameOnDate.homeTeam.name} vs ${gameOnDate.awayTeam.name}`);
        return gameOnDate;
      }
    }
    
    // If we still haven't found the game, check each league's games specifically
    // This covers edge cases where a game might be from a different date or might need specific league endpoints
    const leagues = ['nhl', 'nba', 'mlb', 'nfl'] as const;
    
    for (const league of leagues) {
      // Check today's games for this league
      const leagueGames = await getLeagueGames(league);
      const leagueGame = leagueGames.find(game => game.id === gameId);
      if (leagueGame) {
        console.log(`Found game in ${league.toUpperCase()} league data: ${leagueGame.homeTeam.name} vs ${leagueGame.awayTeam.name}`);
        return leagueGame;
      }
      
      // Check tomorrow's games for this league
      const leagueTomorrowGames = await getLeagueGames(league, tomorrow);
      const leagueTomorrowGame = leagueTomorrowGames.find(game => game.id === gameId);
      if (leagueTomorrowGame) {
        console.log(`Found game for tomorrow in ${league.toUpperCase()} league data: ${leagueTomorrowGame.homeTeam.name} vs ${leagueTomorrowGame.awayTeam.name}`);
        return leagueTomorrowGame;
      }
      
      // Try all demo dates for this league
      for (const demoDate of demoDateRange) {
        const formattedDate = `${demoDate.getFullYear()}-${String(demoDate.getMonth() + 1).padStart(2, '0')}-${String(demoDate.getDate()).padStart(2, '0')}`;
        
        const leagueDemoGames = await getLeagueGames(league, demoDate);
        const leagueDemoGame = leagueDemoGames.find(game => game.id === gameId);
        
        if (leagueDemoGame) {
          console.log(`Found game on ${formattedDate} in ${league.toUpperCase()} league data: ${leagueDemoGame.homeTeam.name} vs ${leagueDemoGame.awayTeam.name}`);
          return leagueDemoGame;
        }
      }
    }
    
    // Check if we can find the game in the database
    // This is a more sustainable approach than hardcoding specific games
    try {
      console.log(`Checking database for game ID ${gameId}`);
      const { data: streamData, error } = await supabase
        .from('streams')
        .select('*')
        .eq('gameId', gameId)
        .single();
      
      if (streamData && !error) {
        console.log(`Found game ${gameId} information in database`);
        
        // Extract team information from the game name if available
        let homeTeamName = 'Home Team';
        let homeTeamAbbr = 'HOME';
        let awayTeamName = 'Away Team';
        let awayTeamAbbr = 'AWAY';
        let leagueId: 'nhl' | 'nba' | 'mlb' | 'nfl' = 'nhl'; // Default to NHL
        
        if (streamData.gameName) {
          const teamPattern = /(.+?)\s+(?:at|vs\.?|@)\s+(.+)/i;
          const match = streamData.gameName.match(teamPattern);
          
          if (match && match.length >= 3) {
            awayTeamName = match[1].trim();
            homeTeamName = match[2].trim();
            
            // Generate abbreviations from team names
            awayTeamAbbr = awayTeamName.split(' ').map(word => word[0]).join('').toUpperCase();
            homeTeamAbbr = homeTeamName.split(' ').map(word => word[0]).join('').toUpperCase();
          }
          
          // Try to determine league from game name
          if (streamData.gameName.toLowerCase().includes('nhl') || 
              streamData.gameName.toLowerCase().includes('hockey')) {
            leagueId = 'nhl';
          } else if (streamData.gameName.toLowerCase().includes('nba') || 
                    streamData.gameName.toLowerCase().includes('basketball')) {
            leagueId = 'nba';
          } else if (streamData.gameName.toLowerCase().includes('mlb') || 
                    streamData.gameName.toLowerCase().includes('baseball')) {
            leagueId = 'mlb';
          } else if (streamData.gameName.toLowerCase().includes('nfl') || 
                    streamData.gameName.toLowerCase().includes('football')) {
            leagueId = 'nfl';
          }
        }
        
        // Create a proper game object from the stream data
        return {
          id: gameId,
          date: streamData.gameDate || new Date().toISOString(),
          name: streamData.gameName || `${awayTeamName} at ${homeTeamName}`,
          shortName: `${awayTeamAbbr} @ ${homeTeamAbbr}`,
          state: "pre", // Assume it's upcoming
          league: leagueId,
          homeTeam: {
            id: "0", // We don't have this info
            name: homeTeamName,
            abbreviation: homeTeamAbbr,
            logo: `https://a.espncdn.com/i/teamlogos/${leagueId}/500/scoreboard/${homeTeamAbbr.toLowerCase()}.png`
          },
          awayTeam: {
            id: "0", // We don't have this info
            name: awayTeamName,
            abbreviation: awayTeamAbbr,
            logo: `https://a.espncdn.com/i/teamlogos/${leagueId}/500/scoreboard/${awayTeamAbbr.toLowerCase()}.png`
          },
          venue: {
            name: streamData.venue || "Venue TBD",
            city: streamData.location || "Location TBD"
          },
          status: {
            period: 0,
            clock: "0:00",
            displayClock: "0:00",
            detail: streamData.gameDetail || "Upcoming Game"
          }
        };
      }
    } catch (dbError) {
      console.error(`Error checking database for game ${gameId}:`, dbError);
    }
    
    console.log(`Game with ID ${gameId} not found in any data source`);
    return null;
  } catch (error) {
    console.error(`Error fetching game by ID ${gameId}:`, error);
    return null;
  }
}

function mapESPNGamesToGameModel(espnGames: ESPNGameResponse[], leagueId: LeagueId): Game[] {
  const games: Game[] = [];

  for (const espnGame of espnGames) {
    try {
      // Find home and away teams
      const homeTeamData = espnGame.competitors?.find(c => c.homeAway === "home");
      const awayTeamData = espnGame.competitors?.find(c => c.homeAway === "away");
      
      if (!homeTeamData || !awayTeamData) {
        console.warn(`Game ${espnGame.id} missing team data, skipping`);
        continue;
      }
      
      // Use our enhanced game state detection logic
      const { state, isWarmup, statusDetail } = determineGameState(espnGame);
      
      // Log detailed state information for debugging
      console.log(`Game ${espnGame.id} status: ${espnGame.status}, detailed status: ${statusDetail}, mapped to state: ${state}`);
      
      const game: Game = {
        id: espnGame.id,
        date: espnGame.date,
        name: espnGame.name,
        shortName: espnGame.shortName,
        state,
        league: leagueId,
        homeTeam: {
          id: homeTeamData.id,
          name: homeTeamData.displayName,
          abbreviation: homeTeamData.abbreviation,
          logo: homeTeamData.logo || homeTeamData.logoDark || "",
          score: homeTeamData.score ? parseInt(homeTeamData.score, 10) : undefined
        },
        awayTeam: {
          id: awayTeamData.id,
          name: awayTeamData.displayName,
          abbreviation: awayTeamData.abbreviation,
          logo: awayTeamData.logo || awayTeamData.logoDark || "",
          score: awayTeamData.score ? parseInt(awayTeamData.score, 10) : undefined
        },
        venue: {
          // Get venue name from event location field, with fallbacks
          name: espnGame.location || 
                espnGame.venue?.fullName || 
                espnGame.venue?.name || 
                "TBD",
          // Get city from home team location, with fallbacks
          city: homeTeamData.location || 
                espnGame.venue?.address?.city || 
                espnGame.venue?.address?.state || 
                "TBD"
        },
        status: {
          period: espnGame.period || 0,
          clock: espnGame.clock,
          displayClock: espnGame.clock,
          detail: statusDetail
        },
        // Enhanced broadcast information
        broadcasts: espnGame.broadcasts?.map(broadcast => ({
          type: broadcast.type || "",
          name: broadcast.market?.name || broadcast.name || "",
          shortName: broadcast.market?.shortName || broadcast.shortName || "",
          callLetters: broadcast.callLetters || "",
          isNational: broadcast.isNational || false,
          slug: broadcast.slug || ""
        })) || [],
        // ESPN links for additional game info
        links: {
          gamecast: espnGame.links?.find(link => link.rel?.includes('gamecast'))?.href,
          boxScore: espnGame.links?.find(link => link.rel?.includes('boxscore'))?.href,
          recap: espnGame.links?.find(link => link.rel?.includes('recap'))?.href
        }
      };
      
      games.push(game);
    } catch (error) {
      console.error(`Error processing game ${espnGame.id}:`, error);
      // Continue with other games
    }
  }
  

  
  return games;
}
