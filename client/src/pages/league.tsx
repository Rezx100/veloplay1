import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useLeagueGames, getCurrentDateInET } from "@/hooks/useGames";
import GameCard from "@/components/games/GameCard";
import GameCarousel from "@/components/games/GameCarousel";
import LiveGamesGrid from "@/components/games/LiveGamesGrid";
import DatePicker from "@/components/games/DatePicker";
import { Game } from "@shared/schema";
import { startOfDay, isSameDay } from "date-fns";

export default function League({ params }: { params: { leagueId: string } }) {
  const { leagueId } = params;
  
  // Use current date in Eastern Time (ET)
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentDateInET());
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);

  // Format league name for display
  const leagueName = leagueId.toUpperCase();
  
  // Use the updated useLeagueGames hook that accepts a date parameter
  // Adding the includeTomorrow parameter for better control
  const { 
    games, 
    liveGames, 
    warmupGames,
    delayedGames,
    postponedGames,
    upcomingGames,
    completedGames,
    activeGames,
    orderedGames,
    isLoading 
  } = useLeagueGames(leagueId, selectedDate, true);
  
  // Combine live, warmup and delayed games for the "Live & Active Games" section
  const allActiveGames = useMemo(() => {
    return [...liveGames, ...warmupGames, ...delayedGames].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [liveGames, warmupGames, delayedGames]);
  
  // No need to filter by date anymore since the API handles it
  useEffect(() => {
    // Since we're getting games for the selected date directly from the API,
    // we can just set filteredGames to be all games
    setFilteredGames(games);
    
    console.log(`Got ${games.length} games for ${leagueId} on selected date:`, selectedDate.toISOString());
  }, [games]); // Only depend on games to avoid infinite loop

  // Define league icons and colors

  const leagueIcon = {
    nba: 'basketball-ball',
    nfl: 'football-ball',
    nhl: 'hockey-puck',
    mlb: 'baseball-ball'
  }[leagueId] || 'basketball-ball';

  const leagueBackgroundColor = {
    nba: '#C9082A',
    nfl: '#013369',
    nhl: '#0033A0',
    mlb: '#002D72'
  }[leagueId] || '#1a1a1a';

  return (
    <>
      <Helmet>
        <title>{leagueName} Games - VeloPlay</title>
        <meta name="description" content={`Watch live ${leagueName} games online with VeloPlay. Stream all ${leagueName} games in HD quality on any device.`} />
      </Helmet>

      <div className="container mx-auto p-4 lg:p-6">
        {/* League Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div 
              className="w-16 h-16 mr-4 overflow-hidden" 
            >
              {leagueId === 'nba' && (
                <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png" alt="NBA Logo" className="w-full h-full object-contain" />
              )}
              {leagueId === 'nfl' && (
                <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png" alt="NFL Logo" className="w-full h-full object-contain" />
              )}
              {leagueId === 'mlb' && (
                <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mlb.png" alt="MLB Logo" className="w-full h-full object-contain" />
              )}
              {leagueId === 'nhl' && (
                <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nhl.png" alt="NHL Logo" className="w-full h-full object-contain" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{leagueName} Games</h1>
              <p className="text-gray-400">Catch all {leagueName} games as they happen, live and uninterrupted</p>
            </div>
          </div>
        </div>

        {/* Live & Active Games Section - Using LiveGamesGrid */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold flex items-center mb-4">
            <span className="inline-flex items-center px-2 py-1 rounded bg-primary text-white text-xs font-bold mr-2">
              <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span> LIVE
            </span>
            <span>Live & Active {leagueName} Games</span>
          </h2>
          
          {/* Live Games Display with loading state - Using LiveGamesGrid for infinite display */}
          <LiveGamesGrid 
            games={allActiveGames} 
            title="" 
            emptyMessage={`No Live Games - Check back soon for live ${leagueName} games`}
            emptyIcon="broadcast-tower"
            isLoading={isLoading} 
          />
        </div>

        {/* Delayed Games Section - Show if any delayed games exist */}
        {delayedGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold flex items-center mb-4">
              <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-600 text-white text-xs font-bold mr-2">
                <i className="fas fa-clock text-xs mr-1"></i> DELAYED
              </span>
              <span>Delayed {leagueName} Games</span>
            </h2>
            
            <LiveGamesGrid 
              games={delayedGames} 
              title="" 
              emptyMessage={`No Delayed Games`}
              emptyIcon="clock"
              isLoading={isLoading} 
            />
          </div>
        )}

        {/* Postponed Games Section - Show if any postponed games exist */}
        {postponedGames.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold flex items-center mb-4">
              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-600 text-white text-xs font-bold mr-2">
                <i className="fas fa-ban text-xs mr-1"></i> POSTPONED
              </span>
              <span>Postponed {leagueName} Games</span>
            </h2>
            
            <LiveGamesGrid 
              games={postponedGames} 
              title="" 
              emptyMessage={`No Postponed Games`}
              emptyIcon="ban"
              isLoading={isLoading} 
            />
          </div>
        )}

        {/* Upcoming Games Section - Using GameCarousel with loading state */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold flex items-center mb-4">
            <span className="inline-flex items-center px-2 py-1 rounded bg-purple-800 text-white text-xs font-bold mr-2">
              <i className="fas fa-calendar-day text-xs mr-1"></i> UPCOMING
            </span>
            <span>Upcoming {leagueName} Games</span>
          </h2>
          
          <GameCarousel 
            games={upcomingGames} 
            title="" 
            emptyMessage={games.length > 0 ? `No Upcoming ${leagueName} Games Today - Check Back Tomorrow` : `No Upcoming ${leagueName} Games Scheduled`}
            emptyIcon="calendar-day"
            isLoading={isLoading}
            showUnlimited={false} // Limit to 4 games on league pages
          />
        </div>

        {/* Completed Games Section - Using GameCarousel with loading state */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold flex items-center mb-4">
            <span className="inline-flex items-center px-2 py-1 rounded bg-gray-700 text-white text-xs font-bold mr-2">
              <i className="fas fa-flag-checkered text-xs mr-1"></i> COMPLETED
            </span>
            <span>Completed {leagueName} Games</span>
          </h2>
          
          <GameCarousel 
            games={completedGames} 
            title="" 
            emptyMessage={`No Completed ${leagueName} Games Available`}
            emptyIcon="flag-checkered"
            isLoading={isLoading}
            showUnlimited={false} // Limit to 4 games on league pages
          />
        </div>
      </div>
    </>
  );
}
