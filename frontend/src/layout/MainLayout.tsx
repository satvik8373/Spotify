import { useEffect, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Outlet, useLocation } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import AudioPlayer from './components/AudioPlayer';
import { PlaybackControls } from './components/PlaybackControls';
import MobileNav from './components/MobileNav';
import Header from '@/components/Header';
import { usePlayerStore } from '@/stores/usePlayerStore';
import QueuePanel from '@/components/QueuePanel';

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const { currentSong } = usePlayerStore();
  const hasActiveSong = !!currentSong;
  const location = useLocation();

  // Listen for queue toggle events
  useEffect(() => {
    const handleToggleQueue = () => {
      setShowQueue(prev => !prev);
    };

    window.addEventListener('toggleQueue', handleToggleQueue);
    return () => window.removeEventListener('toggleQueue', handleToggleQueue);
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

  // Route-aware measurements for mobile header/nav/mini-player spacing
  const MOBILE_HEADER_PX = 40;
  const MOBILE_NAV_PX = 14;
  const MINI_PLAYER_PX = 47;
  const isMobileHeaderRoute = isMobile && (
    location.pathname === '/home' ||
    location.pathname === '/' ||
    location.pathname.startsWith('/library') ||
    location.pathname.startsWith('/search')
  );
  const mobileSubtractPx = (isMobileHeaderRoute ? MOBILE_HEADER_PX : 0) + MOBILE_NAV_PX + (hasActiveSong ? MINI_PLAYER_PX : 0);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden max-w-full">
      {/* Header with login - hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 flex h-full overflow-hidden"
        style={{
          height: isMobile
            ? `calc(100vh - ${mobileSubtractPx}px)`
            : hasActiveSong
              ? 'calc(100vh - 44px - 90px)' // Desktop header + player
              : 'calc(100vh - 44px)', // Desktop header only
          marginTop: isMobileHeaderRoute ? `${MOBILE_HEADER_PX}px` : '0',
        }}
      >
        {/* Audio player component - hidden but functional */}
        <AudioPlayer />

        {/* Left sidebar - hidden on mobile */}
        <ResizablePanel
          defaultSize={20}
          minSize={isMobile ? 0 : 15}
          maxSize={25}
          className={`${isMobile ? 'hidden' : 'block'} h-full`}
        >
          <LeftSidebar />
        </ResizablePanel>

        {!isMobile && <ResizableHandle className="w-1 bg-border rounded-lg transition-colors hover:bg-primary/20" />}

        {/* Main content - adjusts based on queue visibility */}
        <ResizablePanel 
          defaultSize={isMobile ? 100 : (showQueue ? 60 : 80)} 
          minSize={isMobile ? 100 : (showQueue ? 40 : 60)}
          className="overflow-hidden flex flex-col transition-all duration-300 ease-out"
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden mobile-scroll-fix pb-safe">
            <Outlet />
          </div>
        </ResizablePanel>

        {/* Queue Panel - Desktop only */}
        {!isMobile && showQueue && (
          <>
            <ResizableHandle className="w-1 bg-border rounded-lg transition-all duration-200 hover:bg-primary/20 hover:w-1.5" />
            <ResizablePanel 
              defaultSize={20} 
              minSize={15}
              maxSize={30}
              className="overflow-hidden h-full transition-all duration-300 ease-out"
            >
              <QueuePanel onClose={() => setShowQueue(false)} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Playback controls - visible on desktop only when there's a song */}
      {currentSong && !isMobile && <PlaybackControls />}

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default MainLayout;
