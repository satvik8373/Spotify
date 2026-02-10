/**
 * Share Sheet Component
 * Spotify-style bottom sheet for sharing content
 */

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SharePlatform, ShareCardContent } from '@/lib/shareCard/types';
import { generateShareCard } from '@/lib/shareCard/cardGenerator';
import { handlePlatformShare, getPlatformName, getPlatformIcon, isPlatformAvailable } from '@/lib/shareCard/platformHandlers';
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
  const [previewCard, setPreviewCard] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatform(null);
      setPreviewCard(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handlePlatformClick = async (platform: SharePlatform) => {
    if (!isPlatformAvailable(platform)) {
      toast.error('This sharing method is not available on your device');
      return;
    }

    setSelectedPlatform(platform);
    setIsGenerating(true);

    try {
      // Generate share card
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

      // Show preview for a moment
      setPreviewCard(card.imageUrl);

      // Small delay to show preview
      await new Promise(resolve => setTimeout(resolve, 500));

      // Handle platform-specific sharing
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
      } else {
        toast.success(`Shared to ${getPlatformName(platform)}!`);
      }

      // Close after successful share
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share. Please try again.');
    } finally {
      setIsGenerating(false);
      setSelectedPlatform(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-[#282828] border-none">
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
                    disabled={isDisabled}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg transition-all',
                      'hover:bg-white/10 active:scale-95',
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
            </div>
          </div>
        </ScrollArea>

        {/* Preview Card (when generating) */}
        {previewCard && (
          <div className="p-4 border-t border-white/10">
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src={previewCard}
                alt="Share preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/50 text-center">
            Share your favorite music with friends
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
