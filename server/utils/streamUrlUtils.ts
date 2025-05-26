/**
 * Utility functions for generating stream URLs
 */

/**
 * Generates a stream URL based on team name and stream ID
 * Base URL pattern: https://vp.pixelsport.to:443/psportsgate/psportsgate100/[STREAM_ID].m3u8
 * @param teamName The name of the team or channel
 * @param streamId The stream ID number
 * @returns Full stream URL
 */
export function generateStreamUrl(teamName: string, streamId: number): string {
  // Base URL for streams
  const baseUrl = "https://vp.pixelsport.to:443/psportsgate/psportsgate100";
  
  // Return the complete URL with the stream ID
  return `${baseUrl}/${streamId}.m3u8`;
}