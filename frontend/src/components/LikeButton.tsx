import React, { useState, useEffect, useRef } from 'react';
import { Check, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
    isLiked: boolean;
    onToggle: (e: React.MouseEvent) => void;
    className?: string;
    iconSize?: number;
    activeColor?: string;
}

export const LikeButton = ({
    isLiked,
    onToggle,
    className,
    iconSize = 20,
    activeColor = "text-green-500"
}: LikeButtonProps) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const prevIsLiked = useRef(isLiked);

    // Trigger animation on like state change - but prevent excessive animations
    useEffect(() => {
        // Only animate if the liked state actually changed and we're not processing
        if (isLiked !== prevIsLiked.current && !isProcessing) {
            prevIsLiked.current = isLiked;
            
            if (isLiked) {
                setIsAnimating(true);
                // Use a simple timeout for animation - this won't cause performance issues
                // because it's only triggered on actual state changes
                const timer = setTimeout(() => {
                    setIsAnimating(false);
                }, 200); // Shorter animation duration
                return () => clearTimeout(timer);
            }
        }
    }, [isLiked, isProcessing]);

    const handleClick = (e: React.MouseEvent) => {
        // Prevent event bubbling to avoid conflicts
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent multiple rapid clicks
        if (isProcessing) return;
        
        setIsProcessing(true);
        
        // Haptic feedback if available
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30); // Shorter vibration
        }

        onToggle(e);
        
        // Reset processing state after a short delay
        setTimeout(() => {
            setIsProcessing(false);
        }, 300);
    };

    return (
        <button
            onClick={handleClick}
            disabled={isProcessing}
            className={cn(
                "transition-transform duration-150 active:scale-95 flex items-center justify-center relative",
                isLiked ? activeColor : "text-muted-foreground hover:text-foreground",
                isProcessing && "opacity-70 cursor-not-allowed",
                className
            )}
            aria-label={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
        >
            <div className={cn("relative transition-all duration-200", isAnimating ? "scale-110" : "scale-100")}>
                {isLiked ? (
                    <div
                        className="rounded-full bg-green-500 flex items-center justify-center transition-all duration-200"
                        style={{ width: iconSize, height: iconSize }}
                    >
                        <Check
                            size={iconSize * 0.6}
                            strokeWidth={3}
                            className="text-white"
                        />
                    </div>
                ) : (
                    <PlusCircle
                        size={iconSize}
                        className="transition-all duration-200 text-white"
                    />
                )}
            </div>
        </button>
    );
};
