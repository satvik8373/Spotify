import React from 'react';
import { getLoginUrl } from '../services/spotifyService';
import { Button } from './ui/button';
import { Music2 } from 'lucide-react';

interface SpotifyLoginProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const SpotifyLogin: React.FC<SpotifyLoginProps> = ({ 
  className, 
  variant = 'default',
  size = 'default'
}) => {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <Button 
      onClick={handleLogin} 
      className={`bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold flex items-center gap-2 ${className}`}
      variant={variant}
      size={size}
    >
      <Music2 className="h-4 w-4" />
      <span>Connect with Spotify</span>
    </Button>
  );
};

export default SpotifyLogin; 