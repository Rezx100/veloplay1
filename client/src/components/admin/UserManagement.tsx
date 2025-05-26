import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Subscription, SubscriptionPlan } from '@shared/schema';

interface UserManagementProps {
  users: User[];
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
  usersLoading: boolean;
}

interface UserWithSubscription extends User {
  subscription?: Subscription;
  plan?: SubscriptionPlan;
}

export default function UserManagement({ 
  users, 
  subscriptions, 
  plans, 
  usersLoading 
}: UserManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  
  // Form states
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [extensionDays, setExtensionDays] = useState<string>('30');
  const [actionType, setActionType] = useState<'grant' | 'extend' | 'revoke'>('grant');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all'); // all, free, paid, expired
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, today, week, month
  
  // Password reset fallback states
  const [tempPassword, setTempPassword] = useState<string>('');
  const [showPasswordOptions, setShowPasswordOptions] = useState(false);

  // Combine users with their subscription data
  const usersWithSubscriptions: UserWithSubscription[] = users.map(user => {
    const subscription = subscriptions.find(sub => sub.userId === user.id);
    const plan = subscription ? plans.find(p => p.id === subscription.planId) : undefined;
    return { ...user, subscription, plan };
  });

  // Advanced filtering logic
  const filteredUsers = useMemo(() => {
    return usersWithSubscriptions.filter(user => {
      // Search by email or name
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchTerm));
      
      // Filter by subscription status
      let matchesSubscription = true;
      if (subscriptionFilter === 'free') {
        matchesSubscription = !user.subscription || !(user.subscription.isActive ?? false);
      } else if (subscriptionFilter === 'paid') {
        matchesSubscription = !!(user.subscription && (user.subscription.isActive ?? false) && new Date(user.subscription.endDate) > new Date());
      } else if (subscriptionFilter === 'expired') {
        matchesSubscription = !!(user.subscription && (!(user.subscription.isActive ?? false) || new Date(user.subscription.endDate) <= new Date()));
      }
      
      // Filter by registration date
      let matchesDate = true;
      if (dateFilter !== 'all' && user.createdAt) {
        const userDate = new Date(user.createdAt);
        const now = new Date();
        
        if (dateFilter === 'today') {
          matchesDate = userDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = userDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = userDate >= monthAgo;
        }
      }
      
      return matchesSearch && matchesSubscription && matchesDate;
    });
  }, [usersWithSubscriptions, searchQuery, subscriptionFilter, dateFilter]);

  // Mutation for managing subscriptions
  const manageSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, action, planId, extensionDays }: {
      userId: string;
      action: 'grant' | 'extend' | 'revoke';
      planId?: number;
      extensionDays?: string;
    }) => {
      return await apiRequest('POST', `/api/admin/users/${userId}/subscription`, {
        action,
        planId,
        extensionDays
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message || 'Subscription updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setManageSubDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  });

  // Mutation for resetting passwords
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/admin/users/${userId}/reset-password`, {});
    },
    onSuccess: (data) => {
      toast({
        title: 'Password Reset Sent',
        description: data.message || 'Password reset email sent successfully',
      });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset',
        variant: 'destructive',
      });
    }
  });

  // Delete user mutation with database sync
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`, {});
    },
    onSuccess: (data) => {
      toast({
        title: 'User Deleted',
        description: 'User has been permanently removed from the system',
      });
      // Refresh user data to sync with database
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete user from database',
        variant: 'destructive',
      });
    }
  });

  const handleManageSubscription = () => {
    if (!selectedUser) return;
    
    manageSubscriptionMutation.mutate({
      userId: selectedUser.id,
      action: actionType,
      planId: actionType === 'grant' ? parseInt(selectedPlanId) : undefined,
      extensionDays: actionType === 'extend' ? extensionDays : undefined
    });
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    resetPasswordMutation.mutate(selectedUser.id);
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSubscriptionStatus = (user: UserWithSubscription) => {
    if (!user.subscription) {
      return <Badge variant="outline">No Subscription</Badge>;
    }
    
    const isActive = user.subscription.isActive && new Date(user.subscription.endDate) > new Date();
    
    if (isActive) {
      return <Badge className="bg-green-600">Active</Badge>;
    } else {
      return <Badge variant="destructive">Expired</Badge>;
    }
  };

  if (usersLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Search and Filter Section */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a]">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search by Email/Name */}
          <div className="flex-1">
            <Label htmlFor="search" className="text-white mb-2 block">Search Users</Label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
              <Input
                id="search"
                placeholder="Search by email, first name, or last name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#2a2a2a] border-[#3a3a3a] text-white pl-10"
              />
            </div>
          </div>

          {/* Subscription Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="subscription-filter" className="text-white mb-2 block">Subscription Status</Label>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a]">
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
                <SelectItem value="paid">Active Subscribers</SelectItem>
                <SelectItem value="expired">Expired Subscriptions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="date-filter" className="text-white mb-2 block">Registration Date</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a]">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Filter Results Summary */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#2a2a2a]">
          <div className="text-sm text-gray-400">
            Showing {filteredUsers.length} of {users.length} users
          </div>
          {(searchQuery || subscriptionFilter !== 'all' || dateFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSubscriptionFilter('all');
                setDateFilter('all');
              }}
              className="text-gray-400 border-gray-600 hover:bg-[#2a2a2a]"
            >
              <i className="fas fa-times mr-2"></i>Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-white">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || 'Unknown User'
                      }
                    </h3>
                    <p className="text-gray-400 text-sm">{user.email || 'No email provided'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getSubscriptionStatus(user)}
                      {user.plan && (
                        <Badge variant="outline" className="text-xs">
                          {user.plan.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right text-sm">
                    {user.subscription && (
                      <>
                        <p className="text-gray-400">
                          Expires: {formatDate(user.subscription.endDate)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          ID: {user.id.substring(0, 8)}...
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Dialog open={manageSubDialogOpen && selectedUser?.id === user.id} onOpenChange={setManageSubDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className="text-primary border-primary hover:bg-primary hover:text-white"
                        >
                          Manage Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                        <DialogHeader>
                          <DialogTitle className="text-white">
                            Manage Subscription - {user.firstName || user.email}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="action" className="text-white">Action</Label>
                            <Select value={actionType} onValueChange={(value: any) => setActionType(value)}>
                              <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a]">
                                <SelectItem value="grant">Grant/Update Plan</SelectItem>
                                <SelectItem value="extend">Extend Current Plan</SelectItem>
                                <SelectItem value="revoke">Revoke Subscription</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {actionType === 'grant' && (
                            <div>
                              <Label htmlFor="plan" className="text-white">Select Plan</Label>
                              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                <SelectTrigger className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                                  <SelectValue placeholder="Choose a plan" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a]">
                                  {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id.toString()}>
                                      {plan.name} - {plan.durationDays} days
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {actionType === 'extend' && (
                            <div>
                              <Label htmlFor="days" className="text-white">Extension Days</Label>
                              <Input
                                id="days"
                                type="number"
                                value={extensionDays}
                                onChange={(e) => setExtensionDays(e.target.value)}
                                className="bg-[#2a2a2a] border-[#3a3a3a] text-white"
                                min="1"
                                max="365"
                              />
                            </div>
                          )}

                          {actionType === 'revoke' && (
                            <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-md">
                              <p className="text-red-400 text-sm">
                                This will immediately revoke the user's subscription access.
                              </p>
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setManageSubDialogOpen(false);
                              setSelectedUser(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleManageSubscription}
                            disabled={manageSubscriptionMutation.isPending || (actionType === 'grant' && !selectedPlanId)}
                            className="bg-primary hover:bg-primary/80"
                          >
                            {manageSubscriptionMutation.isPending ? 'Processing...' : 'Apply Changes'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={resetPasswordDialogOpen && selectedUser?.id === user.id} onOpenChange={setResetPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
                        >
                          Reset Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                        <DialogHeader>
                          <DialogTitle className="text-white">
                            Reset Password - {user.firstName || user.email}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-orange-900/20 border border-orange-500/20 rounded-md">
                            <p className="text-orange-400 text-sm">
                              This will send a password reset email to <strong>{user.email || 'No email provided'}</strong>.
                              The user will receive instructions to create a new password.
                            </p>
                          </div>

                          {/* Fallback Options Section */}
                          {showPasswordOptions && (
                            <div className="space-y-4 border-t border-[#2a2a2a] pt-4">
                              <h4 className="text-sm font-medium text-white">Fallback Options</h4>
                              <p className="text-xs text-gray-400">
                                If email sending fails, you can use these alternative methods:
                              </p>
                              
                              {/* Generate Temporary Password */}
                              <div className="space-y-2">
                                <Label htmlFor="temp-password" className="text-white text-sm">
                                  Generate Temporary Password
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="temp-password"
                                    value={tempPassword}
                                    onChange={(e) => setTempPassword(e.target.value)}
                                    placeholder="Auto-generated secure password"
                                    className="bg-[#2a2a2a] border-[#3a3a3a] text-white"
                                    readOnly
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      const newPassword = Math.random().toString(36).slice(-10) + 
                                                        Math.random().toString(36).slice(-2).toUpperCase() + 
                                                        Math.floor(Math.random() * 100);
                                      setTempPassword(newPassword);
                                    }}
                                    className="text-white border-gray-600"
                                  >
                                    Generate
                                  </Button>
                                </div>
                              </div>

                              {/* Manual Password Set */}
                              <div className="space-y-2">
                                <Label htmlFor="manual-password" className="text-white text-sm">
                                  Or Set Custom Password
                                </Label>
                                <Input
                                  id="manual-password"
                                  type="password"
                                  placeholder="Enter custom password for user"
                                  className="bg-[#2a2a2a] border-[#3a3a3a] text-white"
                                  value={tempPassword}
                                  onChange={(e) => setTempPassword(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">
                                  Provide this password to the user through a secure channel
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Toggle Fallback Options */}
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowPasswordOptions(!showPasswordOptions)}
                            className="text-sm text-gray-400 hover:text-white w-full"
                          >
                            <i className={`fas fa-chevron-${showPasswordOptions ? 'up' : 'down'} mr-2`}></i>
                            {showPasswordOptions ? 'Hide' : 'Show'} Fallback Options
                          </Button>
                        </div>

                        <DialogFooter className="flex-col gap-2">
                          {/* Primary Action */}
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setResetPasswordDialogOpen(false);
                                setSelectedUser(null);
                                setShowPasswordOptions(false);
                                setTempPassword('');
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleResetPassword}
                              disabled={resetPasswordMutation.isPending}
                              className="bg-orange-600 hover:bg-orange-700 flex-1"
                            >
                              {resetPasswordMutation.isPending ? 'Sending...' : 'Send Reset Email'}
                            </Button>
                          </div>

                          {/* Fallback Action */}
                          {showPasswordOptions && tempPassword && (
                            <Button
                              onClick={() => {
                                // TODO: Add manual password reset functionality
                                toast({
                                  title: "Password Set",
                                  description: `Temporary password set for ${user.firstName || user.email}. Please share securely with the user.`,
                                });
                                setResetPasswordDialogOpen(false);
                                setSelectedUser(null);
                                setShowPasswordOptions(false);
                                setTempPassword('');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 w-full"
                            >
                              Set Temporary Password
                            </Button>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Delete User Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently delete ${user.firstName || user.email || 'this user'}? This action cannot be undone and will remove all user data from the database.`)) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No users found</p>
        </div>
      )}
    </div>
  );
}