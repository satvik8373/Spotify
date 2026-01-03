import { useState, ReactNode } from 'react';

interface SwipeCardProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: ReactNode;
}

export function SwipeCard({ onSwipeLeft, onSwipeRight, children }: SwipeCardProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const SWIPE_THRESHOLD = 60; // px

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(x);
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (startX == null) return;

    const x = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const deltaX = x - startX;

    if (deltaX > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
    } else if (deltaX < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    }

    setStartX(null);
  };

  return (
    <div
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      style={{ userSelect: 'none' }}
    >
      {children}
    </div>
  );
}
