import { useState, useEffect } from "react";
import { Game } from "@shared/schema";
import { Clock, MapPin, Tv, Bell, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SiNhl, SiNba, SiMlb } from 'react-icons/si';
import { IoAmericanFootballOutline } from 'react-icons/io5';

interface PreGameTemplateProps {
  game: Game;
  onStreamStart: () => void;
}

export function PreGameTemplate({ game, onStreamStart }: PreGameTemplateProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isWarmupTime, setIsWarmupTime] = useState(false);
  const [hasAlert, setHasAlert] = useState<boolean>(false);
  const { toast } = useToast();

  // Check for existing alert when component mounts using direct Supabase
  useEffect(() => {
    const checkExistingAlert = async () => {
      try {
        // Direct Supabase call for faster checking
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!
        );

        // Get current user from auth context (you may need to adjust this)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('game_alerts')
            .select('id')
            .eq('user_id', user.id)
            .eq('game_id', game.id)
            .maybeSingle();

          console.log('🎯 Alert check result for game', game.id, ':', !!data);
          setHasAlert(!!data);
        } else {
          setHasAlert(false);
        }
      } catch (error) {
        console.error('Error checking existing alert:', error);
        setHasAlert(false);
      }
    };

    // Small delay to ensure auth is ready
    const timeoutId = setTimeout(checkExistingAlert, 100);
    return () => clearTimeout(timeoutId);
  }, [game.id]);

  // Calculate minutes until game starts to prevent impossible alerts
  const getMinutesUntilGame = () => {
    const now = new Date();
    const gameTime = new Date(game.date);
    const timeDifference = gameTime.getTime() - now.getTime();
    return Math.floor(timeDifference / (1000 * 60));
  };

  // Get available alert options that are actually possible
  const getAvailableAlertOptions = () => {
    const minutesUntilGame = getMinutesUntilGame();
    const options = [
      { value: 5, label: '5 minutes before' },
      { value: 10, label: '10 minutes before' },
      { value: 15, label: '15 minutes before' },
      { value: 30, label: '30 minutes before' },
      { value: 60, label: '1 hour before' },
      { value: 120, label: '2 hours before' },
      { value: 1440, label: '1 day before' },
    ];

    // Only return options where there's enough time remaining
    return options.filter(option => option.value < minutesUntilGame);
  };

  const handleSetAlert = async (minutesBefore: number) => {
    // Validate that the alert time is possible
    const minutesUntilGame = getMinutesUntilGame();
    if (minutesBefore >= minutesUntilGame) {
      toast({
        title: 'Invalid Alert Time',
        description: `Game starts in ${minutesUntilGame} minutes. Cannot set alert for ${minutesBefore} minutes before.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await apiRequest('POST', '/api/game-alerts-temp', {
        gameId: game.id,
        notifyMinutesBefore: minutesBefore
      });

      setHasAlert(true);
      // Toast notification disabled per user request
      // toast({
      //   title: 'Game Alert Set',
      //   description: `You'll be notified ${minutesBefore} minutes before ${game.name} starts`,
      //   variant: 'default',
      // });
    } catch (error) {
      console.error('Error setting game alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to set game alert. Please try again.',
        variant: 'destructive',
      });
    }
  };

  
  // Generate stadium background image based on league
  const getStadiumBackground = (league: string) => {
    const stadiumImages = {
      'mlb': 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&h=800&fit=crop',
      'nfl': 'https://images.unsplash.com/photo-1577223625816-7546f74bb7d1?w=1200&h=800&fit=crop',
      'nba': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=800&fit=crop',
      'nhl': 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=1200&h=800&fit=crop'
    };
    return stadiumImages[league as keyof typeof stadiumImages] || stadiumImages.mlb;
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const gameTime = new Date(game.date);
      const timeDiff = gameTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeRemaining("Game Time!");
        setIsWarmupTime(true);
        return;
      }
      
      // Check if we're within 30 minutes of game time (warmup period)
      const minutesUntilGame = Math.floor(timeDiff / (1000 * 60));
      setIsWarmupTime(minutesUntilGame <= 30);
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [game.date]);

  const getLeagueIcon = () => {
    const iconClass = "w-6 h-6 text-white";
    switch (game.league) {
      case 'nfl':
        return <IoAmericanFootballOutline className={iconClass} />;
      case 'nba':
        return <SiNba className={iconClass} />;
      case 'nhl':
        return <SiNhl className={iconClass} />;
      case 'mlb':
        return <SiMlb className={iconClass} />;
      default:
        return <SiMlb className={iconClass} />;
    }
  };

  const formatGameTime = () => {
    const gameDate = new Date(game.date);
    return gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };



  const nationalBroadcasts = game.broadcasts?.filter(b => b.isNational) || [];
  const regionalBroadcasts = game.broadcasts?.filter(b => !b.isNational) || [];

  return (
    <div className="rounded-lg overflow-hidden shadow-2xl relative min-h-[500px] sm:min-h-[600px] lg:aspect-video border border-purple-800/30">
      {/* Blurred Stadium Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${getStadiumBackground(game.league)})`,
          filter: 'blur(8px)',
          transform: 'scale(1.1)'
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Top Header with League Badge and Alert Button */}
        <div className="flex justify-between items-start p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2">
            {getLeagueIcon()}
            <Badge className={`text-white font-bold px-2 sm:px-3 py-1 text-xs sm:text-sm border-0 ${
              game.league === 'nhl' ? 'bg-[#041E42]' :
              game.league === 'nba' ? 'bg-[#C8102E]' :
              game.league === 'mlb' ? 'bg-[#132448]' :
              game.league === 'nfl' ? 'bg-[#013369]' :
              'bg-purple-600'
            }`}>
              {game.league.toUpperCase()}
            </Badge>
          </div>
          
          {/* Set Alert Button - Mobile Optimized */}
          <div className="flex-shrink-0">
            {hasAlert ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-green-400/20 border-green-400/50 text-green-300 hover:bg-green-400/30 backdrop-blur-sm transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3"
                disabled
              >
                <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 fill-current animate-bell-ring" />
                <span className="hidden sm:inline">Alert Set</span>
                <span className="sm:hidden">Set</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/40 backdrop-blur-sm border-white/20 text-white hover:bg-black/50 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Set Alert</span>
                    <span className="sm:hidden">Alert</span>
                    <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 sm:w-48">
                  {getAvailableAlertOptions().length > 0 ? (
                    getAvailableAlertOptions().map(option => (
                      <DropdownMenuItem key={option.value} onClick={() => handleSetAlert(option.value)}>
                        {option.label}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      Game starts too soon for alerts
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Main Content - Mobile-First Stacked Design */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
          {/* Team Matchup - Mobile: Stacked, Desktop: Horizontal */}
          <div className="mb-6 sm:mb-8">
            {/* Mobile Stack Layout */}
            <div className="flex flex-col items-center gap-4 sm:hidden">
              {/* Away Team */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-3 bg-white/10 rounded-full p-3 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img 
                    src={game.awayTeam.logo} 
                    alt={game.awayTeam.name}
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <h3 className="font-bold text-white text-lg mb-1">{game.awayTeam.abbreviation}</h3>
                <p className="text-purple-200 text-sm font-medium">{game.awayTeam.name}</p>
              </div>
              
              {/* VS */}
              <div className="text-2xl font-bold text-white/90 tracking-wider py-2">VS</div>
              
              {/* Home Team */}
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-3 bg-white/10 rounded-full p-3 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img 
                    src={game.homeTeam.logo} 
                    alt={game.homeTeam.name}
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <h3 className="font-bold text-white text-lg mb-1">{game.homeTeam.abbreviation}</h3>
                <p className="text-purple-200 text-sm font-medium">{game.homeTeam.name}</p>
              </div>
            </div>

            {/* Desktop Horizontal Layout */}
            <div className="hidden sm:flex items-center justify-center gap-16">
              {/* Away Team */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-white/10 rounded-full p-4 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img 
                    src={game.awayTeam.logo} 
                    alt={game.awayTeam.name}
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <h3 className="font-bold text-white text-2xl mb-1">{game.awayTeam.abbreviation}</h3>
                <p className="text-purple-200 text-base font-medium">{game.awayTeam.name}</p>
              </div>
              
              {/* VS Section */}
              <div className="px-4">
                <div className="text-5xl font-bold text-white/90 tracking-wider">VS</div>
              </div>
              
              {/* Home Team */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-white/10 rounded-full p-4 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img 
                    src={game.homeTeam.logo} 
                    alt={game.homeTeam.name}
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <h3 className="font-bold text-white text-2xl mb-1">{game.homeTeam.abbreviation}</h3>
                <p className="text-purple-200 text-base font-medium">{game.homeTeam.name}</p>
              </div>
            </div>
          </div>

          {/* Countdown Timer - Mobile Optimized */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="text-3xl sm:text-6xl font-bold text-white mb-1 sm:mb-3 font-mono tracking-wide drop-shadow-lg">
              {timeRemaining}
            </div>
            <p className="text-purple-200 text-sm sm:text-xl font-medium">Until Game Time</p>
          </div>

          {/* Game Details - Stacked on Mobile */}
          <div className="flex flex-col gap-3 mb-6 sm:mb-8 w-full max-w-xs sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 w-full sm:min-w-[140px] sm:w-auto">
              <div className="flex items-center justify-center gap-2 text-white">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">{formatGameTime()}</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 w-full sm:min-w-[180px] sm:w-auto">
              <div className="flex items-center justify-center gap-2 text-white">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base truncate">{game.venue.name}</span>
              </div>
            </div>
          </div>

          {/* Broadcast Info */}
          {(nationalBroadcasts.length > 0 || regionalBroadcasts.length > 0) && (
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Tv className="w-4 h-4 text-white" />
                <span className="text-white font-medium">Available On</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {nationalBroadcasts.map((broadcast, index) => (
                  <Badge 
                    key={index} 
                    className="bg-blue-600/30 text-blue-200 border-blue-400/50 backdrop-blur-sm"
                  >
                    {broadcast.name || broadcast.callLetters}
                  </Badge>
                ))}
                {regionalBroadcasts.map((broadcast, index) => (
                  <Badge 
                    key={index} 
                    className="bg-purple-600/30 text-purple-200 border-purple-400/50 backdrop-blur-sm"
                  >
                    {broadcast.name || broadcast.callLetters}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}