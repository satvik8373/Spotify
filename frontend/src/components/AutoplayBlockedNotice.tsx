import React from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface AutoplayBlockedNoticeProps {
  onUserInteraction: () => void;
}

const AutoplayBlockedNotice: React.FC<AutoplayBlockedNoticeProps> = ({ onUserInteraction }) => {
  const { autoplayBlocked, currentSong } = usePlayerStore();

  if (!autoplayBlocked || !currentSong) return null;

  const handleClick = () => {
    // Mark user interaction and clear autoplay block
    usePlayerStore.getState().setUserInteracted();
    usePlayerStore.setState({ autoplayBlocked: false });
    onUserInteraction();
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-lg max-w-sm mx-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Play className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            Tap to play music
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Your browser requires user interaction to play audio
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleClick}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Play
        </Button>
      </div>
    </div>
  );
};

export default AutoplayBlockedNotice;