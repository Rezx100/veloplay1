import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function TrialOfferPopup() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Disabled - popup will not automatically show
    // This component is kept for future promotional offers
    
    // Keep track of popup visibility for returning users
    const hasSeenPopup = localStorage.getItem('veloplay_promo_popup_seen');
    // If we want to show the popup, we can manually set it to true elsewhere
  }, []);
  
  const handleClose = () => {
    setIsVisible(false);
    // Remember that this user has seen the popup
    localStorage.setItem('veloplay_promo_popup_seen', 'true');
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fadeIn">
      <div className="relative w-full max-w-md p-6 rounded-xl bg-gradient-to-br from-[#1a0533] to-[#0d021f] border border-[#7f00ff]/30 shadow-xl overflow-hidden animate-scaleIn">
        {/* Purple glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#7f00ff] opacity-30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#7f00ff] opacity-20 rounded-full blur-3xl"></div>
        
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close popup"
        >
          <X size={20} />
        </button>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="text-3xl font-bold text-[#f2f2f2] flex items-center">
              <div className="flex items-center">
                {/* V with outline effect */}
                <span className="relative" style={{ marginTop: '-1px' }}>
                  <span className="absolute -left-[0.5px] -top-[0.5px] text-white">V</span>
                  <span className="absolute -left-[1px] -top-[1px] text-white">V</span>
                  <span className="absolute -left-[1.5px] -top-[1.5px] text-white">V</span>
                  <span className="relative z-10 text-[#9333ea]">V</span>
                </span>
                {/* elo - gradient text */}
                <span className="bg-gradient-to-r from-[#9333ea] to-[#06b6d4] bg-clip-text text-transparent">elo</span>
                {/* Play - white text */}
                <span className="text-[#f2f2f2]">Play</span>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Special Offer!
          </h2>
          
          <div className="bg-[#7f00ff]/10 border border-[#7f00ff]/30 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-xl text-white text-center mb-1">
              Premium Subscription
            </h3>
            <p className="text-gray-300 text-center mb-3">
              Full access to all premium content
            </p>
            <div className="flex justify-center mb-2">
              <div className="px-4 py-1 bg-[#7f00ff] text-white font-bold rounded-full text-sm">
                PREMIUM PLANS AVAILABLE
              </div>
            </div>
          </div>
          
          <p className="text-gray-300 text-center mb-6">
            Sign up now to enjoy unlimited access to all live games, exclusive content, and premium features.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button 
              onClick={handleClose}
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Maybe Later
            </Button>
            
            <Link href="/pricing" onClick={handleClose}>
              <Button className="bg-[#7f00ff] hover:bg-[#9333ea] text-white">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}