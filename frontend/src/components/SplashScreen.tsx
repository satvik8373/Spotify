import React, { useEffect, useState, useRef } from 'react';
import './splash-screen.css';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // Check for cached authentication to determine splash screen duration
  const isAuthenticated = Boolean(
    localStorage.getItem('auth-store') && 
    JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated
  );
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const particlesRef = useRef<HTMLDivElement>(null);
  const soundWavesRef = useRef<HTMLDivElement>(null);

  // Create particles and sound bars on component mount
  useEffect(() => {
    // Create particles
    if (particlesRef.current) {
      const container = particlesRef.current;
      const colors = ['#00FFB2', '#1DB9FF', '#7B61FF', '#FF61DC', '#61FFCE'];
      
      for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.opacity = `${0.2 + Math.random() * 0.3}`;
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Add animation
        particle.style.animation = `float ${4 + Math.random() * 4}s ease-in-out infinite`;
        particle.style.animationDelay = `${Math.random() * 2}s`;
        
        container.appendChild(particle);
      }
    }
    
    // Create sound wave bars
    if (soundWavesRef.current) {
      const container = soundWavesRef.current;
      
      for (let i = 0; i < 40; i++) {
        const bar = document.createElement('div');
        bar.classList.add('sound-bar');
        const height = 5 + Math.random() * 50;
        bar.style.height = `${height}px`;
        
        // Add animation
        bar.style.animation = `float ${0.5 + Math.random() * 1}s ease-in-out infinite`;
        bar.style.animationDelay = `${Math.random() * 0.5}s`;
        
        container.appendChild(bar);
      }
    }
  }, []);

  // Handle fade out and hide logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setHidden(true);
        if (onComplete) onComplete();
      }, 150);
    }, isAuthenticated ? 600 : 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [isAuthenticated, onComplete]);

  if (hidden) {
    return null;
  }

  return (
    <div
      className="splash-screen fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.15s ease-in-out',
        background: 'linear-gradient(135deg, #121212 0%, #191919 50%, #121212 100%)',
      }}
    >
      {/* Background Elements */}
      <div className="dot-pattern"></div>
      <div ref={particlesRef} className="particles-container"></div>
      <div ref={soundWavesRef} className="sound-waves"></div>
      
      {/* Animated background gradient */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at center, rgba(123, 97, 255, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      ></div>

      {/* Logo Container */}
      <div
        className="relative flex flex-col items-center justify-center mb-8"
        style={{ 
          animation: 'float 3s ease-in-out infinite',
          opacity: 0,
          animationFillMode: 'forwards',
          animationName: 'appear',
          animationDuration: '0.5s',
          animationDelay: '0.2s'
        }}
      >
        {/* Logo Mark */}
        <div
          className="flex items-center justify-center mb-4"
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(0,255,178,0.07) 0%, rgba(29,185,255,0.15) 100%)',
            boxShadow: '0 0 30px rgba(0, 255, 178, 0.3)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          <svg
            width="45"
            height="45"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              animation: 'glow 3s ease-in-out infinite',
            }}
          >
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FFB2" />
                <stop offset="50%" stopColor="#1DB9FF" />
                <stop offset="100%" stopColor="#7B61FF" />
              </linearGradient>
            </defs>
            <path
              d="M19.7071 4.29289C20.0976 4.68342 20.0976 5.31658 19.7071 5.70711L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071L4.29289 11.7071C3.90237 11.3166 3.90237 10.6834 4.29289 10.2929C4.68342 9.90237 5.31658 9.90237 5.70711 10.2929L9 13.5858L18.2929 4.29289C18.6834 3.90237 19.3166 3.90237 19.7071 4.29289Z"
              fill="url(#logoGradient)"
            />
            <circle
              cx="12"
              cy="12"
              r="8"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* Brand Name */}
        <div className="mavrixfy-logo relative text-4xl font-bold">
          <div
            className="relative z-10"
            style={{
              background: 'linear-gradient(to right, #00FFB2, #1DB9FF, #7B61FF, #FF61DC)',
              backgroundSize: '300% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'gradientMove 6s ease infinite',
            }}
          >
            MAVRIXFY
          </div>
          <div
            className="absolute bottom-0 left-0 w-full"
            style={{
              height: '3px',
              background: 'linear-gradient(to right, #00FFB2, #1DB9FF, #7B61FF, #FF61DC)',
              backgroundSize: '300% 100%',
              animation: 'gradientMove 6s ease infinite',
              boxShadow: '0 0 10px rgba(0, 255, 178, 0.7)',
            }}
          ></div>
        </div>
        
        {/* Tagline */}
        <div 
          className="text-xs mt-2 tracking-wider"
          style={{ 
            color: '#9C9EAF',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.2em',
            opacity: 0,
            animationFillMode: 'forwards',
            animationName: 'appear',
            animationDuration: '0.5s',
            animationDelay: '0.7s'
          }}
        >
          EXPERIENCE MUSIC
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="flex space-x-3 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="loading-dot"
            style={{
              animation: `float 0.6s ease-in-out ${i * 0.2}s infinite`,
              background: `linear-gradient(to right, ${i === 0 ? '#00FFB2' : i === 1 ? '#1DB9FF' : '#7B61FF'}, ${i === 0 ? '#1DB9FF' : i === 1 ? '#7B61FF' : '#FF61DC'})`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default SplashScreen; 