import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MoodPlaylistLoadingProps {
  className?: string;
}

export const MoodPlaylistLoading: React.FC<MoodPlaylistLoadingProps> = ({ className }) => {
  useEffect(() => {
    const scriptId = 'dotlottie-wc-script';
    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js';
    script.type = 'module';
    document.head.appendChild(script);
  }, []);

  return (
    <div
      role="status"
      aria-label="loading"
      className={cn(
        'fixed inset-0 z-[80] flex items-center justify-center bg-[#06060d] px-4 sm:px-6',
        className
      )}
    >
      <dotlottie-wc
        src="https://lottie.host/618a4956-4376-4969-9995-89bb7c4b945c/wuMDfgA29J.lottie"
        speed={0.8}
        style={{
          width: 'min(88vw, 420px)',
          height: 'min(88vw, 420px)',
          maxWidth: '100%',
          filter:
            'hue-rotate(195deg) saturate(2.4) brightness(1.45) contrast(1.15) drop-shadow(0 0 34px rgba(90, 190, 255, 0.78))',
        }}
        autoplay
        loop
      />
    </div>
  );
};
