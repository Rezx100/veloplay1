import { useEffect } from 'react';

// Using environment variable for Crisp Website ID
const CRISP_WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID;

export default function CrispChat() {
  useEffect(() => {
    console.log('CrispChat component loaded');
    console.log('CRISP_WEBSITE_ID:', CRISP_WEBSITE_ID);
    
    // Initialize Crisp chat only on client side
    if (typeof window !== 'undefined') {
      if (CRISP_WEBSITE_ID) {
        // Configure Crisp
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
        
        // Set color and position before loading
        window.$crisp.push(['config', 'color:theme', '#7f00ff']);
        window.$crisp.push(['config', 'position:reverse', true]);
        window.$crisp.push(['safe', true]);
        
        // Load the Crisp script
        (function() {
          const d = document;
          const s = d.createElement('script');
          s.src = 'https://client.crisp.chat/l.js';
          s.async = true;
          d.getElementsByTagName('head')[0].appendChild(s);
        })();
        
        console.log('✅ Crisp chat initialized with ID:', CRISP_WEBSITE_ID);
      } else {
        console.log('❌ CRISP_WEBSITE_ID not found in environment variables');
      }
    }
  }, []);

  return null; // No UI to render
}