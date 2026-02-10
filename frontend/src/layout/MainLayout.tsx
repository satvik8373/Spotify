import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LeftSidebar from './components/LeftSidebar';
import AudioPlayer from './components/AudioPlayer';
import { PlaybackControls } from './components/PlaybackControls';
import MobileNav from './components/MobileNav';
import Header from '@/components/Header';
import { usePlayerStore } from '@/stores/usePlayerStore';
import QueuePanel from '@/components/QueuePanel';
import { useSidebarStore, COLLAPSED_WIDTH } from '@/stores/useSidebarStore';
import { useBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import DesktopFooter from '@/components/DesktopFooter';
import { CustomScrollbar } from '@/components/ui/CustomScrollbar';
import { PageTracker } from '@/components/PageTracker';

// Memoized components to prevent unnecessary re-renders
const MemoizedLeftSidebar = memo(LeftSidebar);
const MemoizedAudioPlayer = memo(AudioPlayer);
const MemoizedPlaybackControls = memo(PlaybackControls);
const MemoizedMobileNav = memo(MobileNav);
const MemoizedHeader = memo(Header);
const MemoizedQueuePanel = memo(QueuePanel);
const MemoizedDesktopFooter = memo(DesktopFooter);


const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showQueue, setShowQueue] = useState(false);
  const currentSong = usePlayerStore(state => state.currentSong); // Selective subscription
  const hasActiveSong = !!currentSong;
  const location = useLocation();
  const { width, isCollapsed, setWidth, toggleCollapse, setCollapsed } = useSidebarStore();
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const COLLAPSE_THRESHOLD = 120;

  useBackgroundRefresh();

  // Listen for queue toggle events (optimized)
  useEffect(() => {
    const handleToggleQueue = () => setShowQueue(prev => !prev);
    window.addEventListener('toggleQueue', handleToggleQueue, { passive: true });
    return () => window.removeEventListener('toggleQueue', handleToggleQueue);
  }, []);

  // Optimized mobile detection with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100);
    };

    window.addEventListener('resize', checkMobile, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Optimized viewport width variable
  useEffect(() => {
    let rafId: number;
    const setVw = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--vw', `${window.innerWidth * 0.01}px`);
      });
    };

    setVw();
    window.addEventListener('resize', setVw, { passive: true });
    window.addEventListener('orientationchange', setVw, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', setVw);
      window.removeEventListener('orientationchange', setVw);
    };
  }, []);

  // Route-aware measurements for mobile header/nav spacing
  const MOBILE_HEADER_PX = 40;
  const MOBILE_NAV_BASE_PX = 56; // h-14 = 56px
  const MOBILE_PLAYER_PADDING_PX = 44; // paddingTop when song is active
  const isMobileHeaderRoute = isMobile && (
    location.pathname === '/home' ||
    location.pathname.startsWith('/search')
  );

  const isSyncPage = location.pathname === '/liked-songs/sync';
  const showMobilePlayer = hasActiveSong && !isSyncPage;

  const mobileSubtractPx = (isMobileHeaderRoute ? MOBILE_HEADER_PX : 0) + MOBILE_NAV_BASE_PX + (showMobilePlayer ? MOBILE_PLAYER_PADDING_PX : 0);

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = isCollapsed ? COLLAPSED_WIDTH : width;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      // If dragging left past threshold, collapse
      if (newWidth < COLLAPSE_THRESHOLD && !isCollapsed) {
        setCollapsed(true);
      }
      // If dragging right from collapsed state, expand
      else if (isCollapsed && newWidth > COLLAPSED_WIDTH + 30) {
        setCollapsed(false);
        // Restore previous width or use a reasonable default
        const expandedWidth = Math.max(COLLAPSE_THRESHOLD, Math.min(newWidth, 400));
        setWidth(expandedWidth);
      }
      // Normal resize when expanded
      else if (!isCollapsed && newWidth >= COLLAPSE_THRESHOLD) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [setWidth, isCollapsed, width, setCollapsed]);

  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : width;

  return (
    <div className="h-screen bg-black text-foreground flex flex-col overflow-hidden max-w-full relative pwa-safe-area">
      <PageTracker />
      {/* Header with login - hidden on mobile */}
      <div className="hidden md:block flex-shrink-0 relative z-[100]">
        <MemoizedHeader />
      </div>

      {/* Main content area */}
      <div
        className="flex-1 flex overflow-hidden md:pl-2 md:gap-2 relative z-0 bg-black"
        style={{
          height: isMobile
            ? `calc(100vh - ${mobileSubtractPx}px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`
            : 'auto',
          marginTop: isMobileHeaderRoute ? `${MOBILE_HEADER_PX}px` : '0',
        }}
      >
        {/* Audio player component - hidden but functional */}
        <MemoizedAudioPlayer />

        {/* Left sidebar - hidden on mobile */}
        {!isMobile && (
          <div
            ref={sidebarRef}
            className="h-full flex-shrink-0 relative group"
            style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
          >
            <div className="h-full bg-[#121212] rounded-lg overflow-hidden">
              <MemoizedLeftSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
            </div>
            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute right-0 top-0 bottom-0 w-2 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center group/resize"
            >
              <div className="w-0.5 h-16 bg-white/0 group-hover/resize:bg-white/40 rounded-full transition-colors" />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 h-full overflow-hidden">
          <CustomScrollbar className="h-full mobile-scroll-fix bg-[#121212] md:rounded-lg">
            <Outlet />
            <MemoizedDesktopFooter />
          </CustomScrollbar>
        </div>

        {/* Queue Panel - Desktop only */}
        {!isMobile && showQueue && (
          <div className="w-[280px] min-w-[280px] h-full flex-shrink-0">
            <div className="h-full bg-[#121212] rounded-lg overflow-hidden">
              <MemoizedQueuePanel onClose={() => setShowQueue(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Playback controls - visible on desktop only when there's a song */}
      {currentSong && !isMobile && <MemoizedPlaybackControls />}

      {/* Mobile Navigation */}
      <MemoizedMobileNav />
    </div>
  );
};

export default MainLayout;
