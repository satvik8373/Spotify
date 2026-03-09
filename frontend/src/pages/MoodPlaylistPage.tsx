import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodPlaylistGenerator } from '../components/MoodPlaylistGenerator';
import './MoodPlaylistPage.css';

export default function MoodPlaylistPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = () => navigate('/mood-history');
    window.addEventListener('navigate-mood-history', handleNavigate);
    return () => window.removeEventListener('navigate-mood-history', handleNavigate);
  }, [navigate]);

  return (
    <div className="mood-playlist-page relative h-full min-h-0 flex flex-col bg-gradient-to-br from-[#0f0f23] via-[#1a0f2e] to-[#2a1a3e]">
      {/* Static Background - fixed to viewport behind content */}
      <div className="mood-playlist-background">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1f] via-[#1a0a2e] to-[#2d1b4e]" />
      </div>

      {/* Content wrapper */}
      <div className="mood-mobile-page relative z-10 max-w-4xl mx-auto w-full">
        {/* Generator - Direct render without wrapper */}
        <MoodPlaylistGenerator />
      </div>
    </div>
  );
}
