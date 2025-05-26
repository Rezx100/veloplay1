import React from 'react';
import { Home, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoFeedSelectorProps {
  currentFeed: 'home' | 'away';
  hasAwayFeed: boolean;
  onChangeFeed: (feed: 'home' | 'away') => void;
  className?: string;
}

export function VideoFeedSelector({
  currentFeed,
  hasAwayFeed,
  onChangeFeed,
  className
}: VideoFeedSelectorProps) {
  if (!hasAwayFeed) {
    return null; // Don't show selector if there's no away feed
  }

  return (
    <div className={cn("absolute top-2 right-2 z-40 bg-[#0d021f]/70 rounded-md p-1 backdrop-blur-sm border border-[#2f1a48]", className)}>
      <div className="flex space-x-1">
        <button
          className={cn(
            "flex items-center justify-center rounded px-2 py-1 text-xs font-medium transition-colors",
            currentFeed === 'home'
              ? "bg-[#7f00ff] text-white"
              : "bg-black/40 text-white hover:bg-[#2f1a48]"
          )}
          onClick={() => onChangeFeed('home')}
          title="Home feed"
        >
          <Home className="w-3.5 h-3.5 mr-1" />
          <span>Home</span>
        </button>
        
        <button
          className={cn(
            "flex items-center justify-center rounded px-2 py-1 text-xs font-medium transition-colors",
            currentFeed === 'away'
              ? "bg-[#7f00ff] text-white"
              : "bg-black/40 text-white hover:bg-[#2f1a48]"
          )}
          onClick={() => onChangeFeed('away')}
          title="Away feed"
        >
          <Users className="w-3.5 h-3.5 mr-1" />
          <span>Away</span>
        </button>
      </div>
    </div>
  );
}