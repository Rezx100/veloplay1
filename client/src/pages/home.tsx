import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useAllGames, getCurrentDateInET } from "@/hooks/useGames";
import GameCard from "@/components/games/GameCard";
import GameCarousel from "@/components/games/GameCarousel";
import LiveGamesGrid from "@/components/games/LiveGamesGrid";
import DatePicker from "@/components/games/DatePicker";
import LeagueFilter from "@/components/games/LeagueFilter";
import NetworkChannelGrid from "@/components/channels/NetworkChannelGrid";
import { Game, SubscriptionPlan } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import PricingPlans from "@/components/subscription/PricingPlans";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkChannels } from "@/hooks/useNetworkChannels";

type League = 'all' | 'nhl' | 'nba' | 'nfl' | 'mlb';

export default function Home() {
  // Use current date in Eastern Time (ET)
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentDateInET());
  const [selectedLeague, setSelectedLeague] = useState<League>('all');
  const [featuredGame, setFeaturedGame] = useState<Game | null>(null);
  
  // Get authentication state
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Check if user has an active subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription'],
    enabled: isAuthenticated, // Only fetch if user is authenticated
  });
  
  // Function to check if subscription is active
  const hasActiveSubscription = () => {
    if (!subscription) return false;
    
    // Check if subscription exists, is active, and has an end date in the future
    return Boolean(subscription && 
           subscription.isActive && 
           new Date(subscription.endDate) > new Date());
  };

  // Get subscription plans
  const { 
    data: plans = [] as SubscriptionPlan[], 
    isLoading: plansLoading 
  } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });
  
  // Use the updated useAllGames hook with includeTomorrow parameter set to true
  // This ensures we get both today's and tomorrow's games
  const { 
    games,
    liveGames, 
    warmupGames,
    delayedGames,
    postponedGames,
    upcomingGames,
    orderedGames,
    activeGames,
    isLoading 
  } = useAllGames(selectedDate, true);
  
  // No longer need the completed games hook
  
  // Set a featured game (first live game, first warmup game, or first upcoming game if none available)
  useEffect(() => {
    if (liveGames && liveGames.length > 0) {
      setFeaturedGame(liveGames[0]);
    } else if (warmupGames && warmupGames.length > 0) {
      setFeaturedGame(warmupGames[0]);
    } else if (upcomingGames && upcomingGames.length > 0) {
      setFeaturedGame(upcomingGames[0]);
    }
  }, [liveGames, warmupGames, upcomingGames]);

  // Log date filtering parameters for debugging
  console.log("Date filtering parameters:", {
    selectedDate: selectedDate.toISOString(),
    includeTomorrow: true, // We're now including tomorrow's games
    selectedLeague,
    totalGames: upcomingGames.length
  });

  // Combine live, warmup and delayed games for the "Live & Active Games" section
  const allActiveGames = useMemo(() => {
    return [...liveGames, ...warmupGames, ...delayedGames].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [liveGames, warmupGames, delayedGames]);

  // Now we only need to filter by league since date filtering is done at the API level
  // Filter upcoming games by selected league
  const filteredUpcomingGames = upcomingGames.filter(game => {
    // Filter by league only since date is already filtered by the API
    if (selectedLeague !== 'all' && game.league !== selectedLeague) {
      return false;
    }
    return true;
  });
  
  // No longer need to filter completed games

  // No longer need completed games logic since the section has been removed

  return (
    <>
      <Helmet>
        <title>VeloPlay - Live Sports Streaming</title>
        <meta name="description" content="Watch live sports from NFL, NBA, NHL, and MLB in HD quality. Stream games online with VeloPlay - your premium sports streaming platform." />
      </Helmet>

      <div className="container mx-auto p-4 lg:p-6">
        {/* Modern Hero Section - Only shown for non-authenticated users */}
        {!isAuthenticated && !authLoading && (
          <div className="mb-12 relative overflow-hidden rounded-2xl">
            {/* Simpler dark background with subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d021f] to-[#1a0533] z-10"></div>
            
            {/* Subtle grid pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{ 
              backgroundImage: `linear-gradient(#7f00ff 1px, transparent 1px), linear-gradient(to right, #7f00ff 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}></div>
            
            {/* Subtle purple glow effect */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#7f00ff]/20 rounded-full filter blur-[100px] opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#9b30ff]/20 rounded-full filter blur-[100px] opacity-50"></div>
            
            {/* Content */}
            <div className="relative z-20 py-16 px-6 md:py-24 md:px-12 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-[#f2f2f2] tracking-tight">
                    Live Sports <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7f00ff] via-[#9b30ff] to-[#a68dff]">
                      Streaming Experience
                    </span>
                  </h1>
                  <p className="text-lg text-[#e0e0e0] mb-8 max-w-md">
                    Watch live games from NFL, NBA, NHL, and MLB with premium streaming quality and real-time updates.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    <Link href="#upcoming-games">
                      <a className="bg-[#7f00ff] hover:bg-[#6a00d9] transition-all shadow-md hover:shadow-[#7f00ff]/20 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                        <i className="fas fa-play mr-1"></i> Browse Games
                      </a>
                    </Link>
                    <Link href="/pricing">
                      <a className="bg-transparent hover:bg-[#7f00ff]/10 border border-[#7f00ff] hover:border-[#9b30ff] transition-all text-[#e0e0e0] px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                        <i className="fas fa-tag mr-1"></i> View Plans
                      </a>
                    </Link>
                  </div>
                  
                  {/* Features */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-10">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check text-[#a68dff]"></i>
                      <span className="text-[#e0e0e0] text-sm">HD Quality</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check text-[#a68dff]"></i>
                      <span className="text-[#e0e0e0] text-sm">No Ads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check text-[#a68dff]"></i>
                      <span className="text-[#e0e0e0] text-sm">Multi-device</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check text-[#a68dff]"></i>
                      <span className="text-[#e0e0e0] text-sm">Live Stats</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check text-[#a68dff]"></i>
                      <span className="text-[#e0e0e0] text-sm">Chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-check text-[#a68dff]"></i>
                      <span className="text-[#e0e0e0] text-sm">Game Alerts</span>
                    </div>
                  </div>
                </div>
                
                {/* Visual Element - League Logos */}
                <div className="hidden md:block relative">
                  <div className="relative bg-[#0d021f]/80 p-8 rounded-2xl border border-[#2f1a48] shadow-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col items-center justify-center p-4 bg-[#1a0533]/50 rounded-lg hover:bg-[#7f00ff]/10 transition-colors">
                        <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png" alt="NBA" className="w-16 h-16 object-contain" />
                        <span className="mt-2 text-[#e0e0e0] font-semibold">NBA</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-[#1a0533]/50 rounded-lg hover:bg-[#7f00ff]/10 transition-colors">
                        <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png" alt="NFL" className="w-16 h-16 object-contain" />
                        <span className="mt-2 text-[#e0e0e0] font-semibold">NFL</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-[#1a0533]/50 rounded-lg hover:bg-[#7f00ff]/10 transition-colors">
                        <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nhl.png" alt="NHL" className="w-16 h-16 object-contain" />
                        <span className="mt-2 text-[#e0e0e0] font-semibold">NHL</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-[#1a0533]/50 rounded-lg hover:bg-[#7f00ff]/10 transition-colors">
                        <img src="https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mlb.png" alt="MLB" className="w-16 h-16 object-contain" />
                        <span className="mt-2 text-[#e0e0e0] font-semibold">MLB</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <span className="inline-block py-1 px-3 bg-[#7f00ff]/20 text-[#a68dff] rounded-full text-sm">
                        <i className="fas fa-satellite-dish mr-1"></i> All Major Leagues
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats Counters */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0d021f]/80 p-4 rounded-lg text-center border border-[#2f1a48]">
                  <div className="text-3xl font-bold text-[#7f00ff]">100+</div>
                  <div className="text-xs text-[#e0e0e0] uppercase tracking-wider mt-1">Games Weekly</div>
                </div>
                <div className="bg-[#0d021f]/80 p-4 rounded-lg text-center border border-[#2f1a48]">
                  <div className="text-3xl font-bold text-[#7f00ff]">HD</div>
                  <div className="text-xs text-[#e0e0e0] uppercase tracking-wider mt-1">Streaming Quality</div>
                </div>
                <div className="bg-[#0d021f]/80 p-4 rounded-lg text-center border border-[#2f1a48]">
                  <div className="text-3xl font-bold text-[#7f00ff]">4K</div>
                  <div className="text-xs text-[#e0e0e0] uppercase tracking-wider mt-1">Premium Tier</div>
                </div>
                <div className="bg-[#0d021f]/80 p-4 rounded-lg text-center border border-[#2f1a48]">
                  <div className="text-3xl font-bold text-[#7f00ff]">24/7</div>
                  <div className="text-xs text-[#e0e0e0] uppercase tracking-wider mt-1">Customer Support</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live & Active Games Section - Using LiveGamesGrid for infinite display */}
        <LiveGamesGrid 
          games={allActiveGames} 
          title="Live & Active Games" 
          emptyMessage="No Live Games Right Now" 
          emptyIcon="broadcast-tower"
          isLoading={isLoading}
        />

        {/* Delayed Games Section - Show if any delayed games exist */}
        {delayedGames.length > 0 && (
          <LiveGamesGrid 
            games={delayedGames} 
            title="Delayed Games" 
            emptyMessage="No Delayed Games" 
            emptyIcon="clock"
            isLoading={isLoading}
          />
        )}

        {/* Postponed Games Section - Show if any postponed games exist */}
        {postponedGames.length > 0 && (
          <LiveGamesGrid 
            games={postponedGames} 
            title="Postponed Games" 
            emptyMessage="No Postponed Games" 
            emptyIcon="ban"
            isLoading={isLoading}
          />
        )}

        {/* Live TV Networks Section - Added for 24/7 network channels */}
        <div className="mb-8">
          <NetworkChannelGrid 
            channels={useNetworkChannels().channels.slice(0, 5)} 
            title="Live TV Networks" 
            showViewAll={true}
            isLoading={useNetworkChannels().isLoading}
          />
        </div>

        {/* Upcoming Games Section */}
        <div id="upcoming-games" className="pt-4 scroll-mt-16">
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold">
              Upcoming Games
            </h2>
            
            {/* Game Filter Pills */}
            <div className="mt-4">
              <LeagueFilter 
                selectedLeague={selectedLeague} 
                onLeagueSelect={setSelectedLeague} 
              />
            </div>
          </div>

          {/* Upcoming Games - Using GameCarousel with loading state */}
          {/* Show unlimited games on the homepage */}
          <GameCarousel 
            games={filteredUpcomingGames} 
            title="" 
            emptyMessage={games.length > 0 ? "No Upcoming Games Today - Check Back Tomorrow" : "No Upcoming Games Available"}
            emptyIcon="calendar-day"
            isLoading={isLoading}
            showUnlimited={true} // Show unlimited games on homepage
          />
          
          {/* Removed "View More Games" link since we're now showing all games */}
        </div>




      </div>
    </>
  );
}