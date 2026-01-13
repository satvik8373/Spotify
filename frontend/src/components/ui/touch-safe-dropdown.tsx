import React, { useRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { isValidTouch, type TouchStartData } from '../../utils/touchSafetyUtils';

interface TouchSafeDropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  contentClassName?: string;
}

export function TouchSafeDropdownMenu({
  children,
  trigger,
  align = 'end',
  side = 'bottom',
  className,
  contentClassName
}: TouchSafeDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const touchStartRef = useRef<TouchStartData | null>(null);

  // Handle touch events to prevent accidental menu opens
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const isValid = isValidTouch(
      touchStartRef.current,
      { x: touch.clientX, y: touch.clientY },
      {
        minDuration: 150,
        maxDuration: 800,
        maxMovement: 15
      }
    );
    
    if (!isValid) {
      e.preventDefault();
      e.stopPropagation();
      touchStartRef.current = null;
      return false;
    }
    
    touchStartRef.current = null;
    // Allow the menu to open
    setIsOpen(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For mouse clicks (non-touch devices), allow immediate opening
    if (!('ontouchstart' in window)) {
      return;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div
          className={className}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ 
            touchAction: 'manipulation',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          {trigger}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className={contentClassName}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}