import React, { useEffect, useState } from 'react';
import { RefreshCw, X, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { versionService, VersionInfo } from '@/services/versionService';

const VersionUpdateNotification: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check for updates on mount and periodically
  useEffect(() => {
    checkForUpdates();
    
    // Check for updates every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Check for updates when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Listen for version update events
  useEffect(() => {
    const handleVersionUpdate = (event: CustomEvent) => {
      setUpdateInfo(event.detail);
      setShowUpdate(true);
      
      // Show toast notification
      toast.info('New version available!', {
        description: `Version ${event.detail.version} is ready to install`,
        action: {
          label: 'Update Now',
          onClick: () => setShowUpdate(true),
        },
      });
    };

    document.addEventListener('versionUpdateAvailable', handleVersionUpdate as EventListener);
    return () => document.removeEventListener('versionUpdateAvailable', handleVersionUpdate as EventListener);
  }, []);

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      
      const updateInfo = await versionService.checkForUpdates();
      
      if (updateInfo) {
        setUpdateInfo(updateInfo);
        setShowUpdate(true);
        
        // Show toast notification
        toast.info('New version available!', {
          description: `Version ${updateInfo.version} is ready to install`,
          action: {
            label: 'Update Now',
            onClick: () => setShowUpdate(true),
          },
        });
      }
    } catch (error) {
      console.log('Version check failed:', error);
      // Fallback: Check if service worker has updated
      checkServiceWorkerUpdate();
    } finally {
      setIsChecking(false);
    }
  };

  const checkServiceWorkerUpdate = () => {
    // Check if service worker has updated
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().then(() => {
          // Check if there's a new service worker waiting
          if (registration.waiting) {
            setUpdateInfo({
              version: '2.0.0', // You can make this dynamic
              buildTime: new Date().toISOString(),
              features: ['Performance improvements', 'Bug fixes', 'New features'],
              critical: false,
            });
            setShowUpdate(true);
          }
        });
      });
    }
  };

  const handleUpdate = () => {
    // Use the version service to force update
    versionService.forceUpdate();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Store dismissal timestamp to avoid showing again immediately
    localStorage.setItem('versionUpdateDismissed', Date.now().toString());
  };

  const handleRemindLater = () => {
    setShowUpdate(false);
    // Set reminder for 1 hour later
    localStorage.setItem('versionUpdateReminder', (Date.now() + 60 * 60 * 1000).toString());
  };

  // Don't show if dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('versionUpdateDismissed');
    const reminder = localStorage.getItem('versionUpdateReminder');
    
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const oneHour = 60 * 60 * 1000;
      
      if (Date.now() - dismissedTime < oneHour) {
        setShowUpdate(false);
        return;
      }
    }
    
    if (reminder) {
      const reminderTime = parseInt(reminder);
      if (Date.now() < reminderTime) {
        setShowUpdate(false);
        return;
      }
    }

    // Development: Show test notification after 5 seconds (remove in production)
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        setUpdateInfo({
          version: '2.1.0',
          buildTime: new Date().toISOString(),
          features: [
            'Enhanced mobile navigation',
            'Improved touch interactions',
            'Spotify-style dropdown menus',
            'Better theme support',
            'Performance optimizations'
          ],
          critical: false,
        });
        setShowUpdate(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!showUpdate || !updateInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                New Version Available
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Version {updateInfo.version}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="mb-2">
                  A new version of Mavrixfy is available with improvements and new features.
                </p>
                {updateInfo.features && updateInfo.features.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">What's new:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {updateInfo.features.map((feature, index) => (
                        <li key={index} className="text-gray-500 dark:text-gray-400">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {updateInfo.critical && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  ⚠️ This is a critical update that includes important security fixes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Remind Later
          </Button>
          <Button
            onClick={handleUpdate}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VersionUpdateNotification;
