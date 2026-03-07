import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodPlaylistGeneratorStyled } from '../components/MoodPlaylistGeneratorStyled';
import './MoodPlaylistPage.css';
import { History } from 'lucide-react';

// Lazy load FloatingLines to avoid blocking the page
const FloatingLines = lazy(() => import('../components/ui/FloatingLines'));

export default function MoodPlaylistPage() {
  const navigate = useNavigate();
  return (
    <div className="mood-playlist-page">
      {/* Animated Background - Relative Content Handled by CSS */}
      <div className="mood-playlist-background">
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0a0a1f 0%, #1a0a2e 50%, #2d1b4e 100%)' }} />}>
          <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={6}
            lineDistance={4}
            bendRadius={5}
            bendStrength={-0.5}
            interactive={true}
            parallax={false}
            animationSpeed={0.8}
            linesGradient={['#e947f5', '#a855f7', '#8b5cf6', '#6366f1']}
            mixBlendMode="screen"
          />
        </Suspense>
      </div>

      {/* Content */}
      <div className="mood-playlist-content">
        {/* History Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '1.5rem', paddingTop: '1rem' }}>
          <button
            onClick={() => navigate('/mood-history')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <History size={14} />
            View History
          </button>
        </div>

        {/* Compact Generator */}
        <div className="mood-compact-container">
          <MoodPlaylistGeneratorStyled />
        </div>
      </div>
    </div>
  );
}
