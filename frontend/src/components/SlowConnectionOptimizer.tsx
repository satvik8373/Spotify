import React, { useEffect, useState } from 'react';
import { networkOptimizer } from '../utils/networkOptimizer';

interface SlowConnectionOptimizerProps {
  children: React.ReactNode;
}

const SlowConnectionOptimizer: React.FC<SlowConnectionOptimizerProps> = ({ children }) => {
  const [connectionQuality, setConnectionQuality] = useState<'poor' | 'good' | 'excellent'>('good');
  const [showDataSaverPrompt, setShowDataSaverPrompt] = useState(false);

  useEffect(() => {
    // Initial connection check
    const quality = networkOptimizer.getConnectionQuality();
    setConnectionQuality(quality);

    // Show data saver prompt for poor connections
    if (quality === 'poor' && !networkOptimizer.isDataSaverEnabled()) {
      setShowDataSaverPrompt(true);
    }

    // Listen for connection changes
    const handleConfigChange = () => {
      const newQuality = networkOptimizer.getConnectionQuality();
      setConnectionQuality(newQuality);
      
      if (newQuality === 'poor' && !networkOptimizer.isDataSaverEnabled()) {
        setShowDataSaverPrompt(true);
      }
    };

    networkOptimizer.onConfigChange(handleConfigChange);
  }, []);

  const enableDataSaver = () => {
    networkOptimizer.enableDataSaver(true);
    setShowDataSaverPrompt(false);
    
    // Show success message
    const event = new CustomEvent('show-toast', {
      detail: {
        message: 'Data Saver enabled - Images and preloading optimized for slow connection',
        type: 'success'
      }
    });
    window.dispatchEvent(event);
  };

  const dismissPrompt = () => {
    setShowDataSaverPrompt(false);
  };

  return (
    <>
      {children}
      
      {/* Data Saver Prompt */}
      {showDataSaverPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-yellow-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Slow Connection Detected</h3>
              <p className="text-xs opacity-90 mb-3">
                Enable Data Saver mode to optimize loading for your connection?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={enableDataSaver}
                  className="bg-white text-yellow-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  Enable Data Saver
                </button>
                <button
                  onClick={dismissPrompt}
                  className="text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button
              onClick={dismissPrompt}
              className="text-white hover:bg-yellow-700 rounded p-1 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Connection Quality Indicator */}
      {connectionQuality === 'poor' && (
        <div className="fixed top-16 right-4 z-40 bg-red-600 text-white px-2 py-1 rounded text-xs">
          Slow Connection
        </div>
      )}
    </>
  );
};

export default SlowConnectionOptimizer;