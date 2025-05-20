import React, { useEffect, useState, useRef } from 'react';
import { X, Smartphone, Laptop, Tv, Speaker, Bluetooth, RefreshCw, 
         Volume2, VolumeX, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';

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
  const [deviceVolumes, setDeviceVolumes] = useState<{[key: string]: number}>({});
  const [showVolumeControls, setShowVolumeControls] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { currentSong } = usePlayerStore();
  
  // Set initial volume for this device
  useEffect(() => {
    const audio = document.querySelector('audio');
    if (audio) {
      setDeviceVolumes(prev => ({
        ...prev,
        '': Math.round((audio.volume || 0.75) * 100)
      }));
    }
  }, []);
  
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
      
      // Initialize volumes for new devices
      const newVolumes = {...deviceVolumes};
      audioOutputDevices.forEach(device => {
        if (!(device.deviceId in newVolumes)) {
          newVolumes[device.deviceId] = 75;
        }
      });
      setDeviceVolumes(newVolumes);
      
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
  
  // Handle volume change
  const handleVolumeChange = (deviceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setDeviceVolumes(prev => ({
      ...prev,
      [deviceId]: newVolume
    }));
    
    // If this is the current device, update audio element volume
    if (deviceId === currentDevice) {
      const audio = document.querySelector('audio');
      if (audio) {
        (audio as HTMLAudioElement).volume = newVolume / 100;
      }
    }
  };
  
  // Toggle volume mute
  const toggleMute = (deviceId: string) => {
    const isMuted = deviceVolumes[deviceId] === 0;
    const newVolume = isMuted ? 75 : 0;
    
    setDeviceVolumes(prev => ({
      ...prev,
      [deviceId]: newVolume
    }));
    
    // If this is the current device, update audio element volume
    if (deviceId === currentDevice) {
      const audio = document.querySelector('audio');
      if (audio) {
        (audio as HTMLAudioElement).volume = newVolume / 100;
      }
    }
  };
  
  // Toggle volume controls for a specific device
  const toggleVolumeControls = (deviceId: string) => {
    setShowVolumeControls(prev => prev === deviceId ? null : deviceId);
  };
  
  // Get device icon based on type or label
  const getDeviceIcon = (device: MediaDeviceInfo) => {
    const label = (device.label || '').toLowerCase();
    
    if (label.includes('bluetooth') || label.includes('wireless') || 
        label.includes('airpods') || label.includes('buds')) {
      return <Bluetooth className="h-5 w-5" />;
    } else if (label.includes('speaker') || label.includes('headphone') || 
              label.includes('headset') || label.includes('sonos')) {
      return <Speaker className="h-5 w-5" />;
    } else if (label.includes('tv') || label.includes('monitor') || 
              label.includes('screen') || label.includes('display')) {
      return <Tv className="h-5 w-5" />;
    } else if (label.includes('laptop') || label.includes('notebook') || 
              label.includes('mac') || label.includes('pc')) {
      return <Laptop className="h-5 w-5" />;
    }
    
    return <Smartphone className="h-5 w-5" />;
  };
  
  // Device type label
  const getDeviceType = (device: MediaDeviceInfo) => {
    const label = (device.label || '').toLowerCase();
    
    if (label.includes('bluetooth') || label.includes('wireless')) {
      return 'Bluetooth';
    } else if (label.includes('speaker') || label.includes('sonos')) {
      return 'Speaker';
    } else if (label.includes('headphone') || label.includes('headset') || 
              label.includes('airpods') || label.includes('buds')) {
      return 'Headphones';
    } else if (label.includes('tv') || label.includes('monitor')) {
      return 'TV';
    } else if (label.includes('car') || label.includes('auto')) {
      return 'Car';
    } else if (label.includes('laptop') || label.includes('mac') || 
              label.includes('pc')) {
      return 'Computer';
    }
    
    return 'Device';
  };
  
  // Handle outside clicks to close the sheet
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // If the component is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            ref={sheetRef}
            className="bg-gradient-to-b from-zinc-900/95 to-black/95 rounded-t-3xl max-h-[85vh] overflow-hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar at top */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-white/20 rounded-full"></div>
            </div>
            
            {/* Header with current playing song */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-white/10">
              {currentSong ? (
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-12 w-12 rounded-md overflow-hidden shadow-lg">
                    <img 
                      src={currentSong.imageUrl} 
                      alt={currentSong.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{currentSong.title}</h3>
                    <p className="text-sm text-white/60">{currentSong.artist}</p>
                  </div>
                </div>
              ) : (
                <h2 className="text-lg font-bold">Connect to a device</h2>
              )}
              <button 
                onClick={onClose}
                className="text-white/70 p-1.5 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-5 pt-4 pb-2">
              <p className="text-white/60 text-sm">Select where you want your music to play</p>
            </div>
            
            <div className="overflow-y-auto scrollbar-hide" style={{maxHeight: "calc(85vh - 160px)"}}>
              <div className="px-5 space-y-3">
                {/* This device */}
                <div className={cn(
                  "bg-white/5 rounded-xl overflow-hidden transition-all",
                  currentDevice === '' && "ring-1 ring-green-500 shadow-lg shadow-green-500/20"
                )}>
                  <div
                    className={`w-full flex items-center justify-between p-3.5 rounded-t-xl cursor-pointer`}
                    onClick={() => onSelectDevice('')}
                    role="button"
                    tabIndex={0}
                    aria-label="Select this device for playback"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                        currentDevice === '' ? 'bg-[#1ed760] text-black' : 'bg-white/10'
                      }`}>
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-white">This Phone</div>
                        <div className="text-xs text-white/60 flex items-center gap-1.5">
                          {currentDevice === '' ? (
                            <>
                              <span className="inline-block h-2 w-2 bg-green-500 rounded-full"></span>
                              Currently playing
                            </>
                          ) : 'Available'}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVolumeControls('');
                      }}
                      className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                      aria-label="Toggle volume controls"
                    >
                      {deviceVolumes[''] === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                  
                  {/* Volume controls for this device */}
                  {showVolumeControls === '' && (
                    <div className="px-5 py-3 border-t border-white/10 flex items-center gap-3">
                      <button
                        onClick={() => toggleMute('')}
                        className="text-white/60 hover:text-white"
                      >
                        {deviceVolumes[''] === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={deviceVolumes['']}
                        onChange={(e) => handleVolumeChange('', e)}
                        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-green-500"
                      />
                    </div>
                  )}
                </div>

                {/* Available devices section */}
                {availableDevices.length > 0 && (
                  <div className="mt-3 pb-1.5">
                    <h3 className="text-sm font-semibold text-white/90 mb-2">
                      Bluetooth Devices
                    </h3>
                    
                    <div className="space-y-3">
                      {availableDevices.map((device) => (
                        <div
                          key={device.deviceId}
                          className={cn(
                            "bg-white/5 rounded-xl overflow-hidden transition-all",
                            currentDevice === device.deviceId && "ring-1 ring-green-500 shadow-lg shadow-green-500/20"
                          )}
                        >
                          <div
                            className="w-full flex items-center justify-between p-3.5 rounded-t-xl cursor-pointer"
                            onClick={() => onSelectDevice(device.deviceId)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select ${device.label || 'device'} for playback`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 flex items-center justify-center rounded-full ${
                                currentDevice === device.deviceId ? 'bg-[#1ed760] text-black' : 'bg-white/10'
                              }`}>
                                {getDeviceIcon(device)}
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-white truncate max-w-[200px]">
                                  {device.label || `Device ${device.deviceId.slice(0, 5)}`}
                                </div>
                                <div className="text-xs text-white/60 flex items-center gap-1.5">
                                  {currentDevice === device.deviceId ? (
                                    <>
                                      <span className="inline-block h-2 w-2 bg-green-500 rounded-full"></span>
                                      Currently playing
                                    </>
                                  ) : getDeviceType(device)}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVolumeControls(device.deviceId);
                              }}
                              className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                              aria-label="Toggle volume controls"
                            >
                              {deviceVolumes[device.deviceId] === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                          </div>
                          
                          {/* Volume controls for this device */}
                          {showVolumeControls === device.deviceId && (
                            <div className="px-5 py-3 border-t border-white/10 flex items-center gap-3">
                              <button
                                onClick={() => toggleMute(device.deviceId)}
                                className="text-white/60 hover:text-white"
                              >
                                {deviceVolumes[device.deviceId] === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={deviceVolumes[device.deviceId]}
                                onChange={(e) => handleVolumeChange(device.deviceId, e)}
                                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-green-500"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Loading state */}
                {isLoading && (
                  <div className="flex justify-center p-6">
                    <div className="text-white/60">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  </div>
                )}
                
                {/* No devices found */}
                {!isLoading && availableDevices.length === 0 && (
                  <div className="bg-white/5 rounded-xl p-5 text-center my-4">
                    <p className="text-white/80 text-sm mb-1">No Bluetooth devices found</p>
                    <p className="text-white/60 text-xs">Make sure your Bluetooth is enabled</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-white/10 space-y-3">
              <button 
                onClick={fetchAvailableDevices}
                disabled={isLoading}
                className="w-full bg-[#1ed760] hover:bg-[#1bc255] disabled:bg-[#1bc255]/50 text-black text-sm font-medium py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Scan for Devices
                  </>
                )}
              </button>
              
              <button 
                className="w-full border border-white/20 text-white text-sm font-medium py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Manage Devices
              </button>
            </div>
            
            {/* Phone frame overlay - purely decorative */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpotifyConnectView; 