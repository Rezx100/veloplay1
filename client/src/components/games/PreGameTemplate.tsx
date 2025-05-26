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
        <div className="sm:hidden h-full flex flex-col">
          {/* Top Header with League Badge and Alert Button */}
          <div className="flex justify-between items-start p-4">
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
                  className="bg-green-400/20 border-green-400/50 text-green-300 hover:bg-green-400/30 backdrop-blur-sm transition-all duration-200 text-sm px-3"
                  disabled
                >
                  <Bell className="mr-2 h-4 w-4 fill-current animate-bell-ring" />
                  Alert
                  <ChevronDown className="ml-2 h-4 w-4" />
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
                      Alert
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

          {/* Team Matchup */}
          <div className="flex items-center justify-center gap-6 mb-8 px-4">
            {/* Away Team */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-gray-700/50 rounded-full p-3 flex items-center justify-center backdrop-blur-sm border border-gray-600/30">
                <img 
                  src={game.awayTeam.logo} 
                  alt={game.awayTeam.name}
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h3 className="font-bold text-white text-xl mb-1">{game.awayTeam.abbreviation}</h3>
              <p className="text-gray-300 text-sm">{game.awayTeam.name}</p>
            </div>
            
            {/* VS Section */}
            <div className="px-4">
              <div className="text-2xl font-bold text-white/90 tracking-wider">VS</div>
            </div>
            
            {/* Home Team */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-gray-700/50 rounded-full p-3 flex items-center justify-center backdrop-blur-sm border border-gray-600/30">
                <img 
                  src={game.homeTeam.logo} 
                  alt={game.homeTeam.name}
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h3 className="font-bold text-white text-xl mb-1">{game.homeTeam.abbreviation}</h3>
              <p className="text-gray-300 text-sm">{game.homeTeam.name}</p>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-white mb-2 font-mono tracking-wide">
              {timeRemaining}
            </div>
            <p className="text-gray-300 text-lg">Until Game Time</p>
          </div>

          {/* Game Time */}
          <div className="flex justify-center mb-4">
            <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-lg px-6 py-3">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span className="font-medium text-lg">{formatGameTime()}</span>
              </div>
            </div>
          </div>

          {/* Venue */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-lg px-6 py-3 max-w-xs">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-lg text-center">{game.venue.name}</span>
              </div>
            </div>
          </div>

          {/* Broadcast Info */}
          {(nationalBroadcasts.length > 0 || regionalBroadcasts.length > 0) && (
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                  <Tv className="w-4 h-4 text-black" />
                </div>
                <span className="text-white font-medium text-lg">Available On</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {nationalBroadcasts.map((broadcast, index) => (
                  <Badge 
                    key={index} 
                    className="bg-purple-600 text-white border-0 text-sm px-4 py-2 font-medium"
                  >
                    {broadcast.name || broadcast.callLetters}
                  </Badge>
                ))}
                {regionalBroadcasts.map((broadcast, index) => (
                  <Badge 
                    key={index} 
                    className="bg-purple-600 text-white border-0 text-sm px-4 py-2 font-medium"
                  >
                    {broadcast.name || broadcast.callLetters}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout (unchanged) */}
        <div className="hidden sm:flex flex-col h-full">
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