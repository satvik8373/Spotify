import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone ||
                              document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    // Check if iOS
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);
    };

    checkStandalone();
    checkIOS();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after user has interacted with the app
      setTimeout(() => {
        if (!isStandalone) {
          setShowPrompt(true);
        }
      }, 10000); // Show after 10 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed > 7) {
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or user dismissed recently
  if (isStandalone || !showPrompt) {
    return null;
  }

  // Don't show if user dismissed recently
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed <= 7) {
      return null;
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-green-500 text-white p-4 shadow-2xl animate-slide-up">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-3 flex-1">
          <div className="bg-white/20 p-2 rounded-full">
            {isIOS ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">
              {isIOS ? 'Add to Home Screen' : 'Install Mavrixfy'}
            </h3>
            <p className="text-xs text-white/90">
              {isIOS 
                ? 'Tap Share → Add to Home Screen for uninterrupted music'
                : 'Install for better background audio & offline access'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-3">
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="bg-white text-green-600 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-white/90 transition-colors"
            >
              Install
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {isIOS && (
        <div className="mt-3 text-xs text-white/80 text-center">
          For best music experience: Safari → Share → Add to Home Screen
        </div>
      )}
    </div>
  );
};

export default PWAInstallPrompt;