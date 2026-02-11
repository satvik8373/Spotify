/**
 * Share Sheet Component
 * Spotify-style bottom sheet for sharing content
 */

import { useState, useEffect } from 'react';
import { X, Loader2, Code } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SharePlatform, ShareCardContent } from '@/lib/shareCard/types';
import { generateShareCard } from '@/lib/shareCard/cardGenerator';
import { handlePlatformShare, getPlatformName, getPlatformIcon, isPlatformAvailable } from '@/lib/shareCard/platformHandlers';
import EmbedPlaylistModal from './EmbedPlaylistModal';
import toast from 'react-hot-toast';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  content: ShareCardContent;
  title?: string;
  description?: string;
}

const AVAILABLE_PLATFORMS: SharePlatform[] = [
  'instagram-story',
  'instagram-feed',
  'whatsapp',
  'facebook',
  'twitter',
  'telegram',
  'copy-link',
  'native-share'
];

export const ShareSheet = ({ isOpen, onClose, content, title, description }: ShareSheetProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SharePlatform | null>(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatform(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handlePlatformClick = async (platform: SharePlatform) => {
    // Prevent multiple clicks
    if (isGenerating) return;
    
    if (!isPlatformAvailable(platform)) {
      toast.error('This sharing method is not available on your device');
      return;
    }

    setSelectedPlatform(platform);
    setIsGenerating(true);

    try {
      // Simplified: Skip heavy card generation, just share the URL and content
      const card = await generateShareCard({
        platform,
        content,
        branding: {
          logo: true,
          watermark: true,
          appName: 'Mavrixfy'
        },
        preview: {
          audio: false,
          duration: 15
        },
        deepLink: {
          url: `${window.location.origin}/${content.type}/${content.id}?ref=${platform}`,
          fallbackUrl: window.location.origin
        }
      });

      // Handle platform-specific sharing with error handling
      try {
        await handlePlatformShare({
          platform,
          card,
          title: title || content.title,
          text: description || `Check out "${content.title}" on Mavrixfy! 🎵`,
          contentId: content.id,
          contentType: content.type
        });

        // Show success message
        if (platform === 'copy-link') {
          toast.success('Link copied to clipboard!');
        } else if (platform !== 'native-share') {
          // Don't show success for native share (user sees system UI)
          toast.success(`Opening ${getPlatformName(platform)}...`);
        }

        // Close after successful share
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (shareError: any) {
        // Handle user cancellation gracefully
        if (shareError?.name === 'AbortError' || shareError?.message?.includes('cancel')) {
          console.log('Share cancelled by user');
          return;
        }
        throw shareError;
      }
    } catch (error: any) {
      console.error('Share error:', error);
      
      // Don't show error for user cancellation
      if (error?.name !== 'AbortError' && !error?.message?.includes('cancel')) {
        toast.error('Failed to share. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      setSelectedPlatform(null);
    }
  };

  const handleEmbedClick = () => {
    try {
      onClose(); // Close share sheet
      // Small delay to prevent dialog conflicts on mobile
      setTimeout(() => {
        setShowEmbedModal(true); // Open embed modal
      }, 100);
    } catch (error) {
      console.error('Failed to open embed modal:', error);
      toast.error('Failed to open embed options');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 gap-0 bg-[#282828] border-none">
          <DialogTitle className="sr-only">Share {content.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Share this {content.type} on social media or copy the link
          </DialogDescription>
          
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Share</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Preview */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={content.imageUrl}
              alt={content.title}
              className="w-16 h-16 rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 
                  'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{content.title}</p>
              <p className="text-sm text-white/60 truncate">{content.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Platform Grid */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const IconComponent = (Icons as any)[getPlatformIcon(platform)] || Icons.Share2;
                const isSelected = selectedPlatform === platform;
                const isDisabled = isGenerating && !isSelected;

                return (
                  <button
                    key={platform}
                    onClick={() => handlePlatformClick(platform)}
                    onTouchStart={(e) => {
                      // Prevent touch event issues on mobile
                      e.currentTarget.style.transform = 'scale(0.95)';
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = '';
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg transition-all',
                      'hover:bg-white/10 active:scale-95 touch-manipulation',
                      isSelected && 'bg-white/20',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      'bg-white/10 text-white transition-colors',
                      isSelected && 'bg-primary text-black'
                    )}>
                      {isSelected && isGenerating ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <IconComponent className="h-6 w-6" />
                      )}
                    </div>
                    <span className="text-xs text-white/80 text-center">
                      {getPlatformName(platform)}
                    </span>
                  </button>
                );
              })}
              
              {/* Embed Option */}
              {content.type === 'playlist' && (
                <button
                  onClick={handleEmbedClick}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = '';
                  }}
                  disabled={isGenerating}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg transition-all',
                    'hover:bg-white/10 active:scale-95 touch-manipulation',
                    isGenerating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white transition-colors">
                    <Code className="h-6 w-6" />
                  </div>
                  <span className="text-xs text-white/80 text-center">
                    Embed
                  </span>
                </button>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/50 text-center">
            Share your favorite music with friends
          </p>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Embed Modal - Separate Dialog */}
    {content.type === 'playlist' && content.metadata?.songs && (
      <EmbedPlaylistModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        playlistId={content.id}
        playlistTitle={content.title}
        playlistSubtitle={content.subtitle}
        playlistCover={content.imageUrl}
        songs={content.metadata.songs}
      />
    )}
    </>
  );
};
