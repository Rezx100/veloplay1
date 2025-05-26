import { useEffect, useState, useRef } from 'react';
import { Game } from '@shared/schema';
import { useGameStream, getCurrentEasternTime } from '@/hooks/useGames';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { SiNhl, SiNba, SiMlb } from 'react-icons/si';
import { IoAmericanFootballOutline } from 'react-icons/io5';
import { 
  Clock, Eye, Info, Lock, Play, Pause, 
  Volume2, VolumeX, Maximize, Minimize, Settings
} from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import { VideoFeedSelector } from './VideoFeedSelector';
import VideoPlayerSkeleton from './VideoPlayerSkeleton';

import { PreGameTemplate } from './PreGameTemplate';
import Hls from 'hls.js';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  getStandardizedStreamUrl, 
  getFallbackStreamUrl, 
  getStreamId, 
  isSpecialChannel 
} from '@/utils/streamUrlHelper';
import { standardizeStreamUrl } from '@/lib/api';

// HLS video player component using HLS.js
interface HlsVideoPlayerProps {
  url: string;
}

function HlsVideoPlayer({ url }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [usingFallbackUrl, setUsingFallbackUrl] = useState(false);
  
  // Custom controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Update control states based on video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    
    // Show controls briefly on mouse move
    const handleMouseMove = () => {
      setShowControls(true);
      
      // Clear existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Hide controls after 3 seconds of inactivity
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };
    
    // Add event listeners to update UI state based on video state
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    
    // Cleanup
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    let hls: Hls | null = null;
    
    const initPlayer = (streamUrl: string, isFallback = false) => {
      if (!videoRef.current) return;
      
      // Clean up previous instance
      if (hls) {
        hls.destroy();
      }
      
      // Only show loading indicator if this is the initial load
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setPlayerError(null);
      
      // Standardize the URL format using our helper
      const processedUrl = isFallback ? streamUrl : getStandardizedStreamUrl(streamUrl);
      
      // For debugging
      const streamId = getStreamId(processedUrl);
      const isSpecial = isSpecialChannel(processedUrl);
      console.log('[VideoPlayer] Processing stream:', {
        originalUrl: url,
        processedUrl,
        streamId,
        isSpecialChannel: isSpecial,
        isFallback
      });
      
      // Check if the browser supports HLS natively (like Safari)
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[VideoPlayer] Browser supports HLS natively, using URL:', processedUrl);
        videoRef.current.src = processedUrl;
        
        videoRef.current.addEventListener('loadedmetadata', () => {
          console.log('[VideoPlayer] Video metadata loaded successfully');
          setIsLoading(false);
        });
        
        videoRef.current.addEventListener('playing', () => {
          console.log('[VideoPlayer] Playback started successfully');
          setIsLoading(false);
          setIsInitialLoad(false); // Mark initial load as complete
        });
        
        videoRef.current.addEventListener('error', (e) => {
          const videoElement = e.target as HTMLVideoElement;
          const errorCode = videoElement.error ? videoElement.error.code : 'unknown';
          const errorMessage = videoElement.error ? videoElement.error.message : 'Unknown error';
          
          console.error('[VideoPlayer] Native player error:', {
            code: errorCode,
            message: errorMessage,
            url: processedUrl
          });
          
          // If this is a primary URL and a fallback is available, try it
          if (!isFallback) {
            const fallbackUrl = getFallbackStreamUrl(processedUrl);
            if (fallbackUrl) {
              console.log('[VideoPlayer] Trying fallback URL:', fallbackUrl);
              setUsingFallbackUrl(true);
              initPlayer(fallbackUrl, true);
              return;
            }
          }
          
          setPlayerError(`Error loading stream: ${errorMessage}`);
          setIsLoading(false);
        });
      } 
      // If not natively supported, use HLS.js if it's supported
      else if (Hls.isSupported()) {
        console.log('[VideoPlayer] Using HLS.js with URL:', processedUrl);
        // Detect Firefox for special handling
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        
        hls = new Hls({
          xhrSetup: (xhr, url) => {
            // Configure xhr for pixelsport.to streaming server
            xhr.withCredentials = false;
            
            // Firefox-specific CORS handling
            if (isFirefox) {
              // Firefox requires minimal headers to avoid CORS issues
              xhr.setRequestHeader('Accept', 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*');
              
              // Don't set Origin or Referer headers in Firefox as they trigger CORS
              console.log('[VideoPlayer] Firefox detected - using minimal CORS headers');
            } else {
              // Chrome and other browsers can handle more headers
              xhr.setRequestHeader('Accept', '*/*');
              xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
              
              // Remove any headers that might cause issues
              try {
                xhr.setRequestHeader('Origin', '');
                xhr.setRequestHeader('Referer', '');
              } catch (e) {
                // Ignore if headers can't be set
              }
            }
          },
          // Streaming server specific configuration
          manifestLoadingTimeOut: 10000,    // Shorter timeout for faster failure
          manifestLoadingMaxRetry: 3,        // Fewer retries initially
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 4,
          
          // Buffer configuration for live streams
          maxBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000,  // 60MB
          maxBufferHole: 0.5,
          
          // Live streaming optimizations
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          lowLatencyMode: true,
          
          // Enable detailed debugging
          debug: true,
          enableWorker: false,  // Disable worker for better debugging
          
          // CORS settings
          requestMediaKeySystemAccessFunc: null
        });
        
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[VideoPlayer] HLS.js attached to video element, loading source');
          hls?.loadSource(processedUrl);
        });
        
        // Enhanced error handling for debugging
        hls.on(Hls.Events.ERROR, function (event, data) {
          console.error('[VideoPlayer] HLS Error:', { event, data, url: processedUrl });
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('[VideoPlayer] 🛠️ Network error - attempting retry...');
                // Try to recover from network error
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('[VideoPlayer] 🛠️ Media error - attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                console.error('[VideoPlayer] 💥 Fatal error - destroying player');
                setPlayerError(`Stream error: ${data.type}: ${data.details || 'Unknown error'}`);
                setIsLoading(false);
                hls.destroy();
                break;
            }
          }
        });

        hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
          console.log('[VideoPlayer] HLS manifest loaded:', {
            url: data.url,
            levels: data.levels?.length || 0
          });
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('[VideoPlayer] HLS manifest parsed:', {
            levels: data.levels.length,
            firstLevel: data.firstLevel,
            url: processedUrl
          });
          
          // Enhanced autoplay strategies for all platforms including mobile phones
          const attemptAutoplay = async () => {
            if (!videoRef.current) return;
            
            // Mobile detection
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Set mobile-friendly attributes
            if (isMobile) {
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.setAttribute('webkit-playsinline', 'true');
              videoRef.current.setAttribute('x5-playsinline', 'true');
              videoRef.current.setAttribute('x5-video-player-type', 'h5');
              videoRef.current.setAttribute('x5-video-player-fullscreen', 'true');
            }
            
            // Set autoplay attributes
            videoRef.current.setAttribute('autoplay', 'true');
            videoRef.current.autoplay = true;
            videoRef.current.preload = 'auto';
            
            try {
              // First attempt: Try with sound (what user wants)
              await videoRef.current.play();
              console.log('[VideoPlayer] ✅ Autoplay with sound successful');
              setIsPlaying(true);
              setIsLoading(false);
              setIsInitialLoad(false);
            } catch (firstError) {
              console.log('[VideoPlayer] ⚠️ Autoplay with sound blocked, trying muted...');
              
              try {
                // Fallback: Try muted autoplay
                videoRef.current.muted = true;
                videoRef.current.setAttribute('muted', 'true');
                await videoRef.current.play();
                console.log('[VideoPlayer] ✅ Muted autoplay successful - tap to unmute');
                setIsPlaying(true);
                setIsMuted(true);
                setIsLoading(false);
                setIsInitialLoad(false);
              } catch (secondError) {
                console.log('[VideoPlayer] ⚠️ Muted autoplay blocked, trying load + play...');
                
                try {
                  // Final try: load first, then play muted
                  videoRef.current.muted = true;
                  videoRef.current.load();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  await videoRef.current.play();
                  console.log('[VideoPlayer] ✅ Load + muted play successful');
                  setIsPlaying(true);
                  setIsMuted(true);
                  setIsLoading(false);
                  setIsInitialLoad(false);
                } catch (thirdError) {
                  console.log('[VideoPlayer] ⚠️ All autoplay attempts failed');
                  setIsLoading(false);
                }
              }
            }
          };
          
          attemptAutoplay();
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[VideoPlayer] HLS error:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: data.url,
            isFallback: isFallback,
            response: data.response ? {
              code: data.response.code,
              text: data.response.text
            } : 'No response data'
          });
          
          if (data.fatal) {
            // For manifest loading errors, try the fallback URL
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && 
                data.details === 'manifestLoadError' && 
                !isFallback) {
              
              const fallbackUrl = getFallbackStreamUrl(processedUrl);
              if (fallbackUrl) {
                console.log('[VideoPlayer] Manifest load error, trying fallback URL:', fallbackUrl);
                setPlayerError("Stream error - trying alternative source...");
                setUsingFallbackUrl(true);
                
                // Small delay to avoid immediate retry
                setTimeout(() => {
                  initPlayer(fallbackUrl, true);
                }, 1000);
                return;
              }
            }
            
            const errorMessage = data.details ? `${data.type}: ${data.details}` : data.type;
            setPlayerError(`Stream error: ${errorMessage}`);
            setIsLoading(false);
            
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              console.log('[VideoPlayer] Attempting to recover from network error...');
              // Try to recover from network errors
              hls?.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.log('[VideoPlayer] Attempting to recover from media error...');
              hls?.recoverMediaError();
            }
          }
        });
      } else {
        console.error('[VideoPlayer] HLS not supported in this browser');
        setPlayerError('HLS streaming not supported in this browser');
        setIsLoading(false);
      }
    };
    
    if (url) {
      console.log('[VideoPlayer] Initializing player with source:', url);
      // Reset fallback state and initial load state when URL changes
      setUsingFallbackUrl(false);
      setIsInitialLoad(true);
      initPlayer(url);
    }
    
    // Cleanup function
    return () => {
      console.log('[VideoPlayer] Destroying player instance on source change');
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]); // Re-initialize when URL changes
  
  // Handle custom control actions
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play()
        .catch(error => console.error('Play error:', error));
    }
  };
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  };
  
  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    if (newVolume > 0 && videoRef.current.muted) {
      videoRef.current.muted = false;
    }
  };
  
  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
  };
  
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div 
      className="relative w-full h-full bg-black rounded-lg overflow-hidden group"
      onMouseMove={() => {
        setShowControls(true);
        
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        
        controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }, 3000);
      }}
    >
      {/* Custom loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-3 px-4">
            {/* Responsive mobile-friendly spinner */}
            <div className="relative w-10 h-10 sm:w-16 sm:h-16 mx-auto">
              <div className="absolute inset-0 border-2 sm:border-4 border-purple-300/20 rounded-full"></div>
              <div className="absolute inset-0 border-2 sm:border-4 border-transparent border-t-purple-600 border-r-purple-500 rounded-full animate-spin"></div>
            </div>
            {/* Responsive text sizing */}
            <p className="text-white text-sm sm:text-lg font-medium tracking-wide">Connecting stream...</p>
            {usingFallbackUrl && (
              <p className="text-white/70 text-sm mt-2 bg-purple-900/50 px-3 py-1 rounded-full">
                Using alternate stream source
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Error overlay with redesigned UI */}
      {playerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-20 backdrop-blur-sm text-white text-center p-6">
          <div className="max-w-md bg-gray-900/90 p-6 rounded-xl shadow-2xl border border-red-500/20">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <AlertTriangle className="w-full h-full" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Stream Error</h3>
            <p className="mb-6 text-white/80">{playerError}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!usingFallbackUrl && (
                <button 
                  onClick={() => {
                    const fallbackUrl = getFallbackStreamUrl(url);
                    if (fallbackUrl) {
                      videoRef.current!.src = fallbackUrl;
                      setUsingFallbackUrl(true);
                      setPlayerError(null);
                      videoRef.current?.load();
                      videoRef.current?.play()
                        .catch(error => console.error('Fallback playback error:', error));
                    }
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Alternate Source
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Video element - without default controls, no CORS restrictions */}
      <video 
        ref={videoRef} 
        className="w-full h-full rounded-lg" 
        playsInline
        autoPlay
        webkit-playsinline="true"
        onClick={togglePlay}
        crossOrigin="anonymous"
        style={{ objectFit: 'contain' }}
      />
      
      {/* Minimal Custom video controls - Always visible on mobile with fadeaway */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-black/80 px-4 py-3 transition-opacity duration-500 ${
          showControls || !isPlaying ? 'opacity-100' : 
          // On mobile (touch devices), show controls longer with slower fade
          (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ? 'opacity-80' : 'opacity-0'
        }`}
      >
        {/* Always-full red progress bar */}
        <div className="w-full h-1 bg-gray-600 rounded mb-3">
          <div className="h-full bg-red-500 rounded w-full" />
        </div>
        
        {/* Minimal Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Simple Play/Pause button */}
            <button 
              onClick={togglePlay}
              className="text-white hover:text-[#7f00ff] transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            {/* Simple Volume control */}
            <button 
              onClick={toggleMute}
              className="text-white hover:text-[#7f00ff] transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            

          </div>
          
          <div className="flex items-center space-x-3">
            {/* Simple Live indicator */}
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">LIVE</span>
            </div>
            
            {/* Simple Fullscreen toggle */}
            <button 
              onClick={toggleFullscreen}
              className="text-white hover:text-[#7f00ff] transition-colors"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoPlayerModernProps {
  game: Game | null | undefined;
}

export default function VideoPlayerModern({ game }: VideoPlayerModernProps) {
  const [error, setError] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState('');
  const [selectedFeed, setSelectedFeed] = useState<'home' | 'away'>('home');
  const [showPreGame, setShowPreGame] = useState(true);
  const { isAuthenticated, isEmailVerified, isLoading: authLoading } = useAuth();
  const formattedGameTime = useLocalTime(game?.date || '');
  
  // Early return for null game data
  if (!game) {
    return <VideoPlayerSkeleton />;
  }

  // Get stream data from API with the selected feed
  const { 
    data: streamData, 
    isLoading: isStreamLoading, 
    error: streamError,
    refetch: refetchStream
  } = useGameStream(game?.id || '', selectedFeed);
  
  // Handle feed change
  const handleFeedChange = (feed: 'home' | 'away') => {
    setSelectedFeed(feed);
  };

  // Calculate if game is in warmup stage using consistent logic for all leagues
  const isWarmupStage = (() => {
    if (!game) return false;
    
    if (game.state === 'pre' && game.date) {
      // PRIMARY METHOD: Check the game status directly from API data
      // This is the most accurate method since our server now enriches the status field
      const statusDetail = (game.status?.detail || '').toLowerCase();
      
      // If status explicitly mentions 'warmup', game is definitely in warmup stage
      if (statusDetail.includes('warmup')) {
        console.log(`Game ${game.id} (${game?.league?.toUpperCase()}) in warmup based on API status: "${game.status?.detail}"`);
        return true;
      }
      
      // SECONDARY METHOD: Time-based calculation directly comparing UTC timestamps
      // This provides consistent time calculation for accurate warmup detection
      try {
        // Parse game date as UTC (how it's stored in API)
        const gameDate = new Date(game.date);
        
        // Get current time in UTC for direct comparison
        const now = new Date();
        
        // Calculate time difference in minutes
        const timeDiffMs = gameDate.getTime() - now.getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);
        
        // Game is in warmup if it's between 30 minutes before start and start time
        const isTimeInWarmup = timeDiffMinutes <= 30 && timeDiffMinutes > 0;
        
        // Detailed logging to help monitor how the detection is working
        console.log(`Game ${game.id} (${game?.league?.toUpperCase()}) time check: 
          - Game at: ${gameDate.toISOString()} 
          - Current: ${now.toISOString()}
          - Minutes until start: ${Math.round(timeDiffMinutes)}`);
        console.log(`Game ${game.id} (${game?.league?.toUpperCase()}) warmup status: ${isTimeInWarmup ? 'In warmup window' : 'Not yet in warmup'}`);
        
        return isTimeInWarmup;
      } catch (error) {
        console.error(`Error calculating warmup status for game ${game.id}:`, error);
        return false;
      }
    }
    return false;
  })();

  // Handle timer for pre-game countdown using UTC timestamps for consistency
  useEffect(() => {
    if (!game || game.state !== 'pre' || isWarmupStage) return;
    
    const timer = setInterval(() => {
      if (!game?.date) {
        setCountdownText('Time TBD');
        return;
      }
      
      // Parse the game date as UTC, which is how it's stored in our API
      const gameDate = new Date(game.date);
      
      // Get current time in UTC format for proper comparison
      const now = new Date();
      
      // Calculate time difference in milliseconds
      const timeRemaining = gameDate.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        setCountdownText('Starting soon');
        clearInterval(timer);
      } else {
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        setCountdownText(
          `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s until game time`
        );
        
        // Debug information - log current values
        if (seconds === 0 || seconds === 30) {
          console.log(`Game ${game.id} countdown debug:
            - Game date: ${gameDate.toISOString()} 
            - Now: ${now.toISOString()}
            - Time remaining: ${hours}h ${minutes}m ${seconds}s`
          );
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [game?.date, game?.state, isWarmupStage, game?.id]);

  // Get league icon
  let LeagueIcon;
  switch (game.league.toLowerCase()) {
    case 'nhl': LeagueIcon = SiNhl; break;
    case 'nba': LeagueIcon = SiNba; break;
    case 'mlb': LeagueIcon = SiMlb; break;
    case 'nfl': LeagueIcon = IoAmericanFootballOutline; break;
    default: LeagueIcon = Info; break;
  }

  // Helper function to check if the error is a "stream not available" error (404)
  const isStreamNotFoundError = (error: any): boolean => {
    return error && 
           typeof error === 'object' && 
           'status' in error && 
           error.status === 404;
  };

  // Simply return the raw stream URL
  const getCleanStreamUrl = (streamUrl: string): string => {
    return streamUrl.trim();
  };

  // Get the stadium background image based on the league
  const getStadiumImage = () => {
    switch(game.league.toLowerCase()) {
      case 'nba': return '/nba-stadium.webp';
      case 'nhl': return '/nhl-stadium.png';
      case 'mlb': return '/mlb-stadium.jpg';
      case 'nfl': return '/nfl-stadium.jpg';
      default: return '/nba-stadium.webp';
    }
  };

  // If user is not authenticated, show sign-in prompt
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden shadow-2xl relative aspect-video">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div style={{ 
          backgroundImage: `url(${getStadiumImage()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} className="w-full h-full">
          <div className="flex flex-col items-center justify-center h-full relative z-20 text-white p-4">
            <Lock className="h-12 w-12 mb-4 text-[#7f00ff]" />
            <h2 className="text-2xl font-bold mb-3 text-center">Sign In Required</h2>
            <p className="mb-6 text-center max-w-md text-gray-300">
              Please sign in to watch this {game.league.toUpperCase()} game between {game.homeTeam.name} and {game.awayTeam.name}
            </p>
            <div className="flex space-x-4">
              <Button 
                onClick={() => window.location.href = '/signin'} 
                className="bg-[#7f00ff] hover:bg-[#9332ff]"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/signup'} 
                variant="outline" 
                className="border-white/20 hover:bg-white/10"
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isStreamLoading || authLoading) {
    return <VideoPlayerSkeleton />;
  }
  
  // Error state for stream URLs
  if (streamError && !isStreamNotFoundError(streamError)) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg overflow-hidden shadow-2xl relative aspect-video flex flex-col items-center justify-center text-white p-4">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mb-4 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold mb-3">Stream Error</h2>
          <p className="mb-6 max-w-md mx-auto text-gray-300">
            We're having trouble loading this stream. Please try again later.
          </p>
          <Button onClick={() => refetchStream()} className="bg-[#7f00ff] hover:bg-[#9332ff]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // For pre-game status (but NOT in warmup), show the stunning new pre-game template with broadcast info
  if (game.state === 'pre' && !isWarmupStage) {
    return (
      <PreGameTemplate 
        game={game} 
        onStreamStart={() => {
          // Start the video stream when user clicks watch
          setShowPreGame(false);
        }} 
      />
    );
  }

  // Legacy pre-game fallback (should not be reached with new template)
  if (false) {
    return (
      <div 
        className="bg-gradient-to-br from-[#0d021f] to-black rounded-lg overflow-hidden shadow-2xl relative aspect-video"
        style={{ 
          backgroundImage: `url(${getStadiumImage()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/70"></div>
        
        {/* Additional blurred stadium image overlay behind content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-4xl h-3/4 rounded-2xl overflow-hidden">
            <img 
              src={
                game.league === 'nhl' ? '/nhl-stadium.png' :
                game.league === 'mlb' ? '/mlb-stadium.jpg' :
                game.league === 'nfl' ? '/nfl-stadium.jpg' :
                '/nba-stadium.webp'
              }
              className="absolute inset-0 w-full h-full object-cover filter blur-[5px]"
              alt=""
            />
            <div className="absolute inset-0 bg-[#0d021f] opacity-40"></div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center h-full relative z-20 text-white p-4">
          {/* Team vs Team with logos */}
          <div className="flex items-center justify-center mb-6 w-full max-w-2xl">
            {/* Away Team */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative h-16 w-16 md:h-20 md:w-20 mb-2">
                <img 
                  src={game.awayTeam.logo} 
                  alt={game.awayTeam.name}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-[#7f00ff]/20 to-[#9332ff]/10 backdrop-blur-sm rounded-lg border border-white/10 hidden items-center justify-center"
                  style={{ display: 'none' }}
                >
                  <span className="text-xs font-bold text-white">{game.awayTeam.abbreviation}</span>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-center">
                {game.awayTeam.name}
              </h3>
              <p className="text-sm text-gray-300">{game.awayTeam.abbreviation}</p>
            </div>
            
            {/* VS Separator */}
            <div className="flex flex-col items-center mx-4 md:mx-8">
              <LeagueIcon className="h-8 w-8 mb-2 text-[#7f00ff]" />
              <span className="text-2xl md:text-3xl font-bold text-[#7f00ff]">VS</span>
            </div>
            
            {/* Home Team */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative h-16 w-16 md:h-20 md:w-20 mb-2">
                <img 
                  src={game.homeTeam.logo} 
                  alt={game.homeTeam.name}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-[#7f00ff]/20 to-[#9332ff]/10 backdrop-blur-sm rounded-lg border border-white/10 hidden items-center justify-center"
                  style={{ display: 'none' }}
                >
                  <span className="text-xs font-bold text-white">{game.homeTeam.abbreviation}</span>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-center">
                {game.homeTeam.name}
              </h3>
              <p className="text-sm text-gray-300">{game.homeTeam.abbreviation}</p>
            </div>
          </div>
          
          {/* Game Time and Venue */}
          <div className="flex flex-col items-center mb-6 text-gray-300">
            <div className="flex items-center mb-2">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formattedGameTime}</span>
            </div>
            {game.venue && (
              <p className="text-sm">{game.venue.name}, {game.venue.city}</p>
            )}
          </div>
          
          {/* Countdown or Warmup Status */}
          <div className="mb-6 text-xl font-semibold text-center">
            {isWarmupStage ? (
              <div className="flex items-center">
                <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-red-500 mr-2"></span>
                <span>Game in warmup - stream starting soon</span>
              </div>
            ) : (
              <span>{countdownText}</span>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              onClick={() => refetchStream()} 
              className="border-white/20 hover:bg-white/10"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Check for Stream
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Stream not available for live games - show error message
  if (!streamData?.streamUrl || isStreamNotFoundError(streamError)) {
    return (
      <div 
        className="bg-gradient-to-br from-[#0d021f] to-black rounded-lg overflow-hidden shadow-2xl relative aspect-video"
        style={{ 
          backgroundImage: `url(${getStadiumImage()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="flex flex-col items-center justify-center h-full relative z-10 text-white p-4">
          <LeagueIcon className="h-12 w-12 mb-4 text-[#7f00ff]" />
          
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">
            {game.homeTeam.name} vs {game.awayTeam.name}
          </h2>
          
          <div className="flex items-center mb-6 text-gray-300">
            <Clock className="h-4 w-4 mr-1" />
            <span>
              {game.status?.period !== undefined ? `Period ${game.status.period}` : game.status?.detail || 'Live'}
            </span>
          </div>
          
          <div className="text-center">
            <p className="mb-4 text-lg">
              Stream is currently unavailable for this game.
            </p>
            <Button 
              onClick={() => refetchStream()} 
              className="bg-[#7f00ff] hover:bg-[#9332ff]"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Check Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Only for games that are:
  // 1. Live ('in' state), or
  // 2. In warmup for NBA/NFL (isWarmupStage=true)
  // And in either case, must have a stream URL
  if ((game.state === 'in' || isWarmupStage) && streamData?.streamUrl) {
    // Get the appropriate stream URL for the selected feed
    let rawStreamUrl = (selectedFeed === 'away' && streamData.hasAwayFeed && streamData.awayStreamUrl) 
      ? streamData.awayStreamUrl 
      : streamData.streamUrl;
    
    // Use the stream URL directly from centralized database (no more hardcoded overrides!)
    const streamUrl = rawStreamUrl;
    
    console.log("Feed type:", selectedFeed);
    console.log("Has away feed:", streamData.hasAwayFeed);
    console.log("Game ID for stream:", game.id);
    console.log("Teams for this stream:", `${game.homeTeam.name} vs ${game.awayTeam.name}`);
    console.log("Using centralized database URL:", streamUrl);
    
    return (
      <div className="rounded-lg overflow-hidden shadow-2xl relative aspect-video">
        {/* Video feed selector */}
        {streamData.hasAwayFeed && (
          <VideoFeedSelector 
            currentFeed={selectedFeed}
            hasAwayFeed={streamData.hasAwayFeed}
            onChangeFeed={handleFeedChange} 
            className="absolute top-2 right-2 z-10"
          />
        )}
        
        {/* Use the HLS player component that handles stream properly */}
        <HlsVideoPlayer url={streamUrl} />
      </div>
    );
  }

  // Fallback for any other state
  return (
    <div className="bg-gradient-to-br from-[#0d021f] to-black rounded-lg overflow-hidden shadow-2xl relative aspect-video">
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="flex flex-col items-center justify-center h-full relative z-10 text-white p-4">
        <Info className="h-12 w-12 mb-4 text-[#7f00ff]" />
        <h2 className="text-2xl font-bold mb-2">Game Status Unknown</h2>
        <p className="mb-6 text-center max-w-md text-gray-300">
          We're having trouble determining the status of this game. Please check back later.
        </p>
        <Button onClick={() => window.location.reload()} className="bg-[#7f00ff] hover:bg-[#9332ff]">
          Refresh Page
        </Button>
      </div>
    </div>
  );
}