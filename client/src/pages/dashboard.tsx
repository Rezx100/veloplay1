import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Settings, 
  Calendar, 
  Clock, 
  Eye, 
  Play, 
  CreditCard, 
  TrendingUp, 
  Activity, 
  Star,
  Trophy,
  Zap,
  ChevronRight,
  BarChart3,
  Gamepad2,
  Timer,
  Crown,
  Target,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Receipt
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isCancelSubscriptionOpen, setIsCancelSubscriptionOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });

  // Fetch user subscription data
  const { data: subscription } = useQuery({
    queryKey: ['/api/subscription'],
    enabled: !!user
  });

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/user/dashboard-stats'],
    enabled: !!user
  });

  // Fetch recently watched games
  const { data: recentGames } = useQuery({
    queryKey: ['/api/user/recent-games'],
    enabled: !!user
  });

  // Fetch user transactions
  const { data: userTransactions } = useQuery({
    queryKey: ['/api/user/transactions'],
    enabled: !!user
  });

  const handleEditProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
    setIsEditProfileOpen(false);
  };

  const handleChangePassword = () => {
    toast({
      title: "Password Changed",
      description: "Your password has been successfully updated.",
    });
    setIsChangePasswordOpen(false);
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d021f]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7f00ff] mx-auto mb-4"></div>
          <p className="text-purple-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const watchTimeMinutes = dashboardStats?.watchTime || 0;
  const watchTimeProgress = Math.min((watchTimeMinutes / 300) * 100, 100); // Progress out of 5 hours
  const gamesWatched = recentGames?.length || 0;
  const achievementLevel = gamesWatched < 5 ? 'Rookie' : gamesWatched < 20 ? 'Fan' : gamesWatched < 50 ? 'Superfan' : 'Legend';

  return (
    <div className="min-h-screen bg-[#0d021f] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#7f00ff] to-[#9d4edd] rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, {user.firstName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Active
            </Badge>
            <span className="text-purple-400 text-sm">•</span>
            <span className="text-purple-300 text-sm">{user.email}</span>
          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Recent Games */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-[#130426] to-[#1e0b3d] border-[#2f1a48]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Play className="h-5 w-5 text-[#7f00ff]" />
                    Recent Games
                  </CardTitle>
                  <Link href="/">
                    <Button variant="outline" size="sm" className="border-[#3a2957] text-purple-300 hover:bg-[#7f00ff]/10 hover:border-[#7f00ff]/30">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentGames && recentGames.length > 0 ? (
                  <div className="space-y-4">
                    {recentGames.slice(0, 4).map((game: any, index: number) => (
                      <div
                        key={game.id || index}
                        className="flex items-center gap-4 p-4 bg-[#1e0b3d] rounded-xl border border-[#3a2957] hover:border-[#7f00ff]/50 transition-all duration-300 group cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-[#7f00ff] to-[#9d4edd] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1 group-hover:text-[#7f00ff] transition-colors">
                            {game.homeTeam} vs {game.awayTeam}
                          </h3>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs border-[#7f00ff]/30 text-[#7f00ff]">
                              {game.league?.toUpperCase() || 'LIVE'}
                            </Badge>
                            <span className="text-purple-300 text-sm">
                              {formatDate(game.watchedAt || game.date)}
                            </span>
                          </div>
                        </div>
                        <Link href={`/game/${game.id}`}>
                          <Button size="sm" className="bg-[#7f00ff] hover:bg-[#6d00dd] group-hover:shadow-lg transition-all">
                            <Play className="h-4 w-4 mr-1" />
                            Watch
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#1e0b3d] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#3a2957]">
                      <Play className="h-8 w-8 text-[#7f00ff]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Ready to Start?</h3>
                    <p className="text-purple-300 mb-6">Discover live sports and start building your viewing history</p>
                    <Link href="/">
                      <Button className="bg-[#7f00ff] hover:bg-[#6d00dd] shadow-lg">
                        <Play className="h-4 w-4 mr-2" />
                        Start Watching
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Management & Info */}
          <div className="space-y-6">
            {/* Achievement Badge */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">Fan Level</h3>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                  {achievementLevel}
                </Badge>
                <p className="text-purple-300 text-sm mt-2">Keep watching to level up!</p>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="bg-gradient-to-br from-[#7f00ff]/10 to-[#9d4edd]/10 border-[#7f00ff]/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Subscription</h3>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Crown className="h-5 w-5 text-amber-400" />
                    <span className="text-white font-medium">
                      {subscription?.planName || 'VeloPlay Trial'}
                    </span>
                  </div>
                  {subscription?.status === 'active' && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 mb-3">
                      Premium Active
                    </Badge>
                  )}
                  {subscription?.trialExpiresAt && (
                    <div className="bg-amber-500/10 rounded-lg p-3 mb-4">
                      <p className="text-amber-300 text-sm">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {Math.ceil((new Date(subscription.trialExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                      </p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                    onClick={() => setIsCancelSubscriptionOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-gradient-to-br from-[#130426] to-[#1e0b3d] border-[#2f1a48]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-400" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#1e0b3d] rounded-lg border border-[#3a2957]">
                      <div>
                        <p className="text-white text-sm font-medium">{subscription.planName || 'Premium Plan'}</p>
                        <p className="text-purple-300 text-xs">
                          {subscription.startDate ? formatDate(subscription.startDate) : 'Current subscription'}
                        </p>
                      </div>
                      <span className="text-green-400 font-medium">
                        ${subscription.amount ? (subscription.amount / 100).toFixed(2) : '9.99'}
                      </span>
                    </div>
                    {subscription.status === 'active' && (
                      <div className="text-center p-2 bg-green-500/10 rounded-lg">
                        <p className="text-green-300 text-xs">
                          ✓ Active subscription - Next billing: {subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Receipt className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No transactions yet</p>
                    <p className="text-purple-300 text-xs mt-1">Subscribe to see your payment history</p>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-3 border-[#3a2957] text-purple-300 hover:bg-[#7f00ff]/10">
                  View All Transactions
                </Button>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card className="bg-gradient-to-br from-[#130426] to-[#1e0b3d] border-[#2f1a48]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full border-[#3a2957] text-white hover:bg-[#7f00ff]/10"
                  onClick={() => setIsResetPasswordOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-red-500/30 text-red-300 hover:bg-red-500/10"
                  onClick={() => setIsDeleteAccountOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>

            {/* Reset Password Dialog */}
            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
              <DialogContent className="bg-[#0d021f] border-[#2f1a48]">
                <DialogHeader>
                  <DialogTitle className="text-white">Reset Password</DialogTitle>
                  <DialogDescription className="text-purple-300">
                    Enter your email to receive a password reset link.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resetEmail" className="text-purple-200">Email Address</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      defaultValue={user.email}
                      className="bg-[#1e0b3d] border-[#3a2957] text-white"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Reset Link Sent",
                        description: "Check your email for password reset instructions.",
                      });
                      setIsResetPasswordOpen(false);
                    }} 
                    className="w-full bg-[#7f00ff] hover:bg-[#6d00dd]"
                  >
                    Send Reset Link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Account Dialog */}
            <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
              <DialogContent className="bg-[#0d021f] border-[#2f1a48]">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription className="text-purple-300">
                    This action cannot be undone. This will permanently delete your account and all associated data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-300 text-sm">⚠️ Warning: Account deletion is permanent and irreversible.</p>
                  </div>
                  <div>
                    <Label htmlFor="confirmDelete" className="text-purple-200">Type "DELETE" to confirm</Label>
                    <Input
                      id="confirmDelete"
                      placeholder="DELETE"
                      className="bg-[#1e0b3d] border-[#3a2957] text-white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteAccountOpen(false)}
                      className="flex-1 border-[#3a2957] text-white"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        toast({
                          title: "Account Deletion Requested",
                          description: "Your account will be deleted within 24 hours.",
                        });
                        setIsDeleteAccountOpen(false);
                      }}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Cancel Subscription Dialog */}
            <Dialog open={isCancelSubscriptionOpen} onOpenChange={setIsCancelSubscriptionOpen}>
              <DialogContent className="bg-[#0d021f] border-[#2f1a48]">
                <DialogHeader>
                  <DialogTitle className="text-white">Cancel Subscription</DialogTitle>
                  <DialogDescription className="text-purple-300">
                    You'll continue to have access until your current billing period ends.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-amber-300 text-sm">Your subscription will remain active until the end of your current billing cycle.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCancelSubscriptionOpen(false)}
                      className="flex-1 border-[#3a2957] text-white"
                    >
                      Keep Subscription
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        toast({
                          title: "Subscription Cancelled",
                          description: "Your subscription has been cancelled successfully.",
                        });
                        setIsCancelSubscriptionOpen(false);
                      }}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}