import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  itemWidth?: number;
  gap?: number;
  snapToItems?: boolean;
  autoHideArrows?: boolean;
}

export const HorizontalScroll: React.FC<HorizontalScrollProps> = ({
  children,
  className,
  showArrows = true,
  itemWidth = 180,
  gap = 16,
  snapToItems = false,
  autoHideArrows = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const checkScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollButtons, { passive: true });
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [children, checkScrollButtons]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = itemWidth * 3 + gap * 2;
    const newScrollLeft = direction === 'left' 
      ? scrollRef.current.scrollLeft - scrollAmount
      : scrollRef.current.scrollLeft + scrollAmount;
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  // Mouse drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    
    // Prevent text selection
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseLeave();
      }}
    >
      {/* Left Arrow */}
      {showArrows && canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-30",
            "w-10 h-10 rounded-full bg-black/80 hover:bg-black/90",
            "flex items-center justify-center text-white",
            "transition-all duration-200 hover:scale-105",
            "shadow-lg backdrop-blur-sm",
            autoHideArrows 
              ? (isHovered ? "opacity-100" : "opacity-0")
              : "opacity-100"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Right Arrow */}
      {showArrows && canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-30",
            "w-10 h-10 rounded-full bg-black/80 hover:bg-black/90",
            "flex items-center justify-center text-white",
            "transition-all duration-200 hover:scale-105",
            "shadow-lg backdrop-blur-sm",
            autoHideArrows 
              ? (isHovered ? "opacity-100" : "opacity-0")
              : "opacity-100"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Scroll Container */}
      <div className="px-4 md:px-6 w-full overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-4 overflow-x-auto overflow-y-hidden",
            "scrollbar-hide cursor-grab",
            isDragging && "cursor-grabbing select-none",
            snapToItems && "snap-x snap-mandatory",
            className
          )}
          style={{
            scrollBehavior: isDragging ? 'auto' : 'smooth',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
          onMouseDown={handleMouseDown}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// Individual scroll item wrapper
interface ScrollItemProps {
  children: React.ReactNode;
  className?: string;
  width?: number;
  snapToCenter?: boolean;
}

export const ScrollItem: React.FC<ScrollItemProps> = ({
  children,
  className,
  width = 180,
  snapToCenter = false,
}) => {
  return (
    <div
      className={cn(
        "flex-shrink-0",
        snapToCenter && "snap-center",
        className
      )}
      style={{ width: `${width}px` }}
    >
      {children}
    </div>
  );
};