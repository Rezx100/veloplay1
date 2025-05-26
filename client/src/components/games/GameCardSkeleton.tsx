import { Skeleton } from "@/components/ui/skeleton";

export default function GameCardSkeleton() {
  return (
    <div className="relative h-[200px] rounded-xl overflow-hidden shadow-lg">
      {/* Background skeleton */}
      <div className="absolute inset-0 bg-slate-800/80 overflow-hidden">
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
      
      {/* Top badges skeletons */}
      <div className="absolute top-0 left-0 right-0 p-2 flex justify-between z-20">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
      
      {/* Team logos and matchup skeletons */}
      <div className="absolute inset-x-0 top-[40%] transform -translate-y-1/2 flex justify-between items-center px-6 z-10">
        {/* Home team skeleton */}
        <div className="flex flex-col items-center w-2/5">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="mt-2 h-4 w-10" />
        </div>
        
        {/* Center VS indicator */}
        <div className="flex-shrink-0 w-1/5 flex justify-center items-center">
          <Skeleton className="h-6 w-6" />
        </div>
        
        {/* Away team skeleton */}
        <div className="flex flex-col items-center w-2/5">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="mt-2 h-4 w-10" />
        </div>
      </div>

      {/* Game info footer skeleton */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}