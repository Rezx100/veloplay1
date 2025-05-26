import { Game } from '@shared/schema';
import { Link } from 'wouter';
import { useLocalTime } from '@/hooks/useLocalTime';

interface GameListItemProps {
  game: Game;
}

export default function GameListItem({ game }: GameListItemProps) {
  const formattedTime = useLocalTime(game.date);

  return (
    <div className="bg-[#111] rounded-xl overflow-hidden border border-[#222] transition-all duration-300 hover:border-primary">
      <div className="flex flex-col md:flex-row">
        <div className={`relative md:w-48 h-32 md:h-full flex items-center justify-center ${
          game.league === 'nba' ? 'bg-[#1d428a]' :
          game.league === 'nfl' ? 'bg-[#013369]' :
          game.league === 'nhl' ? 'bg-[#041e42]' :
          'bg-[#041e42]'
        } p-6`}>
          <div className="text-white font-bold text-xl">{game.league.toUpperCase()}</div>
        </div>

        <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {game.state === 'in' && (
                <span className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span>LIVE</span>
                </span>
              )}
              <span className="text-gray-400 text-base">{formattedTime}</span>
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              <span className="hidden md:inline">{game.homeTeam.name} vs {game.awayTeam.name}</span>
              <span className="inline md:hidden">{game.homeTeam.abbreviation} vs {game.awayTeam.abbreviation}</span>
            </h3>

            <div className="text-gray-400 text-base">
              {game.venue?.name}
            </div>
          </div>

          <div className="mt-4 md:mt-0 md:ml-6 flex items-center gap-3">
            <Link href={`/game/${game.id}`}>
              <a 
                onClick={() => {
                  // Ensure the page scrolls to top when navigating to a game page
                  window.scrollTo(0, 0);
                }}
                className={`
                ${game.state === 'in' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : game.state === 'post'
                    ? 'bg-neutral-600 hover:bg-neutral-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } 
                text-white px-5 py-2.5 rounded-lg text-base font-semibold transition-colors flex items-center gap-2`}
              >
                <span>
                  {game.state === 'in' 
                    ? 'Watch Live' 
                    : game.state === 'post' 
                      ? 'See Recap' 
                      : 'Set Reminder'}
                </span>
                <i className={`fas ${
                  game.state === 'in'
                    ? 'fa-play'
                    : game.state === 'post'
                      ? 'fa-chart-bar'
                      : 'fa-bell'
                }`}></i>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}