import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Download, Share2, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Custom window interface to handle MSStream
interface CustomNavigator extends Navigator {
  standalone?: boolean;
}

// Extend window with proper typing
declare global {
  interface Window {
    MSStream?: any;
  }
}

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [showHomeScreenTip, setShowHomeScreenTip] = useState(false);

  useEffect(() => {
    // Improved device detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/.test(userAgent);
    
    const nav = window.navigator as CustomNavigator;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                              (nav.standalone === true);
    
    // Check if using installed PWA
    setIsInstalledPWA(isInStandaloneMode);
    setIsIOSDevice(isIOS && !isInStandaloneMode);
    
    // We handle Android in AndroidPWAHelper, so only set to true for non-Android devices
    setIsAndroidDevice(false);
    
    // Logic for handling install prompt for non-iOS devices
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only check and show prompt for non-Android devices
      // Android devices will use AndroidPWAHelper
      if (!isAndroid) {
        checkAndShowPrompt(e as BeforeInstallPromptEvent);
      }
    };
    
    const checkAndShowPrompt = (promptEvent: BeforeInstallPromptEvent) => {
      // Check if user has already dismissed or installed
      const promptShownBefore = localStorage.getItem('pwa-prompt-shown');
      const lastPromptTime = localStorage.getItem('pwa-prompt-time');
      const now = new Date().getTime();
      
      // Show prompt if it hasn't been shown before or if it's been more than 30 days
      if (!promptShownBefore || (lastPromptTime && now - parseInt(lastPromptTime) > 30 * 24 * 60 * 60 * 1000)) {
        setShowPrompt(true);
        localStorage.setItem('pwa-prompt-time', now.toString());
        localStorage.setItem('pwa-prompt-shown', 'true');
      }
    };
    
    // Add event listener for install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for app installed event
    window.addEventListener('appinstalled', (event) => {
      // Clear the deferredPrompt as it can't be used again
      setDeferredPrompt(null);
      setShowPrompt(false);
      
      // Home screen tip is now handled by AndroidPWAHelper
    });
    
    // Listen for update messages from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        if (data && data.type === 'NEW_VERSION') {
          setAppVersion(data.version);
          setShowUpdatePrompt(true);
        }
      });
    }
    
    // Show iOS prompt based on conditions
    if (isIOS && !isInStandaloneMode) {
      const lastIOSPromptTime = localStorage.getItem('ios-pwa-prompt-time');
      const now = new Date().getTime();
      
      if (!lastIOSPromptTime || now - parseInt(lastIOSPromptTime) > 7 * 24 * 60 * 60 * 1000) {
        // Only show after the user has been engaged (5 second delay)
        setTimeout(() => {
          setShowPrompt(true);
          localStorage.setItem('ios-pwa-prompt-time', now.toString());
        }, 5000);
      }
    }
    
    // Android install logic is now in AndroidPWAHelper
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, [deferredPrompt]);
  
  const installPWA = async () => {
    if (!deferredPrompt && !isIOSDevice) return;
    
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        // User accepted the install prompt
        // Clear the saved prompt since it can't be used again
        setDeferredPrompt(null);
      }
    }
    
    // Hide the prompt regardless of outcome
    setShowPrompt(false);
  };
  
  const dismissPrompt = () => {
    setShowPrompt(false);
    // Save dismissal time to not show again for 7 days
    localStorage.setItem('pwa-prompt-dismissed', new Date().getTime().toString());
  };

  const dismissHomeScreenTip = () => {
    setShowHomeScreenTip(false);
    // Save dismissal time to not show again for 7 days
    localStorage.setItem('android-homescreen-tip-dismissed', new Date().getTime().toString());
  };

  const updateApp = () => {
    // Clear cache using caches API if available
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // Use document.location for reloading the page
        document.location.reload();
      });
    } else {
      // Force reload from server
      document.location.reload();
    }
    setShowUpdatePrompt(false);
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
  };
  
  if (!showPrompt && !showUpdatePrompt && !showHomeScreenTip) return null;
  
  // Home screen tip is now handled by AndroidPWAHelper
  
  // Show update notification if available
  if (showUpdatePrompt) {
    return (
      <div className="pwa-install-prompt bg-green-800/90 text-white shadow-lg flex items-center justify-between p-3 px-4">
        <div>
          <p className="text-sm md:text-base font-medium">
            New version available! (v{appVersion})
          </p>
          <p className="text-xs text-green-100/80">
            Update now for new features and improvements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={updateApp}
            className="bg-white text-green-900 text-sm px-3 py-1 rounded-full flex items-center gap-1"
          >
            <RefreshCw size={14} />
            <span>Update</span>
          </button>
          <button 
            onClick={dismissUpdate}
            className="rounded-full p-1 bg-black/20"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }
  
  // Show install prompt
  return (
    <div className="pwa-install-prompt bg-zinc-800/90 text-white shadow-lg flex items-center justify-between p-3 px-4">
      <div>
        <p className="text-sm md:text-base">
          {isIOSDevice 
            ? 'Install Spotify x Mavrix on your iOS device: tap Share then "Add to Home Screen"' 
            : 'Add Spotify x Mavrix to your home screen for the best experience'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!isIOSDevice && deferredPrompt && (
          <button 
            onClick={installPWA} 
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1"
          >
            <Download size={14} className="mr-1" />
            <span>Install</span>
          </button>
        )}
        {isIOSDevice && (
          <button 
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1"
            onClick={() => dismissPrompt()} // Just dismiss since iOS needs manual steps
          >
            <Share2 size={14} className="mr-1" />
            <span>Got it</span>
          </button>
        )}
        <button 
          onClick={dismissPrompt}
          className="rounded-full p-1 bg-black/20"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 