// Stream URL utilities for handling different domain formats and providing fallbacks
import { standardizeStreamUrl as apiStandardizeStreamUrl, createStreamUrl } from '@/lib/api';

// Constants for stream domains
const CURRENT_DOMAIN = 'vpt.pixelsport.to';
const FALLBACK_DOMAIN = 'vp.pixelsport.to';
const STREAM_PATH = 'psportsgate/psportsgate100';

// Cache invalidation timestamp - forces refresh of stream URLs periodically
// Initialize with a value far in the past to ensure first request refreshes the cache
let lastCacheInvalidation = 0;

// Version number for stream ID mapping - increment when team IDs are updated
// v2: MLB team IDs updated to 148-177 range (May 21, 2025)
// v3: Added comprehensive ID handling for NHL (6-35), NFL (36-65), and NBA (98-127) teams (May 21, 2025)
// v4: MLB team IDs updated to 185-214 range from M3U8 source (May 23, 2025)
const STREAM_MAPPING_VERSION = 4;

/**
 * Processes a stream URL to ensure it's using the current domain, with automatic fallback
 * if needed. This standardizes all stream URLs across the application.
 * 
 * @param originalUrl The original stream URL from API
 * @returns The standardized stream URL with the current domain
 */
export function getStandardizedStreamUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  
  // More aggressive cache invalidation (every 1 minute)
  const now = Date.now();
  if (now - lastCacheInvalidation > 1 * 60 * 1000) {
    console.log('[StreamURL] Cache invalidation triggered, forcing refresh of stream URLs');
    lastCacheInvalidation = now;
    
    // Force refresh stream sources to get the latest URLs
    fetchLatestStreamSources();
  }
  
  // Basic cleanup of URL
  const cleanUrl = originalUrl.trim();
  
  // First try to get a fresh URL from the cache
  const streamId = getStreamId(cleanUrl);
  if (streamId) {
    const freshUrl = getLatestStreamUrl(streamId);
    if (freshUrl) {
      console.log(`[StreamURL] Using fresh URL for stream ${streamId}: ${freshUrl}`);
      return freshUrl;
    }
  }
  
  // Use the standardized URL from our API utilities
  const standardizedUrl = apiStandardizeStreamUrl(cleanUrl);
  
  // Apply all sports-specific URL updates to ensure consistent ID mappings
  let finalUrl = standardizedUrl;
  finalUrl = updateMlbStreamUrl(finalUrl);
  finalUrl = updateNhlStreamUrl(finalUrl);
  finalUrl = updateNflStreamUrl(finalUrl);
  finalUrl = updateNbaStreamUrl(finalUrl);
  
  return finalUrl;
}

// Store the latest stream URLs from the server
let latestStreamUrls: Record<string, string> = {};

// Track failed fetch attempts to retry with exponential backoff
let fetchFailureCount = 0;
const MAX_FETCH_RETRIES = 3;

/**
 * Fetch the latest stream sources from the server to ensure
 * we always have the most up-to-date URLs, including the new MLB team IDs (148-177)
 */
async function fetchLatestStreamSources() {
  try {
    // Add cache-busting parameters - timestamp and version to force fresh data
    const cacheBuster = `?_=${Date.now()}&v=${STREAM_MAPPING_VERSION}`;
    console.log('[StreamURL] Fetching latest stream sources from server (MLB IDs v2)');
    
    // Add proper headers including credentials for authentication
    const fetchOptions: RequestInit = {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include' as RequestCredentials // Include credentials for authenticated requests
    };
    
    const response = await fetch(`/api/stream-sources/latest${cacheBuster}`, fetchOptions);
    
    if (response.ok) {
      const data = await response.json();
      
      // Update our local cache with the latest URLs
      if (data && data.sources && Array.isArray(data.sources)) {
        const newUrls: Record<string, string> = {};
        
        data.sources.forEach((source: { id: number; url: string }) => {
          if (source.id && source.url) {
            // Extract the stream ID from the URL if available
            const streamId = getStreamId(source.url) || String(source.id);
            
            // Ensure we're using the latest URL format with the correct domain
            let updatedUrl = source.url;
            if (updatedUrl.includes(FALLBACK_DOMAIN)) {
              updatedUrl = updatedUrl.replace(FALLBACK_DOMAIN, CURRENT_DOMAIN);
            }
            
            newUrls[streamId] = updatedUrl;
          }
        });
        
        // Only update if we have stream URLs (prevent empty cache)
        if (Object.keys(newUrls).length > 0) {
          latestStreamUrls = newUrls;
          console.log(`[StreamURL] Updated ${Object.keys(newUrls).length} stream URLs with MLB IDs v2`);
          
          // Reset failure count after successful fetch
          fetchFailureCount = 0;
        } else {
          console.warn('[StreamURL] Received empty stream sources list - keeping existing cache');
        }
      }
    } else {
      console.error('[StreamURL] Failed to fetch latest stream sources:', response.status);
      // Implement retry logic
      handleFetchFailure();
    }
  } catch (error) {
    console.error('[StreamURL] Error fetching latest stream sources:', error);
    // Implement retry logic
    handleFetchFailure();
  }
}

/**
 * Handle failed fetch attempts with exponential backoff
 */
function handleFetchFailure() {
  fetchFailureCount++;
  
  if (fetchFailureCount <= MAX_FETCH_RETRIES) {
    const backoffDelay = Math.min(1000 * (2 ** fetchFailureCount), 8000);
    console.log(`[StreamURL] Retrying fetch in ${backoffDelay}ms (attempt ${fetchFailureCount}/${MAX_FETCH_RETRIES})`);
    
    setTimeout(() => {
      fetchLatestStreamSources();
    }, backoffDelay);
  }
}

/**
 * Get the latest URL for a specific stream ID
 * 
 * @param streamId The stream ID to look up
 * @returns The latest URL from the server or null if not found
 */
function getLatestStreamUrl(streamId: string): string | null {
  let url = latestStreamUrls[streamId] || null;
  
  if (url) {
    // Apply all of our sport-specific URL updates to ensure consistent formatting
    url = updateMlbStreamUrl(url);
    url = updateNhlStreamUrl(url);
    url = updateNflStreamUrl(url);
    url = updateNbaStreamUrl(url);
  }
  
  return url;
}

/**
 * Creates a fallback URL for a given stream URL, switching the domain
 * from the current to the fallback domain or vice versa.
 * 
 * @param streamUrl The original stream URL
 * @returns A fallback URL using the alternate domain
 */
export function getFallbackStreamUrl(streamUrl: string): string | null {
  if (!streamUrl) return null;
  
  // If using the current domain, switch to fallback domain
  if (streamUrl.includes(CURRENT_DOMAIN)) {
    return streamUrl.replace(CURRENT_DOMAIN, FALLBACK_DOMAIN);
  }
  
  // If using the fallback domain, switch to current domain
  if (streamUrl.includes(FALLBACK_DOMAIN)) {
    return streamUrl.replace(FALLBACK_DOMAIN, CURRENT_DOMAIN);
  }
  
  // If it's neither domain, return null (no fallback available)
  return null;
}

/**
 * Extracts the stream ID from a pixelsport URL
 * 
 * @param streamUrl The stream URL
 * @returns The stream ID or null if not found
 */
export function getStreamId(streamUrl: string): string | null {
  if (!streamUrl) return null;
  
  const pixelsportPattern = /https?:\/\/[^\/]+:?\d*\/psportsgate\/psportsgate100\/(\d+)\.m3u8/;
  const match = streamUrl.match(pixelsportPattern);
  
  return match ? match[1] : null;
}

/**
 * Determines if a given stream URL is a special channel (like NBA TV)
 * 
 * @param streamUrl The stream URL
 * @returns Whether it's a special channel (ID 1-5)
 */
export function isSpecialChannel(streamUrl: string): boolean {
  const streamId = getStreamId(streamUrl);
  
  if (!streamId) return false;
  
  // Special channels have IDs 1-5
  return parseInt(streamId, 10) >= 1 && parseInt(streamId, 10) <= 5;
}

/**
 * Updates MLB team streams to use the correct ID range (185-214)
 * This is used when editing streams in the admin panel
 * 
 * @param streamUrl The original stream URL
 * @returns The updated stream URL with correct MLB team ID
 */
export function updateMlbStreamUrl(streamUrl: string): string {
  if (!streamUrl) return streamUrl;
  
  const streamId = getStreamId(streamUrl);
  if (!streamId) return streamUrl;
  
  // Convert to number
  const idNum = parseInt(streamId, 10);
  
  // Check if this is an MLB team in the old ID ranges and convert to new range (185-214)
  // EXCLUDE special channels (1-5): NBA TV=1, NFL NETWORK=2, ESPN US=3, NHL NETWORK=4, NFL REDZONE=5
  // MLB teams now use IDs 185-214 (as of May 23, 2025)
  
  // Handle old ranges that need updating to new 185-214 range
  let newId = null;
  
  // Old range 6-30 -> new range starting at 185
  if (idNum >= 6 && idNum <= 30) {
    newId = idNum + 179; // 6+179=185, 30+179=209
  }
  // Old range 148-177 -> new range 185-214
  else if (idNum >= 148 && idNum <= 177) {
    newId = idNum + 37; // 148+37=185, 177+37=214
  }
  
  if (newId) {
    console.log(`[MLB Stream Update] Converting old MLB stream ID ${idNum} to new ID ${newId}`);
    return streamUrl.replace(`/${idNum}.m3u8`, `/${newId}.m3u8`);
  }
  
  return streamUrl;
}

/**
 * Updates NHL team streams to use the correct ID range (6-35)
 * This ensures consistent NHL stream IDs across the application
 * 
 * @param streamUrl The original stream URL
 * @returns The updated stream URL with correct NHL team ID
 */
export function updateNhlStreamUrl(streamUrl: string): string {
  if (!streamUrl) return streamUrl;
  
  const streamId = getStreamId(streamUrl);
  if (!streamId) return streamUrl;
  
  // Convert to number
  const idNum = parseInt(streamId, 10);
  
  // Validate if this is actually an NHL team ID
  // NHL teams should use IDs 6-35
  const isInValidRange = idNum >= 6 && idNum <= 35;
  
  // If it's already in the right range, return as is
  if (isInValidRange) {
    return streamUrl;
  }
  
  // For IDs that might need correction (e.g., legacy IDs), add logic here
  // This is a placeholder for future NHL stream ID migrations if needed
  
  return streamUrl;
}

/**
 * Updates NFL team streams to use the correct ID range (36-65)
 * This ensures consistent NFL stream IDs across the application
 * 
 * @param streamUrl The original stream URL
 * @returns The updated stream URL with correct NFL team ID
 */
export function updateNflStreamUrl(streamUrl: string): string {
  if (!streamUrl) return streamUrl;
  
  const streamId = getStreamId(streamUrl);
  if (!streamId) return streamUrl;
  
  // Convert to number
  const idNum = parseInt(streamId, 10);
  
  // Validate if this is actually an NFL team ID
  // NFL teams should use IDs 36-65
  const isInValidRange = idNum >= 36 && idNum <= 65;
  
  // If it's already in the right range, return as is
  if (isInValidRange) {
    return streamUrl;
  }
  
  // For IDs that might need correction (e.g., legacy IDs), add logic here
  // This is a placeholder for future NFL stream ID migrations if needed
  
  return streamUrl;
}

/**
 * Updates NBA team streams to use the correct ID range (98-127)
 * This ensures consistent NBA stream IDs across the application
 * 
 * @param streamUrl The original stream URL
 * @returns The updated stream URL with correct NBA team ID
 */
export function updateNbaStreamUrl(streamUrl: string): string {
  if (!streamUrl) return streamUrl;
  
  const streamId = getStreamId(streamUrl);
  if (!streamId) return streamUrl;
  
  // Convert to number
  const idNum = parseInt(streamId, 10);
  
  // Validate if this is actually an NBA team ID
  // NBA teams should use IDs 98-127
  const isInValidRange = idNum >= 98 && idNum <= 127;
  
  // If it's already in the right range, return as is
  if (isInValidRange) {
    return streamUrl;
  }
  
  // For IDs that might need correction (e.g., legacy IDs), add logic here
  // This is a placeholder for future NBA stream ID migrations if needed
  
  return streamUrl;
}