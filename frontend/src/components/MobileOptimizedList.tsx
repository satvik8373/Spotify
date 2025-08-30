import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface MobileOptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

const MobileOptimizedList = <T extends any>({
  items,
  renderItem,
  itemHeight = 80,
  containerHeight = 400,
  overscan = 5,
  className = '',
  onEndReached,
  onEndReachedThreshold = 0.8,
  loadingComponent,
  emptyComponent
}: MobileOptimizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, items.length);
    const startIndex = Math.max(0, start - overscan);
    
    return { start: startIndex, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Handle scroll with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Check if we need to load more items
  useEffect(() => {
    if (!onEndReached || isLoading) return;

    const scrollPercentage = scrollTop / (items.length * itemHeight - containerHeight);
    
    if (scrollPercentage >= onEndReachedThreshold) {
      setIsLoading(true);
      onEndReached();
      // Reset loading state after a delay
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [scrollTop, items.length, itemHeight, containerHeight, onEndReached, onEndReachedThreshold, isLoading]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger lazy loading for visible items
            const target = entry.target as HTMLElement;
            target.classList.add('mobile-visible');
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Calculate total height for scroll container
  const totalHeight = items.length * itemHeight;

  // Get visible items
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  // Calculate offset for positioning
  const offsetY = visibleRange.start * itemHeight;

  if (items.length === 0) {
    return (
      <div className={`mobile-optimized-list empty ${className}`}>
        {emptyComponent || (
          <div className="mobile-empty-state">
            <p className="mobile-text">No items found</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mobile-optimized-list ${className}`}
      style={{ 
        height: containerHeight,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div
                key={actualIndex}
                className="mobile-list-item"
                style={{ height: itemHeight }}
                data-index={actualIndex}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
      
      {isLoading && loadingComponent && (
        <div className="mobile-loading-indicator">
          {loadingComponent}
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedList;
