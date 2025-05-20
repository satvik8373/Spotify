import React, { useEffect, useState, useCallback } from 'react';
import { X, Smartphone, Laptop, Tv, Speaker, Bluetooth, RefreshCw, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SpotifyConnectViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevice: string;
  onSelectDevice: (deviceId: string) => void;
}

interface DeviceInfo extends MediaDeviceInfo {
  friendlyName?: string;
  deviceType?: 'smartphone' | 'speaker' | 'tv' | 'laptop' | 'car' | 'bluetooth';
  lastConnected?: number;
}

const SpotifyConnectView: React.FC<SpotifyConnectViewProps> = ({
  isOpen,
  onClose,
  currentDevice,
  onSelectDevice
}) => {
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [recentDevices, setRecentDevices] = useState<{[key: string]: {name: string, timestamp: number}}>({});
  
  // Load recent devices from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentAudioDevices');
      if (stored) {
        setRecentDevices(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not load recent devices', e);
    }
  }, []);
  
  // Enhanced device info processing
  const processDeviceInfo = useCallback((device: MediaDeviceInfo): DeviceInfo => {
    const label = (device.label || '').toLowerCase();
    const enhancedDevice = device as DeviceInfo;
    
    // Determine device type
    if (label.includes('bluetooth') || label.includes('wireless')) {
      enhancedDevice.deviceType = 'bluetooth';
      
      // Further identify car systems
      if (label.includes('car') || 
          label.includes('auto') || 
          label.includes('vehicle') ||
          label.includes('ford') ||
          label.includes('toyota') ||
          label.includes('honda') ||
          label.includes('bmw') ||
          label.includes('audi') ||
          label.includes('nissan') ||
          label.includes('sync')) {
        enhancedDevice.deviceType = 'car';
      }
    } else if (label.includes('headphone') || 
               label.includes('headset') || 
               label.includes('speaker') || 
               label.includes('audio')) {
      enhancedDevice.deviceType = 'speaker';
    } else if (label.includes('tv') || label.includes('monitor')) {
      enhancedDevice.deviceType = 'tv';
    } else if (label.includes('laptop') || label.includes('notebook') || label.includes('computer')) {
      enhancedDevice.deviceType = 'laptop';
    } else if (!label && device.deviceId !== '') {
      // Unknown but not default - likely Bluetooth
      enhancedDevice.deviceType = 'bluetooth';
    } else {
      enhancedDevice.deviceType = 'smartphone';
    }
    
    // Create user-friendly name
    if (label) {
      // Clean up common prefixes and manufacturer info
      let friendlyName = label
        .replace(/bluetooth audio/i, '')
        .replace(/bluetooth/i, '')
        .replace(/wireless/i, '')
        .replace(/audio device/i, '')
        .replace(/audio/i, '')
        .replace(/headphones/i, '')
        .replace(/headset/i, '')
        .trim();
      
      // Capitalize first letter
      if (friendlyName) {
        friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1);
      } else {
        friendlyName = enhancedDevice.deviceType === 'car' ? 'Car Audio System' : 'Bluetooth Device';
      }
      
      enhancedDevice.friendlyName = friendlyName;
    } else {
      // No label provided by browser
      enhancedDevice.friendlyName = enhancedDevice.deviceType === 'car' 
        ? 'Car Audio System' 
        : 'Bluetooth Device';
    }
    
    // Check if this device is in our recent devices list
    const recentDeviceInfo = recentDevices[device.deviceId];
    if (recentDeviceInfo) {
      enhancedDevice.lastConnected = recentDeviceInfo.timestamp;
      
      // If we have a better name in storage, use it
      if (recentDeviceInfo.name && (!enhancedDevice.friendlyName || enhancedDevice.friendlyName.includes('Device'))) {
        enhancedDevice.friendlyName = recentDeviceInfo.name;
      }
    }
    
    return enhancedDevice;
  }, [recentDevices]);
  
  // Fetch available devices when the component opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableDevices();
    }
  }, [isOpen]);
  
  // Handle device selection with additional reliability
  const handleSelectDevice = async (deviceId: string) => {
    try {
      setConnectionInProgress(true);
      
      // Remember this device for future sessions
      if (deviceId) {
        const selectedDevice = availableDevices.find(d => d.deviceId === deviceId);
        if (selectedDevice) {
          // Update recent devices
          const updatedRecent = {
            ...recentDevices,
            [deviceId]: {
              name: selectedDevice.friendlyName || selectedDevice.label || 'Bluetooth Device',
              timestamp: Date.now()
            }
          };
          
          try {
            localStorage.setItem('recentAudioDevices', JSON.stringify(updatedRecent));
            setRecentDevices(updatedRecent);
          } catch (e) {
            console.warn('Could not save recent device', e);
          }
        }
      }
      
      // Call the handler to actually connect
      await onSelectDevice(deviceId);
      
    } catch (error) {
      console.error('Error selecting device:', error);
      toast.error('Failed to connect to device');
    } finally {
      setConnectionInProgress(false);
    }
  };
  
  // Enhanced device discovery
  const fetchAvailableDevices = async () => {
    try {
      setIsLoading(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error('Media devices not supported by your browser');
        setIsLoading(false);
        return;
      }
      
      // Get user permission if needed (required for device enumeration)
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only audio output devices and enhance with metadata
      const audioOutputDevices = devices
        .filter(device => device.kind === 'audiooutput' && device.deviceId !== 'default')
        .map(processDeviceInfo);
      
      // Sort devices: current first, then cars, then recent, then others
      const sortedDevices = audioOutputDevices.sort((a, b) => {
        // Current device always first
        if (a.deviceId === currentDevice) return -1;
        if (b.deviceId === currentDevice) return 1;
        
        // Car systems next
        if (a.deviceType === 'car' && b.deviceType !== 'car') return -1;
        if (b.deviceType === 'car' && a.deviceType !== 'car') return 1;
        
        // Then sort by last connected time (most recent first)
        if (a.lastConnected && b.lastConnected) {
          return b.lastConnected - a.lastConnected;
        }
        if (a.lastConnected) return -1;
        if (b.lastConnected) return 1;
        
        // Default to alphabetical sort
        return (a.friendlyName || '').localeCompare(b.friendlyName || '');
      });
      
      setAvailableDevices(sortedDevices);
      
      if (sortedDevices.length === 0) {
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
  
  // Get device icon based on type 
  const getDeviceIcon = (device: DeviceInfo) => {
    switch (device.deviceType) {
      case 'car':
        return <Bluetooth className="h-5 w-5" />;
      case 'bluetooth':
        return <Bluetooth className="h-5 w-5" />;
      case 'speaker':
        return <Speaker className="h-5 w-5" />;
      case 'tv':
        return <Tv className="h-5 w-5" />;
      case 'laptop':
        return <Laptop className="h-5 w-5" />;
      default:
        return <Smartphone className="h-5 w-5" />;
    }
  };
  
  // Get device type label
  const getDeviceTypeLabel = (device: DeviceInfo) => {
    if (device.deviceId === currentDevice) return 'Currently playing';
    
    switch (device.deviceType) {
      case 'car':
        return 'Car Audio';
      case 'bluetooth':
        return 'Bluetooth';
      case 'speaker':
        return 'Speaker';
      case 'tv':
        return 'TV';
      case 'laptop':
        return 'Computer';
      default:
        return 'Spotify Connect';
    }
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
          disabled={connectionInProgress}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {connectionInProgress && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-[#1ed760]" />
            <p className="text-white font-medium">Connecting...</p>
            <p className="text-white/60 text-sm mt-1">Please wait</p>
          </div>
        </div>
      )}
      
      <div className="p-4 flex-1 overflow-auto">
        <p className="text-white/60 text-sm mb-4">Select where you want your music to play</p>
        
        <div className="space-y-2">
          {/* Current device */}
          <button
            className={`w-full flex items-center gap-3 p-3 rounded-md ${
              currentDevice === '' ? 'bg-white/10 text-[#1ed760]' : 'text-white hover:bg-white/5'
            }`}
            onClick={() => handleSelectDevice('')}
            disabled={connectionInProgress}
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
              onClick={() => handleSelectDevice(device.deviceId)}
              disabled={connectionInProgress}
            >
              <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                currentDevice === device.deviceId ? 'bg-[#1ed760] text-black' : 'bg-white/10'
              }`}>
                {getDeviceIcon(device)}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium truncate max-w-[200px]">
                  {device.friendlyName || device.label || `Device (${device.deviceId.slice(0, 8)}...)`}
                </div>
                <div className="text-xs text-white/60 flex items-center gap-1">
                  {getDeviceTypeLabel(device)}
                  {device.lastConnected && (
                    <span className="inline-flex items-center ml-1">
                      <span className="w-1 h-1 rounded-full bg-white/40 mx-1"></span>
                      <span>Recently used</span>
                    </span>
                  )}
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
              <p className="text-white/80 text-sm mb-2">No devices found</p>
              <p className="text-white/60 text-xs">Make sure your Bluetooth is enabled</p>
              <div className="flex items-center justify-center gap-1 mt-3 text-white/60 text-xs bg-white/10 py-2 px-3 rounded-md">
                <Info className="h-3 w-3" />
                <span>Try pairing your device in system settings first</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-white/10">
        <button 
          onClick={fetchAvailableDevices}
          disabled={isLoading || connectionInProgress}
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
        
        <p className="text-center text-white/50 text-xs mt-3">
          Bluetooth and other external audio devices must be paired in your system settings first
        </p>
      </div>
    </div>
  );
};

export default SpotifyConnectView; 