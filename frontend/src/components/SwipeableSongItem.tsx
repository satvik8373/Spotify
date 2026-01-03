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
    const dragStartX = useRef(0);

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

    const handleDragStart = (_: any, info: PanInfo) => {
        console.log('🎯 Drag started at X:', info.point.x);
        dragStartX.current = info.point.x;
        isDragging.current = true;
        // Visual feedback
        if (containerRef.current) {
            containerRef.current.style.opacity = '0.9';
        }
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        console.log('🏁 Drag ended. Offset X:', info.offset.x, 'Threshold:', dynamicThreshold);
        
        // Reset visual feedback
        if (containerRef.current) {
            containerRef.current.style.opacity = '1';
        }
        
        const dragDistance = info.offset.x;
        
        if (dragDistance > dynamicThreshold) {
            console.log('✅ Threshold exceeded! Calling onSwipeRight');
            onSwipeRight();
            // Haptic feedback on success
            safeVibrate(50);
        } else {
            console.log('❌ Threshold not met. Needed:', dynamicThreshold, 'Got:', dragDistance);
        }
        
        // Reset position immediately
        x.set(0);
        setIsTriggered(false);
        
        // Reset dragging state immediately for next interaction
        isDragging.current = false;
    };

    const handleDrag = (_: any, info: PanInfo) => {
        const dragDistance = info.offset.x;
        console.log('📍 Dragging... Offset X:', dragDistance, 'Threshold:', dynamicThreshold);
        
        if (dragDistance > dynamicThreshold && !isTriggered) {
            console.log('✨ Threshold crossed!');
            setIsTriggered(true);
            // Light haptic feedback when threshold crossed
            safeVibrate(10);
        } else if (dragDistance <= dynamicThreshold && isTriggered) {
            setIsTriggered(false);
        }
    };

    const handleClickCapture = (e: React.MouseEvent | React.TouchEvent) => {
        if (isDragging.current) {
            console.log('🚫 Blocking click/touch - drag in progress');
            e.stopPropagation();
            e.preventDefault();
        }
    };

    return (
        <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
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
                dragDirectionLock={true}
                dragPropagation={false}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrag={handleDrag}
                onClickCapture={handleClickCapture}
                onTouchStartCapture={handleClickCapture}
                animate={{ x: 0 }}
                style={{ x }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative z-10 bg-background"
            >
                {children}
            </motion.div>
        </div>
    );
};

export default SwipeableSongItem;
