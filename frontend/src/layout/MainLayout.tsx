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

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header with login */}
      <Header />
      
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 flex h-full overflow-hidden"
        style={{
          height: hasActiveSong
            ? isMobile
              ? 'calc(100vh - 14px - 16px - 44px)' // Subtract mobile nav (14px), player (16px), and header (44px) heights
              : 'calc(100vh - 90px - 44px)' // Subtract the desktop player height and header on desktop
            : isMobile
              ? 'calc(100vh - 14px - 44px)' // Just subtract the mobile nav and header on mobile
              : 'calc(100vh - 44px)', // Just subtract header on desktop
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

        {!isMobile && <ResizableHandle className="w-1 bg-rose-950/30 rounded-lg transition-colors hover:bg-rose-900/50" />}

        {/* Main content - full width on mobile */}
        <ResizablePanel defaultSize={isMobile ? 100 : 80} className="overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rose-950 scrollbar-track-black">
            <Outlet />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Playback controls - always visible when there's a song */}
      {currentSong && <PlaybackControls />}

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default MainLayout;
