import React, { useEffect, useState, useRef } from 'react';
import { X, Smartphone, Laptop, Tv, Speaker, Bluetooth, RefreshCw, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SpotifyConnectViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevice: string;
  onSelectDevice: (deviceId: string) => void;
}

type DeviceCategory = 'speakers' | 'bluetooth';

const SpotifyConnectView: React.FC<SpotifyConnectViewProps> = ({
  isOpen,
  onClose,
  currentDevice,
  onSelectDevice
}) => {
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DeviceCategory>('speakers');
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // Handle touch gestures for bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    setCurrentY(e.touches[0].clientY);
  };
  
  const handleTouchEnd = () => {
    if (startY === null || currentY === null) return;
    
    // If swiped down more than 100px, close the sheet
    if (currentY - startY > 100) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 300);
    }
    
    // Reset values
    setStartY(null);
    setCurrentY(null);
  };
  
  // Calculate transform for swipe gesture
  const getTransform = () => {
    if (startY === null || currentY === null) return '';
    
    // Only allow swiping down, not up
    const delta = Math.max(0, currentY - startY);
    return `translateY(${delta}px)`;
  };
  
  // Fetch available devices when the component opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableDevices();
    }
  }, [isOpen]);
  
  // Handle fetching available devices
  const fetchAvailableDevices = async () => {
    try {
      setIsLoading(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error('Media devices not supported by your browser');
        setIsLoading(false);
        return;
      }
      
      // Get user permission if needed
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only audio output devices
      const audioOutputDevices = devices.filter(device => 
        device.kind === 'audiooutput' && device.deviceId !== 'default'
      );
      
      setAvailableDevices(audioOutputDevices);
      
      if (audioOutputDevices.length === 0) {
        toast('No external audio devices found', {
          description: 'Make sure your Bluetooth is enabled'
        });
      }
    } catch (error) {
      console.error('Error enumerating audio devices:', error);
      toast.error('Could not access audio devices');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get device icon based on type or label
  const getDeviceIcon = (device: MediaDeviceInfo | null, type?: string) => {
    if (!device && type) {
      switch(type) {
        case 'smartphone': return <Smartphone className="h-5 w-5" />;
        case 'tv': return <Tv className="h-5 w-5" />;
        case 'laptop': return <Laptop className="h-5 w-5" />;
        default: return <Speaker className="h-5 w-5" />;
      }
    }
    
    const label = (device?.label || '').toLowerCase();
    
    if (label.includes('bluetooth') || label.includes('wireless')) {
      return <Bluetooth className="h-5 w-5" />;
    } else if (label.includes('speaker') || label.includes('headphone') || label.includes('headset')) {
      return <Speaker className="h-5 w-5" />;
    } else if (label.includes('tv') || label.includes('monitor')) {
      return <Tv className="h-5 w-5" />;
    } else if (label.includes('laptop') || label.includes('notebook')) {
      return <Laptop className="h-5 w-5" />;
    }
    
    return <Smartphone className="h-5 w-5" />;
  };

  // Filter devices by category
  const getFilteredDevices = () => {
    if (activeTab === 'bluetooth') {
      return availableDevices.filter(device => 
        (device.label || '').toLowerCase().includes('bluetooth') || 
        (device.label || '').toLowerCase().includes('wireless')
      );
    }
    
    return availableDevices.filter(device => 
      !(device.label || '').toLowerCase().includes('bluetooth') && 
      !(device.label || '').toLowerCase().includes('wireless')
    );
  };
  
  // If the component is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-end",
        isClosing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"
      )}
      onClick={(e) => {
        // Close if clicking outside the sheet
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={sheetRef}
        className={cn(
          "bg-[#121212] rounded-t-xl w-full max-w-md max-h-[85vh] flex flex-col",
          isClosing ? "animate-out slide-out-to-bottom duration-300" : "animate-in slide-in-from-bottom duration-300"
        )}
        style={{ transform: getTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle for swiping */}
        <div className="h-1 w-12 bg-white/30 mx-auto my-2 rounded-full" />
        
        {/* Header */}
        <div className="px-4 pt-3 pb-5">
          <div className="text-2xl font-bold text-white">Connect</div>
        </div>
        
        {/* Current device */}
        <div className="px-4 py-3 mb-4 bg-[#242424] rounded-lg mx-4">
          <div 
            className="flex items-center gap-3 device-button"
            onClick={() => onSelectDevice('')}
          >
            <div className={`h-10 w-10 flex items-center justify-center rounded-full bg-[#1ed760] text-black`}>
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium text-white text-base">This iPhone</div>
              <div className="text-sm text-white/60">
                {currentDevice === '' ? 'Currently playing' : 'Tap to activate'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 mb-2">
          <button
            className={`flex-1 py-2 text-sm font-medium text-left ${activeTab === 'speakers' ? 'text-white border-b-2 border-white' : 'text-white/60'}`}
            onClick={() => setActiveTab('speakers')}
          >
            Speakers & Jams
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium text-left ${activeTab === 'bluetooth' ? 'text-white border-b-2 border-white' : 'text-white/60'}`}
            onClick={() => setActiveTab('bluetooth')}
          >
            <div className="flex items-center">
              <Bluetooth className="h-4 w-4 mr-1" />
              Bluetooth & Airplay
            </div>
          </button>
        </div>
        
        {/* Device list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin text-white/60">
                <RefreshCw className="h-6 w-6" />
              </div>
            </div>
          ) : (
            <>
              {/* Mock device for screenshot - replace with real devices later */}
              {activeTab === 'speakers' && (
                <div 
                  className="flex items-center gap-3 my-2 p-2 rounded-md hover:bg-white/5 cursor-pointer device-button"
                  onClick={() => onSelectDevice('tv-device')}
                >
                  <div className={`h-10 w-10 flex items-center justify-center rounded-full bg-white/10`}>
                    <Tv className="h-5 w-5" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-white">Shiv's 2nd FireTVStick</div>
                    <div className="text-sm text-white/60">
                      Spotify Connect
                    </div>
                  </div>
                  <button 
                    className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add device options menu here
                    }}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              )}
              
              {/* Real devices */}
              {getFilteredDevices().map((device) => (
                <div 
                  key={device.deviceId}
                  className="flex items-center gap-3 my-2 p-2 rounded-md hover:bg-white/5 cursor-pointer device-button"
                  onClick={() => onSelectDevice(device.deviceId)}
                >
                  <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                    currentDevice === device.deviceId ? 'bg-[#1ed760] text-black' : 'bg-white/10'
                  }`}>
                    {getDeviceIcon(device)}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-white">
                      {device.label || `Device (${device.deviceId.slice(0, 8)}...)`}
                    </div>
                    <div className="text-sm text-white/60">
                      {currentDevice === device.deviceId ? 'Currently playing' : 'Bluetooth'}
                    </div>
                  </div>
                  <button 
                    className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add device options menu here
                    }}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              ))}
              
              {!isLoading && getFilteredDevices().length === 0 && activeTab === 'bluetooth' && (
                <div className="bg-white/5 rounded-md p-4 text-center my-4">
                  <p className="text-white/80 text-sm">No Bluetooth devices found</p>
                  <p className="text-white/60 text-xs mt-1">Make sure your Bluetooth is enabled</p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Bottom area with scan button removed in favor of pull-to-refresh */}
        <div className="h-safe-bottom bg-[#121212]" />
      </div>
    </div>
  );
};

export default SpotifyConnectView; 