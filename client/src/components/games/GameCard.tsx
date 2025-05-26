import { Game } from '@shared/schema';
import { Link } from 'wouter';
import { useLocalTime } from '@/hooks/useLocalTime';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GAME_STATES } from '@/lib/constants';

// Import stadium images directly
import nbaStadium from '@assets/nba-stadium.webp';
import nhlStadium from '@assets/nhl-stadium.png';
import mlbStadium from '@assets/mlb-stadium.jpg';
import nflStadium from '@assets/nfl-stadium.jpg';

interface GameCardProps {
  game: Game;
  showRecapButton?: boolean;
  className?: string;
}

// Predefined vibrant color palettes for different looks
const COLOR_PALETTES = {
  // Vibrant, energetic colors
  vibrant: [
    { h: 0, s: 80, l: 50 },     // Red
    { h: 30, s: 90, l: 45 },    // Orange
    { h: 60, s: 95, l: 55 },    // Yellow
    { h: 120, s: 75, l: 40 },   // Green
    { h: 180, s: 85, l: 45 },   // Teal
    { h: 210, s: 95, l: 55 },   // Sky Blue
    { h: 240, s: 80, l: 60 },   // Blue
    { h: 270, s: 85, l: 60 },   // Purple
    { h: 300, s: 80, l: 50 },   // Pink
    { h: 330, s: 90, l: 55 },   // Magenta
  ],
  // More subdued, professional palette
  cool: [
    { h: 200, s: 85, l: 40 },   // Deep Blue
    { h: 185, s: 75, l: 35 },   // Teal
    { h: 225, s: 70, l: 45 },   // Periwinkle
    { h: 240, s: 60, l: 60 },   // Blue
    { h: 260, s: 65, l: 55 },   // Lavender
    { h: 280, s: 70, l: 40 },   // Purple
    { h: 300, s: 65, l: 45 },   // Magenta
    { h: 320, s: 55, l: 40 },   // Plum
    { h: 340, s: 60, l: 50 },   // Pink
    { h: 355, s: 75, l: 45 },   // Cherry
  ],
  // Warm, earthy tones
  warm: [
    { h: 0, s: 90, l: 45 },     // Red
    { h: 15, s: 85, l: 50 },    // Red-Orange
    { h: 30, s: 90, l: 45 },    // Orange
    { h: 40, s: 80, l: 50 },    // Amber
    { h: 50, s: 95, l: 55 },    // Gold
    { h: 60, s: 85, l: 45 },    // Yellow
    { h: 80, s: 70, l: 40 },    // Yellow-Green
    { h: 100, s: 65, l: 45 },   // Lime
    { h: 130, s: 55, l: 40 },   // Green
    { h: 160, s: 60, l: 35 },   // Forest
  ],
  // League-specific palettes
  nhl: [
    { h: 210, s: 100, l: 50 },  // Blue
    { h: 195, s: 90, l: 45 },   // Cyan
    { h: 220, s: 85, l: 55 },   // Light Blue
    { h: 240, s: 80, l: 50 },   // Navy
  ],
  nba: [
    { h: 0, s: 100, l: 50 },    // Red
    { h: 25, s: 100, l: 45 },   // Orange
    { h: 270, s: 80, l: 40 },   // Purple
    { h: 200, s: 100, l: 35 },  // Blue
  ],
  nfl: [
    { h: 120, s: 70, l: 40 },   // Green
    { h: 210, s: 100, l: 35 },  // Dark Blue
    { h: 0, s: 90, l: 45 },     // Red
    { h: 45, s: 100, l: 50 },   // Gold
  ],
  mlb: [
    { h: 0, s: 85, l: 50 },     // Red
    { h: 210, s: 90, l: 40 },   // Blue
    { h: 45, s: 95, l: 50 },    // Gold
    { h: 330, s: 80, l: 45 },   // Pink
  ]
};

// Function to generate a hash from string
const hashString = (str: string, index: number = 0): number => {
  if (!str) return 0;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i) + index;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Get a color from a palette based on seed
const getColorFromPalette = (seed: string | undefined, palette: Array<{h: number, s: number, l: number}>, index: number = 0) => {
  if (!seed) {
    // Random fallback
    const randomIndex = Math.floor(Math.random() * palette.length);
    const color = palette[randomIndex];
    // Add some random variations
    return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
  }
  
  const hash = hashString(seed, index);
  // Select color and add some variation to make it unique
  const baseColor = palette[hash % palette.length];
  const hVariation = ((hash >> 8) % 20) - 10; // -10 to +10 variation on hue
  const sVariation = ((hash >> 4) % 10) - 5;  // -5 to +5 variation on saturation
  const lVariation = ((hash >> 2) % 10) - 5;  // -5 to +5 variation on lightness
  
  return `hsl(${baseColor.h + hVariation}, ${Math.min(Math.max(baseColor.s + sVariation, 50), 100)}%, ${Math.min(Math.max(baseColor.l + lVariation, 25), 70)}%)`;
};

// Function to generate random color based on game seed
const getRandomColor = (seed: string | undefined, index: number = 0) => {
  if (!seed) {
    return `hsl(${Math.floor(Math.random() * 360)}, 80%, 40%)`;
  }
  
  // Get the league to select a league-specific palette if available
  const leagueMatch = seed.match(/(nhl|nba|nfl|mlb)/i);
  const league = leagueMatch ? leagueMatch[0].toLowerCase() : null;
  
  // Use league-specific palette or fall back to vibrant
  const palette = league && COLOR_PALETTES[league as keyof typeof COLOR_PALETTES] 
    ? COLOR_PALETTES[league as keyof typeof COLOR_PALETTES]
    : COLOR_PALETTES.vibrant;
  
  return getColorFromPalette(seed, palette, index);
};

// Create a complementary or contrasting color
const getComplementaryColor = (color: string) => {
  if (color.startsWith('hsl')) {
    const [h, s, l] = color.match(/\d+/g)!.map(Number);
    // Shift hue by 180 degrees for complementary color
    const newHue = (h + 180) % 360;
    return `hsl(${newHue}, ${s}%, ${l}%)`;
  }
  return color;
};

// Create a slightly darker version of the color
const getDarkerColor = (color: string) => {
  if (color.startsWith('hsl')) {
    const [h, s, l] = color.match(/\d+/g)!.map(Number);
    return `hsl(${h}, ${Math.min(s + 5, 100)}%, ${Math.max(l - 15, 10)}%)`;
  }
  return color;
};

// Create a slightly lighter version of the color
const getLighterColor = (color: string) => {
  if (color.startsWith('hsl')) {
    const [h, s, l] = color.match(/\d+/g)!.map(Number);
    return `hsl(${h}, ${Math.max(s - 10, 50)}%, ${Math.min(l + 15, 90)}%)`;
  }
  return color;
};

export default function GameCard({ game, showRecapButton = false, className = '' }: GameCardProps) {
  const { toast } = useToast();
  
  // Format the game date/time
  const formattedTime = useLocalTime(game?.date || new Date().toISOString(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  // Handle navigation to game page - just scroll to top
  const handleScrollToTop = () => {
    window.scrollTo(0, 0);
  };
  
  // Check if the game is tomorrow by comparing dates (ignoring time)
  const isTomorrowGame = useMemo(() => {
    if (!game?.date) return false;
    
    const gameDate = new Date(game.date);
    const today = new Date();
    
    // Set both dates to start of day to compare just the dates
    const gameDateStart = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Add one day to today to get tomorrow's date
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    
    // Check if game date matches tomorrow's date
    return gameDateStart.getTime() === tomorrowStart.getTime();
  }, [game?.date]);
  
  // Get the appropriate background style based on league for the blurred stadium images
  const getBackgroundStyle = () => {
    const commonStyles = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      filter: 'blur(3px)',
      transform: 'scale(1.05)'
    };
    
    if (!game?.league) {
      return {
        ...commonStyles,
        backgroundImage: `url(/nba-stadium.webp)`
      };
    }

    // Map leagues to their stadium background styles
    const leagueBackgrounds: Record<string, any> = {
      'nhl': {
        ...commonStyles,
        backgroundImage: `url(/nhl-stadium.png)`
      },
      'nba': {
        ...commonStyles,
        backgroundImage: `url(/nba-stadium.webp)`
      },
      'mlb': {
        ...commonStyles,
        backgroundImage: `url(/mlb-stadium.jpg)`
      },
      'nfl': {
        ...commonStyles,
        backgroundImage: `url(/nfl-stadium.jpg)`
      }
    };
    
    return leagueBackgrounds[game.league as keyof typeof leagueBackgrounds] || {
      ...commonStyles,
      backgroundImage: `url(/nba-stadium.webp)`
    };
  };
  
  // For fallback and transition effects, keep some color variables
  const primaryColor = useMemo(() => {
    // League-specific vibrant primary colors for fallback and effects
    const leagueColors = {
      'nhl': 'hsl(215, 90%, 30%)',     // Vibrant blue for NHL
      'nba': 'hsl(270, 80%, 25%)',     // Rich purple for NBA
      'mlb': 'hsl(355, 80%, 35%)',     // Vibrant red for MLB
      'nfl': 'hsl(130, 60%, 25%)'      // Rich green for NFL
    };
    
    return game?.league 
      ? leagueColors[game.league as keyof typeof leagueColors] || 'hsl(270, 80%, 25%)'
      : 'hsl(270, 80%, 25%)';
  }, [game?.league]);
  
  const secondaryColor = useMemo(() => {
    // These are used for fallback and effects only
    const leagueGradients = {
      'nhl': 'hsl(230, 75%, 15%)',     // Deep navy for NHL
      'nba': 'hsl(280, 75%, 15%)',     // Deep purple for NBA
      'mlb': 'hsl(340, 70%, 20%)',     // Deep crimson for MLB
      'nfl': 'hsl(150, 50%, 15%)'      // Deep forest green for NFL
    };
    
    return game?.league
      ? leagueGradients[game.league as keyof typeof leagueGradients] || 'hsl(280, 75%, 15%)'
      : 'hsl(280, 75%, 15%)';
  }, [game?.league]);
  
  // Create color variations for effects
  const darkerPrimary = useMemo(() => getDarkerColor(primaryColor), [primaryColor]);
  const darkerSecondary = useMemo(() => getDarkerColor(secondaryColor), [secondaryColor]);
  const lighterPrimary = useMemo(() => getLighterColor(primaryColor), [primaryColor]);
  
  // Use a more dramatic, dynamic gradient direction for visual interest
  const gradientDirection = useMemo(() => {
    return 'to bottom right'; // Diagonal gradient for best visual effect
  }, []);

  // Generate status badge for the game state using our constants
  const getStatusBadge = () => {
    // Get the appropriate game state config, fallback to 'pre' state if not found
    const gameState = game?.state ? GAME_STATES[game.state as keyof typeof GAME_STATES] : GAME_STATES.pre;
    
    // For LIVE games, show period and clock
    if (game?.state === 'in') {
      return (
        <div 
          className={`flex items-center gap-1 ${gameState.textColor} px-2 py-0.5 rounded text-[10px] font-semibold shadow-md justify-center ${gameState.color}`}
        >
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span>{gameState.label}</span>
          {game?.status?.period && (
            <span className="ml-0.5 text-[8px] font-medium text-white">
              • P{game.status.period}{game.status.clock && ` ${game.status.clock}`}
            </span>
          )}
        </div>
      );
    }
    
    // For DELAYED games, show warning icon
    if (game?.state === 'delayed') {
      return (
        <div 
          className={`flex items-center gap-1 ${gameState.textColor} px-2 py-0.5 rounded text-[10px] font-semibold shadow-md justify-center ${gameState.color}`}
        >
          <span className="w-2 h-2 text-white">⚠️</span>
          <span>{gameState.label}</span>
        </div>
      );
    }
    
    // For POSTPONED games, show icon
    if (game?.state === 'postponed') {
      return (
        <div 
          className={`flex items-center gap-1 ${gameState.textColor} px-2 py-0.5 rounded text-[10px] font-semibold shadow-md justify-center ${gameState.color}`}
        >
          <span className="w-2 h-2 text-white">⊘</span>
          <span>{gameState.label}</span>
        </div>
      );
    }
    
    // For PRE or POST games, simple badge
    return (
      <div 
        className={`${gameState.textColor} px-2 py-0.5 rounded text-[10px] font-semibold min-w-[50px] text-center shadow-md ${gameState.color}`}
      >
        {gameState.label}
      </div>
    );
  };

  // Get border color based on league
  const getBorderColor = () => {
    if (!game?.league) return "#7f00ff40"; // Default semi-transparent purple
    
    const borderColors = {
      'nhl': "#0066cc40", // Semi-transparent blue
      'nba': "#7f00ff40", // Semi-transparent purple
      'mlb': "#cc334440", // Semi-transparent red
      'nfl': "#33aa5540"  // Semi-transparent green
    };
    
    return borderColors[game.league as keyof typeof borderColors] || "#7f00ff40";
  };

  // Get the appropriate button text based on game state
  const getButtonText = () => {
    if (game?.state === 'in') 
      return 'Watch Now';
    if (game?.state === 'post') 
      return 'Recap';
    if (game?.state === 'delayed') 
      return 'Status';
    if (game?.state === 'postponed') 
      return 'Info';
    
    // Check if game is in warmup period (30 mins before)
    if (game?.date) {
      const gameTime = new Date(game.date).getTime();
      const now = new Date().getTime();
      const thirtyMinutesInMs = 30 * 60 * 1000;
      if (gameTime - now < thirtyMinutesInMs && gameTime > now) {
        return 'Warm-up';
      }
    }
    
    // Otherwise show normal status based on timing
    return isTomorrowGame ? 'Tomorrow' : 'Today';
  };

  // Get the appropriate button color based on game state
  const getButtonStyle = () => {
    if (game?.state === 'in')
      return 'bg-[#7f00ff] text-white hover:bg-[#9332ff]';
    if (game?.state === 'post')
      return showRecapButton 
        ? 'bg-[#7f00ff] text-white hover:bg-[#9332ff]' // Highlight for recap
        : 'bg-[#3a2960] text-white hover:bg-[#4a3575]'; // Normal completed game
    if (game?.state === 'pre')
      return 'bg-[#3a2960] text-white hover:bg-[#4a3575]';
    if (game?.state === 'delayed')
      return 'bg-[#ca8a04] text-white hover:bg-[#eab308]';
    if (game?.state === 'postponed')
      return 'bg-[#4f2d99] text-white hover:bg-[#6a3ec8]';
    
    return 'bg-[#252134] text-white hover:bg-[#332b49]';
  };

  return (
    <div className={`relative h-[200px] sm:h-[200px] rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] group cursor-pointer ${className}`} onClick={() => window.location.href = `/game/${game?.id || ''}`}>
      {/* Background - stadium image with high visibility */}
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src={
            game?.league === 'nhl' ? nhlStadium :
            game?.league === 'mlb' ? mlbStadium :
            game?.league === 'nfl' ? nflStadium :
            nbaStadium
          }
          className="absolute inset-0 w-full h-full object-cover filter blur-[5px]"
          alt=""
        />
        {/* Moderate dark tint overlay for proper visibility balance */}
        <div className="absolute inset-0 bg-[#0d021f] opacity-35"></div>
      </div>
      
      {/* Smooth blended shadows for text visibility */}
      <div className="absolute inset-x-0 bottom-0 h-24" 
        style={{
          background: 'linear-gradient(to top, rgba(13,2,31,0.95) 0%, rgba(13,2,31,0.85) 30%, rgba(13,2,31,0.6) 50%, rgba(13,2,31,0.3) 70%, rgba(13,2,31,0.1) 85%, rgba(13,2,31,0) 100%)'
        }}
      ></div>
      <div className="absolute inset-x-0 top-0 h-16" 
        style={{
          background: 'linear-gradient(to bottom, rgba(13,2,31,0.95) 0%, rgba(13,2,31,0.85) 30%, rgba(13,2,31,0.6) 50%, rgba(13,2,31,0.3) 70%, rgba(13,2,31,0.1) 85%, rgba(13,2,31,0) 100%)'
        }}
      ></div>
      
      {/* Top badges row */}
      <div className="absolute top-0 left-0 right-0 p-2 flex justify-between z-20">
        {/* League badge - simple, elegant */}
        <div className={`text-white px-2 py-0.5 rounded text-[10px] font-semibold ${
          game?.league === 'nhl' ? 'bg-[#041E42]' :
          game?.league === 'nba' ? 'bg-[#C8102E]' :
          game?.league === 'mlb' ? 'bg-[#132448]' :
          game?.league === 'nfl' ? 'bg-[#013369]' :
          'bg-[#7f00ff]'
        }`}>
          {game?.league?.toUpperCase() || 'SPORTS'}
        </div>
        {/* Status badge */}
        {getStatusBadge()}
      </div>
      
      {/* Team logos and matchup - positioned in middle */}
      <div className="absolute inset-x-0 top-[40%] transform -translate-y-1/2 flex justify-between items-center px-6 z-10">
        {/* Home team - simple, clear logo display */}
        <div className="flex flex-col items-center w-2/5">
          <div className="relative">
            {/* Subtle transparent shadow behind logo */}
            <div className="absolute inset-0 w-14 h-14 bg-black/20 rounded-full blur-md transform translate-y-1"></div>
            <img
              src={game?.homeTeam?.logo || '/placeholder-logo.png'}
              alt={game?.homeTeam?.name || 'Home Team'}
              className="relative w-14 h-14 object-contain drop-shadow-lg z-10"
            />
          </div>
          <div className="mt-2 text-white font-bold text-sm drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">{game?.homeTeam?.abbreviation || 'HOME'}</div>
        </div>
        
        {/* Center VS indicator */}
        <div className="flex-shrink-0 w-1/5 flex justify-center items-center">
          <div className="text-white font-bold text-lg drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">VS</div>
        </div>
        
        {/* Away team - matching home team style */}
        <div className="flex flex-col items-center w-2/5">
          <div className="relative">
            {/* Subtle transparent shadow behind logo */}
            <div className="absolute inset-0 w-14 h-14 bg-black/20 rounded-full blur-md transform translate-y-1"></div>
            <img
              src={game?.awayTeam?.logo || '/placeholder-logo.png'}
              alt={game?.awayTeam?.name || 'Away Team'}
              className="relative w-14 h-14 object-contain drop-shadow-lg z-10"
            />
          </div>
          <div className="mt-2 text-white font-bold text-sm drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">{game?.awayTeam?.abbreviation || 'AWAY'}</div>
        </div>
      </div>

      {/* Game info footer - mobile optimized */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm sm:text-sm line-clamp-1 mb-1 drop-shadow-md">{formattedTime}</div>
            <div className="text-[#b08eff] text-xs sm:text-xs truncate drop-shadow-md">
              {game?.venue?.name ? `${game.venue.name}` : 'Venue TBD'}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Link href={`/game/${game?.id || ''}`}>
              <div 
                onClick={handleScrollToTop}
                className={`
                  transition-all duration-300 cursor-pointer
                  ${getButtonStyle()} 
                  px-3 sm:px-4 py-1.5 sm:py-1.5 rounded text-xs sm:text-xs font-medium flex items-center gap-1.5 shadow-md drop-shadow-md z-20 whitespace-nowrap`}
              >
                <span>{getButtonText()}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Make entire card clickable with this overlay - z-index higher to capture clicks */}
      <Link href={`/game/${game?.id || ''}`}>
        <div 
          onClick={handleScrollToTop}
          className="absolute inset-0 z-30 cursor-pointer" 
          style={{ opacity: 0 }}
          aria-label={`View ${game?.homeTeam?.name || 'Home'} vs ${game?.awayTeam?.name || 'Away'}`} 
        />
      </Link>
    </div>
  );
}