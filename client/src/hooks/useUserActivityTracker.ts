import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';

export function useUserActivityTracker() {
  const [location] = useLocation();

  useEffect(() => {
    // Track user activity when location changes
    const trackActivity = async () => {
      try {
        // Extract current page from location
        let currentPage = location === "/" ? "Home" : location.replace(/^\//, "").split("/")[0];
        // Capitalize first letter
        currentPage = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

        // Track the activity
        await fetch('/api/track-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ currentPage })
        });
      } catch (error) {
        // Silently fail to not disrupt user experience
        console.log('Activity tracking failed:', error);
      }
    };

    // Track immediately when component mounts or location changes
    trackActivity();

    // Track activity every 30 seconds to keep session alive
    const interval = setInterval(trackActivity, 30000);

    return () => clearInterval(interval);
  }, [location]);
}