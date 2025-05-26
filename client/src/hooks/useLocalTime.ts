import { useMemo } from 'react';

interface FormatOptions {
  weekday?: 'short' | 'long';
  month?: 'short' | 'long' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  hour12?: boolean;
  timeZoneName?: 'short' | 'long';
}

export function useLocalTime(utcDateString: string, options?: FormatOptions) {
  return useMemo(() => {
    if (!utcDateString) return '';
    
    try {
      const date = new Date(utcDateString);
      
      // Default options
      const defaultOptions: FormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      
      const formatter = new Intl.DateTimeFormat(
        navigator.language, 
        options || defaultOptions
      );
      
      return formatter.format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return utcDateString;
    }
  }, [utcDateString, options]);
}

export function useShortDate(utcDateString: string) {
  return useLocalTime(utcDateString, {
    month: 'short',
    day: 'numeric'
  });
}

export function useTimeOnly(utcDateString: string) {
  return useLocalTime(utcDateString, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function useDayOnly(utcDateString: string) {
  return useLocalTime(utcDateString, {
    weekday: 'short'
  });
}

export function useGameTime(utcDateString: string) {
  return useLocalTime(utcDateString, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
