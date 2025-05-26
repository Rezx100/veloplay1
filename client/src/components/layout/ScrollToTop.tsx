import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Component that scrolls the window to the top whenever
 * the route location changes.
 */
export default function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Scroll to the top of the page on route changes
    window.scrollTo(0, 0);
  }, [location]);
  
  return null; // This component doesn't render anything
}