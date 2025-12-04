import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ListPlus } from 'lucide-react';

interface SwipeableSongItemProps {
    children: React.ReactNode;
    onSwipeRight: () => void;
    threshold?: number;
    className?: string;
}

const SwipeableSongItem: React.FC<SwipeableSongItemProps> = ({
    children,
    onSwipeRight,
    threshold = 60,
    className = ''
}) => {
    const x = useMotionValue(0);
    const [isTriggered, setIsTriggered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dynamicThreshold, setDynamicThreshold] = useState(threshold);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    const isDragging = useRef(false);

    // Detect if device supports touch (mobile/tablet)
    useEffect(() => {
        const checkTouchDevice = () => {
            return (
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-ignore
                navigator.msMaxTouchPoints > 0
            );
        };
        const isTouch = checkTouchDevice();
        setIsTouchDevice(isTouch);
        console.log('📱 Touch device detected:', isTouch);
    }, []);

    // Calculate 20% of container width as threshold
    useEffect(() => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const calculatedThreshold = containerWidth * 0.2; // 20% of width
            setDynamicThreshold(calculatedThreshold);
            console.log('📏 Container width:', containerWidth, 'Threshold (20%):', calculatedThreshold);
        }
    }, []);

    // Background opacity based on swipe distance
    const backgroundOpacity = useTransform(x, [0, dynamicThreshold], [0.5, 1]);
    const iconScale = useTransform(x, [0, dynamicThreshold], [0.8, 1.2]);

    const safeVibrate = (pattern: number | number[]) => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                // Check if user has interacted with the document to avoid intervention warnings
                // @ts-ignore - userActivation is not yet in all TS definitions
                if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
                    return;
                }
                navigator.vibrate(pattern);
            }
        } catch (e) {
            // Ignore vibration errors
        }
    };

    const handleDragStart = () => {
        console.log('🎯 Drag started!');
        isDragging.current = true;
        // Visual feedback
        if (containerRef.current) {
            containerRef.current.style.opacity = '0.8';
        }
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        console.log('🏁 Drag ended. Offset X:', info.offset.x, 'Threshold:', dynamicThreshold);
        
        // Reset visual feedback
        if (containerRef.current) {
            containerRef.current.style.opacity = '1';
        }
        
        if (info.offset.x > dynamicThreshold) {
            console.log('✅ Threshold exceeded! Calling onSwipeRight');
            onSwipeRight();
            // Haptic feedback on success
            safeVibrate(50);
        } else {
            console.log('❌ Threshold not met. Needed:', dynamicThreshold, 'Got:', info.offset.x);
        }
        
        // Reset position smoothly
        x.set(0);
        setIsTriggered(false);

        // Reset dragging state after a short delay to block subsequent click
        setTimeout(() => {
            isDragging.current = false;
        }, 100);
    };

    const handleDrag = (_: any, info: PanInfo) => {
        console.log('Dragging... Offset X:', info.offset.x);
        if (info.offset.x > dynamicThreshold && !isTriggered) {
            console.log('Threshold crossed!');
            setIsTriggered(true);
            // Light haptic feedback when threshold crossed
            safeVibrate(10);
        } else if (info.offset.x <= dynamicThreshold && isTriggered) {
            setIsTriggered(false);
        }
    };

    const handleClickCapture = (e: React.MouseEvent) => {
        if (isDragging.current) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    return (
        <div className={`relative overflow-hidden ${className}`} ref={containerRef} style={{ touchAction: 'pan-y' }}>
            {/* Background Action Layer - Only show on touch devices */}
            {isTouchDevice && (
                <motion.div
                    className="absolute inset-y-0 left-0 bg-green-500 flex items-center justify-start pl-6 z-0 rounded-md"
                    style={{
                        width: '100%',
                        opacity: backgroundOpacity
                    }}
                >
                    <motion.div style={{ scale: iconScale }} className="flex items-center gap-2 text-white font-medium">
                        <ListPlus className="w-6 h-6" />
                        <span>{isTriggered ? "Release to Add" : "Add to Queue"}</span>
                    </motion.div>
                </motion.div>
            )}

            {/* Foreground Content Layer */}
            <motion.div
                drag={isTouchDevice ? "x" : false}
                dragConstraints={{ left: 0, right: 200 }}
                dragElastic={{ left: 0, right: 0.3 }}
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrag={handleDrag}
                onClickCapture={handleClickCapture}
                style={{ x, touchAction: 'pan-y' }}
                className="relative z-10 bg-background"
            >
                {children}
            </motion.div>
        </div>
    );
};

export default SwipeableSongItem;
