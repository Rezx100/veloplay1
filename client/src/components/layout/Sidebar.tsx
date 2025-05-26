import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

interface SidebarProps {
  user?: any; // Combined user data from useAuth hook
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin?: boolean; // Admin flag passed directly from useAuth
}

export default function Sidebar({ user, isLoading, isAuthenticated, isAdmin }: SidebarProps) {
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

  return (
    <div className="hidden md:block w-64 bg-[#130426] border-r border-[#2f1a48] h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <Link href="/">
          <div className="text-3xl font-bold flex items-center mb-8 cursor-pointer">
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
        </Link>
        <nav>
          <Link href="/">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/' ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-home mr-2 text-[#b08eff]"></i> Home
            </div>
          </Link>
          <div className="py-2 px-4 text-[#a68dff] text-sm uppercase font-medium mt-2">Leagues</div>
          <Link href="/league/nhl">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/nhl' ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-hockey-puck mr-2 text-[#b08eff]"></i> NHL
            </div>
          </Link>
          <Link href="/league/nba">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/nba' ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-basketball-ball mr-2 text-[#b08eff]"></i> NBA
            </div>
          </Link>
          <Link href="/league/nfl">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/nfl' ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-football-ball mr-2 text-[#b08eff]"></i> NFL
            </div>
          </Link>
          <Link href="/league/mlb">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/league/mlb' ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-baseball-ball mr-2 text-[#b08eff]"></i> MLB
            </div>
          </Link>
          
          {/* Live TV Networks Section - Added for Network Channels */}
          <div className="py-2 px-4 text-[#a68dff] text-sm uppercase font-medium mt-2">Live TV</div>
          <Link href="/channels">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location.startsWith('/channel') ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-tv mr-2 text-[#b08eff]"></i> Channels
            </div>
          </Link>
          
          <div className="py-2 px-4 text-[#a68dff] text-sm uppercase font-medium mt-2">Account</div>
          
          {isAuthenticated && (
            <>
              {isAdmin && (
                <Link href="/admin">
                  <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/admin' ? 'bg-[#2f1a48]' : ''}`}>
                    <i className="fas fa-cog mr-2 text-[#b08eff]"></i> Admin Panel
                  </div>
                </Link>
              )}
              
              <Link href="/dashboard">
                <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/dashboard' ? 'bg-[#2f1a48]' : ''}`}>
                  <i className="fas fa-user mr-2 text-[#b08eff]"></i> Dashboard
                </div>
              </Link>
            </>
          )}
          
          {/* Pricing link - show for all users */}
          <Link href="/pricing">
            <div className={`block py-2 px-4 text-[#f2f2f2] mb-2 rounded hover:bg-[#2f1a48] cursor-pointer ${location === '/pricing' ? 'bg-[#2f1a48]' : ''}`}>
              <i className="fas fa-tags mr-2 text-[#b08eff]"></i> Pricing
            </div>
          </Link>
        </nav>
        <div className="mt-8 pt-4 border-t border-[#2f1a48]">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <div className="flex items-center">
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
                  
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      className="w-full border-[#2f1a48] text-[#f2f2f2] hover:bg-[#2f1a48] hover:text-[#f2f2f2]"
                      onClick={async () => {
                        await signOut();
                        window.location.href = "/";
                      }}
                    >
                      <i className="fas fa-sign-out-alt mr-2 text-[#b08eff]"></i> Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <a href="/login">
                    <Button className="w-full bg-[#7f00ff] hover:bg-[#9b30ff] text-white">
                      <i className="fas fa-sign-in-alt mr-2"></i> Sign In
                    </Button>
                  </a>
                  
                  <a href="/signup">
                    <Button 
                      variant="outline" 
                      className="w-full border-[#7f00ff] bg-[#2f1a48] text-[#f2f2f2] hover:bg-[#3f2a58] hover:text-white mt-2"
                    >
                      <i className="fas fa-user-plus mr-2 text-[#b08eff]"></i> Create Account
                    </Button>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
