import { useState, useRef, ReactNode } from 'react';

interface SwipeCardProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: ReactNode;
}

export function SwipeCard({ onSwipeLeft, onSwipeRight, children }: SwipeCardProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);
  const wasSwiped = useRef(false);

  const SWIPE_THRESHOLD = 60; // px - minimum horizontal distance for swipe
  const MOVEMENT_TAP_THRESHOLD = 10; // px - maximum movement to still be considered a tap
  const VERTICAL_SCROLL_THRESHOLD = 10; // px - if vertical movement exceeds this, likely scrolling

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartX(x);
    setStartY(y);
    setCurrentX(x);
    setCurrentY(y);
    wasSwiped.current = false;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (startX === null || startY === null) return;

    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCurrentX(x);
    setCurrentY(y);

    const deltaX = Math.abs(x - startX);
    const deltaY = Math.abs(y - startY);

    // If user is moving horizontally more than vertically, prevent default to enable swipe
    if (deltaX > deltaY && deltaX > MOVEMENT_TAP_THRESHOLD) {
      e.preventDefault();
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (startX === null || currentX === null || startY === null || currentY === null) return;

    const deltaX = currentX - startX;
    const deltaY = Math.abs(currentY - startY);
    const absDeltaX = Math.abs(deltaX);

    // Check if this was primarily a horizontal swipe
    const isHorizontalSwipe = absDeltaX > SWIPE_THRESHOLD && absDeltaX > deltaY;

    if (isHorizontalSwipe) {
      // Prevent the click event from firing
      e.preventDefault();
      e.stopPropagation();
      wasSwiped.current = true;

      if (deltaX > SWIPE_THRESHOLD && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < -SWIPE_THRESHOLD && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setStartX(null);
    setStartY(null);
    setCurrentX(null);
    setCurrentY(null);

    // Reset swipe flag after a short delay
    setTimeout(() => {
      wasSwiped.current = false;
    }, 100);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If a swipe just happened, prevent the click
    if (wasSwiped.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onClick={handleClick}
      style={{
        userSelect: 'none',
        touchAction: 'pan-y' // Allow vertical scrolling but handle horizontal gestures
      }}
    >
      {children}
    </div>
  );
}
