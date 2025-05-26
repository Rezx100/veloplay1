import { Router } from 'express';
import { isAuthenticated } from '../supabaseAuth';
import { isAdmin } from '../adminMiddleware';
import { supabase } from '../db';

// Create a router
const router = Router();

// Get all streams
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching streams:', error);
      return res.status(500).json({ error: 'Failed to fetch streams' });
    }
    
    return res.json(data);
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Get a stream by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching stream:', error);
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ error: 'Failed to fetch stream' });
  }
});

// Create a new stream (admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { game_id, stream_url, away_stream_url = null, is_active = true } = req.body;
    
    if (!game_id || !stream_url) {
      return res.status(400).json({ error: 'Game ID and stream URL are required' });
    }
    
    // Use a default admin ID since we don't have req.user available
    const user_id = "be62b1e0-2628-4b18-b09f-44637a0dbad2"; // Default admin ID
    
    const { data, error } = await supabase
      .from('streams')
      .insert({
        game_id,
        stream_url,
        away_stream_url,
        is_active,
        added_by_id: user_id
      })
      .select();
    
    if (error) {
      console.error('Error creating stream:', error);
      return res.status(500).json({ error: 'Failed to create stream' });
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// Update a stream (admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { game_id, stream_url, away_stream_url, is_active } = req.body;
    
    const { data, error } = await supabase
      .from('streams')
      .update({
        game_id,
        stream_url,
        away_stream_url,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating stream:', error);
      return res.status(500).json({ error: 'Failed to update stream' });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating stream:', error);
    res.status(500).json({ error: 'Failed to update stream' });
  }
});

// Delete a stream (admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('streams')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting stream:', error);
      return res.status(500).json({ error: 'Failed to delete stream' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: 'Failed to delete stream' });
  }
});

export default router;