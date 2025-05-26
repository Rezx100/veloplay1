import { Game } from "@shared/schema";

// ESPN API endpoint URLs
const API_ENDPOINTS = {
  NHL: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=hockey&league=nhl',
  NBA: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=basketball&league=nba',
  NFL: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=football&league=nfl',
  MLB: 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=baseball&league=mlb',
};

// Constants for stream URL patterns
export const STREAM_URL_DOMAIN = 'vpt.pixelsport.to';
export const STREAM_URL_PORT = '443';
export const STREAM_URL_PATH = 'psportsgate/psportsgate100';

// Fallback stream URL for all games if no custom stream is specified
export const FALLBACK_STREAM_URL = 'https://live.webcastserver.online/hdstream/embed/86.m3u8';

/**
 * Standardizes a stream URL to ensure it uses the consistent domain and path pattern
 * @param url The stream URL to standardize
 * @returns The standardized stream URL
 */
export function standardizeStreamUrl(url: string): string {
  if (!url) return FALLBACK_STREAM_URL;
  
  try {
    // Extract the stream ID using a regex pattern
    const match = url.match(/\/(\d+)\.m3u8$/);
    if (!match) return url;
    
    const streamId = match[1];
    return `https://${STREAM_URL_DOMAIN}:${STREAM_URL_PORT}/${STREAM_URL_PATH}/${streamId}.m3u8`;
  } catch (error) {
    console.error('Error in standardizeStreamUrl:', error);
    return url;
  }
}

/**
 * Creates a standardized stream URL from a stream ID
 * @param streamId The stream ID
 * @returns The standardized stream URL
 */
export function createStreamUrl(streamId: number): string {
  return `https://${STREAM_URL_DOMAIN}:${STREAM_URL_PORT}/${STREAM_URL_PATH}/${streamId}.m3u8`;
}

interface TeamData {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score?: number;
}

interface VenueData {
  name: string;
  city: string;
}

interface StatusData {
  period: number;
  clock?: string;
  displayClock?: string;
  detail: string;
}

export interface GameData {
  id: string;
  date: string;
  name: string;
  shortName: string;
  state: 'pre' | 'in' | 'post';
  league: 'nba' | 'nfl' | 'nhl' | 'mlb';
  homeTeam: TeamData;
  awayTeam: TeamData;
  venue: VenueData;
  status: StatusData;
}

// Helper function to determine game state from ESPN API response
export function determineGameState(stateStr: string): 'pre' | 'in' | 'post' {
  if (stateStr === 'in' || stateStr === 'live' || stateStr === 'in_progress') {
    return 'in';
  } else if (stateStr === 'post') {
    return 'post';
  } else {
    return 'pre';
  }
}

// Helper function to format date to user's local timezone
export function formatToLocalTime(utcDateStr: string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(utcDateStr);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const formatter = new Intl.DateTimeFormat(
    navigator.language, 
    { ...defaultOptions, ...options }
  );
  
  return formatter.format(date);
}

// Function to get league name and icon information
export function getLeagueInfo(leagueId: string) {
  const leagueMap = {
    nba: { name: 'NBA', icon: 'basketball-ball', color: '#C9082A' },
    nfl: { name: 'NFL', icon: 'football-ball', color: '#013369' },
    nhl: { name: 'NHL', icon: 'hockey-puck', color: '#0033A0' },
    mlb: { name: 'MLB', icon: 'baseball-ball', color: '#002D72' }
  };
  
  return leagueMap[leagueId as keyof typeof leagueMap] || 
    { name: leagueId.toUpperCase(), icon: 'question', color: '#333333' };
}
