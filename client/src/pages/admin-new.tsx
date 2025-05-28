import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useToast } from '@/hooks/use-toast';
import { useAllGames } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

import NetworkChannelsPanel from '@/components/admin/NetworkChannelsPanel';
import StreamSourcesPanel from '@/components/admin/StreamSourcesPanel';
import UserManagement from '@/components/admin/UserManagement';

import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { type Stream, type User, type Subscription, type SubscriptionPlan } from '@shared/schema';
import { NetworkChannel } from '@/components/channels/NetworkChannelCard';
import { formatPrice } from '@/lib/utils';
import { updateMlbStreamUrl } from '@/utils/streamUrlHelper';

// Define the combined user data type from useAuth
interface CombinedUserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  fullName: string;
  isAdmin: boolean;
}

// Utility function to format price from number to string
const formatPriceDisplay = (price: number | string): string => {
  const numericPrice = typeof price === 'string' ? parseInt(price, 10) : price;
  return (numericPrice / 100).toFixed(2);
};

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("streams");
  const [isAddStreamDialogOpen, setIsAddStreamDialogOpen] = useState(false);
  const [isEditStreamDialogOpen, setIsEditStreamDialogOpen] = useState(false);
  const [isAddPlanDialogOpen, setIsAddPlanDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = useState(false);
  const [isEditChannelDialogOpen, setIsEditChannelDialogOpen] = useState(false);
  const [isDeleteChannelDialogOpen, setIsDeleteChannelDialogOpen] = useState(false);
  const [isEditUrlDialogOpen, setIsEditUrlDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [urlSearchQuery, setUrlSearchQuery] = useState("");
  const [subscriptionSearchQuery, setSubscriptionSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [newStreamData, setNewStreamData] = useState({ gameId: '', streamUrl: '', awayStreamUrl: '' });
  const [editingUrl, setEditingUrl] = useState({ team: '', currentUrl: '', newUrl: '', league: '' });

  // Stream mapping is now handled automatically by the system
  const [editStreamData, setEditStreamData] = useState<{ id: number, gameId: string, streamUrl: string, awayStreamUrl: string }>({ id: 0, gameId: '', streamUrl: '', awayStreamUrl: '' });
  const [editUserData, setEditUserData] = useState<{ id: string, email: string, firstName: string, lastName: string, isAdmin: boolean }>({ id: '', email: '', firstName: '', lastName: '', isAdmin: false });
  const [newPlanData, setNewPlanData] = useState({ name: '', price: '', description: '', durationDays: '', features: '' });
  const [editPlanData, setEditPlanData] = useState<{ id: number, name: string, price: string, description: string, durationDays: string, features: string }>({ id: 0, name: '', price: '', description: '', durationDays: '', features: '' });
  
  // Network channel states
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [newChannelData, setNewChannelData] = useState({ 
    name: '', 
    icon: '', 
    description: '', 
    streamId: '', 
    isActive: true, 
    isPremium: false 
  });
  const [editChannelData, setEditChannelData] = useState<{ 
    id: number, 
    name: string, 
    icon: string, 
    description: string, 
    streamId: string, 
    isActive: boolean, 
    isPremium: boolean 
  }>({ 
    id: 0, 
    name: '', 
    icon: '', 
    description: '', 
    streamId: '', 
    isActive: true, 
    isPremium: false 
  });
  
  // Streams queries
  const { 
    data: streams = [], 
    isLoading: streamsLoading,
    error: streamsError 
  } = useQuery<Stream[]>({
    queryKey: ['/api/admin/streams'],
    enabled: isAuthenticated && isAdmin
  });

  // Users queries
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError
  } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAuthenticated && isAdmin && (activeTab === "users" || activeTab === "subscriptions")
  });

  // Subscriptions queries
  const {
    data: subscriptions = [],
    isLoading: subscriptionsLoading,
    error: subscriptionsError
  } = useQuery<Subscription[]>({
    queryKey: ['/api/admin/subscriptions'],
    enabled: isAuthenticated && isAdmin && activeTab === "subscriptions"
  });

  // Plans queries
  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError
  } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/admin/subscription-plans'],
    enabled: isAuthenticated && isAdmin && (activeTab === "plans" || activeTab === "subscriptions")
  });

  // Stream mappings for M3U8 URL Management - fetch live data
  const {
    data: streamMappingsData,
    isLoading: streamMappingsLoading,
    error: streamMappingsError,
    refetch: refetchStreamMappings
  } = useQuery<{success: boolean, mappings: Array<{team: string, streamId: number, league: string, url: string}>}>({
    queryKey: ['/api/admin/stream-mappings'],
    enabled: isAuthenticated && isAdmin && activeTab === "stream-urls",
    retry: 1
  });

  const streamMappings = streamMappingsData?.mappings || [];

  // Update stream URL mutation with cache invalidation
  const updateStreamUrlMutation = useMutation({
    mutationFn: async ({ teamName, newUrl }: { teamName: string, newUrl: string }) => {
      const response = await apiRequest('PUT', '/api/admin/update-stream-url', {
        teamName,
        newUrl
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stream-mappings'] });
      refetchStreamMappings();
    }
  });
  
  // Network Channels data - using the fallback directly for now
  const channelsLoading = false;
  const channelsError = null;
  // Use a fixed set of channels for the admin panel until we connect to the API
  const channels = [
    {
      id: 1,
      name: "NBA TV",
      icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nba.png",
      description: "24/7 coverage of NBA games, highlights, analysis, and special programming.",
      isActive: true,
      isPremium: false
    },
    {
      id: 2,
      name: "NFL Network",
      icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png",
      description: "The official network of the National Football League featuring live games, analysis, and exclusive content.",
      isActive: true,
      isPremium: false
    },
    {
      id: 3,
      name: "ESPN US",
      icon: "https://a.espncdn.com/i/espn/espn_logos/espn_red.png",
      description: "The worldwide leader in sports featuring live broadcasts, sports news, and analysis.",
      isActive: true,
      isPremium: false
    }
  ];

  const { games, isLoading: gamesLoading } = useAllGames();

  // Stream Mutations
  const createStreamMutation = useMutation({
    mutationFn: async (data: { gameId: string, streamUrl: string, awayStreamUrl?: string }) => {
      return await apiRequest('POST', '/api/admin/streams', data);
    },
    onSuccess: () => {
      toast({
        title: 'Stream Added',
        description: 'The custom stream URL has been added successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/streams'] });
      setIsAddStreamDialogOpen(false);
      setNewStreamData({ gameId: '', streamUrl: '', awayStreamUrl: '' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Stream',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStreamMutation = useMutation({
    mutationFn: async (data: { id: number, streamUrl: string, awayStreamUrl?: string }) => {
      return await apiRequest('PUT', `/api/admin/streams/${data.id}`, { 
        streamUrl: data.streamUrl,
        ...(data.awayStreamUrl && { awayStreamUrl: data.awayStreamUrl })
      });
    },
    onSuccess: () => {
      toast({
        title: 'Stream Updated',
        description: 'The stream URLs have been updated successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/streams'] });
      setIsEditStreamDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update Stream',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteStreamMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/streams/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Stream Deleted',
        description: 'The stream has been deleted successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/streams'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Stream',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Auto-generate all streams mutation
  const autoGenerateStreamsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/auto-generate-all-streams', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Streams Auto-Generated',
        description: `Successfully processed ${data?.results?.success || 0} new/updated streams out of ${data?.results?.totalGames || 0} games. Cleaned up ${data?.results?.cleanedUp || 0} old streams.`,
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/streams'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Auto-Generate Streams',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // User Mutations
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string, firstName?: string, lastName?: string, email?: string, isAdmin?: boolean }) => {
      return await apiRequest('PUT', `/api/admin/users/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'User Updated',
        description: 'User information has been updated successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditUserDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update User',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'User Deleted',
        description: 'The user has been deleted successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditUserDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete User',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('POST', `/api/auth/reset-password`, { email });
    },
    onSuccess: () => {
      toast({
        title: 'Password Reset Email Sent',
        description: 'A password reset link has been emailed to the user',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Send Password Reset',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Plan Mutations
  const createPlanMutation = useMutation({
    mutationFn: async (data: { name: string, price: string, description: string, durationDays: string, features: string[] }) => {
      return await apiRequest('POST', '/api/admin/subscription-plans', data);
    },
    onSuccess: () => {
      toast({
        title: 'Plan Created',
        description: 'The subscription plan has been created successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-plans'] });
      setIsAddPlanDialogOpen(false);
      setNewPlanData({ name: '', price: '', description: '', durationDays: '', features: '' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: { id: number, name?: string, price?: string, description?: string, durationDays?: string, features?: string[] }) => {
      return await apiRequest('PUT', `/api/admin/subscription-plans/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Plan Updated',
        description: 'The subscription plan has been updated successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-plans'] });
      setIsEditPlanDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update Plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/subscription-plans/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Plan Deleted',
        description: 'The subscription plan has been deleted successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-plans'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Plan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Subscription Mutations
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: { id: number, isActive: boolean, endDate?: string }) => {
      return await apiRequest('PUT', `/api/admin/subscriptions/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Subscription Updated',
        description: 'The subscription has been updated successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update Subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Network Channel Mutations
  const createChannelMutation = useMutation({
    mutationFn: async (data: { name: string, icon: string, description: string, streamId: number, isActive: boolean, isPremium: boolean }) => {
      return await apiRequest('POST', '/api/admin/channels', data);
    },
    onSuccess: () => {
      toast({
        title: 'Channel Added',
        description: 'The network channel has been added successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channels'] });
      setIsAddChannelDialogOpen(false);
      setNewChannelData({
        name: '',
        icon: '',
        description: '',
        streamId: '',
        isActive: true,
        isPremium: false
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Channel',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async (data: { id: number, name: string, icon: string, description: string, streamId: number, isActive: boolean, isPremium: boolean }) => {
      return await apiRequest('PUT', `/api/admin/channels/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Channel Updated',
        description: 'The network channel has been updated successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channels'] });
      setIsEditChannelDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Update Channel',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/channels/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Channel Deleted',
        description: 'The network channel has been deleted successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/channels'] });
      setIsDeleteChannelDialogOpen(false);
      setCurrentChannel(null);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Channel',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle form submissions
  const handleAddStream = () => {
    if (!newStreamData.gameId || !newStreamData.streamUrl) {
      toast({
        title: 'Validation Error',
        description: 'Both Game ID and Stream URL are required',
        variant: 'destructive',
      });
      return;
    }
    
    createStreamMutation.mutate({
      gameId: newStreamData.gameId,
      streamUrl: newStreamData.streamUrl,
      ...(newStreamData.awayStreamUrl && { awayStreamUrl: newStreamData.awayStreamUrl })
    });
  };

  const handleUpdateStream = () => {
    if (!editStreamData.streamUrl) {
      toast({
        title: 'Validation Error',
        description: 'Stream URL is required',
        variant: 'destructive',
      });
      return;
    }
    
    // Update home stream URL to use the latest MLB team IDs (148-177 range)
    const updatedHomeUrl = updateMlbStreamUrl(editStreamData.streamUrl);
    
    // Update away stream URL if it exists
    let updatedAwayUrl = undefined;
    if (editStreamData.awayStreamUrl) {
      updatedAwayUrl = updateMlbStreamUrl(editStreamData.awayStreamUrl);
    }
    
    // Log the updates being made
    if (updatedHomeUrl !== editStreamData.streamUrl) {
      console.log(`[MLB Update] Updated home stream URL from ${editStreamData.streamUrl} to ${updatedHomeUrl}`);
    }
    
    if (updatedAwayUrl && updatedAwayUrl !== editStreamData.awayStreamUrl) {
      console.log(`[MLB Update] Updated away stream URL from ${editStreamData.awayStreamUrl} to ${updatedAwayUrl}`);
    }
    
    // Pass the updated URLs to the mutation
    updateStreamMutation.mutate({
      id: editStreamData.id,
      streamUrl: updatedHomeUrl,
      ...(updatedAwayUrl && { awayStreamUrl: updatedAwayUrl })
    });
  };
  
  const handleUpdateUser = () => {
    updateUserMutation.mutate({
      id: editUserData.id,
      firstName: editUserData.firstName || undefined,
      lastName: editUserData.lastName || undefined,
      email: editUserData.email || undefined,
      isAdmin: editUserData.isAdmin
    });
  };
  
  const handleAddPlan = () => {
    if (!newPlanData.name || !newPlanData.price || !newPlanData.durationDays) {
      toast({
        title: 'Validation Error',
        description: 'Name, price and duration are required',
        variant: 'destructive',
      });
      return;
    }
    
    const features = newPlanData.features 
      ? newPlanData.features.split('\n').filter(line => line.trim() !== '') 
      : [];
    
    createPlanMutation.mutate({
      name: newPlanData.name,
      price: newPlanData.price,
      description: newPlanData.description,
      durationDays: newPlanData.durationDays,
      features
    });
  };
  
  const handleUpdatePlan = () => {
    const features = editPlanData.features 
      ? editPlanData.features.split('\n').filter(line => line.trim() !== '') 
      : undefined;
    
    updatePlanMutation.mutate({
      id: editPlanData.id,
      name: editPlanData.name || undefined,
      price: editPlanData.price || undefined,
      description: editPlanData.description || undefined,
      durationDays: editPlanData.durationDays || undefined,
      features
    });
  };
  
  const handleToggleSubscription = (subscription: Subscription, newState: boolean) => {
    updateSubscriptionMutation.mutate({
      id: subscription.id,
      isActive: newState
    });
  };
  
  // Network Channel form handlers
  const handleAddChannel = () => {
    if (!newChannelData.name || !newChannelData.icon || !newChannelData.description || !newChannelData.streamId) {
      toast({
        title: 'Validation Error',
        description: 'Name, icon URL, description and stream ID are required',
        variant: 'destructive',
      });
      return;
    }
    
    createChannelMutation.mutate({
      name: newChannelData.name,
      icon: newChannelData.icon,
      description: newChannelData.description,
      streamId: parseInt(newChannelData.streamId),
      isActive: newChannelData.isActive,
      isPremium: newChannelData.isPremium
    });
  };
  
  const handleUpdateChannel = () => {
    if (!editChannelData.name || !editChannelData.icon || !editChannelData.description || !editChannelData.streamId) {
      toast({
        title: 'Validation Error',
        description: 'Name, icon URL, description and stream ID are required',
        variant: 'destructive',
      });
      return;
    }
    
    updateChannelMutation.mutate({
      id: editChannelData.id,
      name: editChannelData.name,
      icon: editChannelData.icon,
      description: editChannelData.description,
      streamId: parseInt(editChannelData.streamId),
      isActive: editChannelData.isActive,
      isPremium: editChannelData.isPremium
    });
  };
  
  const openEditChannelDialog = (channel: NetworkChannel) => {
    setEditChannelData({
      id: channel.id,
      name: channel.name,
      icon: channel.icon,
      description: channel.description,
      streamId: channel.id.toString(),
      isActive: channel.isActive !== undefined ? channel.isActive : true,
      isPremium: channel.isPremium !== undefined ? channel.isPremium : false
    });
    setIsEditChannelDialogOpen(true);
  };
  
  const openDeleteChannelDialog = (channel: NetworkChannel) => {
    setCurrentChannel(channel);
    setIsDeleteChannelDialogOpen(true);
  };
  
  const handleDeleteChannel = () => {
    if (currentChannel) {
      deleteChannelMutation.mutate(currentChannel.id);
    }
  };

  // Dialog handlers
  const openEditStreamDialog = (stream: Stream) => {
    setEditStreamData({
      id: stream.id,
      gameId: stream.gameId,
      streamUrl: stream.streamUrl || '',
      awayStreamUrl: stream.awayStreamUrl || ''
    });
    setIsEditStreamDialogOpen(true);
  };
  
  const openEditUserDialog = (user: User) => {
    setEditUserData({
      id: user.id,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      isAdmin: user.isAdmin || false
    });
    setIsEditUserDialogOpen(true);
  };
  
  const openEditPlanDialog = (plan: SubscriptionPlan) => {
    setEditPlanData({
      id: plan.id,
      name: plan.name,
      price: plan.price.toString(),
      description: plan.description || '',
      durationDays: plan.durationDays.toString(),
      features: plan.features ? plan.features.join('\n') : ''
    });
    setIsEditPlanDialogOpen(true);
  };

  // Helper functions
  const getGameDetails = (gameId: string) => {
    const game = games?.find(g => g.id === gameId);
    if (!game) return 'Unknown Game';
    return `${game.homeTeam.name} vs ${game.awayTeam.name}`;
  };
  
  const getUserFullName = (user: User | CombinedUserData) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    } else if ('fullName' in user) {
      return user.fullName;
    } else {
      return 'Unknown User';
    }
  };
  
  const getPlanName = (planId: number) => {
    const plan = plans?.find(p => p.id === planId);
    return plan ? plan.name : 'Unknown Plan';
  };
  
  const formatDate = (date?: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Only show full-page loading for authentication
  if (authLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="flex flex-col justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }
  
  // Other loading states will be handled within each content section

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="text-center py-16">
          <i className="fas fa-lock text-4xl text-gray-600 mb-4"></i>
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-gray-400 mb-6">You need admin privileges to view this page.</p>
          {!isAuthenticated ? (
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-opacity-80"
            >
              Sign In
            </Button>
          ) : (
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              Go to Homepage
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - VeloPlay</title>
        <meta name="description" content="VeloPlay admin dashboard for managing streams, users, plans, and subscriptions." />
      </Helmet>

      <div className="flex h-screen bg-[#121212]">
        {/* Sidebar Navigation */}
        <div className="hidden md:flex w-64 flex-col bg-[#1a1a1a] border-r border-[#2a2a2a]">
          <div className="p-6 border-b border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="bg-primary w-8 h-8 rounded-md flex items-center justify-center mr-3">
                <i className="fas fa-sliders-h text-white"></i>
              </span>
              Admin Panel
            </h2>
          </div>
          
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab("streams")}
                className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${activeTab === "streams" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323] hover:text-white"}`}
              >
                <i className="fas fa-video mr-3 w-5 text-center"></i>
                <span>Streams</span>
                <span className="ml-auto bg-[#333] text-xs px-2 py-0.5 rounded-full">{streams?.length || 0}</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("users")}
                className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${activeTab === "users" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323] hover:text-white"}`}
              >
                <i className="fas fa-users mr-3 w-5 text-center"></i>
                <span>Users</span>
                <span className="ml-auto bg-[#333] text-xs px-2 py-0.5 rounded-full">{users?.length || 0}</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("plans")}
                className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${activeTab === "plans" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323] hover:text-white"}`}
              >
                <i className="fas fa-tags mr-3 w-5 text-center"></i>
                <span>Plans</span>
                <span className="ml-auto bg-[#333] text-xs px-2 py-0.5 rounded-full">{plans?.length || 0}</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("subscriptions")}
                className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${activeTab === "subscriptions" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323] hover:text-white"}`}
              >
                <i className="fas fa-credit-card mr-3 w-5 text-center"></i>
                <span>Subscriptions</span>
                <span className="ml-auto bg-[#333] text-xs px-2 py-0.5 rounded-full">{subscriptions?.filter(s => s.isActive)?.length || 0}/{subscriptions?.length || 0}</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("channels")}
                className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${activeTab === "channels" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323] hover:text-white"}`}
              >
                <i className="fas fa-tv mr-3 w-5 text-center"></i>
                <span>Network Channels</span>
                <span className="ml-auto bg-[#333] text-xs px-2 py-0.5 rounded-full">{channels?.length || 0}</span>
              </button>
              


              

              

            </div>
            
            <div className="mt-8">
              <div className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-3 pl-4">Quick Stats</div>
              <div className="bg-[#232323] rounded-lg p-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Active Users</span>
                    <span className="font-medium text-white">{users?.length || 0}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#333] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Active Subscriptions</span>
                    <span className="font-medium text-white">
                      {subscriptions?.filter(s => s.isActive)?.length || 0}/{subscriptions?.length || 0}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#333] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{
                        width: `${subscriptions?.length ? (subscriptions?.filter(s => s.isActive)?.length / subscriptions?.length * 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-[#2a2a2a]">
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm text-gray-300 hover:bg-[#2c2c2c] transition-colors"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to Site
                  </button>
                </div>
              </div>
            </div>
          </nav>
          
          <div className="p-4 border-t border-[#2a2a2a]">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center mr-2">
                <span className="text-sm font-semibold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getUserFullName(user!)}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      
        {/* Mobile Top Navigation */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-[#1a1a1a] border-b border-[#2a2a2a] p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="bg-primary w-8 h-8 rounded-md flex items-center justify-center mr-3">
                <i className="fas fa-sliders-h text-white"></i>
              </span>
              Admin
            </h2>
            
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex mt-4 overflow-x-auto pb-1 space-x-2">
            <button 
              onClick={() => setActiveTab("streams")}
              className={`flex items-center px-3 py-2 rounded-md whitespace-nowrap ${activeTab === "streams" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323]"}`}
            >
              <i className="fas fa-video mr-2"></i>
              <span>Streams</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("users")}
              className={`flex items-center px-3 py-2 rounded-md whitespace-nowrap ${activeTab === "users" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323]"}`}
            >
              <i className="fas fa-users mr-2"></i>
              <span>Users</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("plans")}
              className={`flex items-center px-3 py-2 rounded-md whitespace-nowrap ${activeTab === "plans" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323]"}`}
            >
              <i className="fas fa-tags mr-2"></i>
              <span>Plans</span>
            </button>
            
            <button 
              onClick={() => setActiveTab("subscriptions")}
              className={`flex items-center px-3 py-2 rounded-md whitespace-nowrap ${activeTab === "subscriptions" ? "bg-[#2c2c2c] text-primary" : "text-gray-400 hover:bg-[#232323]"}`}
            >
              <i className="fas fa-credit-card mr-2"></i>
              <span>Subscriptions</span>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-[#121212] md:pt-0 pt-[104px]">
          <div className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {activeTab === "streams" && "Stream Management"}
                  {activeTab === "users" && "User Management"}
                  {activeTab === "plans" && "Subscription Plans"}
                  {activeTab === "subscriptions" && "Active Subscriptions"}
                  {activeTab === "channels" && "Network Channels"}

                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {activeTab === "streams" && "Manage live stream URLs for games"}
                  {activeTab === "users" && "View and manage user accounts"}
                  {activeTab === "plans" && "Configure subscription pricing plans"}
                  {activeTab === "subscriptions" && "Monitor active user subscriptions"}
                  {activeTab === "channels" && "Manage live TV network channels"}

                </p>
              </div>
              
              {activeTab === 'streams' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => autoGenerateStreamsMutation.mutate()}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={autoGenerateStreamsMutation.isPending}
                  >
                    {autoGenerateStreamsMutation.isPending ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i>Auto-Generating...</>
                    ) : (
                      <><i className="fas fa-sync-alt mr-2"></i>Auto-Generate Streams</>
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsAddStreamDialogOpen(true)}
                    className="bg-primary hover:bg-opacity-80"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Stream
                  </Button>
                </div>
              )}
              
              {activeTab === 'plans' && (
                <Button
                  onClick={() => setIsAddPlanDialogOpen(true)}
                  className="bg-primary hover:bg-opacity-80"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Plan
                </Button>
              )}
            </div>
            
            {/* Main Content Area */}
            {activeTab === "channels" && (
              <NetworkChannelsPanel />
            )}
            

            
            {activeTab === "streams" && (
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                {streamsLoading || gamesLoading ? (
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="h-6 w-32 bg-[#252525]" />
                      <div className="h-8 w-24 bg-[#252525]" />
                    </div>
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="py-4 border-b border-[#2a2a2a]">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[#252525]" />
                            <div className="h-4 w-48 bg-[#252525]" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-8 w-16 bg-[#252525] rounded-md" />
                            <div className="h-8 w-16 bg-[#252525] rounded-md" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : streams.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-[#232323] rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-video-slash text-gray-500 text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Custom Streams</h3>
                    <p className="text-gray-400 mb-4">You haven't added any custom stream URLs yet.</p>
                    <Button
                      onClick={() => setIsAddStreamDialogOpen(true)}
                      className="bg-primary hover:bg-opacity-80"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Your First Stream
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#2a2a2a] bg-[#232323]">
                          <TableHead className="text-gray-400">Game</TableHead>
                          <TableHead className="text-gray-400">League</TableHead>
                          <TableHead className="text-gray-400">Stream Status</TableHead>
                          <TableHead className="text-gray-400">Feeds</TableHead>
                          <TableHead className="text-right text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {streams.map((stream) => {
                          // Find the corresponding game to get more details
                          const game = games?.find(g => g.id === stream.gameId);
                          return (
                            <TableRow key={stream.id} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f]">
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  {game && (
                                    <img 
                                      src={game.homeTeam.logo} 
                                      alt={game.homeTeam.name}
                                      className="w-6 h-6 mr-2 object-contain" 
                                    />
                                  )}
                                  <span className="truncate max-w-[200px]">{getGameDetails(stream.gameId)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="uppercase text-xs font-semibold px-2 py-1 rounded-md bg-[#252525]">
                                  {game?.league?.toUpperCase() || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center text-sm">
                                  <span className={`w-2 h-2 rounded-full mr-2 ${stream.streamUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  {stream.streamUrl ? 'Active' : 'No Stream'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stream.streamUrl ? 'bg-blue-900 text-blue-200' : 'bg-[#252525] text-gray-400'}`}>
                                    Home
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stream.awayStreamUrl ? 'bg-blue-900 text-blue-200' : 'bg-[#252525] text-gray-400'}`}>
                                    Away
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    className="h-8 px-3 text-xs"
                                    onClick={() => openEditStreamDialog(stream)}
                                  >
                                    <i className="fas fa-edit mr-1"></i> Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    className="h-8 px-3 text-xs"
                                    onClick={() => deleteStreamMutation.mutate(stream.id)}
                                  >
                                    <i className="fas fa-trash-alt mr-1"></i> Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "users" && (
              <UserManagement 
                users={users}
                subscriptions={subscriptions}
                plans={plans}
                usersLoading={usersLoading}
              />
            )}

            {activeTab === "plans" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!plans || plans.length === 0 ? (
                  <div className="col-span-full bg-[#1a1a1a] p-6 rounded-lg text-center">
                    <div className="w-16 h-16 bg-[#232323] rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-tags text-gray-500 text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Subscription Plans</h3>
                    <p className="text-gray-400 mb-4">You haven't created any subscription plans yet.</p>
                    <Button
                      onClick={() => setIsAddPlanDialogOpen(true)}
                      className="bg-primary hover:bg-opacity-80"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Create Your First Plan
                    </Button>
                  </div>
                ) : (
                  plans.map((plan) => (
                    <div key={plan.id} className="bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors duration-300">
                      <div className="p-5 border-b border-[#2a2a2a]">
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditPlanDialog(plan)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => deletePlanMutation.mutate(plan.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-baseline mt-2">
                          <span className="text-3xl font-bold text-white">${formatPriceDisplay(plan.price)}</span>
                          <span className="text-gray-400 ml-1">/{parseInt(String(plan.durationDays), 10) === 30 ? 'month' : parseInt(String(plan.durationDays), 10) === 365 ? 'year' : `${plan.durationDays} days`}</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-gray-300 mb-4">{plan.description || 'No description available'}</p>
                        <div className="space-y-2">
                          {plan.features?.map((feature, index) => (
                            <div key={index} className="flex items-start">
                              <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                              <span className="text-gray-300">{feature}</span>
                            </div>
                          ))}
                          {(!plan.features || plan.features.length === 0) && (
                            <div className="text-gray-400 italic">No features listed</div>
                          )}
                        </div>
                      </div>
                      <div className="p-5 bg-[#232323] mt-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Active subscribers:</span>
                          <span className="font-semibold">
                            {subscriptions?.filter(s => s.planId === plan.id && s.isActive)?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-400">Duration:</span>
                          <span className="font-semibold">{plan.durationDays} days</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "subscriptions" && (
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center">
                  <h3 className="text-lg font-bold">User Subscriptions</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm">
                      <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                      <span className="text-gray-300 mr-4">Active</span>
                      <span className="w-3 h-3 rounded-full bg-gray-500 mr-2"></span>
                      <span className="text-gray-300">Inactive</span>
                    </div>
                    <div className="relative">
                      <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                      <Input 
                        className="bg-[#232323] border-[#333] pl-9 pr-4 py-2 w-64 text-sm" 
                        placeholder="Search subscriptions..."
                        value={subscriptionSearchQuery}
                        onChange={(e) => setSubscriptionSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {subscriptionsLoading || plansLoading ? (
                  <div className="p-6">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="py-4 border-b border-[#2a2a2a]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#252525]" />
                            <div className="space-y-2">
                              <div className="h-4 w-32 bg-[#252525]" />
                              <div className="h-3 w-48 bg-[#252525]" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="h-6 w-24 bg-[#252525] rounded-md" />
                            <div className="h-6 w-28 bg-[#252525]" />
                            <div className="h-8 w-20 bg-[#252525] rounded-md" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-[#232323] rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-credit-card text-gray-500 text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Subscriptions Found</h3>
                    <p className="text-gray-400 mb-4">There are no user subscriptions in the system yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#2a2a2a] bg-[#232323]">
                          <TableHead className="text-gray-400">User</TableHead>
                          <TableHead className="text-gray-400">Email</TableHead>
                          <TableHead className="text-gray-400">Plan</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Start Date</TableHead>
                          <TableHead className="text-gray-400">End Date</TableHead>
                          <TableHead className="text-right text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions
                          .filter(subscription => {
                            if (!subscriptionSearchQuery) return true;
                            const user = users.find(u => u.id === subscription.userId);
                            const plan = plans.find(p => p.id === subscription.planId);
                            const searchTerm = subscriptionSearchQuery.toLowerCase();
                            
                            return (
                              user?.email?.toLowerCase().includes(searchTerm) ||
                              user?.firstName?.toLowerCase().includes(searchTerm) ||
                              user?.lastName?.toLowerCase().includes(searchTerm) ||
                              plan?.name?.toLowerCase().includes(searchTerm) ||
                              getUserFullName(user)?.toLowerCase().includes(searchTerm)
                            );
                          })
                          .map((subscription) => {
                          const user = users.find(u => u.id === subscription.userId);
                          return (
                            <TableRow key={subscription.id} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f]">
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    {user?.profileImageUrl ? (
                                      <img
                                        src={user.profileImageUrl}
                                        alt={getUserFullName(user)}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
                                        <span className="text-sm font-semibold text-white">
                                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="font-medium">
                                    {user ? getUserFullName(user) : 'Unknown User'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {user?.email || 'No email'}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-sm bg-[#232323] px-3 py-1 rounded-md">
                                  {getPlanName(subscription.planId)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Switch 
                                  checked={Boolean(subscription.isActive)} 
                                  onCheckedChange={(checked) => handleToggleSubscription(subscription, checked)}
                                  className="data-[state=checked]:bg-green-600"
                                />
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {formatDate(subscription.startDate)}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {formatDate(subscription.endDate)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    className="h-8 px-3 text-xs"
                                    onClick={() => handleToggleSubscription(subscription, !subscription.isActive)}
                                  >
                                    {subscription.isActive ? (
                                      <>
                                        <i className="fas fa-ban mr-1"></i> Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-check mr-1"></i> Activate
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            
            {/* Stream mapping is now handled automatically by the system when streams are requested */}
          </div>
        </div>
      </div>

      {/* Add Stream Dialog */}
      <Dialog open={isAddStreamDialogOpen} onOpenChange={setIsAddStreamDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Add Custom Stream URL</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gameId">Game</Label>
              <select
                id="gameId"
                value={newStreamData.gameId}
                onChange={(e) => setNewStreamData({ ...newStreamData, gameId: e.target.value })}
                className="w-full p-2 bg-[#232323] border border-[#333] rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a game</option>
                {games?.filter(g => g.state !== 'post').map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.homeTeam.name} vs {game.awayTeam.name} ({game.league.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="streamUrl">Home Feed URL</Label>
              <Input
                id="streamUrl"
                placeholder="Enter stream URL (m3u8 format)"
                value={newStreamData.streamUrl}
                onChange={(e) => setNewStreamData({ ...newStreamData, streamUrl: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="awayStreamUrl">Away Feed URL (Optional)</Label>
              <Input
                id="awayStreamUrl"
                placeholder="Enter away feed URL (m3u8 format)"
                value={newStreamData.awayStreamUrl}
                onChange={(e) => setNewStreamData({ ...newStreamData, awayStreamUrl: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-primary hover:bg-opacity-80"
              onClick={handleAddStream}
              disabled={createStreamMutation.isPending}
            >
              {createStreamMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
                  Adding...
                </>
              ) : (
                'Add Stream'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Stream Dialog */}
      <Dialog open={isEditStreamDialogOpen} onOpenChange={setIsEditStreamDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Edit Stream URLs</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-400 mb-1 block">Game</Label>
              <div className="font-medium">{getGameDetails(editStreamData.gameId)}</div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="streamUrl">Home Feed URL</Label>
              <Input
                id="streamUrl"
                placeholder="Enter stream URL (m3u8 format)"
                value={editStreamData.streamUrl}
                onChange={(e) => setEditStreamData({ ...editStreamData, streamUrl: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="awayStreamUrl">Away Feed URL (Optional)</Label>
              <Input
                id="awayStreamUrl"
                placeholder="Enter away feed URL (m3u8 format)"
                value={editStreamData.awayStreamUrl}
                onChange={(e) => setEditStreamData({ ...editStreamData, awayStreamUrl: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-primary hover:bg-opacity-80"
              onClick={handleUpdateStream}
              disabled={updateStreamMutation.isPending}
            >
              {updateStreamMutation.isPending ? 'Updating...' : 'Update Stream'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editUserData.firstName}
                onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editUserData.lastName}
                onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isAdmin"
                checked={editUserData.isAdmin}
                onCheckedChange={(checked) => setEditUserData({ ...editUserData, isAdmin: checked })}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="isAdmin">Admin Access</Label>
            </div>
            
            <div className="mt-6 border-t border-[#333] pt-4">
              <h3 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="border-amber-800 text-amber-400 hover:bg-amber-900/30 justify-start"
                  onClick={() => {
                    // Using a custom confirm dialog instead of window.confirm
                    if (confirm(`Are you sure you want to send a password reset email to ${editUserData.email}?`)) {
                      resetPasswordMutation.mutate(editUserData.email);
                    }
                  }}
                  disabled={resetPasswordMutation.isPending}
                >
                  <i className="fas fa-key mr-2"></i>
                  {resetPasswordMutation.isPending ? 'Sending...' : 'Reset Password'}
                </Button>
                
                {editUserData.id !== 'system' && (
                  <Button
                    variant="outline"
                    className="border-red-800 text-red-400 hover:bg-red-900/30 justify-start"
                    onClick={() => {
                      // Using a custom confirm dialog instead of window.confirm
                      if (confirm(`Are you sure you want to delete user ${editUserData.email}? This action cannot be undone.`)) {
                        deleteUserMutation.mutate(editUserData.id);
                      }
                    }}
                    disabled={deleteUserMutation.isPending}
                  >
                    <i className="fas fa-trash-alt mr-2"></i>
                    {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-primary hover:bg-opacity-80"
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Plan Dialog */}
      <Dialog open={isAddPlanDialogOpen} onOpenChange={setIsAddPlanDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Add Subscription Plan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                placeholder="e.g. Basic, Premium, etc."
                value={newPlanData.name}
                onChange={(e) => setNewPlanData({ ...newPlanData, name: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price (in cents)</Label>
              <Input
                id="price"
                type="number"
                placeholder="e.g. 999 for $9.99"
                value={newPlanData.price}
                onChange={(e) => setNewPlanData({ ...newPlanData, price: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input
                id="durationDays"
                type="number"
                placeholder="e.g. 30 for monthly, 365 for yearly"
                value={newPlanData.durationDays}
                onChange={(e) => setNewPlanData({ ...newPlanData, durationDays: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the plan"
                value={newPlanData.description}
                onChange={(e) => setNewPlanData({ ...newPlanData, description: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                placeholder="Enter one feature per line"
                value={newPlanData.features}
                onChange={(e) => setNewPlanData({ ...newPlanData, features: e.target.value })}
                className="bg-[#232323] border-[#333] min-h-24"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-primary hover:bg-opacity-80"
              onClick={handleAddPlan}
              disabled={createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? 'Adding...' : 'Add Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Plan Dialog */}
      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={editPlanData.name}
                onChange={(e) => setEditPlanData({ ...editPlanData, name: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price (in cents)</Label>
              <Input
                id="price"
                type="number"
                value={editPlanData.price}
                onChange={(e) => setEditPlanData({ ...editPlanData, price: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input
                id="durationDays"
                type="number"
                value={editPlanData.durationDays}
                onChange={(e) => setEditPlanData({ ...editPlanData, durationDays: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editPlanData.description}
                onChange={(e) => setEditPlanData({ ...editPlanData, description: e.target.value })}
                className="bg-[#232323] border-[#333]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={editPlanData.features}
                onChange={(e) => setEditPlanData({ ...editPlanData, features: e.target.value })}
                className="bg-[#232323] border-[#333] min-h-24"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-primary hover:bg-opacity-80"
              onClick={handleUpdatePlan}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Network Channel Dialog */}
      <Dialog open={isAddChannelDialogOpen} onOpenChange={setIsAddChannelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Network Channel</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channelName" className="text-right">
                Name
              </Label>
              <Input
                id="channelName"
                placeholder="ESPN"
                value={newChannelData.name}
                onChange={(e) => setNewChannelData({ ...newChannelData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channelIcon" className="text-right">
                Icon URL
              </Label>
              <Input
                id="channelIcon"
                placeholder="https://example.com/icon.png"
                value={newChannelData.icon}
                onChange={(e) => setNewChannelData({ ...newChannelData, icon: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channelStreamId" className="text-right">
                Stream ID
              </Label>
              <Input
                id="channelStreamId"
                placeholder="1"
                value={newChannelData.streamId}
                onChange={(e) => setNewChannelData({ ...newChannelData, streamId: e.target.value })}
                className="col-span-3"
                type="number"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="channelDescription" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="channelDescription"
                placeholder="24/7 sports coverage"
                value={newChannelData.description}
                onChange={(e) => setNewChannelData({ ...newChannelData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channelIsActive" className="text-right">
                Status
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="channelIsActive"
                  checked={newChannelData.isActive}
                  onCheckedChange={(checked) => setNewChannelData({ ...newChannelData, isActive: checked })}
                />
                <span>{newChannelData.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channelIsPremium" className="text-right">
                Premium
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="channelIsPremium"
                  checked={newChannelData.isPremium}
                  onCheckedChange={(checked) => setNewChannelData({ ...newChannelData, isPremium: checked })}
                />
                <span>{newChannelData.isPremium ? 'Premium' : 'Free'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddChannelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddChannel}
            >
              Add Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Network Channel Dialog */}
      <Dialog open={isEditChannelDialogOpen} onOpenChange={setIsEditChannelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Network Channel</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editChannelName" className="text-right">
                Name
              </Label>
              <Input
                id="editChannelName"
                value={editChannelData.name}
                onChange={(e) => setEditChannelData({ ...editChannelData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editChannelIcon" className="text-right">
                Icon URL
              </Label>
              <Input
                id="editChannelIcon"
                value={editChannelData.icon}
                onChange={(e) => setEditChannelData({ ...editChannelData, icon: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editChannelStreamId" className="text-right">
                Stream ID
              </Label>
              <Input
                id="editChannelStreamId"
                value={editChannelData.streamId}
                onChange={(e) => setEditChannelData({ ...editChannelData, streamId: e.target.value })}
                className="col-span-3"
                type="number"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="editChannelDescription" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="editChannelDescription"
                value={editChannelData.description}
                onChange={(e) => setEditChannelData({ ...editChannelData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editChannelIsActive" className="text-right">
                Status
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="editChannelIsActive"
                  checked={editChannelData.isActive}
                  onCheckedChange={(checked) => setEditChannelData({ ...editChannelData, isActive: checked })}
                />
                <span>{editChannelData.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editChannelIsPremium" className="text-right">
                Premium
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="editChannelIsPremium"
                  checked={editChannelData.isPremium}
                  onCheckedChange={(checked) => setEditChannelData({ ...editChannelData, isPremium: checked })}
                />
                <span>{editChannelData.isPremium ? 'Premium' : 'Free'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditChannelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateChannel}
            >
              Update Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Network Channel Dialog */}
      <Dialog open={isDeleteChannelDialogOpen} onOpenChange={setIsDeleteChannelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Network Channel</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Are you sure you want to delete this channel? This action cannot be undone.</p>
            {currentChannel && (
              <div className="flex items-center p-3 rounded-md bg-[#202020]">
                <img 
                  src={currentChannel.icon} 
                  alt={currentChannel.name} 
                  className="w-10 h-10 rounded mr-3 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Error';
                  }}
                />
                <div>
                  <h4 className="font-medium">{currentChannel.name}</h4>
                  <p className="text-sm text-gray-400">ID: {currentChannel.id}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteChannelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteChannel}
            >
              Delete Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit M3U8 URL Dialog */}
      <Dialog open={isEditUrlDialogOpen} onOpenChange={setIsEditUrlDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border border-[#2a2a2a] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <i className="fas fa-link mr-2 text-primary"></i>
              Edit M3U8 URL for {editingUrl.team}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-url" className="text-gray-300">Current URL</Label>
              <Input
                id="current-url"
                value={editingUrl.currentUrl}
                className="bg-[#232323] border-[#333] text-gray-400 mt-1"
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="new-url" className="text-gray-300">New M3U8 URL</Label>
              <Input
                id="new-url"
                value={editingUrl.newUrl}
                onChange={(e) => setEditingUrl(prev => ({ ...prev, newUrl: e.target.value }))}
                className="bg-[#232323] border-[#333] text-white mt-1"
                placeholder="https://vpt.pixelsport.to:443/psportsgate/psportsgate100/XXX.m3u8"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the correct M3U8 stream URL for {editingUrl.team}
              </p>
            </div>
            <div className="bg-[#252525] rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <i className="fas fa-info-circle mr-2 text-blue-400"></i>
                URL Format Guidelines
              </h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Base URL: https://vpt.pixelsport.to:443/psportsgate/psportsgate100/</li>
                <li>• Stream ID should be between 1-200</li>
                <li>• Must end with .m3u8</li>
                <li>• Example: https://vpt.pixelsport.to:443/psportsgate/psportsgate100/148.m3u8</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditUrlDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-opacity-80"
              onClick={() => {
                updateStreamUrlMutation.mutate({
                  teamName: editingUrl.team,
                  newUrl: editingUrl.newUrl
                }, {
                  onSuccess: () => {
                    toast({
                      title: 'URL Updated Successfully!',
                      description: `${editingUrl.team} M3U8 URL has been updated and is now live`,
                      variant: 'default',
                    });
                    setIsEditUrlDialogOpen(false);
                    setEditingUrl({ team: '', currentUrl: '', newUrl: '', league: '' });
                  },
                  onError: (error: any) => {
                    toast({
                      title: 'Update Failed',
                      description: error.message || 'Failed to update M3U8 URL',
                      variant: 'destructive',
                    });
                  }
                });
              }}
              disabled={updateStreamUrlMutation.isPending}
            >
              <i className="fas fa-save mr-2"></i>
              Update URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}