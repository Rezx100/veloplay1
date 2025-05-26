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

  // Check for existing alert when component mounts with cache busting
  useEffect(() => {
    const checkExistingAlert = async () => {
      try {
        const response = await fetch(`/api/game-alerts/${game.id}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          credentials: 'include', // Important for session cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🎯 Alert check result for game', game.id, ':', data);
          setHasAlert(data.exists || false);
        } else {
          console.log('⚠️ Alert check failed:', response.status);
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

  const handleSetAlert = async (minutesBefore: number) => {
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
    <div className="rounded-lg overflow-hidden shadow-2xl relative aspect-video border border-purple-800/30">
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
                  <DropdownMenuItem onClick={() => handleSetAlert(5)}>
                    5 minutes before
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetAlert(10)}>
                    10 minutes before
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetAlert(15)}>
                    15 minutes before
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetAlert(30)}>
                    30 minutes before
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetAlert(60)}>
                    1 hour before
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetAlert(120)}>
                    2 hours before
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Main Content - Dynamic Responsive */}
        <div className="flex-1 flex flex-col items-center justify-center px-[3vw] max-w-full">
          {/* Team Matchup - Fluid Responsive */}
          <div className="flex items-center justify-center w-full max-w-4xl mx-auto" style={{
            gap: `clamp(2rem, ${Math.min(8, Math.max(2, window.innerWidth / 80))}vw, 8rem)`,
            marginBottom: `clamp(1.5rem, ${Math.min(4, Math.max(1.5, window.innerWidth / 120))}vw, 4rem)`
          }}>
            {/* Away Team */}
            <div className="text-center flex-1 min-w-0">
              <div 
                className="mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20"
                style={{
                  width: `clamp(4rem, ${Math.min(12, Math.max(4, window.innerWidth / 40))}vw, 12rem)`,
                  height: `clamp(4rem, ${Math.min(12, Math.max(4, window.innerWidth / 40))}vw, 12rem)`,
                  padding: `clamp(0.5rem, ${Math.min(1.5, Math.max(0.5, window.innerWidth / 200))}vw, 1.5rem)`,
                  marginBottom: `clamp(0.75rem, ${Math.min(2, Math.max(0.75, window.innerWidth / 200))}vw, 2rem)`
                }}
              >
                <img 
                  src={game.awayTeam.logo} 
                  alt={game.awayTeam.name}
                  className="object-contain w-full h-full"
                />
              </div>
              <h3 
                className="font-bold text-white mb-1"
                style={{fontSize: `clamp(1rem, ${Math.min(2.5, Math.max(1, window.innerWidth / 60))}vw, 2.5rem)`}}
              >
                {game.awayTeam.abbreviation}
              </h3>
              <p 
                className="text-purple-200 font-medium leading-tight"
                style={{fontSize: `clamp(0.75rem, ${Math.min(1.25, Math.max(0.75, window.innerWidth / 80))}vw, 1.25rem)`}}
              >
                {game.awayTeam.name}
              </p>
            </div>
            
            {/* VS Section - Fluid */}
            <div className="flex-shrink-0">
              <div 
                className="font-bold text-white/90 tracking-wider"
                style={{fontSize: `clamp(1.25rem, ${Math.min(4, Math.max(1.25, window.innerWidth / 40))}vw, 4rem)`}}
              >
                VS
              </div>
            </div>
            
            {/* Home Team */}
            <div className="text-center flex-1 min-w-0">
              <div 
                className="mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20"
                style={{
                  width: `clamp(4rem, ${Math.min(12, Math.max(4, window.innerWidth / 40))}vw, 12rem)`,
                  height: `clamp(4rem, ${Math.min(12, Math.max(4, window.innerWidth / 40))}vw, 12rem)`,
                  padding: `clamp(0.5rem, ${Math.min(1.5, Math.max(0.5, window.innerWidth / 200))}vw, 1.5rem)`,
                  marginBottom: `clamp(0.75rem, ${Math.min(2, Math.max(0.75, window.innerWidth / 200))}vw, 2rem)`
                }}
              >
                <img 
                  src={game.homeTeam.logo} 
                  alt={game.homeTeam.name}
                  className="object-contain w-full h-full"
                />
              </div>
              <h3 
                className="font-bold text-white mb-1"
                style={{fontSize: `clamp(1rem, ${Math.min(2.5, Math.max(1, window.innerWidth / 60))}vw, 2.5rem)`}}
              >
                {game.homeTeam.abbreviation}
              </h3>
              <p 
                className="text-purple-200 font-medium leading-tight"
                style={{fontSize: `clamp(0.75rem, ${Math.min(1.25, Math.max(0.75, window.innerWidth / 80))}vw, 1.25rem)`}}
              >
                {game.homeTeam.name}
              </p>
            </div>
          </div>

          {/* Countdown Timer - Fluid Responsive */}
          <div 
            className="text-center w-full"
            style={{marginBottom: `clamp(1rem, ${Math.min(3, Math.max(1, window.innerWidth / 120))}vw, 3rem)`}}
          >
            <div 
              className="font-bold text-white font-mono tracking-wide drop-shadow-lg"
              style={{
                fontSize: `clamp(2rem, ${Math.min(5, Math.max(2, window.innerWidth / 30))}vw, 5rem)`,
                marginBottom: `clamp(0.5rem, ${Math.min(1.5, Math.max(0.5, window.innerWidth / 200))}vw, 1.5rem)`
              }}
            >
              {timeRemaining}
            </div>
            <p 
              className="text-purple-200 font-medium"
              style={{fontSize: `clamp(0.875rem, ${Math.min(1.5, Math.max(0.875, window.innerWidth / 80))}vw, 1.5rem)`}}
            >
              Until Game Time
            </p>
          </div>

          {/* Game Details - Fluid Cards */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center w-full max-w-2xl mx-auto"
            style={{
              gap: `clamp(1rem, ${Math.min(2, Math.max(1, window.innerWidth / 120))}vw, 2rem)`,
              marginBottom: `clamp(1rem, ${Math.min(2.5, Math.max(1, window.innerWidth / 120))}vw, 2.5rem)`
            }}
          >
            <div 
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex-1 sm:flex-initial"
              style={{
                padding: `clamp(0.75rem, ${Math.min(1.5, Math.max(0.75, window.innerWidth / 200))}vw, 1.5rem)`,
                minWidth: `clamp(8.75rem, ${Math.min(12, Math.max(8.75, window.innerWidth / 25))}vw, 12rem)`
              }}
            >
              <div className="flex items-center justify-center gap-2 text-white">
                <Clock 
                  className="flex-shrink-0"
                  style={{
                    width: `clamp(1rem, ${Math.min(1.25, Math.max(1, window.innerWidth / 200))}vw, 1.25rem)`,
                    height: `clamp(1rem, ${Math.min(1.25, Math.max(1, window.innerWidth / 200))}vw, 1.25rem)`
                  }}
                />
                <span 
                  className="font-medium"
                  style={{fontSize: `clamp(0.875rem, ${Math.min(1.125, Math.max(0.875, window.innerWidth / 120))}vw, 1.125rem)`}}
                >
                  {formatGameTime()}
                </span>
              </div>
            </div>
            <div 
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex-1 sm:flex-initial"
              style={{
                padding: `clamp(0.75rem, ${Math.min(1.5, Math.max(0.75, window.innerWidth / 200))}vw, 1.5rem)`,
                minWidth: `clamp(11.25rem, ${Math.min(15, Math.max(11.25, window.innerWidth / 20))}vw, 15rem)`
              }}
            >
              <div className="flex items-center justify-center gap-2 text-white">
                <MapPin 
                  className="flex-shrink-0"
                  style={{
                    width: `clamp(1rem, ${Math.min(1.25, Math.max(1, window.innerWidth / 200))}vw, 1.25rem)`,
                    height: `clamp(1rem, ${Math.min(1.25, Math.max(1, window.innerWidth / 200))}vw, 1.25rem)`
                  }}
                />
                <span 
                  className="font-medium truncate"
                  style={{fontSize: `clamp(0.875rem, ${Math.min(1.125, Math.max(0.875, window.innerWidth / 120))}vw, 1.125rem)`}}
                >
                  {game.venue.name}
                </span>
              </div>
            </div>
          </div>

          {/* Broadcast Info - Fluid Layout */}
          {(nationalBroadcasts.length > 0 || regionalBroadcasts.length > 0) && (
            <div className="text-center w-full max-w-3xl mx-auto" style={{padding: `0 clamp(1rem, 3vw, 2rem)`}}>
              <div 
                className="flex items-center justify-center mb-3"
                style={{gap: `clamp(0.5rem, ${Math.min(1, Math.max(0.5, window.innerWidth / 200))}vw, 1rem)`}}
              >
                <Tv 
                  className="text-white flex-shrink-0"
                  style={{
                    width: `clamp(1rem, ${Math.min(1.25, Math.max(1, window.innerWidth / 200))}vw, 1.25rem)`,
                    height: `clamp(1rem, ${Math.min(1.25, Math.max(1, window.innerWidth / 200))}vw, 1.25rem)`
                  }}
                />
                <span 
                  className="text-white font-medium"
                  style={{fontSize: `clamp(0.875rem, ${Math.min(1.125, Math.max(0.875, window.innerWidth / 120))}vw, 1.125rem)`}}
                >
                  Available On
                </span>
              </div>
              <div 
                className="flex flex-wrap justify-center mx-auto"
                style={{
                  gap: `clamp(0.5rem, ${Math.min(0.75, Math.max(0.5, window.innerWidth / 200))}vw, 0.75rem)`,
                  maxWidth: `clamp(20rem, ${Math.min(40, Math.max(20, window.innerWidth / 3))}vw, 40rem)`
                }}
              >
                {nationalBroadcasts.map((broadcast, index) => (
                  <Badge 
                    key={index} 
                    className="bg-blue-600/30 text-blue-200 border-blue-400/50 backdrop-blur-sm"
                    style={{
                      fontSize: `clamp(0.75rem, ${Math.min(0.875, Math.max(0.75, window.innerWidth / 160))}vw, 0.875rem)`,
                      padding: `clamp(0.25rem, ${Math.min(0.5, Math.max(0.25, window.innerWidth / 400))}vw, 0.5rem) clamp(0.5rem, ${Math.min(0.75, Math.max(0.5, window.innerWidth / 200))}vw, 0.75rem)`
                    }}
                  >
                    {broadcast.name || broadcast.callLetters}
                  </Badge>
                ))}
                {regionalBroadcasts.map((broadcast, index) => (
                  <Badge 
                    key={index} 
                    className="bg-purple-600/30 text-purple-200 border-purple-400/50 backdrop-blur-sm"
                    style={{
                      fontSize: `clamp(0.75rem, ${Math.min(0.875, Math.max(0.75, window.innerWidth / 160))}vw, 0.875rem)`,
                      padding: `clamp(0.25rem, ${Math.min(0.5, Math.max(0.25, window.innerWidth / 400))}vw, 0.5rem) clamp(0.5rem, ${Math.min(0.75, Math.max(0.5, window.innerWidth / 200))}vw, 0.75rem)`
                    }}
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