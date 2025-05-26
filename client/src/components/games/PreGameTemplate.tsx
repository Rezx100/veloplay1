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

  // Check for existing alert when component mounts
  useEffect(() => {
    const checkExistingAlert = async () => {
      try {
        const response = await fetch(`/api/game-alerts/${game.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important for session cookies
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setHasAlert(true);
          }
        }
      } catch (error) {
        console.error('Error checking existing alert:', error);
        // Don't show error to user for this check
      }
    };

    checkExistingAlert();
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
        <div className="flex justify-between items-center p-4">
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
          
          {/* Set Alert Button - Top Right Position */}
          <div className="absolute top-4 right-4">
            {hasAlert ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-green-400/20 border-green-400/50 text-green-300 hover:bg-green-400/30 backdrop-blur-sm transition-all duration-200"
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
                    className="bg-black/40 backdrop-blur-sm border-white/20 text-white hover:bg-black/50"
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
          {/* Team Matchup with Responsive Logos */}
          <div className="flex items-center justify-center gap-4 sm:gap-12 mb-8">
            {/* Away Team */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 bg-white/10 rounded-full p-2 sm:p-3 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <img 
                  src={game.awayTeam.logo} 
                  alt={game.awayTeam.name}
                  className="w-12 h-12 sm:w-18 sm:h-18 object-contain"
                />
              </div>
              {/* Show only abbreviation on mobile, full name on desktop */}
              <h3 className="font-bold text-white text-sm sm:text-lg mb-1 block sm:hidden">{game.awayTeam.abbreviation}</h3>
              <h3 className="font-bold text-white text-lg mb-1 hidden sm:block">{game.awayTeam.name}</h3>
              <p className="text-purple-200 text-xs sm:text-sm font-medium sm:block hidden">{game.awayTeam.abbreviation}</p>
            </div>
            
            {/* VS Section */}
            <div className="px-2 sm:px-8">
              <div className="text-2xl sm:text-4xl font-bold text-white/90 tracking-wider">VS</div>
            </div>
            
            {/* Home Team */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 bg-white/10 rounded-full p-2 sm:p-3 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <img 
                  src={game.homeTeam.logo} 
                  alt={game.homeTeam.name}
                  className="w-12 h-12 sm:w-18 sm:h-18 object-contain"
                />
              </div>
              {/* Show only abbreviation on mobile, full name on desktop */}
              <h3 className="font-bold text-white text-sm sm:text-lg mb-1 block sm:hidden">{game.homeTeam.abbreviation}</h3>
              <h3 className="font-bold text-white text-lg mb-1 hidden sm:block">{game.homeTeam.name}</h3>
              <p className="text-purple-200 text-xs sm:text-sm font-medium sm:block hidden">{game.homeTeam.abbreviation}</p>
            </div>
          </div>

          {/* Countdown Timer - Large and Prominent */}
          <div className="text-center mb-8">
            <div className="text-5xl font-bold text-white mb-2 font-mono tracking-wide">
              {timeRemaining}
            </div>
            <p className="text-purple-200 text-lg font-medium">Until Game Time</p>
          </div>

          {/* Game Details in Cards */}
          <div className="flex items-center gap-8 mb-6">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{formatGameTime()}</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{game.venue.name}</span>
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