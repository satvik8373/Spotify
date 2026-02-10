import { useState } from 'react';
import { Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmbedPlaylistModal from '@/components/EmbedPlaylistModal';

interface EmbedPlaylistButtonProps {
  playlistId: string;
  playlistTitle: string;
  playlistSubtitle: string;
  playlistCover: string;
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    duration: number;
  }>;
  variant?: 'default' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const EmbedPlaylistButton = ({
  playlistId,
  playlistTitle,
  playlistSubtitle,
  playlistCover,
  songs,
  variant = 'ghost',
  size = 'icon',
  className,
}: EmbedPlaylistButtonProps) => {
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowEmbedModal(true)}
        title="Embed playlist"
      >
        <Code className="h-5 w-5" />
      </Button>

      <EmbedPlaylistModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        playlistId={playlistId}
        playlistTitle={playlistTitle}
        playlistSubtitle={playlistSubtitle}
        playlistCover={playlistCover}
        songs={songs}
      />
    </>
  );
};
