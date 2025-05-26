// Public Channels API - No authentication required
import { Router } from 'express';
import { STREAM_BASE_URL } from '../streamMapping';
import { streamUrlService } from '../services/streamUrlService';

const router = Router();

// Special public access endpoint for network channels like NBA TV
router.get('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    console.log(`Public channel access request for channel ${channelId}`);
    
    // Set CORS headers to allow access from any origin
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Only allow specific channel IDs (1-5 are special channels)
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(channelIdNum) || channelIdNum < 1 || channelIdNum > 5) {
      console.log(`Rejected public access request for invalid channel ID: ${channelId}`);
      return res.status(403).json({ 
        error: 'channel_not_public',
        message: 'This channel is not available for public access' 
      });
    }

    // Get the stream source data
    const sources = await streamUrlService.getAllStreamSources();
    const channelSource = sources.find(source => source.id === channelIdNum);

    if (!channelSource) {
      console.log(`Channel source not found for ID: ${channelId}`);
      // Fall back to default URL format
      return res.json({
        streamUrl: `${STREAM_BASE_URL}${channelId}.m3u8`,
        channelName: `Channel ${channelId}`
      });
    }

    console.log(`Returning public stream data for ${channelSource.name}`);
    return res.json({
      streamUrl: channelSource.url,
      channelName: channelSource.name,
      description: channelSource.description
    });
  } catch (error) {
    console.error('Error processing public channel request:', error);
    res.status(500).json({ error: 'Server error while accessing channel' });
  }
});

export default router;