// Persistent storage service for stream URLs
import fs from 'fs';
import path from 'path';

// File location for stream URL storage
const STORAGE_FILE = path.join(process.cwd(), 'stream-url-storage.json');

// Simple in-memory cache with file persistence
class PersistentStorage {
  constructor() {
    this.data = {};
    this.loadFromDisk();
    
    // Auto-save periodically
    setInterval(() => this.saveToDisk(), 30000); // Save every 30 seconds
  }
  
  // Load data from persistent storage
  loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const fileContents = fs.readFileSync(STORAGE_FILE, 'utf8');
        this.data = JSON.parse(fileContents);
        console.log(`Loaded ${Object.keys(this.data).length} items from persistent storage`);
      } else {
        console.log('No persistent storage file found, starting with empty storage');
      }
    } catch (error) {
      console.error('Error loading from persistent storage:', error);
      this.data = {};
    }
  }
  
  // Save data to persistent storage
  saveToDisk() {
    try {
      if (Object.keys(this.data).length > 0) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.data, null, 2), 'utf8');
      }
    } catch (error) {
      console.error('Error saving to persistent storage:', error);
    }
  }
  
  // Synchronous version to force immediate saving without waiting for the interval
  saveToDiskSync() {
    try {
      if (Object.keys(this.data).length > 0) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        console.log(`Successfully saved ${Object.keys(this.data).length} items to persistent storage file`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in synchronous save to persistent storage:', error);
      return false;
    }
  }
  
  // Get an item from storage
  get(key) {
    return this.data[key];
  }
  
  // Set an item in storage
  set(key, value) {
    this.data[key] = value;
    this.saveToDisk(); // Save immediately after an update
    return value;
  }
  
  // Get all items as an object
  getAll() {
    return this.data;
  }
  
  // Get all keys
  getKeys() {
    return Object.keys(this.data);
  }
  
  // Check if an item exists
  has(key) {
    return key in this.data;
  }
  
  // Remove an item
  remove(key) {
    if (this.has(key)) {
      delete this.data[key];
      this.saveToDisk();
      return true;
    }
    return false;
  }
  
  // Clear all items
  clear() {
    this.data = {};
    this.saveToDisk();
  }
}

// Export a singleton instance
export const persistentStorage = new PersistentStorage();