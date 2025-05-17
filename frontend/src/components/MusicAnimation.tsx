import React, { useState, useEffect } from 'react';
import './MusicAnimation.css';

// Enhanced SVG Music Notes with better visual quality
const MusicNote = ({ color, size, className }: { color: string, size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9 17.25V8.75H19V17.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M9 17.25C9 18.9069 7.65685 20.25 6 20.25C4.34315 20.25 3 18.9069 3 17.25C3 15.5931 4.34315 14.25 6 14.25C7.65685 14.25 9 15.5931 9 17.25Z" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M19 17.25C19 18.9069 17.6569 20.25 16 20.25C14.3431 20.25 13 18.9069 13 17.25C13 15.5931 14.3431 14.25 16 14.25C17.6569 14.25 19 15.5931 19 17.25Z" stroke={color} strokeWidth="1.5" fill="none"/>
    <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </svg>
);

const EighthNote = ({ color, size, className }: { color: string, size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M13 17.25C13 18.9069 11.6569 20.25 10 20.25C8.34315 20.25 7 18.9069 7 17.25C7 15.5931 8.34315 14.25 10 14.25C11.6569 14.25 13 15.5931 13 17.25Z" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M13 17.25V5.75L17.5 3.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </svg>
);

// Enhanced Music Wave with gradient and better animation
const MusicWave = ({ color1, color2 }: { color1: string, color2: string }) => (
  <svg width="100%" height="40" viewBox="0 0 1200 40" preserveAspectRatio="none">
    <defs>
      <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={color1} stopOpacity="0.4" />
        <stop offset="50%" stopColor={color2} stopOpacity="0.7" />
        <stop offset="100%" stopColor={color1} stopOpacity="0.4" />
      </linearGradient>
      <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path 
      d="M0,20 C60,5 120,35 180,20 C240,5 300,35 360,20 C420,5 480,35 540,20 C600,5 660,35 720,20 C780,5 840,35 900,20 C960,5 1020,35 1080,20 C1140,5 1200,35 1260,20" 
      stroke="url(#waveGradient)" 
      strokeWidth="2" 
      fill="none" 
      className="music-wave"
      filter="url(#waveGlow)"
    />
  </svg>
);

// Particle component for enhanced visual effects
const Particle = ({ color, size, delay, duration, left, top }: { 
  color: string, 
  size: number, 
  delay: string, 
  duration: string, 
  left: string, 
  top: string 
}) => (
  <div 
    className="particle"
    style={{
      backgroundColor: color,
      width: `${size}px`,
      height: `${size}px`,
      animationDelay: delay,
      animationDuration: duration,
      left,
      top,
    }}
  />
);

// Equalizer bars for visual rhythm representation
const Equalizer = ({ color, barCount = 4 }: { color: string, barCount?: number }) => (
  <div className="equalizer" style={{ height: `${barCount * 3}px` }}>
    {[...Array(barCount)].map((_, i) => (
      <div 
        key={i}
        className="equalizer-bar"
        style={{
          backgroundColor: color,
          animationDelay: `${i * 0.15}s`,
          height: `${3 + Math.random() * 12}px`
        }}
      />
    ))}
  </div>
);

// Main Music Animation Component
const MusicAnimation: React.FC<{ variant?: 'default' | 'minimal' | 'dense' }> = ({ variant = 'default' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const colors = ['#1DB954', '#1ED760', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00AEFF', '#FFC400'];
  
  // Dynamically adjust visibility based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine the note count based on variant
  const getNoteCount = () => {
    switch(variant) {
      case 'minimal': return 4;
      case 'dense': return 12;
      default: return 8;
    }
  };

  // Determine particle count based on variant
  const getParticleCount = () => {
    switch(variant) {
      case 'minimal': return 6;
      case 'dense': return 15;
      default: return 10;
    }
  };
  
  return (
    <div className={`music-animation-container ${variant} ${isVisible ? 'visible' : 'hidden'}`}>
      {/* Floating Music Notes */}
      {[...Array(getNoteCount())].map((_, index) => {
        const isEighthNote = index % 2 === 0;
        const color = colors[index % colors.length];
        const animationDelay = `${(index * 0.7) % 5}s`;
        const animationDuration = `${5 + (index % 5)}s`;
        const size = variant === 'minimal' ? 20 + (index % 6) : 24 + (index % 8);
        
        return (
          <div 
            key={index}
            className="floating-note"
            style={{
              animationDelay,
              animationDuration,
              left: `${5 + (index * (variant === 'minimal' ? 20 : 11))}%`,
            }}
          >
            {isEighthNote ? 
              <EighthNote color={color} size={size} className="note-svg" /> : 
              <MusicNote color={color} size={size} className="note-svg" />
            }
          </div>
        );
      })}
      
      {/* Wave Lines - More complex for better aesthetic */}
      {variant !== 'minimal' && (
        <>
          <div className="wave-container wave-1">
            <MusicWave color1="#1DB954" color2="#2196F3" />
          </div>
          <div className="wave-container wave-2">
            <MusicWave color1="#9C27B0" color2="#E91E63" />
          </div>
        </>
      )}
      
      {/* Particles for better visual effects */}
      {[...Array(getParticleCount())].map((_, index) => (
        <Particle 
          key={`particle-${index}`}
          color={colors[index % colors.length]}
          size={3 + (index % 3)}
          delay={`${(index * 0.3) % 3}s`}
          duration={`${3 + (index % 3)}s`}
          left={`${10 + (index * 9)}%`}
          top={`${20 + (index * 6)}%`}
        />
      ))}
      
      {/* Add Equalizer visualization for more professional look */}
      {variant === 'dense' && [...Array(3)].map((_, index) => (
        <div 
          key={`eq-${index}`}
          className="equalizer-container"
          style={{
            left: `${25 + (index * 25)}%`,
            top: '50%',
          }}
        >
          <Equalizer color={colors[index % colors.length]} barCount={4 + index} />
        </div>
      ))}
    </div>
  );
};

export default MusicAnimation; 