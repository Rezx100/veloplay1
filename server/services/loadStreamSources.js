// Direct stream URL loader using local JSON file first
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Loads stream sources from the local JSON file
 * This ensures all streams are properly mapped with correct IDs
 */
export function loadStreamSources() {
  try {
    // Get the path to the JSON file in the root directory
    const jsonFilePath = path.resolve(process.cwd(), 'stream-url-storage.json');
    
    // Check if the file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error('Stream sources file not found:', jsonFilePath);
      return [];
    }
    
    // Read and parse the file
    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const sources = JSON.parse(jsonData);
    
    // Convert to array format for consistent interface
    const sourcesList = Object.values(sources).map(source => {
      // For safety, ensure the URL is using the vpt domain
      let url = source.stream_url || source.url;
      if (url && url.includes('pixelsport.to')) {
        // Always use vpt domain for consistency
        url = url.replace('vp.pixelsport.to', 'vpt.pixelsport.to');
      }
      
      return {
        id: source.id,
        name: source.name,
        url: url,
        teamName: source.teamName || source.name,
        leagueId: source.leagueId || 'other',
        isActive: true,
        priority: 1
      };
    });
    
    console.log(`Loaded ${sourcesList.length} stream sources from local JSON file`);
    return sourcesList;
  } catch (error) {
    console.error('Error loading stream sources from JSON file:', error);
    return [];
  }
}

/**
 * Get a specific stream source by ID
 */
export function getStreamSourceById(id) {
  const allSources = loadStreamSources();
  return allSources.find(source => source.id === parseInt(id, 10)) || null;
}

/**
 * Get a specific stream URL by team name
 */
export function getStreamUrlByTeamName(teamName) {
  if (!teamName) return null;
  
  const allSources = loadStreamSources();
  const matchingSource = allSources.find(source => {
    // Try different variations of the team name for matching
    const sourceTeamName = source.teamName || source.name || '';
    const normalizedSourceName = sourceTeamName.toLowerCase().trim();
    const normalizedSearchName = teamName.toLowerCase().trim();
    
    return normalizedSourceName === normalizedSearchName || 
           normalizedSourceName.includes(normalizedSearchName) ||
           normalizedSearchName.includes(normalizedSourceName);
  });
  
  return matchingSource ? matchingSource.url : null;
}

export default {
  loadStreamSources,
  getStreamSourceById,
  getStreamUrlByTeamName
};