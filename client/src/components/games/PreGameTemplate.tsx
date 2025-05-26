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

      if (result.ok) {
        setHasAlert(true);
        toast({
          title: 'Game Alert Set',
          description: `You'll be notified ${minutesBefore} minutes before ${game.name} starts`,
          variant: 'default',
        });
      } else {
        const errorData = await result.json();
        if (result.status === 409) {
          // Alert already exists - show informative message
          setHasAlert(true);
          toast({
            title: 'Alert Already Set',
            description: `You already have an alert set for this game. You'll be notified ${minutesBefore} minutes before ${game.name} starts.`,
            variant: 'default',
          });
        } else {
          throw new Error(errorData.message || 'Failed to set alert');
        }
      }
    } catch (error) {
      console.error('Error setting game alert:', error);
      toast({
        title: 'Unable to Set Alert',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'default',
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
    <div className="rounded-lg overflow-hidden shadow-2xl relative aspect-video sm:aspect-video border border-purple-800/30">
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
        {/* Mobile Layout */}
        <div className="md:hidden h-full flex flex-col justify-between p-4">
          {/* Top Header with League Badge and Alert Button */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
              {getLeagueIcon()}
              <Badge className={`text-white font-bold px-3 py-1 text-sm border-0 ${
                game.league === 'nhl' ? 'bg-[#041E42]' :
                game.league === 'nba' ? 'bg-[#C8102E]' :
                game.league === 'mlb' ? 'bg-[#132448]' :
                game.league === 'nfl' ? 'bg-[#013369]' :
                'bg-purple-600'
              }`}>
                {game.league.toUpperCase()}
              </Badge>
            </div>
            
            {/* Alert Button */}
            <div className="flex-shrink-0">
              {hasAlert ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-400/20 border-green-400/50 text-green-300 hover:bg-green-400/30 backdrop-blur-sm transition-all duration-200 text-xs px-2"
                  disabled
                >
                  <Bell className="mr-1 h-3 w-3 fill-current animate-bell-ring" />
                  Set
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-black/40 backdrop-blur-sm border-white/20 text-white hover:bg-black/50 text-xs px-2"
                    >
                      <Bell className="mr-1 h-3 w-3" />
                      Set
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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

          {/* Team Matchup */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Away Team */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-gray-700/50 rounded-full p-2 flex items-center justify-center backdrop-blur-sm border border-gray-600/30">
                <img 
                  src={game.awayTeam.logo} 
                  alt={game.awayTeam.name}
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">{game.awayTeam.abbreviation}</h3>
            </div>
            
            {/* VS Section */}
            <div className="px-3">
              <div className="text-xl font-bold text-white/90 tracking-wider">VS</div>
            </div>
            
            {/* Home Team */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-gray-700/50 rounded-full p-2 flex items-center justify-center backdrop-blur-sm border border-gray-600/30">
                <img 
                  src={game.homeTeam.logo} 
                  alt={game.homeTeam.name}
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">{game.homeTeam.abbreviation}</h3>
            </div>
          </div>

          {/* Game Title */}
          <div className="text-center mb-4">
            <h2 className="text-white text-lg font-semibold leading-tight">
              {game.awayTeam.name} vs {game.homeTeam.name}
            </h2>
          </div>

          {/* Venue */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{game.venue.name}</span>
            </div>
          </div>

          {/* Game Details Section */}
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/10">
            {/* Score Display (0-0 for pre-game) */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <img src={game.awayTeam.logo} alt={game.awayTeam.name} className="w-8 h-8" />
                <span className="text-white font-bold text-sm">{game.awayTeam.abbreviation}</span>
              </div>
              <div className="text-purple-400 font-bold text-2xl">0</div>
              <div className="text-purple-400 font-bold text-2xl">0</div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{game.homeTeam.abbreviation}</span>
                <img src={game.homeTeam.logo} alt={game.homeTeam.name} className="w-8 h-8" />
              </div>
            </div>
            
            {/* Game Status */}
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">P0 • 0:00</div>
            </div>
          </div>

          {/* About This Game Section */}
          <div className="mb-4">
            <h3 className="text-white text-lg font-semibold mb-3">About This Game</h3>
            
            {/* Countdown Timer */}
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-white mb-1 font-mono tracking-wide">
                {timeRemaining}
              </div>
              <p className="text-gray-300 text-sm">Until Game Time</p>
            </div>

            {/* Game Time */}
            <div className="flex justify-center mb-3">
              <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium text-sm">{formatGameTime()}</span>
                </div>
              </div>
            </div>

            {/* Broadcast Info */}
            {(nationalBroadcasts.length > 0 || regionalBroadcasts.length > 0) && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                    <Tv className="w-3 h-3 text-black" />
                  </div>
                  <span className="text-white font-medium text-sm">Available On</span>
                </div>
                <div className="flex flex-wrap justify-center gap-1">
                  {nationalBroadcasts.map((broadcast, index) => (
                    <Badge 
                      key={index} 
                      className="bg-purple-600 text-white border-0 text-xs px-2 py-1 font-medium"
                    >
                      {broadcast.name || broadcast.callLetters}
                    </Badge>
                  ))}
                  {regionalBroadcasts.map((broadcast, index) => (
                    <Badge 
                      key={index} 
                      className="bg-purple-600 text-white border-0 text-xs px-2 py-1 font-medium"
                    >
                      {broadcast.name || broadcast.callLetters}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout (unchanged) */}
        <div className="hidden md:flex flex-col h-full">
          {/* Top Header with League Badge and Alert Button */}
          <div className="flex justify-between items-start p-4">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
              {getLeagueIcon()}
              <Badge className={`text-white font-bold px-3 py-1 text-sm border-0 ${
                game.league === 'nhl' ? 'bg-[#041E42]' :
                game.league === 'nba' ? 'bg-[#C8102E]' :
                game.league === 'mlb' ? 'bg-[#132448]' :
                game.league === 'nfl' ? 'bg-[#013369]' :
                'bg-purple-600'
              }`}>
                {game.league.toUpperCase()}
              </Badge>
            </div>
            
            {/* Set Alert Button - Desktop */}
            <div className="flex-shrink-0">
              {hasAlert ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-400/20 border-green-400/50 text-green-300 hover:bg-green-400/30 backdrop-blur-sm transition-all duration-200 text-sm px-3"
                  disabled
                >
                  <Bell className="mr-2 h-4 w-4 fill-current animate-bell-ring" />
                  Alert Set
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-black/40 backdrop-blur-sm border-white/20 text-white hover:bg-black/50 text-sm px-3"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Set Alert
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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

          {/* Main Content - Team Logos and Info */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Team Matchup with Larger Logos and Better Spacing */}
            <div className="flex items-center justify-center gap-16 mb-12">
              {/* Away Team */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-white/10 rounded-full p-4 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img 
                    src={game.awayTeam.logo} 
                    alt={game.awayTeam.name}
                    className="w-24 h-24 object-contain"
                  />
                </div>
                {/* Show abbreviation prominently */}
                <h3 className="font-bold text-white text-2xl mb-1">{game.awayTeam.abbreviation}</h3>
                <p className="text-purple-200 text-base font-medium">{game.awayTeam.name}</p>
              </div>
              
              {/* VS Section - More Prominent */}
              <div className="px-4">
                <div className="text-5xl font-bold text-white/90 tracking-wider">VS</div>
              </div>
              
              {/* Home Team */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-white/10 rounded-full p-4 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img 
                    src={game.homeTeam.logo} 
                    alt={game.homeTeam.name}
                    className="w-24 h-24 object-contain"
                  />
                </div>
                {/* Show abbreviation prominently */}
                <h3 className="font-bold text-white text-2xl mb-1">{game.homeTeam.abbreviation}</h3>
                <p className="text-purple-200 text-base font-medium">{game.homeTeam.name}</p>
              </div>
            </div>

            {/* Countdown Timer - More Prominent */}
            <div className="text-center mb-12">
              <div className="text-6xl font-bold text-white mb-3 font-mono tracking-wide drop-shadow-lg">
                {timeRemaining}
              </div>
              <p className="text-purple-200 text-xl font-medium">Until Game Time</p>
            </div>

            {/* Game Details - Centered Cards */}
            <div className="flex flex-row items-center justify-center gap-8 mb-8 w-full">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3 min-w-[140px]">
                <div className="flex items-center justify-center gap-2 text-white">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-base">{formatGameTime()}</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3 min-w-[180px]">
                <div className="flex items-center justify-center gap-2 text-white">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-base truncate">{game.venue.name}</span>
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
    </div>
  );
}