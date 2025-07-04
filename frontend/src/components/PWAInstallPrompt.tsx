import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Download, Share2, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

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

// Define installable platforms
type Platform = 'ios' | 'android' | 'desktop';

// Detect the user's platform
const detectPlatform = (): Platform | null => {
  const userAgent = navigator.userAgent || navigator.vendor;
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  } else if (/android/i.test(userAgent)) {
    return 'android';
  } else if (window.matchMedia('(display-mode: browser)').matches) {
    return 'desktop';
  }
  
  return null;
};

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [showHomeScreenTip, setShowHomeScreenTip] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // App is already installed, don't show the prompt
    }

    // Detect platform
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    
    // Handle the beforeinstallprompt event (Chrome/Edge/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
    });

    // For iOS, we'll show our custom prompt after a delay
    if (detectedPlatform === 'ios') {
      // Only show prompt if not already in standalone mode and not recently dismissed
      const hasRecentlyDismissed = localStorage.getItem('pwaPromptDismissed');
      const dismissedTime = hasRecentlyDismissed ? parseInt(hasRecentlyDismissed) : 0;
      const now = new Date().getTime();
      
      // Show prompt if not dismissed in the last 7 days
      if (!hasRecentlyDismissed || now - dismissedTime > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // Show after 5 seconds
      }
    }
    
    // Add iOS meta tags for better icon display
    if (detectedPlatform === 'ios') {
      addIOSMetaTags();
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', (e) => {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      });
    };
  }, []);

  // Function to add iOS-specific meta tags for better icon display
  const addIOSMetaTags = () => {
    // Check if meta tags already exist
    if (document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      return; // Tags already exist
    }

    // Add meta tags if they don't exist
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Mavrixfy' }
    ];

    metaTags.forEach(tag => {
      const metaTag = document.createElement('meta');
      metaTag.name = tag.name;
      metaTag.content = tag.content;
      document.head.appendChild(metaTag);
    });

    // Add apple touch icons
    const iconSizes = [180, 167, 152, 120];
    iconSizes.forEach(size => {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.setAttribute('sizes', `${size}x${size}`);
      link.href = `/apple-touch-icon-${size}.png`;
      document.head.appendChild(link);
    });

    // Add default apple touch icon
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'apple-touch-icon';
    defaultLink.href = `/apple-touch-icon.png`;
    document.head.appendChild(defaultLink);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      // For Chrome/Edge/Android
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Store the timestamp when the user dismissed the prompt
    localStorage.setItem('pwaPromptDismissed', new Date().getTime().toString());
    setShowPrompt(false);
  };
  
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
            onClick={() => {
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
            }}
            className="bg-white text-green-900 text-sm px-3 py-1 rounded-full flex items-center gap-1"
          >
            <RefreshCw size={14} />
            <span>Update</span>
          </button>
          <button 
            onClick={handleDismiss}
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
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install Mavrixfy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-4">
            {platform === 'ios' ? (
              <>
                <p>To install this app on your iPhone:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Tap the Share button <span className="inline-block w-6">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 100-2H5z" />
                    </svg>
                  </span></li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                  <li>Tap <strong>Add</strong> in the top right corner</li>
                </ol>
              </>
            ) : platform === 'android' ? (
              <p>Tap "Install" to add this app to your home screen for quick access.</p>
            ) : (
              <p>Install this app on your device for a better experience.</p>
            )}
      </div>
    </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleDismiss}>
            Not Now
          </Button>
          {platform !== 'ios' && (
            <Button onClick={handleInstall}>
              Install
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PWAInstallPrompt; 