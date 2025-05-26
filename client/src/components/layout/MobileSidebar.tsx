import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any; // Combined user data from useAuth hook
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin?: boolean; // Admin flag passed directly from useAuth
}

export default function MobileSidebar({ isOpen, onClose, user, isLoading, isAuthenticated, isAdmin }: MobileSidebarProps) {
  const [location] = useLocation();
  
  // Check if user has an active subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription'],
    enabled: isAuthenticated, // Only fetch if user is authenticated
  });
  
  // Function to check if subscription is active
  const hasActiveSubscription = () => {
    if (!subscription) return false;
    
    // Check if subscription exists, is active, and has an end date in the future
    return Boolean(subscription && 
           subscription.isActive && 
           new Date(subscription.endDate) > new Date());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 md:hidden">
      <div className="bg-[#130426] h-full w-64 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div 
            className="text-3xl font-bold flex items-center cursor-pointer"
            onClick={() => {
              window.location.href = "/";
              onClose();
            }}
          >
            <div className="flex items-center">
              {/* All text in one line for better proportions */}
              <span className="font-extrabold flex items-center">
                {/* V with outline effect - no extra spacing */}
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
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#f2f2f2] p-2">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <nav className="flex-1">
          <div 
            onClick={() => {
              window.location.href = "/";
              onClose();
            }}
            className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/' ? 'bg-[#2f1a48]' : ''}`}
          >
            <i className="fas fa-home mr-2 text-[#b08eff]"></i> Home
          </div>
          
          <div className="py-2 px-4 text-[#a68dff] text-sm uppercase font-medium mt-2">Leagues</div>
          
          <div 
            onClick={() => {
              window.location.href = "/league/nhl";
              onClose();
            }}
            className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/nhl' ? 'bg-[#2f1a48]' : ''}`}
          >
            <i className="fas fa-hockey-puck mr-2 text-[#b08eff]"></i> NHL
          </div>
          
          <div 
            onClick={() => {
              window.location.href = "/league/nba";
              onClose();
            }}
            className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/nba' ? 'bg-[#2f1a48]' : ''}`}
          >
            <i className="fas fa-basketball-ball mr-2 text-[#b08eff]"></i> NBA
          </div>
          
          <div 
            onClick={() => {
              window.location.href = "/league/nfl";
              onClose();
            }}
            className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/nfl' ? 'bg-[#2f1a48]' : ''}`}
          >
            <i className="fas fa-football-ball mr-2 text-[#b08eff]"></i> NFL
          </div>
          
          <div 
            onClick={() => {
              window.location.href = "/league/mlb";
              onClose();
            }}
            className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/mlb' ? 'bg-[#2f1a48]' : ''}`}
          >
            <i className="fas fa-baseball-ball mr-2 text-[#b08eff]"></i> MLB
          </div>
          
          <div className="py-2 px-4 text-[#a68dff] text-sm uppercase font-medium mt-2">Account</div>
          
          {isAuthenticated && (
            <>
              {isAdmin && (
                <div 
                  onClick={() => {
                    window.location.href = "/admin";
                    onClose();
                  }}
                  className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/admin' ? 'bg-[#2f1a48]' : ''}`}
                >
                  <i className="fas fa-cog mr-2 text-[#b08eff]"></i> Admin Panel
                </div>
              )}
              
              <div 
                onClick={() => {
                  window.location.href = "/dashboard";
                  onClose();
                }}
                className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/dashboard' ? 'bg-[#2f1a48]' : ''}`}
              >
                <i className="fas fa-user mr-2 text-[#b08eff]"></i> Dashboard
              </div>
            </>
          )}
          
          {/* Only show upgrade button if user is not authenticated or doesn't have an active subscription */}
          {(!isAuthenticated || (isAuthenticated && !hasActiveSubscription())) && (
            <div 
              onClick={() => {
                window.location.href = "/pricing";
                onClose();
              }}
              className="block py-2 px-4 bg-[#7f00ff] text-white rounded mt-4 hover:bg-[#9b30ff] cursor-pointer"
            >
              <i className="fas fa-crown mr-2"></i> Upgrade Plan
            </div>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-[#2f1a48]">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <div className="flex items-center mb-4">
                    <img 
                      src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName || 'User'}&background=7f00ff&color=fff`}
                      alt="User profile" 
                      className="w-8 h-8 rounded-full object-cover border border-[#7f00ff]"
                    />
                    <div className="ml-2">
                      <div className="text-sm font-medium text-[#f2f2f2]">
                        {user?.firstName || user?.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="text-xs text-[#a68dff]">
                        {hasActiveSubscription() ? 'Premium Member' : 'Free Trial'}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-[#2f1a48] text-[#f2f2f2] hover:bg-[#2f1a48] hover:text-[#f2f2f2]"
                    onClick={async () => {
                      await signOut();
                      window.location.href = "/";
                      onClose();
                    }}
                  >
                    <i className="fas fa-sign-out-alt mr-2 text-[#b08eff]"></i> Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    className="w-full bg-[#7f00ff] hover:bg-[#9b30ff] text-white"
                    onClick={() => {
                      window.location.href = "/login";
                      onClose();
                    }}
                  >
                    <i className="fas fa-sign-in-alt mr-2"></i> Sign In
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-[#7f00ff] bg-[#2f1a48] text-[#f2f2f2] hover:bg-[#3f2a58] hover:text-white mt-2"
                    onClick={() => {
                      window.location.href = "/signup";
                      onClose();
                    }}
                  >
                    <i className="fas fa-user-plus mr-2 text-[#b08eff]"></i> Create Account
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
