import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useGame, useAllGames } from "@/hooks/useGames";
import { useLocalTime } from "@/hooks/useLocalTime";
import { useAuth } from "@/hooks/useAuth";
// Subscription status now checked at server level
import { useLocation, useRoute } from "wouter";
import VideoPlayerModern from "@/components/games/VideoPlayerModern";
import GameCard from "@/components/games/GameCard";
import GameCarousel from "@/components/games/GameCarousel";
import GameRecap from "@/components/games/GameRecap";
import GameAlertButton from "@/components/games/GameAlertButton";
import { Game } from "@shared/schema";
import VideoPlayerSkeleton from "@/components/games/VideoPlayerSkeleton";
import GameDetailsSkeleton from "@/components/games/GameDetailsSkeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Lock } from "lucide-react";

interface GameQueryResult {
  data: Game;
  isLoading: boolean;
  error: Error | null;
}

export default function GamePage() {
  // Use wouter's useRoute hook to get the gameId parameter directly from the URL
  const [, params] = useRoute('/game/:gameId');
  const gameId = params?.gameId;
  console.log("Game page loaded with gameId:", gameId);
  
  // Get authentication and email verification status
  const { isAuthenticated, isEmailVerified, user } = useAuth();
  const [, setLocation] = useLocation();
  
  // No need for subscription status hook anymore since it's handled server-side
  // Just a simple verification check state
  const [verificationCheckComplete, setVerificationCheckComplete] = useState(true);
  
  // Add effect specifically for delaying verification message
  useEffect(() => {
    // Only start the timer if authenticated but not verified
    if (isAuthenticated && !isEmailVerified) {
      // Set a longer delay to ensure video player loads completely first
      const timer = setTimeout(() => {
        setVerificationCheckComplete(true);
      }, 3000); // 3 second delay to prevent flashing
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isEmailVerified]);
  
  // Use a type assertion to ensure TypeScript knows game is a Game when it's available
  const { data: game, isLoading, error } = useGame(gameId) as unknown as GameQueryResult;
  
  // For similar games, use the API data
  const { games: apiGames } = useAllGames();
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<Game[]>([]);
  
  // When a user is on a game page, handle email verification and URL saving
  useEffect(() => {
    // We'll handle verification check in a different way - no need for setTimeout here
    // This eliminates the timing glitch completely
    
    if (gameId) {
      const currentUrl = window.location.pathname + window.location.search;
      const urlParams = new URLSearchParams(window.location.search);
      const verificationParam = urlParams.get('verification');
      
      // Check URL for verification success flag first (highest priority)
      if (verificationParam === 'success' && isAuthenticated) {
        // Set verification status in localStorage
        localStorage.setItem('email_verified', 'true');
        console.log('✅ Verification success detected in game page URL, marking email as verified');
        
        // Clean up the URL parameters to avoid confusion
        if (window.history && window.history.replaceState) {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          
          // Force reload to apply the verification change
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return;
        }
      }
      
      // If verification was not in URL but user is still not verified, save current URL for later redirect
      if (isAuthenticated && !isEmailVerified) {
        localStorage.setItem('gameUrlBeforeVerification', currentUrl);
        console.log('Game URL saved for post-verification redirect:', currentUrl);
      }
    }
  }, [gameId, isAuthenticated, isEmailVerified]);
  
  console.log("Game data loaded:", game);
  
  const formattedGameTime = useLocalTime(game?.date || '');

  // Find similar games (same league, excluding current game)
  useEffect(() => {
    if (game && apiGames && apiGames.length > 0) {
      const league = game.league;
      
      // Filter games by league and exclude current game
      const sameLeagueGames = apiGames
        .filter(g => g.league === league && g.id !== game.id);
      
      // Separate into live and completed games
      const liveSimilarGames = sameLeagueGames
        .filter(g => g.state === 'in' || g.state === 'pre')
        .slice(0, 8); // Show up to 8 live games
      
      const completedSimilarGames = sameLeagueGames
        .filter(g => g.state === 'post')
        .slice(0, 8); // Show up to 8 completed games
      
      setLiveGames(liveSimilarGames);
      setCompletedGames(completedSimilarGames);
    }
  }, [game, apiGames]);

  // Get status text
  const getStatusText = () => {
    if (!game) return '';
    
    if (game.state === 'in') {
      return `LIVE: ${game.status?.detail || `${game.status?.period || '1'} Period`}`;
    } else if (game.state === 'pre') {
      return `Scheduled: ${formattedGameTime || 'TBD'}`;
    } else {
      return 'FINAL';
    }
  };

  // No need for any delay logic now as we don't show subscription UI anymore
  // Just show the content directly - user is already authenticated at this point
  
  // Show loading state while game data is loading
  // Skip all authentication checks in the UI since they're handled at API level
  
  // Always show content without checking auth on the frontend
  // The API endpoints will handle access control for us
  const shouldShowContent = true;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        {/* Video player skeleton */}
        <div className="mb-8">
          <VideoPlayerSkeleton />
        </div>
        
        {/* Game details skeleton */}
        <div className="mb-8">
          <GameDetailsSkeleton />
        </div>
        
        {/* About this game section skeleton */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            <div className="h-7 w-48 bg-slate-800 rounded animate-pulse"></div>
          </h2>
          <div className="bg-[#0d021f] rounded-lg p-4 border border-[#2f1a48]">
            <div className="h-4 w-full bg-slate-800 rounded animate-pulse mb-3"></div>
            <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse mb-3"></div>
            <div className="h-4 w-5/6 bg-slate-800 rounded animate-pulse mb-6"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#0d021f] p-3 rounded border border-[#2f1a48]">
                  <div className="h-3 w-20 mx-auto bg-slate-800 rounded animate-pulse mb-3"></div>
                  <div className="h-5 w-24 mx-auto bg-slate-800 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authentication check is now completely removed from the UI
  // All access control is handled on the server side
  // This code will never execute since shouldShowContent is always true
  // But we'll keep it as a fallback just in case
  if (!shouldShowContent && !isAuthenticated) {
    console.log("This should never execute with the current implementation");
    // Redirect to login page directly instead of showing UI message
    setLocation('/login');
    return null;
  }

  // Show error state only after we've given enough time to look for the game in all caches
  // and a specific error has occurred that's not a network error
  if (!isLoading && !game && error && error.message !== "Network Error") {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="text-center py-12">
          <i className="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
          <h1 className="text-2xl font-bold mb-2">Game Not Found</h1>
          <p className="text-gray-400">The requested game ID ({gameId}) could not be found.</p>
          <p className="text-gray-500 mt-4">Please select another game from the homepage.</p>
        </div>
      </div>
    );
  }
  
  // Show loading state while we're fetching data
  if (isLoading && !game) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7f00ff] mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Loading Game</h1>
          <p className="text-gray-400">Getting information for game ID {gameId}...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${game?.homeTeam?.name || 'Home Team'} vs ${game?.awayTeam?.name || 'Away Team'} - VeloPlay`}</title>
        <meta name="description" content={`Watch ${game?.homeTeam?.name || 'Home Team'} vs ${game?.awayTeam?.name || 'Away Team'} game live on VeloPlay. Stream ${game?.league?.toUpperCase() || 'SPORTS'} games in HD quality.`} />
      </Helmet>

      <div className="container mx-auto p-4 lg:p-6">
        {/* Game content rendering with proper video player priority */}
        {game?.state === 'post' ? (
          // Game Recap for ended games
          <GameRecap game={game} />
        ) : (
          // Always show a single video player, regardless of verification status
          <div className="bg-[#0d021f] rounded-xl overflow-hidden mb-8 border border-[#2f1a48]">
            <VideoPlayerModern game={game} />
          </div>
        )}
        
        {/* Separate verification message that appears after player loads */}
        {isAuthenticated && !isEmailVerified && verificationCheckComplete && game?.state !== 'post' && (
          <div className="bg-[#0d021f] rounded-xl overflow-hidden mb-8 border border-[#7f00ff]/30">
            <div className="w-full py-16 bg-gradient-to-br from-[#0d021f] to-black/90 flex items-center justify-center">
              <div className="text-center p-8 max-w-3xl">
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-[#7f00ff]/20 rounded-full animate-pulse duration-1000"></div>
                  <div className="relative bg-[#7f00ff]/10 rounded-full p-5">
                    <Mail className="h-14 w-14 text-[#7f00ff]" />
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Email Verification Required</h2>
                
                <p className="text-gray-300 mb-6 max-w-lg mx-auto">
                  To ensure the security of your account and access to premium content, 
                  we require all users to verify their email address before watching streams.
                </p>
                
                <div className="bg-[#1a103a] p-4 rounded-lg mb-6 max-w-md mx-auto">
                  <div className="flex items-start">
                    <div className="mr-3 mt-1 flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-200/90">
                        Please check your inbox for a verification email from <span className="font-medium">noreply@veloplay.tv</span>. 
                        If you don't see it, check your spam folder.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="lg"
                  className="bg-[#7f00ff] hover:bg-[#9332ff] text-white font-medium px-10 py-6 h-auto"
                  onClick={() => setLocation('/login?verification=required')}
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Go to Verification
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Game Title (simplified without redundant status info) */}
        <div className="mb-4">
          {/* League indicator pill - only show if not in post-game state to avoid duplication */}
          {game && game.state !== 'post' && (
            <div className="flex mb-2">
              <span className={`league-indicator ${game.league || 'sports'} px-2 py-1 rounded text-xs font-bold`}>
                {game.league?.toUpperCase() || 'SPORTS'}
              </span>
            </div>
          )}
          
          {/* Game title - more responsive */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
            {game?.homeTeam?.name || 'Home Team'} vs {game?.awayTeam?.name || 'Away Team'}
          </h1>
          
          {/* Only venue info, removed redundant status text */}
          <div className="mt-2 text-gray-400 text-sm sm:text-base">
            <div>{game?.venue?.name !== 'TBD' ? game?.venue?.name : 'Venue'}, {game?.venue?.city !== 'TBD' ? game?.venue?.city : 'To Be Announced'}</div>
          </div>
        </div>
        
        {/* Game Details - Clean and Minimalist Design */}
        {game && game.state !== 'post' && (
          <div className="mb-8">
            <div className="p-4 bg-[#0d021f] rounded-lg border border-[#2f1a48]">
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex items-center">
                  <img 
                    src={game.homeTeam.logo || `https://ui-avatars.com/api/?name=${game.homeTeam.abbreviation || 'HOME'}&size=64&background=1a1a1a&color=fff`} 
                    alt={`${game.homeTeam.name || 'Home Team'} logo`} 
                    className="w-12 h-12 md:w-16 md:h-16 object-contain"
                  />
                  <div className="ml-3">
                    <div className="font-semibold">
                      <span className="hidden md:inline">{game.homeTeam.name || 'Home Team'}</span>
                      <span className="inline md:hidden">{game.homeTeam.abbreviation || 'HOME'}</span>
                    </div>
                    <div className="text-3xl font-bold mt-1 text-[#7f00ff]">
                      {typeof game.homeTeam.score === 'number' ? game.homeTeam.score : '0'}
                    </div>
                  </div>
                </div>
                
                {/* Center Status */}
                <div className="flex flex-col items-center mx-4">
                  {game.state === 'in' && (
                    <div className="mb-1 bg-[#7f00ff] text-white text-xs px-2 py-0.5 rounded-sm uppercase font-semibold">
                      Live
                    </div>
                  )}
                  <div className="text-sm text-[#a68dff]">
                    {game.league === 'mlb' ? `Inning ${game.status.period}` : 
                     game.league === 'nba' ? `Q${game.status.period}` : 
                     game.league === 'nhl' ? `P${game.status.period}` : 
                     game.league === 'nfl' ? `Q${game.status.period}` : 
                     `Period ${game.status.period}`}
                    {game.status.clock && ` · ${game.status.clock}`}
                  </div>
                </div>
                
                {/* Away Team */}
                <div className="flex items-center">
                  <div className="mr-3 text-right">
                    <div className="font-semibold">
                      <span className="hidden md:inline">{game.awayTeam.name || 'Away Team'}</span>
                      <span className="inline md:hidden">{game.awayTeam.abbreviation || 'AWAY'}</span>
                    </div>
                    <div className="text-3xl font-bold mt-1 text-[#7f00ff]">
                      {typeof game.awayTeam.score === 'number' ? game.awayTeam.score : '0'}
                    </div>
                  </div>
                  <img 
                    src={game.awayTeam.logo || `https://ui-avatars.com/api/?name=${game.awayTeam.abbreviation || 'AWAY'}&size=64&background=1a1a1a&color=fff`}
                    alt={`${game.awayTeam.name || 'Away Team'} logo`}
                    className="w-12 h-12 md:w-16 md:h-16 object-contain" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Game Description */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">About This Game</h2>
          <div className="bg-[#0d021f] rounded-lg p-4 border border-[#2f1a48]">
            <p className="mb-4">
              Watch the {game.league.toUpperCase() || 'SPORTS'} matchup between {game.homeTeam.name || 'Home Team'} and {game.awayTeam.name || 'Away Team'} live 
              from {game.venue?.name || 'Venue'} in {game.venue?.city || 'City'}.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="bg-[#0d021f] p-3 rounded border border-[#2f1a48]">
                <div className="text-[#a68dff] text-sm mb-1">Date & Time</div>
                <div className="font-medium text-[#f2f2f2]">{formattedGameTime || 'TBD'}</div>
              </div>
              <div className="bg-[#0d021f] p-3 rounded border border-[#2f1a48]">
                <div className="text-[#a68dff] text-sm mb-1">Venue</div>
                <div className="font-medium text-[#f2f2f2]">{game.venue?.name || 'TBD'}</div>
              </div>
              <div className="bg-[#0d021f] p-3 rounded border border-[#2f1a48]">
                <div className="text-[#a68dff] text-sm mb-1">League</div>
                <div className="font-medium text-[#f2f2f2]">{game.league.toUpperCase() || 'SPORTS'}</div>
              </div>
              <div className="bg-[#0d021f] p-3 rounded border border-[#2f1a48]">
                <div className="text-[#a68dff] text-sm mb-1">City</div>
                <div className="font-medium text-[#f2f2f2]">{game.venue?.city || 'TBD'}</div>
              </div>
            </div>

          </div>
        </div>
        
        {/* Upcoming Games Section */}
        <div className="mb-8">
          <GameCarousel 
            games={liveGames} 
            title={`Upcoming ${game?.league?.toUpperCase() || 'SPORTS'} Games`}
            emptyMessage={`No Upcoming ${game?.league?.toUpperCase() || 'SPORTS'} Games Available`}
            emptyIcon="calendar-day"
            isLoading={!game}
            showUnlimited={false} // Limit to 4 games on game detail page
          />
        </div>
        
        {/* Completed Games Section */}
        <div className="mb-8">
          <GameCarousel 
            games={completedGames} 
            title={`Completed ${game?.league?.toUpperCase() || 'SPORTS'} Games`}
            emptyMessage={`No Completed ${game?.league?.toUpperCase() || 'SPORTS'} Games Available`}
            emptyIcon="flag-checkered"
            isLoading={!game}
            showUnlimited={false} // Limit to 4 games on game detail page
          />
        </div>
      </div>
    </>
  );
}
