// Online users tracking system for admin panel

// Interface for online user data
export interface OnlineUser {
  id: string;
  displayName: string;
  loginTime: string;
  lastActive: string;
  currentPage?: string;
  ip?: string;
}

// Store active users in memory for real-time tracking
const activeUsers = new Map<string, OnlineUser>();

// Update or add a user to the active users list
export function trackUserActivity(userId: string, userData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  ip?: string;
  currentPage?: string;
}) {
  const now = new Date().toISOString();
  
  if (activeUsers.has(userId)) {
    // Update existing user's last active time
    const user = activeUsers.get(userId)!;
    activeUsers.set(userId, {
      ...user,
      lastActive: now,
      currentPage: userData.currentPage || user.currentPage
    });
  } else {
    // Add new user to tracking
    const userName = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}`
      : userData.email?.split('@')[0] || 'User';
    
    activeUsers.set(userId, {
      id: userId,
      displayName: userName,
      loginTime: now,
      lastActive: now,
      currentPage: userData.currentPage || 'Home',
      ip: userData.ip
    });
  }
}

// Get all active users
export function getActiveUsers(): OnlineUser[] {
  // Convert the map to an array
  const users = Array.from(activeUsers.values());
  
  // Sort by last active time (most recent first)
  users.sort((a, b) => {
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });
  
  return users;
}

// Clean up inactive users (more than 30 minutes)
export function cleanupInactiveUsers() {
  const now = new Date();
  
  activeUsers.forEach((user, userId) => {
    const lastActive = new Date(user.lastActive);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins > 30) {
      activeUsers.delete(userId);
    }
  });
}

// Start the inactive users cleanup interval (run every 5 minutes)
export function startCleanupInterval() {
  setInterval(cleanupInactiveUsers, 5 * 60 * 1000);
}