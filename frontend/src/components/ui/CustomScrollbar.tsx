import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
  thumbClassName?: string;
  showOnHover?: boolean;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  children,
  className,
  thumbClassName,
  showOnHover = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollThumbRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [isScrollbarHovered, setIsScrollbarHovered] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const dragStartRef = useRef({ y: 0, scrollTop: 0 });

  const updateScrollbar = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollHeight, clientHeight, scrollTop } = container;
    const hasScroll = scrollHeight > clientHeight;

    if (!hasScroll) {
      setShowScrollbar(false);
      return;
    }

    // Calculate thumb height (proportional to visible content)
    const thumbHeightCalc = Math.max((clientHeight / scrollHeight) * clientHeight, 40);
    setThumbHeight(thumbHeightCalc);

    // Calculate thumb position
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - thumbHeightCalc;
    const thumbTopCalc = (scrollTop / maxScrollTop) * maxThumbTop;
    setThumbTop(thumbTopCalc);

    setShowScrollbar(true);
  }, []);

  const handleScroll = useCallback(() => {
    updateScrollbar();
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  }, [updateScrollbar]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      y: e.clientY,
      scrollTop: scrollContainerRef.current?.scrollTop || 0,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const { scrollHeight, clientHeight } = container;
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeight;

      const deltaY = e.clientY - dragStartRef.current.y;
      const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
      container.scrollTop = dragStartRef.current.scrollTop + scrollDelta;
    },
    [isDragging, thumbHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current || !scrollThumbRef.current) return;
    if (e.target === scrollThumbRef.current) return;

    const container = scrollContainerRef.current;
    const { scrollHeight, clientHeight } = container;
    const trackRect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - thumbHeight;

    container.scrollTop = (clickY / maxThumbTop) * maxScrollTop;
  }, [thumbHeight]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollbar();
    container.addEventListener('scroll', handleScroll);

    const resizeObserver = new ResizeObserver(updateScrollbar);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, updateScrollbar]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const shouldShowThumb = showScrollbar && (!showOnHover || isScrolling || isDragging || isScrollbarHovered);

  return (
    <div className="relative w-full h-full">
      <div
        ref={scrollContainerRef}
        className={cn('w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar-hide', className)}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Custom Scrollbar Track */}
      {showScrollbar && (
        <div
          className={cn(
            'absolute top-0 right-0 w-3 h-full pointer-events-auto z-50',
            'transition-opacity duration-200',
            shouldShowThumb ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleTrackClick}
          onMouseEnter={() => setIsScrollbarHovered(true)}
          onMouseLeave={() => setIsScrollbarHovered(false)}
        >
          {/* Scrollbar Thumb */}
          <div
            ref={scrollThumbRef}
            className={cn(
              'absolute right-0.5 w-2.5 rounded-md cursor-pointer transition-all duration-200',
              'bg-[#5a5a5a] hover:bg-[#7a7a7a] active:bg-[#8a8a8a]',
              isDragging && 'bg-[#8a8a8a]',
              thumbClassName
            )}
            style={{
              height: `${thumbHeight}px`,
              top: `${thumbTop}px`,
            }}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
    </div>
  );
};

export default CustomScrollbar;
