import { useState, useEffect } from "react";
import { NetworkChannel } from "@/components/channels/NetworkChannelCard";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Using the updated base URL with the new domain for streams
const STREAM_BASE_URL = 'https://vpt.pixelsport.to:443/psportsgate/psportsgate100/';

// Fallback network channels data in case the API is not available
const fallbackChannels: NetworkChannel[] = [
  {
    id: 1,
    name: "NBA TV",
    icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png",
    description: "24/7 coverage of NBA games, highlights, analysis, and special programming.",
    isActive: true,
    isPremium: false
  },
  {
    id: 2,
    name: "NFL Network",
    icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png",
    description: "The official network of the National Football League featuring live games, analysis, and exclusive content.",
    isActive: true,
    isPremium: false
  },
  {
    id: 3,
    name: "ESPN US",
    icon: "https://a.espncdn.com/i/espn/espn_logos/espn_red.png",
    description: "The worldwide leader in sports featuring live broadcasts, sports news, and analysis.",
    isActive: true,
    isPremium: false
  },
  {
    id: 4,
    name: "NHL Network",
    icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nhl.png",
    description: "The official network for National Hockey League coverage featuring games, highlights, and analysis.",
    isActive: true,
    isPremium: false
  },
  {
    id: 5,
    name: "MLB Network",
    icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mlb.png",
    description: "The official network for Major League Baseball coverage featuring games, highlights, and analysis.",
    isActive: true,
    isPremium: false
  }
];

// Admin hook for managing channels
export const useAdminNetworkChannels = () => {
  // Use TanStack Query to fetch and manage channels
  const { 
    data: channels = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/channels'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/channels');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching network channels:", error);
        // In case of error, return an empty array to avoid breaking the UI
        return [];
      }
    }
  });

  return {
    channels,
    isLoading,
    error,
    refetch
  };
};

export const useNetworkChannels = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<NetworkChannel[]>([]);

  useEffect(() => {
    const loadChannels = async () => {
      setIsLoading(true);
      try {
        // First try to fetch from API
        const response = await fetch('/api/channels');
        
        if (response.ok) {
          const data = await response.json();
          setChannels(data);
        } else {
          // If API fails, use fallback data
          const channelsWithUrls = fallbackChannels.map(channel => ({
            ...channel,
            streamUrl: `${STREAM_BASE_URL}${channel.id}.m3u8`
          }));
          setChannels(channelsWithUrls);
        }
      } catch (error) {
        console.error("Error loading network channels:", error);
        // If everything fails, use fallback data
        const channelsWithUrls = fallbackChannels.map(channel => ({
          ...channel,
          streamUrl: `${STREAM_BASE_URL}${channel.id}.m3u8`
        }));
        setChannels(channelsWithUrls);
      } finally {
        setIsLoading(false);
      }
    };

    loadChannels();
  }, []);

  return {
    channels,
    isLoading
  };
};

export const useNetworkChannel = (channelId: number | string) => {
  const { channels, isLoading } = useNetworkChannels();
  const [channel, setChannel] = useState<NetworkChannel | null>(null);

  useEffect(() => {
    if (!isLoading && channels.length > 0) {
      const id = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
      const foundChannel = channels.find(c => c.id === id) || null;
      setChannel(foundChannel);
    }
  }, [channelId, channels, isLoading]);

  return {
    channel,
    isLoading
  };
};