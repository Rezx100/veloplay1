import GameCardSkeleton from "./GameCardSkeleton";

interface GameCarouselSkeletonProps {
  count?: number; // Number of skeleton cards to display
}

export default function GameCarouselSkeleton({ count = 4 }: GameCarouselSkeletonProps) {
  return (
    <div className="mb-10">
      {/* Title skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-40 bg-slate-700/50 rounded animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-slate-700/50 rounded-full animate-pulse"></div>
          <div className="h-8 w-8 bg-slate-700/50 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Cards container */}
      <div className="flex overflow-x-hidden space-x-4">
        {Array(count)
          .fill(0)
          .map((_, index) => (
            <div 
              key={`skeleton-${index}`} 
              className="flex-none w-full sm:w-1/2 md:w-1/4 lg:w-1/4 xl:w-1/4 px-2 first:pl-0 last:pr-0"
            >
              <GameCardSkeleton />
            </div>
          ))}
      </div>
    </div>
  );
}