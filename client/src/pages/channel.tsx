import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useRoute } from 'wouter';
import Hls from 'hls.js';
import { useNetworkChannel } from '@/hooks/useNetworkChannels';
import { useAuth } from '@/hooks/useAuth';
import { getStandardizedStreamUrl, getFallbackStreamUrl } from '@/utils/streamUrlHelper';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize
} from 'lucide-react';

export default function ChannelPage() {
  const [, params] = useRoute('/channel/:id');
  const channelId = params?.id;
  const { channel, isLoading } = useNetworkChannel(channelId || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showBuffering, setShowBuffering] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Custom controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
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
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    
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
  
  // Control functions
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
    
    // Mobile-friendly fullscreen implementation
    const element = videoRef.current;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
      if (!document.fullscreenElement) {
        // Try different fullscreen methods for cross-platform compatibility
        if (element.requestFullscreen) {
          element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          (element as any).msRequestFullscreen();
        } else if (isMobile) {
          // For mobile devices, use native video fullscreen
          if ((element as any).webkitEnterFullscreen) {
            (element as any).webkitEnterFullscreen();
          } else {
            // Fallback: just make the video larger
            element.style.position = 'fixed';
            element.style.top = '0';
            element.style.left = '0';
            element.style.width = '100vw';
            element.style.height = '100vh';
            element.style.zIndex = '9999';
            setIsFullscreen(true);
          }
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        } else {
          // Reset custom fullscreen
          element.style.position = '';
          element.style.top = '';
          element.style.left = '';
          element.style.width = '';
          element.style.height = '';
          element.style.zIndex = '';
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.log('Fullscreen not supported on this device');
      // Graceful fallback - do nothing instead of throwing error
    }
  };
  
  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Setup HLS.js player
  useEffect(() => {
    let hls: Hls | null = null;
    
    const setupPlayer = () => {
      if (!channel?.streamUrl || !videoRef.current) return;
      
      // Special handling for NBA TV (channel ID 1)
      let streamUrl = channel?.streamUrl;
      
      // If this is NBA TV (channel ID 1), make sure we use the latest URL format
      if (channelId === '1') {
        const latestUrl = getStandardizedStreamUrl(`https://vpt.pixelsport.to:443/psportsgate/psportsgate100/1.m3u8`);
        streamUrl = latestUrl;
        console.log('[VideoPlayer] Using standardized NBA TV stream URL:', streamUrl);
      }
      
      setPlayerError(null);
      console.log('[VideoPlayer] Setting up player with URL:', streamUrl);
      
      // If native HLS is supported, use it
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[VideoPlayer] Using native HLS support');
        videoRef.current.src = streamUrl;
      } 
      // If not natively supported, use HLS.js if it's supported
      else if (Hls.isSupported()) {
        console.log('[VideoPlayer] Using HLS.js');
        // Detect Firefox for special handling
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        
        hls = new Hls({
          xhrSetup: (xhr) => {
            // Set CORS related options
            xhr.withCredentials = false;
            
            // Firefox-specific CORS handling
            if (isFirefox) {
              // Firefox requires minimal headers to avoid CORS issues
              xhr.setRequestHeader('Accept', 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*');
              
              // Don't set Origin or Referer headers in Firefox as they trigger CORS
              console.log('[VideoPlayer] Firefox detected - using minimal CORS headers');
            } else {
              // Chrome and other browsers can handle more headers
              xhr.setRequestHeader('Origin', window.location.origin);
              xhr.setRequestHeader('Referer', window.location.origin);
            }
          },
          // Improved HLS.js configuration for better reliability
          debug: true,
          manifestLoadingTimeOut: 30000, // Increased timeout
          manifestLoadingMaxRetry: 5,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 8,
          maxBufferLength: 30,
          lowLatencyMode: true
        });
        
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[VideoPlayer] Media attached');
          if (isInitialLoad) {
            setShowBuffering(true);
          }
          hls?.loadSource(streamUrl);
        });
        
        hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
          console.log('[VideoPlayer] Manifest loaded successfully:', data);
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('[VideoPlayer] Manifest parsed, found', data.levels.length, 'quality levels');
          
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
            
            // For mobile, always start muted for better autoplay success
            if (isMobile) {
              videoRef.current.muted = true;
              videoRef.current.setAttribute('muted', 'true');
            }
            
            try {
              // For mobile, try muted autoplay first (higher success rate)
              if (isMobile) {
                videoRef.current.muted = true;
                await videoRef.current.play();
                console.log('[VideoPlayer] ✅ Mobile muted autoplay successful - tap to unmute');
                setShowBuffering(false);
                setIsInitialLoad(false);
              } else {
                // Desktop: try direct play first
                await videoRef.current.play();
                console.log('[VideoPlayer] ✅ Desktop autoplay successful');
                setShowBuffering(false);
                setIsInitialLoad(false);
              }
            } catch (firstError) {
              console.log('[VideoPlayer] ⚠️ Initial autoplay blocked, trying fallback...');
              
              try {
                // Fallback: always try muted autoplay
                videoRef.current.muted = true;
                videoRef.current.setAttribute('muted', 'true');
                await videoRef.current.play();
                console.log('[VideoPlayer] ✅ Muted autoplay successful - tap to unmute');
                setShowBuffering(false);
                setIsInitialLoad(false);
              } catch (secondError) {
                console.log('[VideoPlayer] ⚠️ Muted autoplay blocked, trying load + play...');
                
                try {
                  // Final try: load first, then play muted
                  videoRef.current.muted = true;
                  videoRef.current.load();
                  await new Promise(resolve => setTimeout(resolve, 200));
                  await videoRef.current.play();
                  console.log('[VideoPlayer] ✅ Load + muted play successful');
                  setShowBuffering(false);
                  setIsInitialLoad(false);
                } catch (thirdError) {
                  console.log('[VideoPlayer] ⚠️ All autoplay attempts failed, showing manual play button');
                  setShowBuffering(false);
                  setIsInitialLoad(false);
                  // Show manual play button for user interaction
                }
              }
            }
          };
          
          attemptAutoplay();
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[VideoPlayer] Error details:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: data.url,
            response: data.response
          });
          
          if (data.fatal) {
            console.error('[VideoPlayer] Fatal error:', data);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // For NBA TV, try fallback URL on network error
                if (channelId === '1' && data.details === 'manifestLoadError') {
                  console.log('[VideoPlayer] NBA TV manifest load error, trying alternative URL');
                  const fallbackUrl = getFallbackStreamUrl(streamUrl || '') || '';
                  setPlayerError("Network error - trying alternative source...");
                  setTimeout(() => {
                    if (hls) {
                      hls.loadSource(fallbackUrl || '');
                    }
                  }, 2000);
                } else {
                  setPlayerError("Network error - please check your connection or try again later");
                  hls?.startLoad(); // Try to recover
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setPlayerError("Media error - attempting to recover");
                hls?.recoverMediaError(); // Try to recover
                break;
              default:
                setPlayerError("Could not load the stream");
                break;
            }
          }
        });
      } else {
        setPlayerError("Your browser doesn't support HLS playback");
      }
    };
    
    if (channel?.streamUrl) {
      // Reset initial load state when channel changes
      setIsInitialLoad(true);
      setupPlayer();
    }
    
    // Cleanup
    // Add video event listeners for buffering control - only show buffering on initial load
    const video = videoRef.current;
    if (video) {
      const handleCanPlay = () => {
        setShowBuffering(false);
        setIsInitialLoad(false);
      };
      const handlePlaying = () => {
        setShowBuffering(false);
        setIsInitialLoad(false);
      };
      const handleWaiting = () => {
        // Only show buffering indicator during initial load, not regular rebuffering
        if (isInitialLoad) {
          setShowBuffering(true);
        }
      };
      const handleLoadStart = () => {
        // Only show buffering indicator during initial load
        if (isInitialLoad) {
          setShowBuffering(true);
        }
      };
      
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('loadstart', handleLoadStart);
      
      return () => {
        if (hls) {
          console.log('[VideoPlayer] Cleaning up HLS player');
          hls.destroy();
        }
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('loadstart', handleLoadStart);
        video.pause();
        video.src = '';
        video.load();
      };
    }

    return () => {
      if (hls) {
        console.log('[VideoPlayer] Cleaning up HLS player');
        hls.destroy();
      }
    };
  }, [channel, channelId]);

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        {/* Video player skeleton - matches league game design */}
        <div className="bg-[#0d021f] rounded-xl overflow-hidden mb-8 border border-[#2f1a48]">
          <div className="relative aspect-video bg-slate-900 animate-pulse"></div>
        </div>
        
        {/* Title section skeleton - below player */}
        <div className="mb-4">
          <div className="h-6 w-20 bg-red-500/20 rounded animate-pulse mb-2"></div>
          <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-48 bg-slate-800 rounded animate-pulse"></div>
        </div>
        
        {/* About section skeleton */}
        <div className="mb-8">
          <div className="h-6 w-48 bg-slate-800 rounded animate-pulse mb-4"></div>
          <div className="bg-[#0d021f] rounded-lg p-4 border border-[#2f1a48]">
            <div className="h-4 w-full bg-slate-800 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="container mx-auto p-4 lg:p-6">
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4 text-zinc-700">
              <i className="fas fa-tv"></i>
            </div>
            <h1 className="text-xl font-bold mb-2">Channel Not Found</h1>
            <p className="text-zinc-400 mb-4">The channel you're looking for doesn't exist or is unavailable.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{channel.name} - VeloPlay</title>
        <meta name="description" content={`Watch ${channel.name} live on VeloPlay - 24/7 streaming of premium sports content.`} />
      </Helmet>

      <div className="container mx-auto p-4 lg:p-6">
        {/* Video Player - Modern clean design */}
        <div className="relative bg-black rounded-lg overflow-hidden mb-6 shadow-2xl">
          <div 
            className="relative aspect-video group"
            onMouseMove={() => {
              setShowControls(true);
              
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
              }
              
              controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
              }, 3000);
            }}
          >
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain bg-black rounded-lg" 
              autoPlay 
              playsInline
              webkit-playsinline="true"
              onClick={togglePlay}
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'
              }}
            ></video>
            
            {/* Buffering overlay - Responsive design */}
            {showBuffering && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="text-center space-y-3 px-4">
                  {/* Mobile-friendly responsive spinner */}
                  <div className="relative w-10 h-10 sm:w-16 sm:h-16 mx-auto">
                    <div className="absolute inset-0 border-2 sm:border-4 border-purple-300/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 sm:border-4 border-transparent border-t-purple-600 border-r-purple-500 rounded-full animate-spin"></div>
                  </div>
                  {/* Responsive buffering text */}
                  <p className="text-white text-sm sm:text-lg font-medium tracking-wide">Connecting stream...</p>
                </div>
              </div>
            )}
            
            {playerError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-sm rounded-lg">
                <div className="text-center p-8 max-w-md space-y-4">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
                    <div className="relative bg-red-500/10 rounded-full p-3 backdrop-blur-sm">
                      <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Stream Unavailable</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{playerError}</p>
                </div>
              </div>
            )}

            {/* Minimal Custom video controls */}
            <div 
              className={`absolute bottom-0 left-0 right-0 bg-black/80 px-4 py-3 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
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
        </div>

        {/* Channel Title - Modern clean design */}
        <div className="mb-6 space-y-4">
          {/* Live indicator - Modern design */}
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide shadow-lg">
              Live 24/7
            </span>
          </div>
          
          {/* Channel title - Modern typography */}
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
            {channel.name}
          </h1>
          
          {/* Status info - Clean design */}
          <div className="text-gray-400 text-base">
            <div className="flex items-center space-x-2">
              <span>Premium Sports Network</span>
              <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
              <span>Live Stream</span>
            </div>
          </div>
        </div>

        {/* About this Channel - Modern card design */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 tracking-wide">About this Channel</h2>
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/20 shadow-xl">
            <p className="text-gray-300 leading-relaxed text-base">{channel.description}</p>
          </div>
        </div>
      </div>
    </>
  );
}