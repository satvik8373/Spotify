import React from 'react';

interface SwipeableSongItemProps {
    children: React.ReactNode;
    onSwipeRight?: () => void;
    threshold?: number;
    className?: string;
}

const SwipeableSongItem: React.FC<SwipeableSongItemProps> = ({
    children,
    onSwipeRight,
    threshold,
    className = ''
}) => {
    // Simple wrapper without any swipe functionality
    // Added touch-safe class to prevent visual artifacts
    return (
        <div className={`touch-safe song-item ${className}`}>
            {children}
        </div>
    );
};

export default SwipeableSongItem;
