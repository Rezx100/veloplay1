import { Router } from 'express';
import { isAuthenticated } from '../supabaseAuth';
import { isAdmin } from '../adminMiddleware';
import { storage } from '../neonStorage';
// Import standardizeStreamUrl function from our consolidated file
import { standardizeStreamUrl } from './streamSourcesLatestFixed';

const router = Router();

// Update stream URL endpoint
router.patch('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    console.log(`Updating stream URL for ID ${id} to ${url}`);
    
    // Update the stream source in the database
    try {
      // Standardize the URL first
      const standardizedUrl = standardizeStreamUrl(url);
      
      // Update the record in the database
      const { data, error } = await supabase
        .from('stream_sources')
        .update({ 
          url: standardizedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', parseInt(id, 10))
        .select();
      
      if (error) {
        console.error('Error updating stream source:', error);
        return res.status(500).json({ error: 'Failed to update stream URL' });
      }
      
      if (!data || data.length === 0) {
        console.error('Error updating stream source: No result returned');
        return res.status(500).json({ error: 'Failed to update stream URL' });
      }
    } catch (updateError) {
      console.error('Error updating stream source:', updateError);
      return res.status(500).json({ error: 'Failed to update stream URL' });
    }
    
    // Invalidate any cached data to ensure fresh URLs are used by the video player
    const globalObj = global as any;
    if (globalObj.cachedStreamSources) {
      console.log('Clearing global stream sources cache');
      globalObj.cachedStreamSources = null;
    }
    
    console.log(`Stream URL updated for ID ${id}: ${url}`);
    res.json({
      success: true,
      message: 'Stream URL updated and cache refreshed',
      data: { id, url: standardizeStreamUrl(url) }
    });
  } catch (error) {
    console.error('Error updating stream source URL:', error);
    res.status(500).json({ error: 'Failed to update stream source URL' });
  }
});

export default router;