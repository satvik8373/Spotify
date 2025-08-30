import React from 'react';

// Critical CSS for above-the-fold content
const criticalCSS = `
  /* Critical CSS for mobile performance */
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #121212;
    color: #ffffff;
    overflow-x: hidden;
  }
  
  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  /* Mobile-first critical styles */
  .mobile-critical {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .mobile-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
  }
  
  .mobile-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .mobile-player {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 16px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    z-index: 50;
  }
  
  /* Critical loading states */
  .mobile-skeleton {
    background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 8px;
  }
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  /* Critical button styles */
  .mobile-button {
    background: #1DB954;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    min-width: 44px;
    min-height: 44px;
  }
  
  .mobile-button:active {
    transform: scale(0.98);
  }
  
  /* Critical image styles */
  .mobile-image {
    max-width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: 8px;
  }
  
  /* Critical text styles */
  .mobile-text {
    font-size: 16px;
    line-height: 1.4;
    margin: 0;
  }
  
  .mobile-title {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
    margin: 0 0 8px 0;
  }
  
  .mobile-subtitle {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    margin: 0 0 4px 0;
    color: #b3b3b3;
  }
  
  /* Critical layout styles */
  .mobile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 8px;
  }
  
  .mobile-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    margin: 8px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* Safe area support */
  .mobile-safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  /* High DPI displays */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .mobile-image {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  }
`;

const CriticalCSS: React.FC = () => {
  return (
    <style
      dangerouslySetInnerHTML={{ __html: criticalCSS }}
      id="critical-css"
    />
  );
};

export default CriticalCSS;
