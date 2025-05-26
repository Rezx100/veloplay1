import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Game } from '@shared/schema';
import { useMemo, useEffect } from 'react';
import { format, startOfDay, isSameDay } from 'date-fns';

// Helper functions for date handling

/**
 * Get the current date in Eastern Time (ET)
 * Returns a Date object with the time component set to midnight ET
 */
export function getCurrentDateInET(): Date {
  // Get current date in Eastern Time
  const now = new Date();
  const etOptions = { timeZone: 'America/New_York' };
  const etDateString = now.toLocaleString('en-US', etOptions);
  const etDate = new Date(etDateString);
  
  // Reset time component to get just the date part
  etDate.setHours(0, 0, 0, 0);
  console.log(`Current date in Eastern Time: ${etDate.toLocaleDateString()}`);
  return etDate;
}

/**
 * Get the current date and time in Eastern Time (ET)
 * Returns a Date object with the full time information
 */
export function getCurrentEasternTime(): Date {
  const now = new Date();
  // Convert to Eastern Time
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

// Helper to format date as ISO string for API (YYYY-MM-DD)
function formatDateForApi(date: Date): string {
  // Convert to Eastern Time for consistency with the server
  // We need to create a new Date with just the local components to avoid timezone shifts
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = etDate.getMonth() + 1; // 1-indexed for API
  const day = etDate.getDate();
  
  // Format as YYYY-MM-DD
  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  console.log(`Formatting date ${month}/${day}/${year} to API format: ${formatted}`);
  return formatted;
}

/**
 * Comprehensive game state detection function
 * Determines if a game is in warmup, delayed, or other special states
 * Uses both API data and time-based calculations
 */
function isGameInWarmup(game: Game): boolean {
  if (game.state !== 'pre' || !game.date) return false;

  // Method 1: Check game status from the API directly
  // This is the most accurate method and takes precedence
  const statusDetail = (game.status?.detail || '').toLowerCase();
  if (statusDetail.includes('warmup')) {
    console.log(`Game ${game.id} explicitly in warmup based on status: "${game.status?.detail}"`);
    return true;
  }
  
  // Method 2: Time-based calculation using Eastern Time
  try {
    const gameTime = new Date(game.date);
    const etNow = getCurrentEasternTime(); // Get current time in Eastern Time
    
    // Calculate time difference in minutes
    const timeDiffMs = gameTime.getTime() - etNow.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    
    // Game is in warmup if it's between 30 minutes before start and start time
    const isTimeBasedWarmup = timeDiffMinutes <= 30 && timeDiffMinutes > 0;
    
    if (isTimeBasedWarmup) {
      console.log(`Game ${game.id} in warmup based on Eastern Time calculation (${Math.round(timeDiffMinutes)} min before start)`);
    }
    
    return isTimeBasedWarmup;
  } catch (error) {
    console.error(`Error calculating warmup status for game ${game.id}:`, error);
    return false;
  }
}

export function useAllGames(selectedDate?: Date, includeTomorrow: boolean = true) {
  const queryClient = useQueryClient();
  
  // Use current date in Eastern Time if none provided
  const dateToUse = selectedDate ? selectedDate : getCurrentDateInET();
  const formattedDate = formatDateForApi(dateToUse);
  
  // Include the date and includeTomorrow flag in the queryKey for proper cache management
  const queryKey = ['/api/games', formattedDate, includeTomorrow ? 'with-tomorrow' : 'today-only'];
  
  // Debug log with date parameters
  console.log(`Fetching games for date: ${dateToUse.toISOString()}, including tomorrow: ${includeTomorrow}`);
  console.log("Date filtering parameters:", {
    selectedDate: selectedDate?.toISOString(),
    includeTomorrow,
    selectedLeague: "all",
    totalGames: 0 // Will be updated when data loads
  });
  
  // Whenever the selected date or includeTomorrow changes, invalidate any previous query
  useEffect(() => {
    // Force invalidation of all games queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/games'] });
    console.log(`Date changed to ${formattedDate}, invalidating previous queries`);
    
    // Force a refetch for the current settings
    queryClient.refetchQueries({ queryKey });
  }, [formattedDate, includeTomorrow, queryClient, queryKey]);
  
  const { data: games = [], isLoading, error, refetch } = useQuery<Game[]>({
    queryKey,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Make sure the date parameter and includeTomorrow flag are properly included
    queryFn: async () => {
      const response = await fetch(`/api/games?date=${formattedDate}&includeTomorrow=${includeTomorrow}`);
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      return response.json();
    }
  });

  // Process and categorize games into appropriate groups
  const { 
    liveGames, 
    warmupGames, 
    delayedGames, 
    postponedGames, 
    upcomingGames, 
    completedGames 
  } = useMemo(() => {
    // Initialize empty arrays for each category
    const live: Game[] = [];
    const warmup: Game[] = [];
    const delayed: Game[] = [];
    const postponed: Game[] = [];
    const upcoming: Game[] = [];
    const completed: Game[] = [];
    
    // Process each game and place in appropriate category
    games.forEach(game => {
      if (game.state === 'in') {
        // Live games
        live.push(game);
      } else if (game.state === 'delayed') {
        // Delayed games
        delayed.push(game);
      } else if (game.state === 'postponed') {
        // Postponed games
        postponed.push(game);
      } else if (game.state === 'post') {
        // Completed games
        completed.push(game);
      } else if (game.state === 'pre') {
        // Determine if game is in warmup (30 mins before start)
        if (isGameInWarmup(game)) {
          warmup.push(game);
        } else {
          // Regular upcoming game
          upcoming.push(game);
        }
      }
    });
    
    // Sort each category by start time (earliest first)
    const sortByDate = (a: Game, b: Game) => 
      new Date(a.date).getTime() - new Date(b.date).getTime();
    
    return {
      liveGames: live.sort(sortByDate),
      warmupGames: warmup.sort(sortByDate),
      delayedGames: delayed.sort(sortByDate),
      postponedGames: postponed.sort(sortByDate),
      upcomingGames: upcoming.sort(sortByDate),
      completedGames: completed.sort(sortByDate)
    };
  }, [games]);
  
  // For convenience, combine live games and warmup games as "activeGames"
  const activeGames = useMemo(() => 
    [...liveGames, ...warmupGames].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ), 
    [liveGames, warmupGames]
  );
  
  // Create a combined list of games in proper display order:
  // 1. Live games
  // 2. Warmup games
  // 3. Delayed games
  // 4. Upcoming games (from next 24 hours)
  // 5. Postponed games
  const orderedGames = useMemo(() => 
    [...liveGames, ...warmupGames, ...delayedGames, ...upcomingGames, ...postponedGames],
    [liveGames, warmupGames, delayedGames, upcomingGames, postponedGames]
  );

  // Log the breakdown of games for debugging
  useEffect(() => {
    console.log(`Game breakdown for ${formattedDate}:`, {
      total: games.length,
      live: liveGames.length,
      warmup: warmupGames.length,
      delayed: delayedGames.length,
      postponed: postponedGames.length,
      upcoming: upcomingGames.length,
      completed: completedGames.length
    });
  }, [games, formattedDate, liveGames, warmupGames, delayedGames, postponedGames, upcomingGames, completedGames]);

  return {
    games,
    liveGames,
    warmupGames, 
    delayedGames,
    postponedGames,
    upcomingGames,
    completedGames,
    activeGames,    // Combines live and warmup games
    orderedGames,   // All games in proper display order
    isLoading,
    error,
    refetch
  };
}

export function useLeagueGames(leagueId: string, selectedDate?: Date, includeTomorrow: boolean = true) {
  const queryClient = useQueryClient();
  
  // Use current date in Eastern Time if none provided
  const dateToUse = selectedDate ? selectedDate : getCurrentDateInET();
  const formattedDate = formatDateForApi(dateToUse);
  
  // Include the date and includeTomorrow flag in the queryKey for proper cache management
  const queryKey = [`/api/games/${leagueId}`, formattedDate, includeTomorrow ? 'with-tomorrow' : 'today-only'];
  
  // Debug log with date and league parameters
  console.log(`Fetching ${leagueId} games for date: ${dateToUse.toISOString()}, including tomorrow: ${includeTomorrow}`);
  console.log(`League page query parameters:`, {
    leagueId,
    formattedDate,
    includeTomorrow,
    url: `/api/games/${leagueId}?date=${formattedDate}&includeTomorrow=${includeTomorrow}`
  });
  
  // Whenever the selected date or includeTomorrow changes, invalidate any previous query
  useEffect(() => {
    // Force invalidation of all league games queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: [`/api/games/${leagueId}`] });
    console.log(`Date changed to ${formattedDate} for league ${leagueId}, invalidating previous queries`);
    
    // Force a refetch for the current settings
    queryClient.refetchQueries({ queryKey });
  }, [formattedDate, leagueId, includeTomorrow, queryClient, queryKey]);
  
  const { data: games = [], isLoading, error, refetch } = useQuery<Game[]>({
    queryKey,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Make sure the date parameter and includeTomorrow flag are properly included
    queryFn: async () => {
      const response = await fetch(`/api/games/${leagueId}?date=${formattedDate}&includeTomorrow=${includeTomorrow}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${leagueId} games`);
      }
      
      // Get the data from the response
      const data = await response.json();
      
      // Log the actual data returned for debugging
      console.log(`${leagueId} API returned ${data.length} games:`, {
        byState: {
          live: data.filter((g: Game) => g.state === 'in').length,
          upcoming: data.filter((g: Game) => g.state === 'pre').length,
          delayed: data.filter((g: Game) => g.state === 'delayed').length,
          postponed: data.filter((g: Game) => g.state === 'postponed').length,
          completed: data.filter((g: Game) => g.state === 'post').length,
        },
        upcomingGames: data.filter((g: Game) => g.state === 'pre').map((g: Game) => ({ id: g.id, name: g.name }))
      });
      
      return data;
    }
  });

  // Process and categorize games into appropriate groups
  const { 
    liveGames, 
    warmupGames, 
    delayedGames, 
    postponedGames, 
    upcomingGames, 
    completedGames 
  } = useMemo(() => {
    // Initialize empty arrays for each category
    const live: Game[] = [];
    const warmup: Game[] = [];
    const delayed: Game[] = [];
    const postponed: Game[] = [];
    const upcoming: Game[] = [];
    const completed: Game[] = [];
    
    // Process each game and place in appropriate category
    games.forEach(game => {
      if (game.state === 'in') {
        // Live games
        live.push(game);
      } else if (game.state === 'delayed') {
        // Delayed games
        delayed.push(game);
      } else if (game.state === 'postponed') {
        // Postponed games
        postponed.push(game);
      } else if (game.state === 'post') {
        // Completed games
        completed.push(game);
      } else if (game.state === 'pre') {
        // Determine if game is in warmup (30 mins before start)
        if (isGameInWarmup(game)) {
          warmup.push(game);
        } else {
          // Regular upcoming game
          upcoming.push(game);
        }
      }
    });
    
    // Sort each category by start time (earliest first)
    const sortByDate = (a: Game, b: Game) => 
      new Date(a.date).getTime() - new Date(b.date).getTime();
    
    return {
      liveGames: live.sort(sortByDate),
      warmupGames: warmup.sort(sortByDate),
      delayedGames: delayed.sort(sortByDate),
      postponedGames: postponed.sort(sortByDate),
      upcomingGames: upcoming.sort(sortByDate),
      completedGames: completed.sort(sortByDate)
    };
  }, [games]);
  
  // For convenience, combine live games and warmup games as "activeGames"
  const activeGames = useMemo(() => 
    [...liveGames, ...warmupGames].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ), 
    [liveGames, warmupGames]
  );
  
  // Create a combined list of games in proper display order:
  // 1. Live games
  // 2. Warmup games
  // 3. Delayed games
  // 4. Upcoming games (from next 24 hours)
  // 5. Postponed games
  const orderedGames = useMemo(() => 
    [...liveGames, ...warmupGames, ...delayedGames, ...upcomingGames, ...postponedGames],
    [liveGames, warmupGames, delayedGames, upcomingGames, postponedGames]
  );

  // Log the breakdown of games for debugging
  useEffect(() => {
    console.log(`Game breakdown for ${leagueId} on ${formattedDate}:`, {
      total: games.length,
      live: liveGames.length,
      warmup: warmupGames.length,
      delayed: delayedGames.length,
      postponed: postponedGames.length,
      upcoming: upcomingGames.length,
      completed: completedGames.length
    });
  }, [games, leagueId, formattedDate, liveGames, warmupGames, delayedGames, postponedGames, upcomingGames, completedGames]);

  return {
    games,
    liveGames,
    warmupGames, 
    delayedGames,
    postponedGames,
    upcomingGames,
    completedGames,
    activeGames,    // Combines live and warmup games
    orderedGames,   // All games in proper display order
    isLoading,
    error,
    refetch
  };
}

// New hook to specifically fetch completed games across all leagues
export function useCompletedGames(selectedDate?: Date) {
  const queryClient = useQueryClient();
  
  // Use current date in Eastern Time if none provided
  const dateToUse = selectedDate ? selectedDate : getCurrentDateInET();
  const formattedDate = formatDateForApi(dateToUse);
  
  // Set up a specific query key for completed games
  const queryKey = ['/api/completed-games', formattedDate];
  
  // Whenever the selected date changes, invalidate previous query
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/completed-games'] });
    console.log(`Date changed to ${formattedDate} for completed games, invalidating previous queries`);
    
    // Force a refetch for the current settings
    queryClient.refetchQueries({ queryKey });
  }, [formattedDate, queryClient, queryKey]);
  
  const { data: games = [], isLoading, error } = useQuery<Game[]>({
    queryKey,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      // First try to get data from the API
      try {
        const response = await fetch(`/api/games?date=${formattedDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch games');
        }
        const allGames = await response.json();
        // Filter out just the completed games
        const completedGames = allGames.filter((game: Game) => game.state === 'post');
        
        if (completedGames.length > 0) {
          console.log(`Found ${completedGames.length} completed games directly from API`);
          return completedGames;
        }
        
        // No mock data in production
        console.log('No completed games found from API');
        return [];
      } catch (error) {
        console.error('Error fetching completed games:', error);
        throw error;
      }
    }
  });
  
  return {
    completedGames: games,
    isLoading,
    error
  };
}

export function useGame(gameId: string) {
  const queryClient = useQueryClient();
  
  // On mount, force invalidate and refetch to ensure we don't get stale data
  useEffect(() => {
    // Clear any cached game data to ensure we get fresh data from the API
    queryClient.invalidateQueries({ queryKey: [`/api/game/${gameId}`] });
    queryClient.refetchQueries({ queryKey: [`/api/game/${gameId}`] });
    console.log(`Invalidating and refreshing data for game ID: ${gameId}`);
  }, [gameId, queryClient]);
  
  // This query gets data from the API endpoint
  const apiQuery = useQuery<Game>({
    queryKey: [`/api/game/${gameId}`],
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
    refetchInterval: 60 * 1000, // Auto refresh every minute for live game updates
    retry: 1 // Limit retries for better UX
  });
  
  // Always check for the game in all games as a potential fallback
  const { games, isLoading: allGamesLoading } = useAllGames();
  const gameFromAllGames = useMemo(() => {
    if (games && games.length > 0) {
      const foundGame = games.find(g => g.id === gameId);
      if (foundGame) {
        // If we're still waiting on API data or if there was an error, use the found game as fallback
        if (!apiQuery.data || apiQuery.error) {
          console.log(`Found game ${gameId} in cached games list as fallback`);
          return foundGame;
        }
      }
    }
    return null;
  }, [apiQuery.data, apiQuery.error, games, gameId]);
  
  // Return either the API result or the fallback if available
  return {
    data: apiQuery.data || gameFromAllGames,
    isLoading: (apiQuery.isLoading && !gameFromAllGames) || allGamesLoading,
    error: gameFromAllGames ? null : apiQuery.error,
    refetch: apiQuery.refetch
  };
}

export interface GameStreamData {
  streamUrl: string;
  hasAwayFeed: boolean;
  hasHomeFeed: boolean;
  currentFeed: 'home' | 'away' | 'fallback';
}

export function useGameStream(gameId: string, feedType: 'home' | 'away' = 'home') {
  const queryClient = useQueryClient();
  
  // On mount, force invalidate and refetch to ensure we don't get stale data
  useEffect(() => {
    // Clear any cached stream data to ensure we get fresh data from the API
    queryClient.invalidateQueries({ queryKey: [`/api/stream/${gameId}`] });
    console.log(`Invalidating stream data for game ID: ${gameId}, feed: ${feedType}`);
  }, [gameId, feedType, queryClient]);
  
  interface GameStreamData {
    streamUrl: string;
    hasAwayFeed: boolean;
    hasHomeFeed: boolean;
    currentFeed: string;
    awayStreamUrl?: string;
  }
  
  return useQuery<GameStreamData>({
    queryKey: [`/api/stream/${gameId}`, { feed: feedType }],
    enabled: !!gameId,
    retry: 3, // Increase retry attempts for development
    retryDelay: 1000, // 1 second delay between retries
    staleTime: 10 * 1000, // Consider data fresh for only 10 seconds to refresh more often
    queryFn: async () => {
      // Import the getAuthToken function from supabaseClient  
      const { getAuthToken } = await import('../lib/supabaseClient');
      
      const endpoint = `/api/stream/${gameId}?feed=${feedType}`;
      console.log(`[StreamDebug] Fetching stream for game ID: ${gameId} with feed: ${feedType}`);
      
      // Determine if we're in development mode to conditionally handle auth
      // Also consider replit.app domains as development for authentication purpose
      const isDevelopment = process.env.NODE_ENV !== 'production' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname.includes('.replit.dev') ||
                             window.location.hostname.includes('.replit.app');
      
      console.log(`[StreamDebug] Environment: ${isDevelopment ? 'development' : 'production'}, hostname: ${window.location.hostname}`);
      
      try {
        // Get authorization token (skip in development)
        let headers: Record<string, string> = {};
        
        // Always try to include auth token if available, regardless of environment
        try {
          const token = await getAuthToken();
          if (token) {
            headers = {
              Authorization: `Bearer ${token}`
            };
            console.log('[StreamDebug] Using auth token for stream request');
          } else if (!isDevelopment) {
            console.warn("[StreamDebug] No auth token available for stream request");
          } else {
            console.log('[StreamDebug] No auth token but in development mode, continuing');
          }
        } catch (error) {
          if (!isDevelopment) {
            console.error("[StreamDebug] Error getting auth token:", error);
          } else {
            console.log('[StreamDebug] Error getting token but in development mode, continuing');
          }
        }
        
        // Make authenticated request
        const response = await fetch(endpoint, {
          headers,
          credentials: "include"
        });
        
        console.log(`Stream response status: ${response.status} for gameId: ${gameId}`);
        
        if (!response.ok) {
          console.log(`Stream fetch failed with status: ${response.status} for gameId: ${gameId}`);
          
          if (response.status === 401) {
            // For auth errors, create a custom error to notify user they need to log in
            const error: any = new Error("Please log in to view this stream");
            error.status = 401;
            error.authRequired = true;
            throw error;
          }
          
          if (response.status === 403) {
            // For subscription required errors
            const error: any = new Error("Subscription required to view this stream");
            error.status = 403;
            error.subscriptionRequired = true;
            throw error;
          }
          
          if (response.status === 404) {
            // For 404 errors, create a custom error object that the UI can use
            // to display a "stream not available" message
            const error: any = new Error(`No stream available for game ID: ${gameId}`);
            error.status = 404;
            error.gameId = gameId;
            throw error;
          }
          
          throw new Error(`Failed to fetch stream for gameId ${gameId}: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Stream data fetched successfully for gameId ${gameId}:`, data);
        
        // Ensure all expected properties are available in the response
        return {
          streamUrl: data.streamUrl,
          hasAwayFeed: !!data.hasAwayFeed,
          hasHomeFeed: data.hasHomeFeed !== false, // Default to true if not specified
          currentFeed: data.currentFeed || feedType,
          awayStreamUrl: data.awayStreamUrl
        };
      } catch (error) {
        console.error(`Error in useGameStream for gameId ${gameId}:`, error);
        throw error;
      }
    }
  });
}