import React, { useEffect, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Outlet } from 'react-router-dom';
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
              ? 'calc(100vh - 46px - 14px - 42px)' // Mobile header + nav + mini player
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-black mobile-scroll-fix pb-safe">
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
