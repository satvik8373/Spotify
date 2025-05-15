import React, { useEffect, useState, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Outlet, useLocation } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import AudioPlayer from './components/AudioPlayer';
import { PlaybackControls } from './components/PlaybackControls';
import MobileNav from './components/MobileNav';
import Header from '@/components/Header';
import { usePlayerStore } from '@/stores/usePlayerStore';

// Define Spotify-like color palette for different content sections
const GRADIENT_COLORS = {
  home: 'from-emerald-800 via-emerald-900',
  search: 'from-purple-800 via-purple-900',
  library: 'from-blue-800 via-blue-900',
  playlist: 'from-indigo-800 via-indigo-900',
  album: 'from-pink-800 via-pink-900',
  artist: 'from-orange-800 via-orange-900',
  liked: 'from-rose-800 via-rose-900',
};

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { currentSong } = usePlayerStore();
  const hasActiveSong = !!currentSong;
  const [gradientClass, setGradientClass] = useState(GRADIENT_COLORS.home);
  const [scrollPosition, setScrollPosition] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Determine gradient color based on current path
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/' || path.includes('/home')) {
      setGradientClass(GRADIENT_COLORS.home);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(16, 185, 129)');
    } else if (path.includes('/search')) {
      setGradientClass(GRADIENT_COLORS.search);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(168, 85, 247)');
    } else if (path.includes('/library')) {
      setGradientClass(GRADIENT_COLORS.library);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(59, 130, 246)');
    } else if (path.includes('/playlist')) {
      setGradientClass(GRADIENT_COLORS.playlist);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(99, 102, 241)');
    } else if (path.includes('/album')) {
      setGradientClass(GRADIENT_COLORS.album);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(236, 72, 153)');
    } else if (path.includes('/artist')) {
      setGradientClass(GRADIENT_COLORS.artist);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(249, 115, 22)');
    } else if (path.includes('/liked-songs')) {
      setGradientClass(GRADIENT_COLORS.liked);
      document.documentElement.style.setProperty('--spotify-accent', 'rgb(244, 63, 94)');
    }
  }, [location]);

  // Handle scroll for gradient fade effect
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setScrollPosition(mainContentRef.current.scrollTop);
      }
    };

    const currentRef = mainContentRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

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

  // Calculate gradient opacity based on scroll position
  const gradientOpacity = Math.max(0, Math.min(1, 1 - (scrollPosition / 300)));

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden max-w-full">
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
        <ResizablePanel defaultSize={isMobile ? 100 : 80} className="overflow-hidden flex flex-col max-w-full relative">
          {/* Spotify-like dynamic gradient background overlay */}
          <div 
            className={`absolute top-0 left-0 right-0 h-60 bg-gradient-to-b ${gradientClass} to-black z-0 transition-opacity duration-300 ease-in-out pointer-events-none`}
            style={{ opacity: gradientOpacity }}
          />
          
          <div 
            ref={mainContentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-black mobile-scroll-fix relative z-10"
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
