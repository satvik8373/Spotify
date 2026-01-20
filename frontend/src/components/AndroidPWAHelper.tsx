import React, { useEffect, useState } from 'react';
import { Menu, Share, X, Plus, Download } from 'lucide-react';

interface AndroidPWAHelperProps {
  onDismiss?: () => void;
}

const AndroidPWAHelper: React.FC<AndroidPWAHelperProps> = ({ onDismiss }) => {
  const [showHelper, setShowHelper] = useState(false);
  const [installMode, setInstallMode] = useState<'install' | 'homescreen'>('homescreen');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);

  useEffect(() => {
    // Check if Android and not in standalone mode
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    if (!isAndroid || isInStandaloneMode) {
      // Not Android or already installed as PWA
      setIsInstalledPWA(isInStandaloneMode);
      return;
    }
    
    // Check if service worker is active
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Check installation status from service worker
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data && event.data.type === 'INSTALLATION_STATUS') {
          if (event.data.installed) {
            // App is installed but not running in standalone mode
            // This suggests user hasn't added to home screen
            setInstallMode('homescreen');
            checkIfShouldShowHomeScreenTip();
          }
        }
      };
      
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_INSTALLATION_STATUS'
      }, [messageChannel.port2]);
      
      // Listen for app installed events from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'APP_INSTALLED') {
          // App was just installed
          setDeferredPrompt(null);
          
          // Show home screen tip after installation
          setTimeout(() => {
            setInstallMode('homescreen');
            setShowHelper(true);
            localStorage.setItem('android-pwa-helper-time', Date.now().toString());
            localStorage.setItem('android-pwa-helper-shown', 'true');
          }, 2000);
        }
      });
    }
    
    // Check if the user has seen this helper before
    const checkIfShouldShowHomeScreenTip = () => {
      const helperShown = localStorage.getItem('android-pwa-helper-shown');
      const lastHelperTime = localStorage.getItem('android-pwa-helper-time');
      const now = Date.now();
      
      // Show helper if not shown before or if it's been more than 7 days
      if (!helperShown || (lastHelperTime && now - parseInt(lastHelperTime) > 7 * 24 * 60 * 60 * 1000)) {
        // Show after a delay to let the user engage with the app first
        setTimeout(() => {
          setShowHelper(true);
          localStorage.setItem('android-pwa-helper-time', now.toString());
          localStorage.setItem('android-pwa-helper-shown', 'true');
        }, 10000);
      }
    };
    
    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to notify the user they can install the PWA
      setInstallMode('install');
      
      // Show the prompt after a delay
      setTimeout(() => {
        setShowHelper(true);
      }, 3000);
    };
    
    // Capture the installation prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for successful installations
    window.addEventListener('appinstalled', () => {
      // Log install to analytics
      console.log('PWA was installed');
      // Clear the deferredPrompt so it can't be used again
      setDeferredPrompt(null);
      
      // Update to home screen tip mode after installation
      setTimeout(() => {
        setInstallMode('homescreen');
        setShowHelper(true);
      }, 2000);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);
  
  const installApp = async () => {
    if (!deferredPrompt) return;
    
    // Show the installation prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Hide our custom install prompt regardless of outcome
    setShowHelper(false);
    
    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      // We'll show the home screen tip after installation via the appinstalled event
    } else {
      console.log('User dismissed the install prompt');
      // Save dismissal to not show again for a while
      localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    }
  };
  
  const dismiss = () => {
    setShowHelper(false);
    
    // Save different dismiss times based on the mode
    if (installMode === 'install') {
      localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    } else {
      localStorage.setItem('homescreen-tip-dismissed', Date.now().toString());
    }
    
    if (onDismiss) onDismiss();
  };
  
  useEffect(() => {
    // Only run on Android devices
    const isAndroid = /android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    // Fix for Android PWA splash screen and icons
    const fixAndroidPWA = () => {
      // Ensure proper theme colors for splash screen
      const updateThemeColor = () => {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', '#121212');
        }
        
        const bgColorMeta = document.querySelector('meta[name="background-color"]');
        if (bgColorMeta) {
          bgColorMeta.setAttribute('content', '#121212');
        }
      };

      // Check if we already have a manifest link
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        // Add manifest link if missing
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }

      // Update theme colors
      updateThemeColor();

      // Add Android-specific splash screen styling
      const style = document.createElement('style');
      style.id = 'android-pwa-fixes';
      style.textContent = `
        /* Android PWA Splash Screen Fixes */
        @media (display-mode: standalone) {
          html, body {
            background-color: #121212 !important;
            color-scheme: dark !important;
          }
          
          /* Prevent white flash during app launch */
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #121212;
            z-index: -1;
          }
          
          /* Splash screen icon improvements */
          .splash-icon {
            filter: drop-shadow(0 0 20px rgba(29, 185, 84, 0.3)) !important;
            max-width: 120px !important;
            max-height: 120px !important;
          }
          
          /* Icon appearance fixes for home screen */
          .pwa-icon {
            border-radius: 18% !important;
            background-color: #121212 !important;
            padding: 8% !important;
            box-sizing: border-box !important;
          }
        }
        
        /* Android Chrome specific fixes */
        @media screen and (display-mode: standalone) and (orientation: portrait) {
          /* Ensure consistent background during transitions */
          * {
            background-color: inherit !important;
          }
          
          /* Fix for status bar area */
          body {
            padding-top: env(safe-area-inset-top, 0px) !important;
          }
        }
      `;
      
      // Remove existing style if present
      const existingStyle = document.getElementById('android-pwa-fixes');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      document.head.appendChild(style);
    };

    fixAndroidPWA();
    
    // Re-apply fixes when the page becomes visible (handles app switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(fixAndroidPWA, 100);
      }
    });
  }, []);
  
  if (isInstalledPWA || !showHelper) return null;
  
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-safe">
      <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 bg-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {installMode === 'install' 
              ? 'Install App' 
              : 'Add to Home Screen'}
          </h3>
          <button 
            onClick={dismiss} 
            className="text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4">
          {installMode === 'install' ? (
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-zinc-300">
                Install this app on your device for a better experience:
              </p>
              <div className="flex items-center text-sm text-zinc-300 space-x-2">
                <Download size={20} className="text-green-500" />
                <span>Faster loading and offline access</span>
              </div>
              <div className="flex items-center text-sm text-zinc-300 space-x-2">
                <Share size={20} className="text-green-500" />
                <span>Full-screen experience without browser UI</span>
              </div>
              <button
                onClick={installApp}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md w-full mt-2"
              >
                Install Now
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-zinc-300">
                Add this app to your home screen for easier access:
              </p>
              <div className="flex items-start space-x-3 p-2 bg-zinc-800 rounded">
                <div className="mt-1">
                  <Menu size={20} className="text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-200">Tap the menu icon in your browser</p>
                  <p className="text-xs text-zinc-400 mt-1">Look for the three dots (⋮) in the top-right corner</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-2 bg-zinc-800 rounded">
                <div className="mt-1">
                  <Plus size={20} className="text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-200">Select "Add to Home Screen"</p>
                  <p className="text-xs text-zinc-400 mt-1">You may need to scroll down to find this option</p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-md w-full mt-2"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AndroidPWAHelper; 