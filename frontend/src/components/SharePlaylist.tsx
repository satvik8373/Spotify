import { useState } from 'react';
import { Playlist } from '../types';
import { Share2, Copy, MessageCircle, Facebook, Twitter, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface SharePlaylistProps {
  playlist: Playlist;
  trigger?: React.ReactNode;
}

export function SharePlaylist({ playlist, trigger }: SharePlaylistProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get the correct playlist ID (prefer _id, fallback to id)
  const playlistId = playlist._id || playlist.id;
  
  // Generate shareable URL with playlist ID - direct link to playlist
  const shareUrl = `${window.location.origin}/playlist/${playlistId}`;
  const shareText = `Check out "${playlist.name}" playlist with ${playlist.songs.length} songs on Mavrixfy!`;
  
  // WhatsApp share URL
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
  
  // Facebook share URL
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  
  // Twitter share URL
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Playlist link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Playlist link copied to clipboard!');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: playlist.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      handleCopyLink();
    }
  };

  const handlePlatformShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  // Validate that we have a valid playlist ID
  if (!playlistId || playlistId.trim() === '') {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Playlist</DialogTitle>
        </DialogHeader>
        
        {/* Playlist Preview */}
        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
          <img
            src={playlist.imageUrl}
            alt={playlist.name}
            className="w-12 h-12 rounded object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 
                'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{playlist.name}</p>
            <p className="text-sm text-zinc-400 truncate">
              {playlist.songs.length} songs • {playlist.createdBy?.fullName || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Share URL */}
        <div className="flex items-center gap-2">
          <Input
            value={shareUrl}
            readOnly
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Share Options */}
        <div className="grid grid-cols-2 gap-2">
          {/* Native Share */}
          <Button
            variant="outline"
            onClick={handleNativeShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          
          {/* WhatsApp */}
          <Button
            variant="outline"
            onClick={() => handlePlatformShare(whatsappUrl)}
            className="flex items-center gap-2 text-green-500 hover:text-green-400"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          
          {/* Facebook */}
          <Button
            variant="outline"
            onClick={() => handlePlatformShare(facebookUrl)}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-400"
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </Button>
          
          {/* Twitter */}
          <Button
            variant="outline"
            onClick={() => handlePlatformShare(twitterUrl)}
            className="flex items-center gap-2 text-sky-500 hover:text-sky-400"
          >
            <Twitter className="h-4 w-4" />
            Twitter
          </Button>
        </div>

        {/* Copy Link Button */}
        <Button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-2"
        >
          <Link className="h-4 w-4" />
          Copy Playlist Link
        </Button>
      </DialogContent>
    </Dialog>
  );
}
