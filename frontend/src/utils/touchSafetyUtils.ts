/**
 * Utility functions for improving touch safety on mobile devices
 */

export interface TouchStartData {
  x: number;
  y: number;
  time: number;
}

/**
 * Validates if a touch gesture is intentional and should trigger an action
 * @param touchStart - Initial touch data
 * @param touchEnd - Final touch data
 * @param options - Configuration options
 * @returns true if the touch is valid for triggering actions
 */
export function isValidTouch(
  touchStart: TouchStartData,
  touchEnd: { x: number; y: number },
  options: {
    minDuration?: number;
    maxDuration?: number;
    maxMovement?: number;
  } = {}
): boolean {
  const {
    minDuration = 150,
    maxDuration = 800,
    maxMovement = 15
  } = options;

  const deltaX = Math.abs(touchEnd.x - touchStart.x);
  const deltaY = Math.abs(touchEnd.y - touchStart.y);
  const deltaTime = Date.now() - touchStart.time;

  return (
    deltaTime >= minDuration &&
    deltaTime <= maxDuration &&
    deltaX <= maxMovement &&
    deltaY <= maxMovement
  );
}

/**
 * Applies touch-safe styles to prevent accidental interactions
 * @param element - DOM element to make touch-safe
 */
export function makeTouchSafe(element: HTMLElement): void {
  const style = element.style as any;
  style.webkitTouchCallout = 'none';
  style.webkitUserSelect = 'none';
  style.userSelect = 'none';
  style.touchAction = 'manipulation';
  style.webkitTapHighlightColor = 'transparent';
}

/**
 * Detects if the current device is touch-enabled
 * @returns true if touch is supported
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Creates touch event handlers for dropdown triggers
 * @param onValidTouch - Callback for valid touch events
 * @returns Object with touch event handlers
 */
export function createTouchHandlers(onValidTouch: () => void) {
  let touchStartData: TouchStartData | null = null;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartData) return;

    const touch = e.changedTouches[0];
    const isValid = isValidTouch(
      touchStartData,
      { x: touch.clientX, y: touch.clientY }
    );

    if (isValid) {
      onValidTouch();
    } else {
      e.preventDefault();
      e.stopPropagation();
    }

    touchStartData = null;
  };

  return { handleTouchStart, handleTouchEnd };
}