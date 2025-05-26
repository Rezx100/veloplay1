import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users } from 'lucide-react';

// Interface for online user data
interface OnlineUser {
  id: string;
  displayName: string; 
  lastActive: string;
  currentPage?: string;
  loginTime: string;
}

export default function OnlineUsersTracker() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const queryClient = useQueryClient();
  
  // Query for active users data
  const { data: activeUsersData, isLoading, isError } = useQuery({
    queryKey: ['/api/admin/active-users'],
    // Refresh data every 30 seconds
    refetchInterval: 30000,
  });
  
  // Sample data for display purposes until the API is populated
  const demoUsers: OnlineUser[] = [
    {
      id: "1",
      displayName: "John Smith",
      lastActive: new Date().toISOString(),
      loginTime: new Date(Date.now() - 35 * 60000).toISOString(),
      currentPage: "Watch"
    },
    {
      id: "2",
      displayName: "Sarah Johnson",
      lastActive: new Date(Date.now() - 2 * 60000).toISOString(),
      loginTime: new Date(Date.now() - 15 * 60000).toISOString(),
      currentPage: "Home"
    },
    {
      id: "3",
      displayName: "Admin User",
      lastActive: new Date(Date.now() - 30000).toISOString(),
      loginTime: new Date(Date.now() - 25 * 60000).toISOString(),
      currentPage: "Admin"
    }
  ];

  useEffect(() => {
    // For now, use the demo data until the backend API is fully functional
    setOnlineUsers(demoUsers);
    
    // Once the API is working, uncomment this code:
    /*
    if (activeUsersData && Array.isArray(activeUsersData)) {
      setOnlineUsers(activeUsersData as OnlineUser[]);
    } else {
      setOnlineUsers([]);
    }
    */
  }, []);

  // Calculate time since a given timestamp
  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  // Determine if a user is currently active (active in last 5 minutes)
  const isUserActive = (lastActive: string) => {
    const now = new Date();
    const then = new Date(lastActive);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins < 5;
  };

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a] shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary" />
            <span>Online Users</span>
          </CardTitle>
          <Badge variant="outline" className="bg-[#2a2a2a] text-primary border-primary">
            {onlineUsers?.length || 0} Active
          </Badge>
        </div>
        <CardDescription className="text-gray-400">
          Users who accessed the site in the last 30 minutes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : onlineUsers?.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active users at the moment</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {Array.isArray(onlineUsers) && onlineUsers.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-2 rounded-md bg-[#222] border border-[#333]"
              >
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.displayName.split(' ').map(name => name[0]).join('')}
                      </span>
                    </div>
                    <div 
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1a1a1a] ${
                        isUserActive(user.lastActive) ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    ></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{user.displayName}</p>
                    <p className="text-xs text-gray-400">
                      {user.currentPage ? `On: ${user.currentPage}` : 'Browsing'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary">{getTimeSince(user.lastActive)}</p>
                  <p className="text-xs text-gray-400">Session: {getTimeSince(user.loginTime)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}