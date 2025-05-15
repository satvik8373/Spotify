import React, { useEffect, useState, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Outlet, useLocation } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import AudioPlayer from './components/AudioPlayer';
import { PlaybackControls } from './components/PlaybackControls';
import MobileNav from './components/MobileNav';
import Header from '@/components/Header';
import { usePlayerStore } from '@/stores/usePlayerStore';

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { currentSong } = usePlayerStore();
  const hasActiveSong = !!currentSong;
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [gradientColors, setGradientColors] = useState({
    primary: 'rgb(18, 18, 18)',
    secondary: 'rgb(40, 40, 40)',
    accent: 'rgb(29, 185, 84)'
  });

  // Update gradient colors based on route or song
  useEffect(() => {
    // A set of nice Spotify-like gradient pairs
    const gradientPairs = [
      { primary: 'rgb(83, 83, 198)', secondary: 'rgb(13, 13, 31)', accent: 'rgb(29, 185, 84)' },
      { primary: 'rgb(132, 87, 255)', secondary: 'rgb(9, 9, 22)', accent: 'rgb(30, 215, 96)' },
      { primary: 'rgb(80, 56, 160)', secondary: 'rgb(12, 9, 56)', accent: 'rgb(29, 185, 84)' },
      { primary: 'rgb(193, 69, 69)', secondary: 'rgb(31, 9, 12)', accent: 'rgb(255, 131, 112)' },
      { primary: 'rgb(43, 107, 164)', secondary: 'rgb(6, 32, 56)', accent: 'rgb(44, 196, 243)' },
      { primary: 'rgb(105, 59, 177)', secondary: 'rgb(20, 13, 43)', accent: 'rgb(231, 119, 255)' },
      { primary: 'rgb(54, 135, 124)', secondary: 'rgb(7, 54, 49)', accent: 'rgb(115, 244, 211)' },
    ];

    // Pick a gradient based on the current path
    const pathHash = Math.abs(location.pathname.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + acc;
    }, 0));
    
    // Use currentSong as another source of variety if available
    const songInfluence = currentSong ? 
      (currentSong.title?.length || 0) + (currentSong.artist?.length || 0) : 0;
    
    const combinedHash = (pathHash + songInfluence) % gradientPairs.length;
    setGradientColors(gradientPairs[combinedHash]);
    
    // Apply the gradient to a CSS variable that we'll use for the background
    if (mainContentRef.current) {
      document.documentElement.style.setProperty('--spotify-primary-bg', gradientColors.primary);
      document.documentElement.style.setProperty('--spotify-secondary-bg', gradientColors.secondary);
      document.documentElement.style.setProperty('--spotify-accent-color', gradientColors.accent);
    }
  }, [location.pathname, currentSong]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set viewport width variable for proper mobile rendering
  useEffect(() => {
    const setVw = () => {
      // Store viewport width as CSS variable
      document.documentElement.style.setProperty('--vw', `${window.innerWidth * 0.01}px`);
    };
    
    setVw();
    window.addEventListener('resize', setVw);
    window.addEventListener('orientationchange', setVw);
    
    return () => {
      window.removeEventListener('resize', setVw);
      window.removeEventListener('orientationchange', setVw);
    };
  }, []);

  // Add CSS for the Spotify-style gradient background
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .spotify-gradient-bg {
        background: linear-gradient(180deg, 
          var(--spotify-primary-bg, rgb(83, 83, 198)) 0%, 
          var(--spotify-secondary-bg, rgb(18, 18, 18)) 50%);
        transition: background 0.8s ease-in-out;
      }
      
      .spotify-gradient-bg::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: linear-gradient(180deg, 
          rgba(0,0,0,0) 0%, 
          rgba(0,0,0,0.8) 100%);
        pointer-events: none;
      }

      .spotify-accent {
        color: var(--spotify-accent-color, rgb(29, 185, 84));
      }

      .spotify-content-area {
        position: relative;
        transition: background-color 0.5s ease;
      }
      
      @media (max-width: 768px) {
        .spotify-gradient-bg {
          background: linear-gradient(180deg, 
            var(--spotify-primary-bg, rgb(83, 83, 198)) 0%, 
            var(--spotify-secondary-bg, rgb(18, 18, 18)) 40%);
        }
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div className="h-screen text-white flex flex-col overflow-hidden max-w-full spotify-gradient-bg">
      {/* Header with login - hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 flex h-full overflow-hidden"
        style={{
          height: isMobile 
            ? hasActiveSong
              ? 'calc(100vh - 46px - 14px - 40px)' // Mobile header + nav + mini player
              : 'calc(100vh - 46px - 14px)' // Mobile header + nav
            : hasActiveSong
              ? 'calc(100vh - 44px - 90px)' // Desktop header + player
              : 'calc(100vh - 44px)', // Desktop header only
          marginTop: isMobile ? '46px' : '0', // Add margin for the mobile header
        }}
      >
        {/* Audio player component - hidden but functional */}
        <AudioPlayer />

        {/* Left sidebar - hidden on mobile */}
        <ResizablePanel
          defaultSize={20}
          minSize={isMobile ? 0 : 10}
          maxSize={30}
          className={isMobile ? 'hidden md:block' : ''}
        >
          <LeftSidebar />
        </ResizablePanel>

        {!isMobile && <ResizableHandle className="w-1 bg-zinc-800/50 rounded-lg transition-colors hover:bg-green-900/50" />}

        {/* Main content - full width on mobile */}
        <ResizablePanel defaultSize={isMobile ? 100 : 80} className="overflow-hidden flex flex-col max-w-full">
          <div 
            ref={mainContentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent mobile-scroll-fix spotify-content-area"
          >
            <Outlet />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Playback controls - visible on desktop only when there's a song */}
      {currentSong && !isMobile && <PlaybackControls />}

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default MainLayout;
