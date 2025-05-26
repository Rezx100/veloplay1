import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  trialExpiresAt: string;
  isTrialActive: boolean;
  daysRemaining: number;
}

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    enabled: !!user,
  });

  // Handle coming soon button clicks
  const handleComingSoon = () => {
    toast({
      title: "Coming Soon! 🚀",
      description: "Premium plans are launching soon. Enjoy your 15-day free trial!",
      variant: "default",
    });
  };

  // Calculate trial status
  const getTrialStatus = () => {
    if (!userProfile) return { status: 'loading', text: 'Loading...', variant: 'secondary' as const };
    
    if (userProfile.isAdmin) {
      return { status: 'admin', text: 'Admin Access', variant: 'default' as const };
    }
    
    if (userProfile.isTrialActive) {
      return { 
        status: 'active', 
        text: `${userProfile.daysRemaining} days remaining`, 
        variant: 'default' as const 
      };
    }
    
    return { status: 'expired', text: 'Trial Expired', variant: 'destructive' as const };
  };

  const trialStatus = getTrialStatus();

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Choose Your VeloPlay Membership</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Get unlimited access to live sports streams, game highlights, and exclusive content with our premium membership plans.
          </p>
        </div>

        {/* Current Status Card */}
        {user && (
          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Your Current Status
                  </CardTitle>
                  <Badge variant={trialStatus.variant}>
                    {trialStatus.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {userProfile && (
                  <div className="space-y-2">
                    <p className="text-gray-300">
                      Account created: {formatDate(userProfile.createdAt)}
                    </p>
                    {userProfile.isAdmin ? (
                      <p className="text-green-400">✅ You have admin privileges with unlimited access</p>
                    ) : userProfile.isTrialActive ? (
                      <p className="text-blue-400">
                        🎉 Your free trial expires on {formatDate(userProfile.trialExpiresAt)}
                      </p>
                    ) : (
                      <p className="text-orange-400">
                        ⏰ Your trial ended on {formatDate(userProfile.trialExpiresAt)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Trial Plan */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-center">Free Trial</CardTitle>
              <div className="text-center">
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm text-gray-400">for 15 days</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Live TV Network Channels</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Game Schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Live Game Streams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Game Archives</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Multiple Devices</span>
                </div>
              </div>
              <Button 
                className="w-full bg-gray-600 hover:bg-gray-500" 
                disabled
              >
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Plan */}
          <Card className="bg-gray-800/50 border-purple-500 border-2 relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-600 text-white">POPULAR</Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-center">Monthly</CardTitle>
              <div className="text-center">
                <div className="text-2xl font-bold">$9.99</div>
                <div className="text-sm text-gray-400">per month</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Live TV Network Channels</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Game Schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Live Game Streams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Game Archives</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Stream on 2 devices</span>
                </div>
              </div>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={handleComingSoon}
                disabled
              >
                Coming Soon
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Premium plans launching soon. All users get 15-day free trial.
              </p>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="bg-gray-800/50 border-gray-700 relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-green-600 text-white">SAVE 20%</Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-center">Annual</CardTitle>
              <div className="text-center">
                <div className="text-2xl font-bold">$149.99</div>
                <div className="text-sm text-gray-400">per year ($12.50/mo)</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Live TV Network Channels</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Game Schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Live Game Streams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Game Archives</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Stream on 4 devices</span>
                </div>
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleComingSoon}
                disabled
              >
                Coming Soon
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Premium plans launching soon. All users get 15-day free trial.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Description */}
        <div className="text-center text-gray-400">
          <p className="mb-4">All plans include access to our mobile and desktop apps.</p>
          <p>Have questions? Contact our <span className="text-purple-400 cursor-pointer">support team</span>.</p>
        </div>
    </div>
  );
}