import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { NetworkChannel } from '@/components/channels/NetworkChannelCard';
import { useQueryClient } from '@tanstack/react-query';

// Static channel data for initial implementation
const DEFAULT_CHANNELS: NetworkChannel[] = [
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
  },
  {
    id: 4,
    name: "NHL Network",
    icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nhl.png",
    description: "The official network for National Hockey League coverage featuring games, highlights, and analysis.",
    isActive: true,
    isPremium: false
  },
  {
    id: 5,
    name: "MLB Network",
    icon: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/mlb.png",
    description: "The official network for Major League Baseball coverage featuring games, highlights, and analysis.",
    isActive: true,
    isPremium: false
  }
];

export default function NetworkChannelsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [channels, setChannels] = useState<NetworkChannel[]>(DEFAULT_CHANNELS);
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = useState(false);
  const [isEditChannelDialogOpen, setIsEditChannelDialogOpen] = useState(false);
  const [isDeleteChannelDialogOpen, setIsDeleteChannelDialogOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<NetworkChannel | null>(null);
  
  // Form state for add/edit channel
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: '',
    isActive: true,
    isPremium: false
  });
  
  // Reset form to defaults
  const resetForm = () => {
    setFormData({
      name: '',
      icon: '',
      description: '',
      isActive: true,
      isPremium: false
    });
  };
  
  // Open edit channel dialog
  const openEditChannelDialog = (channel: NetworkChannel) => {
    setCurrentChannel(channel);
    setFormData({
      name: channel.name,
      icon: channel.icon,
      description: channel.description,
      isActive: channel.isActive || false,
      isPremium: channel.isPremium || false
    });
    setIsEditChannelDialogOpen(true);
  };
  
  // Open delete channel dialog
  const openDeleteChannelDialog = (channel: NetworkChannel) => {
    setCurrentChannel(channel);
    setIsDeleteChannelDialogOpen(true);
  };
  
  // Handle form change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle switch change
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Add a new channel
  const handleAddChannel = () => {
    // Generate a unique ID (for now just increment the max ID)
    const maxId = Math.max(...channels.map(c => Number(c.id)), 0);
    const newChannel: NetworkChannel = {
      id: maxId + 1,
      name: formData.name,
      icon: formData.icon,
      description: formData.description,
      isActive: formData.isActive,
      isPremium: formData.isPremium
    };
    
    setChannels(prev => [...prev, newChannel]);
    resetForm();
    setIsAddChannelDialogOpen(false);
    
    toast({
      title: "Channel Added",
      description: `${newChannel.name} has been successfully added.`,
    });
  };
  
  // Edit an existing channel
  const handleEditChannel = () => {
    if (!currentChannel) return;
    
    const updatedChannels = channels.map(c => 
      c.id === currentChannel.id 
        ? { 
            ...c, 
            name: formData.name,
            icon: formData.icon,
            description: formData.description,
            isActive: formData.isActive,
            isPremium: formData.isPremium
          } 
        : c
    );
    
    setChannels(updatedChannels);
    setIsEditChannelDialogOpen(false);
    
    toast({
      title: "Channel Updated",
      description: `${formData.name} has been successfully updated.`,
    });
  };
  
  // Delete a channel
  const handleDeleteChannel = () => {
    if (!currentChannel) return;
    
    const updatedChannels = channels.filter(c => c.id !== currentChannel.id);
    setChannels(updatedChannels);
    setIsDeleteChannelDialogOpen(false);
    
    toast({
      title: "Channel Deleted",
      description: `${currentChannel.name} has been successfully deleted.`,
      variant: "destructive"
    });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Network TV Channels</h2>
        <Button 
          onClick={() => {
            resetForm();
            setIsAddChannelDialogOpen(true);
          }}
          className="bg-primary hover:bg-opacity-80"
        >
          <i className="fas fa-plus mr-2"></i>
          Add Channel
        </Button>
      </div>
      
      {channels.length === 0 ? (
        <div className="bg-[#1a1a1a] p-6 rounded-lg text-center">
          <div className="w-16 h-16 bg-[#232323] rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-tv text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">No Channels Found</h3>
          <p className="text-gray-400 mb-4">You haven't added any network channels yet.</p>
          <Button
            onClick={() => {
              resetForm();
              setIsAddChannelDialogOpen(true);
            }}
            className="bg-primary hover:bg-opacity-80"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Your First Channel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <div key={channel.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
              <div className="p-4 flex items-center border-b border-[#2a2a2a]">
                <div className="flex-shrink-0 mr-3">
                  <img 
                    src={channel.icon} 
                    alt={channel.name} 
                    className="w-12 h-12 rounded object-cover bg-[#232323]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=Error';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{channel.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {channel.isActive ? (
                      <span className="inline-flex items-center text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-600 mr-1.5"></span>
                        Inactive
                      </span>
                    )}
                    
                    {channel.isPremium && (
                      <span className="inline-flex items-center text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded">
                        <i className="fas fa-crown text-[10px] mr-1.5"></i>
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <p className="text-gray-400 text-sm line-clamp-2 min-h-[2.5rem]">{channel.description}</p>
                
                <div className="mt-3 text-xs text-gray-500">
                  <div className="flex items-center mb-1">
                    <span className="w-20 mr-2">Stream ID:</span>
                    <span className="text-gray-300 font-mono">{channel.id}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    className="h-8 px-3 text-xs"
                    onClick={() => openEditChannelDialog(channel)}
                  >
                    <i className="fas fa-edit mr-1.5"></i> Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="h-8 px-3 text-xs"
                    onClick={() => openDeleteChannelDialog(channel)}
                  >
                    <i className="fas fa-trash-alt mr-1.5"></i> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Channel Dialog */}
      <Dialog open={isAddChannelDialogOpen} onOpenChange={setIsAddChannelDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] text-white border border-[#2a2a2a] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. ESPN US"
                className="bg-[#232323] border-[#2a2a2a]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="icon">Icon URL</Label>
              <Input
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                placeholder="https://example.com/icon.png"
                className="bg-[#232323] border-[#2a2a2a]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the channel"
                className="bg-[#232323] border-[#2a2a2a] min-h-[80px]"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="isPremium" className="cursor-pointer">Premium</Label>
              <Switch
                id="isPremium"
                checked={formData.isPremium}
                onCheckedChange={(checked) => handleSwitchChange("isPremium", checked)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsAddChannelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddChannel}
              disabled={!formData.name || !formData.icon}
            >
              Add Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Channel Dialog */}
      <Dialog open={isEditChannelDialogOpen} onOpenChange={setIsEditChannelDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] text-white border border-[#2a2a2a] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Channel Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. ESPN US"
                className="bg-[#232323] border-[#2a2a2a]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-icon">Icon URL</Label>
              <Input
                id="edit-icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                placeholder="https://example.com/icon.png"
                className="bg-[#232323] border-[#2a2a2a]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the channel"
                className="bg-[#232323] border-[#2a2a2a] min-h-[80px]"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-isActive" className="cursor-pointer">Active</Label>
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-isPremium" className="cursor-pointer">Premium</Label>
              <Switch
                id="edit-isPremium"
                checked={formData.isPremium}
                onCheckedChange={(checked) => handleSwitchChange("isPremium", checked)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditChannelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditChannel}
              disabled={!formData.name || !formData.icon}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Channel Confirmation */}
      <AlertDialog open={isDeleteChannelDialogOpen} onOpenChange={setIsDeleteChannelDialogOpen}>
        <AlertDialogContent className="bg-[#1a1a1a] text-white border border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete {currentChannel?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-white border-[#2a2a2a]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteChannel}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}