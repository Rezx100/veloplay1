import { Game } from '@shared/schema';
import { useLocalTime } from '@/hooks/useLocalTime';

interface GameRecapProps {
  game: Game | null | undefined;
}

export default function GameRecap({ game }: GameRecapProps) {
  const formattedGameTime = useLocalTime(game?.date || '');
  
  // Get winning team
  const getWinningTeam = () => {
    if (!game?.homeTeam?.score || !game?.awayTeam?.score) return null;
    
    const homeScore = game.homeTeam.score;
    const awayScore = game.awayTeam.score;
    
    if (homeScore > awayScore) {
      return {
        team: game.homeTeam,
        score: homeScore,
        opponentScore: awayScore,
        isHome: true
      };
    } else if (awayScore > homeScore) {
      return {
        team: game.awayTeam,
        score: awayScore,
        opponentScore: homeScore,
        isHome: false
      };
    }
    
    return null; // It's a tie
  };
  
  const winner = getWinningTeam();
  
  const getScoreSummary = () => {
    if (!winner) return 'Final Score';
    
    const winnerName = winner.team.name;
    const winnerScore = winner.score;
    const loserScore = winner.opponentScore;
    const opponentName = winner.isHome ? game?.awayTeam?.name : game?.homeTeam?.name;
    
    return `${winnerName} defeated ${opponentName} ${winnerScore}-${loserScore}`;
  };
  
  return (
    <div className="bg-[#0d021f] rounded-xl overflow-hidden mb-8 border border-[#2f1a48]">
      {/* Game header with final score */}
      <div className="bg-gradient-to-r from-[#130426] to-[#1a0533] p-4 border-l-4 border-[#7f00ff]">
        <div className="flex items-center mb-2">
          <span className="bg-[#7f00ff]/80 text-white px-2 py-1 text-xs font-bold rounded mr-2">
            FINAL
          </span>
          <span className={`league-indicator ${game?.league || 'sports'} px-2 py-1 bg-[#2f1a48] rounded text-xs`}>
            {game?.league?.toUpperCase() || 'SPORTS'}
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
          {getScoreSummary()}
        </h2>
        <p className="text-gray-400 text-sm">
          {formattedGameTime} • {game?.venue?.name}, {game?.venue?.city}
        </p>
      </div>
      
      {/* Team Comparison */}
      <div className="p-4 sm:p-6">
        {/* Mobile view - scores at top in a cleaner format */}
        <div className="block sm:hidden mb-6">
          <div className="flex items-center justify-between mb-4 bg-[#0d021f] rounded-lg p-3 border border-[#2f1a48]">
            <div className="flex flex-col items-center">
              <img 
                src={game?.homeTeam?.logo || '/placeholder-logo.png'} 
                alt={game?.homeTeam?.name || 'Home Team'}
                className="w-16 h-16 object-contain mb-1"
              />
              <p className="text-[#a68dff] text-sm font-medium mt-1">{game?.homeTeam?.abbreviation}</p>
              {winner && winner.isHome && (
                <div className="mt-1 bg-[#7f00ff]/20 text-[#a68dff] px-2 py-0.5 rounded-full text-xs font-semibold">
                  WIN
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-4xl font-bold mr-2 text-[#7f00ff]">{game?.homeTeam?.score || '0'}</div>
              <div className="text-xl text-[#a68dff] mx-2">-</div>
              <div className="text-4xl font-bold ml-2 text-[#7f00ff]">{game?.awayTeam?.score || '0'}</div>
            </div>
            
            <div className="flex flex-col items-center">
              <img 
                src={game?.awayTeam?.logo || '/placeholder-logo.png'} 
                alt={game?.awayTeam?.name || 'Away Team'}
                className="w-16 h-16 object-contain mb-1"
              />
              <p className="text-[#a68dff] text-sm font-medium mt-1">{game?.awayTeam?.abbreviation}</p>
              {winner && !winner.isHome && (
                <div className="mt-1 bg-[#7f00ff]/20 text-[#a68dff] px-2 py-0.5 rounded-full text-xs font-semibold">
                  WIN
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-[#0d021f] rounded-lg p-3 mb-4 border border-[#2f1a48]">
            <div className="text-center mb-2 text-[#a68dff] text-sm font-medium">
              Game Details
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#a68dff]/80">Date:</span>
                <span className="text-[#f2f2f2]">{formattedGameTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a68dff]/80">Venue:</span>
                <span className="text-[#f2f2f2]">{game?.venue?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a68dff]/80">Status:</span>
                <span className="text-[#f2f2f2]">{game?.status?.detail || 'Final'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desktop view - 3 column grid */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4 mb-6">
          {/* Home Team Column */}
          <div className="flex flex-col items-center">
            <img 
              src={game?.homeTeam?.logo || '/placeholder-logo.png'} 
              alt={game?.homeTeam?.name || 'Home Team'}
              className="w-20 h-20 object-contain mb-2"
            />
            <h3 className="font-bold text-lg text-center text-[#f2f2f2]">{game?.homeTeam?.name}</h3>
            <p className="text-[#a68dff] text-sm">{game?.homeTeam?.abbreviation}</p>
            <div className="text-4xl font-bold mt-2 text-[#7f00ff]">{game?.homeTeam?.score || '0'}</div>
            {winner && winner.isHome && (
              <div className="mt-2 bg-[#7f00ff]/20 text-[#a68dff] px-3 py-1 rounded-full text-xs font-semibold">
                WINNER
              </div>
            )}
          </div>
          
          {/* Game Info Column */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-center mb-4">
              <div className="text-[#a68dff] text-sm mb-1">Final Score</div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-[#7f00ff]">{game?.homeTeam?.score || '0'}</span>
                <span className="text-[#a68dff]">-</span>
                <span className="text-xl font-bold text-[#7f00ff]">{game?.awayTeam?.score || '0'}</span>
              </div>
            </div>
            
            <div className="w-full bg-[#0d021f] rounded-lg p-3 border border-[#2f1a48]">
              <div className="text-center mb-2 text-[#a68dff] text-sm font-medium">
                Game Details
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#a68dff]/80">Date:</span>
                  <span className="text-[#f2f2f2]">{formattedGameTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a68dff]/80">Venue:</span>
                  <span className="text-[#f2f2f2]">{game?.venue?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a68dff]/80">Status:</span>
                  <span className="text-[#f2f2f2]">{game?.status?.detail || 'Final'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Away Team Column */}
          <div className="flex flex-col items-center">
            <img 
              src={game?.awayTeam?.logo || '/placeholder-logo.png'} 
              alt={game?.awayTeam?.name || 'Away Team'}
              className="w-20 h-20 object-contain mb-2"
            />
            <h3 className="font-bold text-lg text-center text-[#f2f2f2]">{game?.awayTeam?.name}</h3>
            <p className="text-[#a68dff] text-sm">{game?.awayTeam?.abbreviation}</p>
            <div className="text-4xl font-bold mt-2 text-[#7f00ff]">{game?.awayTeam?.score || '0'}</div>
            {winner && !winner.isHome && (
              <div className="mt-2 bg-[#7f00ff]/20 text-[#a68dff] px-3 py-1 rounded-full text-xs font-semibold">
                WINNER
              </div>
            )}
          </div>
        </div>
        
        {/* Game Summary */}
        <div className="bg-[#0d021f] rounded-lg p-4 mb-6 border border-[#2f1a48]">
          <h3 className="font-bold text-lg mb-3 text-[#f2f2f2]">Game Summary</h3>
          <p className="text-[#e0e0e0]">
            <span className="hidden md:inline">
              This game between {game?.homeTeam?.name} and {game?.awayTeam?.name} has ended. 
              The final score was {game?.homeTeam?.score || '0'}-{game?.awayTeam?.score || '0'}.
              {winner ? (
                <span> {winner.team.name} {winner.isHome ? '(home)' : '(away)'} won the game.</span>
              ) : (
                <span> The game ended in a tie.</span>
              )}
            </span>
            <span className="inline md:hidden">
              This game between {game?.homeTeam?.abbreviation} and {game?.awayTeam?.abbreviation} has ended. 
              The final score was {game?.homeTeam?.score || '0'}-{game?.awayTeam?.score || '0'}.
              {winner ? (
                <span> {winner.team.abbreviation} {winner.isHome ? '(home)' : '(away)'} won the game.</span>
              ) : (
                <span> The game ended in a tie.</span>
              )}
            </span>
          </p>
        </div>
        
        {/* Additional Game Stats - placeholder for future enhancement */}
        <div className="bg-[#0d021f] rounded-lg p-4 border border-[#2f1a48]">
          <h3 className="font-bold text-lg mb-3 text-[#f2f2f2]">Game Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="text-[#a68dff] text-sm mb-1">Home Team</div>
              <div className="flex justify-between border-b border-[#2f1a48] py-2">
                <span className="text-[#e0e0e0]">Score</span>
                <span className="font-bold text-[#7f00ff]">{game?.homeTeam?.score || '0'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#e0e0e0]">Record</span>
                <span className="font-bold text-[#f2f2f2]">-</span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-[#a68dff] text-sm mb-1">Away Team</div>
              <div className="flex justify-between border-b border-[#2f1a48] py-2">
                <span className="text-[#e0e0e0]">Score</span>
                <span className="font-bold text-[#7f00ff]">{game?.awayTeam?.score || '0'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#e0e0e0]">Record</span>
                <span className="font-bold text-[#f2f2f2]">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}