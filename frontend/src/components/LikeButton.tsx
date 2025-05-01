import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLikedSongsStore } from '@/stores/useLikedSongsStore';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types for the component
interface LikeButtonProps {
  songId: string;
  song: any;
  variant?: 'ghost' | 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  fillColor?: string;
  className?: string;
  showLoginPrompt?: boolean;
  showToasts?: boolean;
}

export function LikeButton({
  songId,
  song,
  variant = 'ghost',
  size = 'icon',
  fillColor = 'fill-green-500 text-green-500',
  className = '',
  showLoginPrompt = true,
  showToasts = true
}: LikeButtonProps) {
  const { likedSongIds, toggleLikeSong, loadLikedSongs } = useLikedSongsStore();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load the liked status on mount and when songId changes
  useEffect(() => {
    loadLikedSongs();
    // Set mounted to ensure we don't show flickering on initial render
    setMounted(true);
  }, [loadLikedSongs]);

  // Update local like state whenever likedSongIds changes
  useEffect(() => {
    if (mounted && songId) {
      const isLikedInStore = likedSongIds.has(songId);
      setIsLiked(isLikedInStore);
    }
  }, [likedSongIds, songId, mounted]);

  // Listen for updates from other components
  useEffect(() => {
    const handleLikedSongsUpdated = () => {
      loadLikedSongs();
    };
    
    document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    return () => {
      document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
    };
  }, [loadLikedSongs]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isAuthenticated && showLoginPrompt) {
      toast.error('Please log in to like songs', {
        description: 'Login to save your liked songs across devices',
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }
    
    try {
      setIsUpdating(true);
      // We use a cached liked state to show immediate UI feedback
      setIsLiked(!isLiked);
      
      // Perform the actual toggle
      toggleLikeSong(song);
      
      // Sync with server (done inside toggleLikeSong)
      if (showToasts) {
        toast.success(isLiked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
      }
    } catch (error) {
      console.error('Error toggling like status:', error);
      // Revert UI state if there was an error
      setIsLiked(isLiked);
      if (showToasts) {
        toast.error('Failed to update liked status');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't render until we've loaded the initial state
  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant={isLiked ? 'default' : variant}
      size={size}
      className={cn(
        isLiked ? fillColor : '',
        isUpdating ? 'opacity-70' : '',
        className
      )}
      onClick={handleLike}
      disabled={isUpdating}
      aria-label={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
    >
      <Heart className={cn(
        isLiked ? 'fill-current' : '',
        size === 'icon' ? 'h-4 w-4' : 'h-5 w-5'
      )} />
    </Button>
  );
} 