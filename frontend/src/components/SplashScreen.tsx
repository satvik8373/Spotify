import { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 10);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const primaryIcon = '/spotify-icons/spotify-logo-green.svg';
  const fallbackIcon = '/spotify-icons/spotify-icon-192.png';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      aria-label="Mavrixfy splash screen"
    >
      <img
        src={primaryIcon}
        alt="App icon"
        className="h-24 w-24"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = fallbackIcon;
        }}
        loading="eager"
        decoding="async"
        width={96}
        height={96}
      />
    </div>
  );
};

export default SplashScreen;
