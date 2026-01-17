import { useCallback, useRef, useEffect } from 'react';

interface UseMobileTapSimpleOptions {
    onTap: () => void;
    tapDelay?: number;
}

export function useMobileTapSimple({
    onTap,
    tapDelay = 50 // Reduced from 150ms to 50ms for faster response
}: UseMobileTapSimpleOptions) {
    const isMobile = useRef(false);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const TAP_MOVEMENT_THRESHOLD = 10; // px - max movement to still be considered a tap

    // Detect if device is mobile
    useEffect(() => {
        const checkMobile = () => {
            isMobile.current = window.innerWidth < 768 ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (tapTimeoutRef.current) {
                clearTimeout(tapTimeoutRef.current);
            }
        };
    }, []);

    const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // Check if this was a tap or a swipe/scroll
        if ('changedTouches' in e && touchStartPos.current) {
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

            // If movement was too much, it's not a tap
            if (deltaX > TAP_MOVEMENT_THRESHOLD || deltaY > TAP_MOVEMENT_THRESHOLD) {
                touchStartPos.current = null;
                return;
            }
        }

        e.preventDefault();

        // Clear any existing timeout
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
        }

        // For mobile, execute immediately for better responsiveness
        if (isMobile.current) {
            onTap();
        } else {
            // Add a small delay for desktop to prevent accidental double clicks
            tapTimeoutRef.current = setTimeout(() => {
                onTap();
            }, tapDelay);
        }

        touchStartPos.current = null;
    }, [onTap, tapDelay]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Store touch position to detect movement later
        if (isMobile.current && e.touches.length > 0) {
            touchStartPos.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            // Don't preventDefault here - let parent handlers (like SwipeCard) work
        }
    }, []);

    return {
        isMobile: isMobile.current,
        handleTap,
        handleTouchStart
    };
}
