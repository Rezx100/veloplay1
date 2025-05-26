import { Router } from 'express';
import { storage } from '../storage';
import { STREAM_BASE_URL } from '@shared/constants';

const router = Router();

// Get all network channels
router.get('/', async (req, res) => {
  try {
    const channels = await storage.getNetworkChannels();
    
    // Add stream URLs to the channels
    const channelsWithUrls = channels.map(channel => ({
      ...channel,
      streamUrl: `${STREAM_BASE_URL}${channel.id}.m3u8`
    }));
    
    res.json(channelsWithUrls);
  } catch (error) {
    console.error('Error fetching network channels:', error);
    res.status(500).json({ message: 'Error fetching network channels' });
  }
});

// Get a single channel by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const channel = await storage.getNetworkChannelById(id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    // Add stream URL
    const channelWithUrl = {
      ...channel,
      streamUrl: `${STREAM_BASE_URL}${channel.id}.m3u8`
    };
    
    res.json(channelWithUrl);
  } catch (error) {
    console.error('Error fetching network channel:', error);
    res.status(500).json({ message: 'Error fetching network channel' });
  }
});

// Admin routes - protected by admin middleware
// Create a new channel
router.post('/', async (req, res) => {
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const { name, icon, description, streamId, isActive, isPremium } = req.body;
    
    if (!name || !icon || !description || !streamId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const newChannel = await storage.createNetworkChannel({
      id: streamId, // The ID will be used as the stream ID for URL generation
      name,
      icon, 
      description,
      isActive: isActive !== undefined ? isActive : true,
      isPremium: isPremium !== undefined ? isPremium : false
    });
    
    // Add stream URL for convenience
    const channelWithUrl = {
      ...newChannel,
      streamUrl: `${STREAM_BASE_URL}${newChannel.id}.m3u8`
    };
    
    res.status(201).json(channelWithUrl);
  } catch (error) {
    console.error('Error creating network channel:', error);
    res.status(500).json({ message: 'Error creating network channel' });
  }
});

// Update a channel
router.put('/:id', async (req, res) => {
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const id = parseInt(req.params.id);
    const { name, icon, description, streamId, isActive, isPremium } = req.body;
    
    // Check if channel exists
    const existingChannel = await storage.getNetworkChannelById(id);
    if (!existingChannel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    const updatedChannel = await storage.updateNetworkChannel(id, {
      name,
      icon,
      description,
      id: streamId ? parseInt(streamId) : undefined, // Allow updating the stream ID
      isActive,
      isPremium
    });
    
    // Add stream URL for convenience
    const channelWithUrl = {
      ...updatedChannel,
      streamUrl: `${STREAM_BASE_URL}${updatedChannel.id}.m3u8`
    };
    
    res.json(channelWithUrl);
  } catch (error) {
    console.error('Error updating network channel:', error);
    res.status(500).json({ message: 'Error updating network channel' });
  }
});

// Delete a channel
router.delete('/:id', async (req, res) => {
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const id = parseInt(req.params.id);
    
    // Check if channel exists
    const existingChannel = await storage.getNetworkChannelById(id);
    if (!existingChannel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    await storage.deleteNetworkChannel(id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting network channel:', error);
    res.status(500).json({ message: 'Error deleting network channel' });
  }
});

export default router;