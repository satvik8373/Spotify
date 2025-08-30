     import { useEffect, useState } from 'react';
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

  // Improved mobile layout calculations with PWA considerations
  const MOBILE_HEADER_PX = 40;
  const MOBILE_NAV_PX = 60; // Increased for better PWA bottom spacing
  const MINI_PLAYER_PX = 47;
  const SAFE_AREA_BOTTOM = 20; // Additional safe area for PWA
  
  const isMobileHeaderRoute = isMobile && (
    location.pathname === '/home' ||
    location.pathname === '/' ||
    location.pathname.startsWith('/library') ||
    location.pathname.startsWith('/search')
  );
  
  // Calculate mobile layout with proper PWA bottom spacing
  const mobileSubtractPx = (isMobileHeaderRoute ? MOBILE_HEADER_PX : 0) + 
                          MOBILE_NAV_PX + 
                          (hasActiveSong ? MINI_PLAYER_PX : 0) + 
                          SAFE_AREA_BOTTOM;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden max-w-full pwa-layout">
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

        {/* Main content - full width on mobile with proper bottom spacing */}
        <ResizablePanel defaultSize={isMobile ? 100 : 80} className="overflow-hidden flex flex-col max-w-full">
          <div className="flex-1 overflow-y-auto overflow-x-hidden mobile-scroll-fix pb-safe pwa-content">
            <Outlet />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Playback controls - visible on desktop only when there's a song */}
      {currentSong && !isMobile && <PlaybackControls />}

      {/* Mobile Navigation with PWA bottom spacing */}
      <MobileNav />
    </div>
  );
};

export default MainLayout;
