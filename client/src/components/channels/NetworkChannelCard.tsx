import React from 'react';
import { Link } from 'wouter';
import nbatvLogo from '@assets/NBA_TV.svg.png';
import nflnetworkLogo from '@assets/nflnetwork.webp';
import mlbtvLogo from '@assets/mlbtv.png';
import espnusLogo from '@assets/espnus.png';
import nhlnetworkLogo from '@assets/nhlnetwork.webp';

export interface NetworkChannel {
  id: number;
  name: string;
  icon: string;
  description: string;
  streamUrl?: string;
  isActive?: boolean;
  isPremium?: boolean;
}

interface NetworkChannelCardProps {
  channel: NetworkChannel;
  isPremium?: boolean;
}

export default function NetworkChannelCard({ channel, isPremium = false }: NetworkChannelCardProps) {
  const getChannelLogo = (channelName: string): string => {
    if (channelName.includes('NBA')) return nbatvLogo;
    if (channelName.includes('ESPN')) return espnusLogo;
    if (channelName.includes('NFL')) return nflnetworkLogo;
    if (channelName.includes('MLB')) return mlbtvLogo;
    if (channelName.includes('NHL')) return nhlnetworkLogo;
    return espnusLogo; // fallback to ESPN
  };

  return (
    <Link href={`/channel/${channel.id}`}>
      <div className="group cursor-pointer rounded-xl overflow-hidden relative shadow-lg hover:shadow-2xl transition-all duration-300 bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-[#7f00ff]/40">
        {/* Channel Icon & Background */}
        <div className="aspect-video bg-gradient-to-br from-[#7f00ff]/20 to-zinc-900 relative flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          
          {/* Professional channel logos */}
          <img 
            src={getChannelLogo(channel.name)} 
            alt={`${channel.name} logo`}
            className="max-h-16 md:max-h-20 object-contain z-10 transition-transform duration-300 group-hover:scale-110"
          />
          
          {/* Live Badge */}
          <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/70 px-2 py-1 rounded z-10">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs font-medium">LIVE</span>
          </div>
          
          {/* Premium Badge - Only show if marked as premium */}
          {isPremium && (
            <div className="absolute top-3 right-3 px-2 py-1 text-xs bg-[#7f00ff] text-white font-medium rounded">
              PREMIUM
            </div>
          )}
        </div>
        
        {/* Channel Info */}
        <div className="p-3">
          <h3 className="font-semibold text-white tracking-tight group-hover:text-[#7f00ff] transition-colors">
            {channel.name}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 min-h-[2rem]">
            {channel.description}
          </p>
        </div>
      </div>
    </Link>
  );
}