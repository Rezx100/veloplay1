import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../supabaseAuth';
import { isAdmin } from '../adminMiddleware';
import { z } from 'zod';

// Create a router
const router = Router();

// Schema for stream source validation
const streamSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().min(1, "URL is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  leagueId: z.string(),
  priority: z.number().int().min(1).default(1),
  teamName: z.string().min(1, "Team name is required")
});

const updateStreamSourceSchema = streamSourceSchema.partial();

// Get all stream sources - PUBLIC endpoint for streaming player access
router.get('/', async (req, res) => {
  try {
    // Allow CORS for streaming player access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    
    const streamSources = await storage.getAllStreamSources();
    res.json(streamSources);
  } catch (error) {
    console.error('Error fetching stream sources:', error);
    res.status(500).json({ error: 'Failed to fetch stream sources' });
  }
});

// Get a stream source by ID
router.get('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const streamSource = await storage.getStreamSourceById(parseInt(id, 10));
    
    if (!streamSource) {
      return res.status(404).json({ error: 'Stream source not found' });
    }
    
    res.json(streamSource);
  } catch (error) {
    console.error('Error fetching stream source:', error);
    res.status(500).json({ error: 'Failed to fetch stream source' });
  }
});

// Create a new stream source
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const validatedData = streamSourceSchema.parse(req.body);
    const newStreamSource = await storage.createStreamSource(validatedData);
    res.status(201).json(newStreamSource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating stream source:', error);
    res.status(500).json({ error: 'Failed to create stream source' });
  }
});

// Update a stream source
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateStreamSourceSchema.parse(req.body);
    const updatedStreamSource = await storage.updateStreamSource(parseInt(id, 10), validatedData);
    
    if (!updatedStreamSource) {
      return res.status(404).json({ error: 'Stream source not found' });
    }
    
    res.json(updatedStreamSource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating stream source:', error);
    res.status(500).json({ error: 'Failed to update stream source' });
  }
});

// Delete a stream source
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteStreamSource(parseInt(id, 10));
    
    if (!success) {
      return res.status(404).json({ error: 'Stream source not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting stream source:', error);
    res.status(500).json({ error: 'Failed to delete stream source' });
  }
});

// Patch only the URL of a stream source (for the stream URL editor)
router.patch('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    // Validate that the stream source exists
    const existingSource = await storage.getStreamSourceById(parseInt(id, 10));
    if (!existingSource) {
      return res.status(404).json({ error: 'Stream source not found' });
    }
    
    // Update just the URL field
    const updatedStreamSource = await storage.updateStreamSource(parseInt(id, 10), { url });
    
    if (!updatedStreamSource) {
      return res.status(404).json({ error: 'Stream source not found' });
    }
    
    console.log(`Stream URL updated for ID ${id}: ${url}`);
    res.json(updatedStreamSource);
  } catch (error) {
    console.error('Error updating stream source URL:', error);
    res.status(500).json({ error: 'Failed to update stream source URL' });
  }
});

export default router;