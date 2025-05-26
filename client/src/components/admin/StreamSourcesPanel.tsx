import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle as AlertCircleIcon } from "lucide-react";

// Define the type for a stream source
interface StreamSource {
  id: number;
  name: string;
  url: string;
  description?: string;
  isActive: boolean;
  leagueId: string;
  priority: number;
  teamName: string;
  createdAt: string;
  updatedAt: string;
}

// Form schema for adding or editing a stream source
const streamSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().min(1, "URL is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  leagueId: z.string().min(1, "League is required"),
  priority: z.number().int().min(1).default(1),
  teamName: z.string().min(1, "Team name is required")
});

type StreamSourceFormValues = z.infer<typeof streamSourceSchema>;

export default function StreamSourcesPanel() {
  const { toast } = useToast();
  const [streamSources, setStreamSources] = useState<StreamSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentSourceId, setCurrentSourceId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<StreamSource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [addSourceDialogOpen, setAddSourceDialogOpen] = useState(false);
  
  // League color classes for badges
  const leagueColorClasses: Record<string, string> = {
    'nhl': 'bg-blue-100 text-blue-800',
    'nba': 'bg-red-100 text-red-800',
    'nfl': 'bg-green-100 text-green-800',
    'mlb': 'bg-yellow-100 text-yellow-800',
    'other': 'bg-purple-100 text-purple-800'
  };
  
  // Filter sources based on search and league selection
  const filteredSources = streamSources.filter(source => {
    // Filter by league
    if (selectedLeague !== 'all' && source.leagueId !== selectedLeague) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !source.url.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !source.teamName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Form setup
  const form = useForm<StreamSourceFormValues>({
    resolver: zodResolver(streamSourceSchema),
    defaultValues: {
      name: '',
      url: '',
      description: '',
      isActive: true,
      leagueId: 'nba',
      priority: 1,
      teamName: ''
    }
  });

  // Initialize stream sources with m3u8 URLs
  const initializeStreamSources = async () => {
    setIsSubmitting(true);
    try {
      // Display loading toast
      toast({
        title: "Initializing",
        description: "Setting up stream sources, this may take a moment...",
      });
      
      // Use the apiRequest utility which handles errors properly
      const response = await fetch('/api/stream-sources/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true })
      });

      // Check response status first
      if (!response.ok) {
        let errorMessage = 'Failed to initialize stream sources';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse the error JSON, use the default message
          console.error('Could not parse error:', e);
        }
        throw new Error(errorMessage);
      }
      
      // Try to parse the JSON response
      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Stream sources initialized successfully! Created ${result.count || 0} stream sources.`,
      });
      
      setIsSetupRequired(false);
      await fetchStreamSources();
    } catch (error) {
      console.error('Error initializing stream sources:', error);
      setHasError(true);
      toast({
        title: "Error",
        description: "Failed to initialize stream sources. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch all stream sources from the API
  const fetchStreamSources = async () => {
    setLoading(true);
    try {
      // Use the streams endpoint that works with the existing table
      const response = await fetch('/api/streams');
      if (!response.ok) {
        // Check if we need to set up the table (404 Not Found might mean table doesn't exist)
        if (response.status === 404 || response.status === 500) {
          setIsSetupRequired(true);
          throw new Error('Stream sources table might not exist');
        }
        throw new Error('Failed to fetch stream sources');
      }
      
      // Get the raw streams data
      const streamsData = await response.json();
      
      // Transform the streams data to match our StreamSource interface
      const transformedSources = streamsData.map((stream: any) => ({
        id: stream.id,
        name: `Stream for game ${stream.game_id}`,
        url: stream.stream_url,
        description: stream.away_stream_url ? `Has home and away feeds` : `Home feed only`,
        isActive: stream.is_active,
        leagueId: getLeagueFromGameId(stream.game_id),
        priority: 1,
        teamName: getTeamNameFromGameId(stream.game_id),
        createdAt: stream.created_at,
        updatedAt: stream.updated_at
      }));
      
      setStreamSources(transformedSources);
      setHasError(false);
    } catch (error) {
      console.error('Error fetching stream sources:', error);
      setHasError(true);
      toast({
        title: "Error",
        description: "Failed to load stream sources. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to extract league from game ID
  const getLeagueFromGameId = (gameId: string): string => {
    // Game IDs starting with 401773 are NHL
    if (gameId.startsWith('401773')) return 'nhl';
    // Game IDs starting with 401769 are NBA
    if (gameId.startsWith('401769')) return 'nba';
    // Game IDs starting with 401695 or 401764 are MLB
    if (gameId.startsWith('401695') || gameId.startsWith('401764')) return 'mlb';
    // Game IDs starting with 401657 are NFL
    if (gameId.startsWith('401657')) return 'nfl';
    
    // Default to 'other' if we can't determine the league
    return 'other';
  };
  
  // Helper function to get a team name from game ID (placeholder logic)
  const getTeamNameFromGameId = (gameId: string): string => {
    // For now, just use the game ID as the team name
    // In a real implementation, you would lookup the teams for this game ID
    return `Team for game ${gameId}`;
  };

  // Initialize by fetching data
  useEffect(() => {
    fetchStreamSources();
  }, []);

  // Handle opening the form for editing an existing stream source
  const handleEditSource = (source: StreamSource) => {
    form.reset({
      name: source.name,
      url: source.url,
      description: source.description || '',
      isActive: source.isActive,
      leagueId: source.leagueId,
      priority: source.priority,
      teamName: source.teamName
    });
    setCurrentSourceId(source.id);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteClick = (source: StreamSource) => {
    setSourceToDelete(source);
    setIsDeleteConfirmOpen(true);
  };

  // Handle confirming the deletion of a stream source
  const confirmDelete = async () => {
    if (!sourceToDelete) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/stream-sources/${sourceToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete stream source');
      }
      
      // Update the local state
      setStreamSources(streamSources.filter(source => source.id !== sourceToDelete.id));
      
      toast({
        title: "Success",
        description: "Stream source deleted successfully.",
      });
      
      setIsDeleteConfirmOpen(false);
      setSourceToDelete(null);
    } catch (error) {
      console.error('Error deleting stream source:', error);
      toast({
        title: "Error",
        description: "Failed to delete stream source. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for creating or editing a stream source
  const onSubmit = async (values: StreamSourceFormValues) => {
    setIsSubmitting(true);
    
    try {
      let response;
      
      if (formMode === 'create') {
        // Create a new stream source
        response = await fetch(
          '/api/stream-sources',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(values)
          }
        );
      } else {
        // Update an existing stream source
        response = await fetch(
          `/api/stream-sources/${currentSourceId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(values)
          }
        );
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }
      
      const newSource = await response.json();
      
      // Update the local state
      if (formMode === 'create') {
        setStreamSources([...streamSources, newSource]);
      } else {
        setStreamSources(streamSources.map(source => 
          source.id === currentSourceId ? newSource : source
        ));
      }
      
      toast({
        title: "Success",
        description: `Stream source ${formMode === 'create' ? 'created' : 'updated'} successfully.`,
      });
      
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: `Failed to ${formMode === 'create' ? 'create' : 'update'} stream source. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Stream Sources</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={initializeStreamSources}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Initialize Sources'
            )}
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setAddSourceDialogOpen(true)}
          >
            Add Source
          </Button>
        </div>
      </div>

      {hasError && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error loading or initializing stream sources.
            Please try again or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      {isSetupRequired && (
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription>
            Stream sources need to be set up before you can use them.
            Click the "Initialize Sources" button to set up stream sources automatically,
            or "Add Source" to add them manually.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="w-full flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : streamSources.length === 0 && !isSetupRequired ? (
        <div className="text-center py-8 text-muted-foreground">
          No stream sources found. Click "Add Source" to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {/* League filters */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedLeague === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedLeague('all')}
            >
              All
            </Button>
            <Button 
              variant={selectedLeague === 'nhl' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedLeague('nhl')}
            >
              NHL
            </Button>
            <Button 
              variant={selectedLeague === 'nfl' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedLeague('nfl')}
            >
              NFL
            </Button>
            <Button 
              variant={selectedLeague === 'nba' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedLeague('nba')}
            >
              NBA
            </Button>
            <Button 
              variant={selectedLeague === 'mlb' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedLeague('mlb')}
            >
              MLB
            </Button>
            <Button 
              variant={selectedLeague === 'other' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedLeague('other')}
            >
              Special Channels
            </Button>
          </div>
          
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search teams..."
              className="w-full px-4 py-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Stream sources table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team/Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">League</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stream URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{source.name}</div>
                          <div className="text-sm text-gray-500">{source.teamName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${leagueColorClasses[source.leagueId] || 'bg-gray-100 text-gray-800'}`}>
                        {source.leagueId.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {source.url}
                      </div>
                      {source.description && (
                        <div className="text-xs text-gray-500">{source.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${source.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {source.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditSource(source)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => handleDeleteClick(source)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Add New Stream Source' : 'Edit Stream Source'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' 
                ? 'Add a new stream source to the system.' 
                : 'Edit the existing stream source details.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Stream name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/stream.m3u8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Team name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="leagueId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>League</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a league" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nba">NBA</SelectItem>
                        <SelectItem value="nfl">NFL</SelectItem>
                        <SelectItem value="mlb">MLB</SelectItem>
                        <SelectItem value="nhl">NHL</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Description of the stream" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        If the stream is currently active and usable
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {formMode === 'create' ? 'Creating...' : 'Saving...'}
                    </>
                  ) : (
                    formMode === 'create' ? 'Create' : 'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stream Source</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stream source? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sourceToDelete && (
              <div className="border rounded p-4">
                <p><strong>Name:</strong> {sourceToDelete.name}</p>
                <p><strong>Team:</strong> {sourceToDelete.teamName}</p>
                <p><strong>URL:</strong> {sourceToDelete.url}</p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}