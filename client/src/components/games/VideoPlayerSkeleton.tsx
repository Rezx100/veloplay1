import { Skeleton } from "@/components/ui/skeleton";

export default function VideoPlayerSkeleton() {
  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex flex-col">
      {/* Main content skeleton */}
      <div className="flex-1 relative">
        <Skeleton className="absolute inset-0 w-full h-full" />
        
        {/* Center play button */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
      </div>
      
      {/* Controls skeleton */}
      <div className="p-3 bg-gray-800">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/4" />
          <div className="flex space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/4" />
        </div>
        
        {/* Progress bar */}
        <Skeleton className="h-2 w-full mt-3" />
      </div>
    </div>
  );
}