import React, { useEffect, useState } from 'react';
import { networkOptimizer } from '../utils/networkOptimizer';

interface SlowConnectionOptimizerProps {
  children: React.ReactNode;
}

const SlowConnectionOptimizer: React.FC<SlowConnectionOptimizerProps> = ({ children }) => {
  const [connectionQuality, setConnectionQuality] = useState<'poor' | 'good' | 'excellent'>('good');
  const [showCellularPrompt, setShowCellularPrompt] = useState(false);
  const [cellularModeEnabled, setCellularModeEnabled] = useState(false);

  useEffect(() => {
    // Initial connection check
    const quality = networkOptimizer.getConnectionQuality();
    const isCellular = networkOptimizer.isCellularConnection();
    
    setConnectionQuality(quality);

    // Show cellular optimization prompt
    if ((quality === 'poor' || isCellular) && !cellularModeEnabled) {
      setShowCellularPrompt(true);
    }

    // Listen for connection changes
    const handleConfigChange = () => {
      const newQuality = networkOptimizer.getConnectionQuality();
      const newCellular = networkOptimizer.isCellularConnection();
      
      setConnectionQuality(newQuality);
      
      if ((newQuality === 'poor' || newCellular) && !cellularModeEnabled) {
        setShowCellularPrompt(true);
      }
    };

    networkOptimizer.onConfigChange(handleConfigChange);

    // Apply cellular optimizations to DOM
    if (quality === 'poor' || isCellular) {
      document.documentElement.classList.add('cellular-optimized');
      
      // Disable heavy animations
      const style = document.createElement('style');
      style.id = 'cellular-optimizations';
      style.textContent = `
        .cellular-optimized * {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }
        .cellular-optimized .skeleton-pulse {
          animation: none !important;
        }
        .cellular-optimized img {
          image-rendering: -webkit-optimize-contrast;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      document.documentElement.classList.remove('cellular-optimized');
      const style = document.getElementById('cellular-optimizations');
      if (style) style.remove();
    };
  }, [cellularModeEnabled]);

  const enableCellularMode = () => {
    networkOptimizer.enableCellularMode(true);
    setCellularModeEnabled(true);
    setShowCellularPrompt(false);
    
    // Show success message
    const event = new CustomEvent('show-toast', {
      detail: {
        message: 'Cellular Mode enabled - Heavy elements disabled, images minimized',
        type: 'success'
      }
    });
    window.dispatchEvent(event);
  };

  const dismissPrompt = () => {
    setShowCellularPrompt(false);
  };

  return (
    <>
      {children}
      
      {/* Cellular Optimization Prompt */}
      {showCellularPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-orange-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Cellular Connection Detected</h3>
              <p className="text-xs opacity-90 mb-3">
                Enable Cellular Mode to minimize data usage and remove heavy elements?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={enableCellularMode}
                  className="bg-white text-orange-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  Enable Cellular Mode
                </button>
                <button
                  onClick={dismissPrompt}
                  className="text-white px-3 py-1 rounded text-xs hover:bg-orange-700 transition-colors"
                >
                  Keep Normal Mode
                </button>
              </div>
            </div>
            <button
              onClick={dismissPrompt}
              className="text-white hover:bg-orange-700 rounded p-1 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Connection Quality Indicator */}
      {(connectionQuality === 'poor' || cellularModeEnabled) && (
        <div className="fixed top-16 right-4 z-40 bg-orange-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          {cellularModeEnabled ? 'Cellular Mode' : 'Slow Connection'}
        </div>
      )}
    </>
  );
};

export default SlowConnectionOptimizer;