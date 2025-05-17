import React from 'react';
import './MusicAnimation.css';

// SVG Music Notes for better visual quality
const MusicNote = ({ color, size }: { color: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 17.25V8.75H19V17.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M9 17.25C9 18.9069 7.65685 20.25 6 20.25C4.34315 20.25 3 18.9069 3 17.25C3 15.5931 4.34315 14.25 6 14.25C7.65685 14.25 9 15.5931 9 17.25Z" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M19 17.25C19 18.9069 17.6569 20.25 16 20.25C14.3431 20.25 13 18.9069 13 17.25C13 15.5931 14.3431 14.25 16 14.25C17.6569 14.25 19 15.5931 19 17.25Z" stroke={color} strokeWidth="1.5" fill="none"/>
  </svg>
);

const EighthNote = ({ color, size }: { color: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 17.25C13 18.9069 11.6569 20.25 10 20.25C8.34315 20.25 7 18.9069 7 17.25C7 15.5931 8.34315 14.25 10 14.25C11.6569 14.25 13 15.5931 13 17.25Z" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M13 17.25V5.75L17.5 3.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const MusicWave = ({ color }: { color: string }) => (
  <svg width="100%" height="30" viewBox="0 0 1200 30" preserveAspectRatio="none">
    <path 
      d="M0,15 C50,5 100,25 150,15 C200,5 250,25 300,15 C350,5 400,25 450,15 C500,5 550,25 600,15 C650,5 700,25 750,15 C800,5 850,25 900,15 C950,5 1000,25 1050,15 C1100,5 1150,25 1200,15" 
      stroke={color} 
      strokeWidth="2" 
      fill="none" 
      className="music-wave"
    />
  </svg>
);

const MusicAnimation: React.FC = () => {
  const colors = ['#1DB954', '#1ED760', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63'];
  
  return (
    <div className="music-animation-container">
      {/* Floating Music Notes */}
      {[...Array(8)].map((_, index) => {
        const isEighthNote = index % 2 === 0;
        const color = colors[index % colors.length];
        const animationDelay = `${(index * 0.7) % 5}s`;
        const animationDuration = `${5 + (index % 5)}s`;
        const size = 24 + (index % 8);
        
        return (
          <div 
            key={index}
            className="floating-note"
            style={{
              animationDelay,
              animationDuration,
              left: `${5 + (index * 11)}%`,
            }}
          >
            {isEighthNote ? 
              <EighthNote color={color} size={size} /> : 
              <MusicNote color={color} size={size} />
            }
          </div>
        );
      })}
      
      {/* Wave Lines */}
      <div className="wave-container wave-1">
        <MusicWave color="rgba(29, 185, 84, 0.4)" />
      </div>
      <div className="wave-container wave-2">
        <MusicWave color="rgba(33, 150, 243, 0.4)" />
      </div>
      
      {/* Floating Circles */}
      {[...Array(10)].map((_, index) => (
        <div 
          key={`circle-${index}`}
          className="floating-circle"
          style={{
            backgroundColor: colors[index % colors.length],
            animationDelay: `${(index * 0.3) % 4}s`,
            animationDuration: `${4 + (index % 4)}s`,
            left: `${10 + (index * 8)}%`,
            width: `${8 + (index % 10)}px`,
            height: `${8 + (index % 10)}px`,
          }}
        />
      ))}
    </div>
  );
};

export default MusicAnimation; 