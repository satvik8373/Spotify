import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface MoodPlaylistLoadingProps {
  className?: string;
}

const loadingTexts = [
  "Initializing AI model...",
  "Analyzing your vibe...",
  "Scanning musical patterns...",
  "Extracting audio features...",
  "Matching emotional frequencies...",
  "Curating the perfect playlist...",
  "Finalizing arrangements..."
];

export const MoodPlaylistLoading: React.FC<MoodPlaylistLoadingProps> = ({ className }) => {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex flex-col h-full min-h-0 items-center justify-center', className)}>
      <div className="w-full max-w-sm">
        <div className="bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 p-10 shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden relative">

          {/* Animated background glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="flex flex-col items-center justify-center space-y-10 relative z-10">

            {/* Professional AI Core Animation */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Outer spinning dashed ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-blue-400/30 animate-[spin_10s_linear_infinite]" />

              {/* Inner contra-spinning ring */}
              <div className="absolute inset-2 rounded-full border-t-2 border-l-2 border-purple-500/60 animate-[spin_4s_linear_infinite_reverse]" />

              {/* Central Glowing Orb */}
              <div className="relative w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-500 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.6)] animate-pulse flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white animate-bounce" />
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              </div>

              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
              </div>
              <div className="absolute inset-0 animate-[spin_5s_linear_infinite_reverse]">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
              </div>
            </div>

            {/* Loading text with fade transition effect */}
            <div className="text-center space-y-3">
              <div className="h-6 relative overflow-hidden flex items-center justify-center w-full">
                {loadingTexts.map((text, idx) => (
                  <p
                    key={idx}
                    className={cn(
                      "absolute text-base font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500",
                      idx === textIndex ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-4"
                    )}
                  >
                    {text}
                  </p>
                ))}
              </div>

              {/* Progress UI */}
              <div className="w-48 mx-auto mt-4">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full w-1/3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-[shimmer_1.5s_infinite] relative">
                    <div className="absolute top-0 right-0 w-4 h-full bg-white/50 blur-sm" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
