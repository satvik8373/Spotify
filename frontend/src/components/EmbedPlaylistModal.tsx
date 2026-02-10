import { useState, useEffect } from 'react';
import { X, Check, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EmbedPreview from '@/components/EmbedPreview';

interface EmbedPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

type ColorTheme = 'green' | 'dark';
type SizePreset = 'compact' | 'normal' | 'large' | 'responsive';

const EmbedPlaylistModal = ({
  isOpen,
  onClose,
  playlistId,
  playlistTitle,
  playlistSubtitle,
  playlistCover,
  songs,
}: EmbedPlaylistModalProps) => {
  const [colorTheme, setColorTheme] = useState<ColorTheme>('green');
  const [sizePreset, setSizePreset] = useState<SizePreset>('normal');
  const [widthPercentage, setWidthPercentage] = useState(100);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const getSizeHeight = () => {
    switch (sizePreset) {
      case 'compact':
        return '152';
      case 'normal':
        return '352';
      case 'large':
        return '552';
      case 'responsive':
        return '80';
      default:
        return '352';
    }
  };

  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    const height = getSizeHeight();
    const width = sizePreset === 'responsive' ? '100%' : `${widthPercentage}%`;
    const theme = colorTheme === 'dark' ? '&theme=dark' : '';

    return `<iframe
  src="${baseUrl}/embed/playlist/${playlistId}?utm_source=generator${theme}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
  loading="lazy">
</iframe>`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setShowCode(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] p-0 bg-[#121212] border-none overflow-hidden">
        <DialogTitle className="sr-only">Embed {playlistTitle}</DialogTitle>
        <DialogDescription className="sr-only">
          Customize and generate embed code for {playlistTitle} playlist
        </DialogDescription>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-2xl font-bold text-white">Embed playlist</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-[#b3b3b3] hover:text-white hover:bg-[#282828] rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Controls */}
          <div className="px-6 pb-4 flex items-center gap-6">
            {/* Color Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#b3b3b3]">Color</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setColorTheme('green')}
                  className={cn(
                    'w-8 h-8 rounded-full bg-[#1DB954] border-2 transition-all',
                    colorTheme === 'green'
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  aria-label="Green theme"
                />
                <button
                  onClick={() => setColorTheme('dark')}
                  className={cn(
                    'w-8 h-8 rounded-full bg-[#282828] border-2 transition-all',
                    colorTheme === 'dark'
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  aria-label="Dark theme"
                />
              </div>
            </div>

            {/* Size Selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#b3b3b3]">Size:</span>
              <select
                value={sizePreset}
                onChange={(e) => setSizePreset(e.target.value as SizePreset)}
                className="bg-[#282828] text-white px-3 py-1.5 rounded text-sm border-none outline-none cursor-pointer hover:bg-[#3e3e3e] transition-colors"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal (352px)</option>
                <option value="large">Large</option>
                <option value="responsive">Responsive</option>
              </select>
            </div>

            {/* Width Percentage */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="25"
                max="100"
                value={widthPercentage}
                onChange={(e) => setWidthPercentage(Number(e.target.value))}
                className="w-24 accent-[#1DB954]"
              />
              <span className="text-sm text-white w-12">{widthPercentage}%</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-[#b3b3b3] hover:text-white hover:bg-[#282828] rounded-full ml-auto"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>

          {/* Preview */}
          <div className="px-6 pb-6">
            <div
              className="mx-auto transition-all duration-300"
              style={{ width: `${widthPercentage}%` }}
            >
              <EmbedPreview
                playlistId={playlistId}
                playlistTitle={playlistTitle}
                playlistSubtitle={playlistSubtitle}
                playlistCover={playlistCover}
                songs={songs}
                colorTheme={colorTheme}
                height={getSizeHeight()}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <p className="text-xs text-[#b3b3b3] mb-4">
              By embedding a Mavrixfy player on your site, you are agreeing to{' '}
              <a href="/terms" className="text-white hover:underline">
                Mavrixfy's Developer Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-white hover:underline">
                Mavrixfy Platform Rules
              </a>
            </p>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    showCode
                      ? 'bg-[#1DB954] border-[#1DB954]'
                      : 'border-[#727272] group-hover:border-white'
                  )}
                >
                  {showCode && <Check className="h-3 w-3 text-black" />}
                </div>
                <input
                  type="checkbox"
                  checked={showCode}
                  onChange={(e) => setShowCode(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-sm text-white">Show code</span>
              </label>

              <Button
                onClick={handleCopy}
                className={cn(
                  'px-8 py-2 rounded-full font-semibold transition-all',
                  copied
                    ? 'bg-[#1DB954] hover:bg-[#1ed760] text-black'
                    : 'bg-[#1DB954] hover:bg-[#1ed760] text-black hover:scale-105'
                )}
              >
                {copied ? (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Copied!
                  </motion.span>
                ) : (
                  'Copy'
                )}
              </Button>
            </div>
          </div>

          {/* Code Display */}
          <AnimatePresence>
            {showCode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <pre className="bg-[#282828] p-4 rounded-lg text-xs text-[#b3b3b3] overflow-x-auto">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default EmbedPlaylistModal;
