import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to user's local timezone
export function formatLocalTime(utcDateStr: string, options: Intl.DateTimeFormatOptions = {}): string {
  if (!utcDateStr) return '';
  
  try {
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
  } catch (error) {
    console.error('Error formatting date:', error);
    return utcDateStr;
  }
}

// Format price from cents to dollars
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

// Get league information based on league ID
export function getLeagueInfo(leagueId: string) {
  const leagueMap: Record<string, { name: string, icon: string, color: string }> = {
    nba: { name: 'NBA', icon: 'basketball-ball', color: '#C9082A' },
    nfl: { name: 'NFL', icon: 'football-ball', color: '#013369' },
    nhl: { name: 'NHL', icon: 'hockey-puck', color: '#0033A0' },
    mlb: { name: 'MLB', icon: 'baseball-ball', color: '#002D72' }
  };
  
  return leagueMap[leagueId] || { name: leagueId.toUpperCase(), icon: 'question', color: '#333333' };
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Format date for display
export function formatDate(dateString: string, format: 'short' | 'long' | 'time' = 'short'): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString();
  } else if (format === 'time') {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Filter games by date
export function filterGamesByDate(games: any[], date: Date): any[] {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return games.filter(game => {
    const gameDate = new Date(game.date);
    gameDate.setHours(0, 0, 0, 0);
    return gameDate.getTime() === targetDate.getTime();
  });
}

// Create avatar URL from initials
export function createAvatarUrl(name: string, size = 64): string {
  const initials = name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
    
  return `https://ui-avatars.com/api/?name=${initials}&size=${size}&background=1a1a1a&color=fff`;
}
