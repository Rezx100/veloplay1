import { Skeleton } from "@/components/ui/skeleton";

export default function GameDetailsSkeleton() {
  return (
    <div className="space-y-4 p-4 bg-slate-800/40 rounded-xl">
      {/* Game title and status */}
      <div className="flex flex-col space-y-2">
        <Skeleton className="h-6 w-3/4 max-w-[400px]" />
        <Skeleton className="h-4 w-1/2 max-w-[250px]" />
      </div>
      
      {/* Teams info */}
      <div className="flex items-center justify-between py-4">
        {/* Home team */}
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
          <Skeleton className="h-5 w-24 mt-2" />
          <Skeleton className="h-7 w-14" />
        </div>
        
        {/* Game state */}
        <div className="flex flex-col items-center">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        
        {/* Away team */}
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
          <Skeleton className="h-5 w-24 mt-2" />
          <Skeleton className="h-7 w-14" />
        </div>
      </div>
      
      {/* Additional info */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}