import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { X, Trash2, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QueueDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
    const { queue, currentSong, currentIndex, removeFromQueue, playAlbum } = usePlayerStore();
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect mobile/desktop
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Filter out songs that have already played (optional, but standard queue behavior usually shows upcoming)
    // For now, let's show the whole queue but highlight current

    const upcomingSongs = queue.slice(currentIndex + 1);

    const handleClearQueue = () => {
        // We can't easily "clear" the queue in the store without a specific action, 
        // but we can play just the current song to reset it.
        if (currentSong) {
            playAlbum([currentSong], 0);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { x: '100%' }}
                        animate={isMobile ? { y: 0 } : { x: 0 }}
                        exit={isMobile ? { y: '100%' } : { x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={
                            isMobile
                                ? "fixed bottom-0 left-0 right-0 h-[85vh] bg-background border-t border-border rounded-t-[20px] z-50 flex flex-col shadow-2xl"
                                : "fixed top-0 right-0 bottom-0 w-[400px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
                        }
                    >
                        {/* Handle bar for visual cue - only on mobile */}
                        {isMobile && (
                            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
                                <div className="w-12 h-1.5 bg-muted rounded-full" />
                            </div>
                        )}

                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <ListMusic className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold">Queue</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {upcomingSongs.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearQueue}
                                        className="text-muted-foreground hover:text-red-500"
                                    >
                                        Clear
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-1 px-6">
                            <div className="py-4 space-y-6">
                                {/* Now Playing */}
                                {currentSong && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Now Playing</h3>
                                        <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-primary/20">
                                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 relative">
                                                {/* playing animation overlay */}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <div className="flex gap-1 items-end h-4">
                                                        <div className="w-1 bg-primary animate-[music-bar_1s_ease-in-out_infinite] h-2"></div>
                                                        <div className="w-1 bg-primary animate-[music-bar_1.2s_ease-in-out_infinite_0.1s] h-4"></div>
                                                        <div className="w-1 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite_0.2s] h-3"></div>
                                                    </div>
                                                </div>
                                                <img
                                                    src={currentSong.imageUrl}
                                                    alt={currentSong.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium truncate text-primary">{currentSong.title}</h4>
                                                <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Next In Queue */}
                                <div className="space-y-3 pb-20">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Next In Queue</h3>

                                    {upcomingSongs.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <p>No songs in queue</p>
                                            <p className="text-sm mt-1">Add songs by swiping right on them</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {upcomingSongs.map((song, idx) => (
                                                <div
                                                    key={`${song._id}-${idx}`}
                                                    className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-lg group transition-colors"
                                                >
                                                    <div className="w-8 text-center text-sm text-muted-foreground">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={song.imageUrl}
                                                            alt={song.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium truncate text-sm">{song.title}</h4>
                                                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeFromQueue(currentIndex + 1 + idx)}
                                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default QueueDrawer;
