import React from 'react';
import { Helmet } from 'react-helmet';
import NetworkChannelGrid from '@/components/channels/NetworkChannelGrid';
import { useNetworkChannels } from '@/hooks/useNetworkChannels';

export default function ChannelsPage() {
  const { channels, isLoading } = useNetworkChannels();

  return (
    <>
      <Helmet>
        <title>Live TV Channels - VeloPlay</title>
        <meta name="description" content="Watch 24/7 live sports networks including NBA TV, NHL Network, NFL Network, ESPN and more on VeloPlay." />
      </Helmet>

      <div className="container mx-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Live TV Channels</h1>
          <p className="text-zinc-400 mt-2">
            Stream premium sports networks 24/7, completely free with your VeloPlay account.
          </p>
        </div>

        <NetworkChannelGrid 
          channels={channels} 
          title="" 
          isLoading={isLoading} 
        />
      </div>
    </>
  );
}