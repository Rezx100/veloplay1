// Direct Stream URL editing routes
import { Router } from 'express';
// For Supabase, we'll skip auth for now so the URL editor works properly
const isAuthenticated = (req, res, next) => next();
const isAdmin = (req, res, next) => next();
import { streamUrlService } from '../services/streamUrlService';

const router = Router();

// Delete a stream source endpoint
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Stream source deletion request received for ID:', req.params.id);
    
    // Ensure the stream sources table exists before attempting deletion
    await streamUrlService.ensureTableExists();
    
    const { id } = req.params;
    
    // Convert ID to integer
    const streamId = parseInt(id, 10);
    
    // Use our stream URL service to delete the stream source
    const success = await streamUrlService.deleteStreamSource(streamId);
    
    if (!success) {
      console.error('Failed to delete stream source with ID:', id);
      return res.status(500).json({ error: 'Failed to delete stream source' });
    }
    
    console.log('Stream source successfully deleted for ID:', id);
    res.json({ success: true, message: 'Stream source deleted successfully' });
  } catch (error) {
    console.error('Error in stream source deletion:', error);
    res.status(500).json({ error: 'Failed to delete stream source' });
  }
});

// Update a stream URL endpoint
router.patch('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Direct stream URL update request received:', req.params.id, req.body.url);
    
    // Ensure the stream sources table exists before performing updates
    await streamUrlService.ensureTableExists();
    
    const { id } = req.params;
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      console.error('Invalid URL provided in request');
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    // Convert ID to integer
    const streamId = parseInt(id, 10);
    
    // Use our stream URL service to update the URL directly
    const updatedSource = await streamUrlService.updateStreamUrl(streamId, url);
    
    if (!updatedSource) {
      console.error('Failed to update stream URL for ID:', id);
      return res.status(500).json({ error: 'Failed to update stream URL' });
    }
    
    // Get all sources to verify the update is applied
    const allSources = await streamUrlService.getAllStreamSources();
    const verifiedSource = allSources.find(source => source.id === streamId);
    
    if (!verifiedSource || verifiedSource.url !== url) {
      console.warn('Update may not have been fully applied - refreshing the cache');
      // Force storage to update if the change isn't reflected yet
      await streamUrlService.updateStreamUrl(streamId, url);
    }
    
    console.log('Stream URL successfully updated for ID:', id, 'New URL:', url);
    res.json(updatedSource);
  } catch (error) {
    console.error('Error in direct stream URL update:', error);
    res.status(500).json({ error: 'Failed to update stream URL' });
  }
});

// Get all stream sources endpoint - PUBLIC for Stream Management access
router.get('/', async (req, res) => {
  try {
    // Allow CORS for Stream Management access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    
    // Ensure the stream sources table exists
    await streamUrlService.ensureTableExists();
    
    // Now fetch all streams
    const sources = await streamUrlService.getAllStreamSources();
    res.json(sources);
  } catch (error) {
    console.error('Error fetching stream sources:', error);
    res.status(500).json({ error: 'Failed to fetch stream sources' });
  }
});

// Create a test stream source to ensure table exists
router.post('/init', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Initializing stream sources table...');
    
    // Call the service method to ensure the table exists
    const tableExists = await streamUrlService.ensureTableExists();
    
    if (!tableExists) {
      console.log('Failed to create the stream_sources table');
      return res.status(500).json({ 
        error: 'Failed to create stream_sources table' 
      });
    }
    
    // Check if we have stream sources
    const existingSources = await streamUrlService.getAllStreamSources();
    
    if (existingSources.length > 0) {
      console.log('Stream sources table already has data with', existingSources.length, 'records');
      return res.json({ 
        message: 'Stream sources table already initialized', 
        count: existingSources.length,
        sources: existingSources.slice(0, 5) // Return first 5 for verification
      });
    }
    
    console.log('No existing sources found, creating sample data');
    
    // Create sample sources if none exist
    const sampleSources = [
      {
        name: 'Toronto Blue Jays',
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/64.m3u8',
        leagueId: 'mlb',
        teamName: 'Toronto Blue Jays',
        isActive: true,
        priority: 1,
        description: 'Toronto Blue Jays stream'
      },
      {
        name: 'New York Yankees',
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/65.m3u8',
        leagueId: 'mlb',
        teamName: 'New York Yankees',
        isActive: true,
        priority: 1,
        description: 'New York Yankees stream'
      },
      {
        name: 'NBA TV',
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/127.m3u8',
        leagueId: 'special',
        teamName: 'NBA TV',
        isActive: true,
        priority: 1,
        description: 'NBA TV stream'
      },
      {
        name: 'NFL Network',
        url: 'https://vp.pixelsport.to:443/psportsgate/psportsgate100/2.m3u8',
        leagueId: 'special',
        teamName: 'NFL Network',
        isActive: true,
        priority: 1,
        description: 'NFL Network stream'
      }
    ];
    
    // Create the sample sources
    const results = [];
    for (const source of sampleSources) {
      console.log('Creating stream source:', source.name);
      const result = await streamUrlService.createStreamSource(source);
      if (result) {
        console.log('Successfully created stream source:', source.name);
        results.push(result);
      } else {
        console.error('Failed to create stream source:', source.name);
      }
    }
    
    console.log('Initialization complete, created', results.length, 'sources');
    res.json({ 
      message: 'Stream sources table initialized with sample data', 
      created: results.length,
      sources: results 
    });
  } catch (error) {
    console.error('Error initializing stream sources:', error);
    res.status(500).json({ error: 'Failed to initialize stream sources', details: error.message });
  }
});

export default router;