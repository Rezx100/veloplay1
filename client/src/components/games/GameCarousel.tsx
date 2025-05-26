import React, { useState, useEffect, useCallback } from 'react';
import GameCard from './GameCard';
import { Game } from '@shared/schema';
import GameCarouselSkeleton from './GameCarouselSkeleton';
import useEmblaCarousel from 'embla-carousel-react';

interface GameCarouselProps {
  games: Game[];
  title: string;
  emptyMessage?: string;
  emptyIcon?: string;
  isLoading?: boolean;
  showUnlimited?: boolean; // Flag to show unlimited games for premium users
}

const GameCarousel: React.FC<GameCarouselProps> = ({ 
  games, 
  title, 
  emptyMessage = 'No games available',
  emptyIcon = 'calendar-day',
  isLoading = false,
  showUnlimited = false // Default to false (non-premium behavior)
}) => {
  // Initialize Embla Carousel with improved settings
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    dragFree: true,
    containScroll: 'trimSnaps',
    skipSnaps: true // Smoother scrolling
  });
  
  const [showingSkeleton, setShowingSkeleton] = useState(true);
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  // Functions to scroll the carousel
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  
  // Update button states
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);
  
  // Initialize the carousel and attach event listeners
  useEffect(() => {
    if (emblaApi) {
      onSelect();
      emblaApi.on('select', onSelect);
      emblaApi.on('reInit', onSelect);
    }
    
    return () => {
      if (emblaApi) {
        emblaApi.off('select', onSelect);
        emblaApi.off('reInit', onSelect);
      }
    };
  }, [emblaApi, onSelect]);
  
  // Handle loading state with a skeleton
  useEffect(() => {
    if (isLoading) {
      setShowingSkeleton(true);
    } else {
      const timer = setTimeout(() => {
        setShowingSkeleton(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, games.length]);
  
  // Show skeleton loader during loading
  if (showingSkeleton) {
    return <GameCarouselSkeleton count={4} />;
  }

  return (
    <div className="mb-8">
      {title && (
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          
          {/* Navigation Buttons */}
          {games.length > 4 && (
            <div className="flex space-x-2">
              <button 
                className={`rounded-full w-8 h-8 flex items-center justify-center bg-gray-800 ${!prevBtnEnabled ? 'opacity-50 cursor-default' : 'hover:bg-gray-700'}`}
                onClick={scrollPrev}
                disabled={!prevBtnEnabled}
                aria-label="Previous games"
              >
                <i className="fas fa-chevron-left text-white"></i>
              </button>
              <button 
                className={`rounded-full w-8 h-8 flex items-center justify-center bg-gray-800 ${!nextBtnEnabled ? 'opacity-50 cursor-default' : 'hover:bg-gray-700'}`}
                onClick={scrollNext}
                disabled={!nextBtnEnabled}
                aria-label="Next games"
              >
                <i className="fas fa-chevron-right text-white"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons for carousels without titles */}
      {!title && games.length > 4 && (
        <div className="mb-4 flex justify-end">
          <div className="flex space-x-2">
            <button 
              className={`rounded-full w-8 h-8 flex items-center justify-center bg-gray-800 ${!prevBtnEnabled ? 'opacity-50 cursor-default' : 'hover:bg-gray-700'}`}
              onClick={scrollPrev}
              disabled={!prevBtnEnabled}
              aria-label="Previous games"
            >
              <i className="fas fa-chevron-left text-white"></i>
            </button>
            <button 
              className={`rounded-full w-8 h-8 flex items-center justify-center bg-gray-800 ${!nextBtnEnabled ? 'opacity-50 cursor-default' : 'hover:bg-gray-700'}`}
              onClick={scrollNext}
              disabled={!nextBtnEnabled}
              aria-label="Next games"
            >
              <i className="fas fa-chevron-right text-white"></i>
            </button>
          </div>
        </div>
      )}

      {games.length > 0 ? (
        <div className="relative">
          {showUnlimited ? (
            /* Unlimited view - grid layout showing all games */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {games.map((game, index) => (
                <div 
                  key={`${game.id}-${index}`} 
                  className="select-none relative"
                >
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          ) : (
            /* Limited view - scrollable carousel with 4 visible games */
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {games.map((game, index) => (
                  <div 
                    key={`${game.id}-${index}`} 
                    className="flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_25%] pl-0 pr-4 select-none"
                  >
                    <GameCard game={game} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center rounded-lg bg-slate-900/30 border border-slate-800/50">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-800/50">
              <i className={`fas fa-${emptyIcon} text-xl text-purple-400/70`}></i>
            </div>
            <h3 className="text-xl font-medium text-white/90">{emptyMessage}</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Check back later or try selecting a different date from the date picker.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCarousel;