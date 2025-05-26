import React from 'react';
import { Link } from 'wouter';
import NetworkChannelCard, { NetworkChannel } from './NetworkChannelCard';
import { ArrowRightIcon } from 'lucide-react';

interface NetworkChannelGridProps {
  channels: NetworkChannel[];
  title: string;
  isLoading?: boolean;
  showViewAll?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
}

export default function NetworkChannelGrid({
  channels,
  title,
  isLoading = false,
  showViewAll = false,
  emptyMessage = "No channels available",
  emptyIcon = "tv"
}: NetworkChannelGridProps) {
  // Create skeleton array for loading state
  const skeletonCards = Array(5).fill(0).map((_, i) => i);

  return (
    <div className="mb-8">
      {/* Section header with title and optional "View All" link */}
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          
          {showViewAll && (
            <Link href="/channels" className="text-[#7f00ff] flex items-center gap-1 hover:underline">
              View All <ArrowRightIcon size={16} />
            </Link>
          )}
        </div>
      )}

      {isLoading ? (
        // Loading skeleton grid
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {skeletonCards.map((index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-video bg-zinc-800/50 rounded-xl mb-2"></div>
              <div className="h-4 bg-zinc-800/50 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-zinc-800/50 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : channels.length > 0 ? (
        // Actual channel grid
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {channels.map((channel) => (
            <NetworkChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        // Empty state
        <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
          <div className="text-5xl mb-4">
            <i className={`fas fa-${emptyIcon}`}></i>
          </div>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}