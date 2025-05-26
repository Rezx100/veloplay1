import React from 'react';
import GameCard from './GameCard';
import { Game } from '@shared/schema';
import GameCarouselSkeleton from './GameCarouselSkeleton';

interface LiveGamesGridProps {
  games: Game[];
  title: string;
  emptyMessage?: string;
  emptyIcon?: string;
  isLoading?: boolean;
}

const LiveGamesGrid: React.FC<LiveGamesGridProps> = ({ 
  games, 
  title, 
  emptyMessage = 'No live games available',
  emptyIcon = 'broadcast-tower',
  isLoading = false
}) => {
  // Show skeleton loader during loading
  if (isLoading) {
    return (
      <div className="mb-8">
        {title && (
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="game-grid-item">
              <div className="h-[200px] rounded-xl bg-slate-800/50 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {title && (
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          {games.length > 0 && (
            <span className="px-3 py-1 bg-purple-900/40 rounded-full text-sm font-medium">
              {games.length} {games.length === 1 ? 'Game' : 'Games'}
            </span>
          )}
        </div>
      )}

      {games.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 fade-in">
          {games.map((game, index) => (
            <div key={`${game.id}-${index}`} className="game-grid-item">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center rounded-lg bg-slate-900/30 border border-slate-800/50">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-white/90">{emptyMessage}</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Check back later for live games or try a different date from the date picker above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveGamesGrid;