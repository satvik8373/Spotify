import React, { useEffect, useState } from 'react';
import { X, Smartphone, Laptop, Tv, Speaker, Bluetooth, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SpotifyConnectViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevice: string;
  onSelectDevice: (deviceId: string) => void;
}

const SpotifyConnectView: React.FC<SpotifyConnectViewProps> = ({
  isOpen,
  onClose,
  currentDevice,
  onSelectDevice
}) => {
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
  const getDeviceIcon = (device: MediaDeviceInfo) => {
    const label = (device.label || '').toLowerCase();
    
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
  
  // If the component is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <h2 className="text-white text-lg font-bold">Connect to a device</h2>
        <button 
          onClick={onClose}
          className="text-white/70 p-1 rounded-full hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/30"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        <p className="text-white/60 text-sm mb-4">Select where you want your music to play</p>
        
        <div className="space-y-2">
          {/* Current device */}
          <button
            className={`w-full flex items-center gap-3 p-3 rounded-md ${
              currentDevice === '' ? 'bg-white/10 text-[#1ed760]' : 'text-white hover:bg-white/5'
            }`}
            onClick={() => onSelectDevice('')}
          >
            <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
              currentDevice === '' ? 'bg-[#1ed760] text-black' : 'bg-white/10'
            }`}>
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-medium">This device</div>
              <div className="text-xs text-white/60">
                {currentDevice === '' ? 'Currently playing' : 'Spotify Connect'}
              </div>
            </div>
          </button>
          
          {/* List of available devices */}
          {availableDevices.map((device) => (
            <button
              key={device.deviceId}
              className={`w-full flex items-center gap-3 p-3 rounded-md ${
                currentDevice === device.deviceId ? 'bg-white/10 text-[#1ed760]' : 'text-white hover:bg-white/5'
              }`}
              onClick={() => onSelectDevice(device.deviceId)}
            >
              <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                currentDevice === device.deviceId ? 'bg-[#1ed760] text-black' : 'bg-white/10'
              }`}>
                {getDeviceIcon(device)}
              </div>
              <div className="text-left">
                <div className="font-medium truncate max-w-[200px]">
                  {device.label || `Device (${device.deviceId.slice(0, 8)}...)`}
                </div>
                <div className="text-xs text-white/60">
                  {currentDevice === device.deviceId ? 'Currently playing' : 'Bluetooth'}
                </div>
              </div>
            </button>
          ))}
          
          {isLoading && (
            <div className="flex justify-center p-4">
              <div className="animate-spin text-white/60">
                <RefreshCw className="h-6 w-6" />
              </div>
            </div>
          )}
          
          {!isLoading && availableDevices.length === 0 && (
            <div className="bg-white/5 rounded-md p-4 text-center">
              <p className="text-white/80 text-sm">No devices found</p>
              <p className="text-white/60 text-xs mt-1">Make sure your Bluetooth is enabled</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-white/10">
        <button 
          onClick={fetchAvailableDevices}
          disabled={isLoading}
          className="w-full bg-[#1ed760] hover:bg-[#1bc255] disabled:bg-[#1bc255]/50 text-black text-sm font-medium py-3 px-4 rounded-full flex items-center justify-center gap-2 focus:outline-none"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Scan for Devices
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SpotifyConnectView; 