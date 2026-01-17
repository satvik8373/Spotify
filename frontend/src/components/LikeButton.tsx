import React, { useState, useEffect } from 'react';
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

    // Trigger animation on like state change
    useEffect(() => {
        if (isLiked) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isLiked]);

    const handleClick = (e: React.MouseEvent) => {
        // Haptic feedback if available
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }

        onToggle(e);
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "transition-transform duration-200 active:scale-90 flex items-center justify-center relative",
                isLiked ? activeColor : "text-muted-foreground hover:text-foreground",
                className
            )}
            aria-label={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
        >
            <div className={cn("relative transition-all duration-300", isAnimating ? "scale-110" : "scale-100")}>
                {isLiked ? (
                    <div
                        className="rounded-full bg-green-500 flex items-center justify-center transition-all duration-300"
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
                        className="transition-all duration-300 text-white"
                    />
                )}
            </div>
        </button>
    );
};
