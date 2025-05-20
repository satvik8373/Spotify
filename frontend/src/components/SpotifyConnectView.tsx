import React, { useEffect, useState, useRef } from 'react';
import { X, Smartphone, Laptop, Tv, Speaker, Bluetooth, RefreshCw, MoreVertical, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Radio } from 'lucide-react';

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
  groupId?: string;
}

type DeviceCategory = 'speakers_jams' | 'bluetooth_airplay';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed';

interface DeviceConnectionState {
  [deviceId: string]: ConnectionState;
}

interface SpotifyConnectViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevice?: string | null;
  onDeviceSelect: (deviceId: string) => void;
  availableDevices: DeviceInfo[];
}

const SpotifyConnectView: React.FC<SpotifyConnectViewProps> = ({
  isOpen,
  onClose,
  onDeviceSelect,
  currentDevice,
  availableDevices = [],
}) => {
  const [activeTab, setActiveTab] = useState<DeviceCategory>('speakers_jams');
  const [isScanning, setIsScanning] = useState(false);
  const [connectionState, setConnectionState] = useState<DeviceConnectionState>({});
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Check if Bluetooth is available in the browser
  useEffect(() => {
    setBluetoothAvailable('bluetooth' in navigator);
  }, []);

  // Fetch available devices when the component opens and refresh every 10 seconds
  useEffect(() => {
    if (isOpen) {
      startScan();
      const intervalId = setInterval(startScan, 10000); // Refresh every 10 seconds
      return () => clearInterval(intervalId);
    }
  }, [isOpen]);

  // Monitor device connection state changes
  useEffect(() => {
    // Reset connection states when devices change
    const resetConnectionStates: DeviceConnectionState = {};
    availableDevices.forEach(device => {
      // Preserve existing states or set to idle
      resetConnectionStates[device.deviceId] = 
        connectionState[device.deviceId] || 'idle';
    });
    
    setConnectionState(resetConnectionStates);
  }, [availableDevices]);

  // Listen for audio device changed events from AudioPlayer
  useEffect(() => {
    const handleDeviceChanged = (event: CustomEvent) => {
      const { deviceId } = event.detail;
      if (deviceId) {
        // Update the connection state to connected
        setConnectionState(prev => ({
          ...prev,
          [deviceId]: 'connected'
        }));
        
        // After showing the connected state for a moment, close the view
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    };
    
    document.addEventListener('audioDeviceChanged', handleDeviceChanged as EventListener);
    return () => {
      document.removeEventListener('audioDeviceChanged', handleDeviceChanged as EventListener);
    };
  }, [onClose]);
  
  // Function to start scanning for devices
  const startScan = async () => {
    setIsScanning(true);
    
    // In a real app, you would use navigator.bluetooth.requestDevice() here
    // Since we're using our own mock devices, we'll just simulate scanning
    
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  // Function to handle pull-to-refresh gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startYRef.current) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startYRef.current;
    
    // If user pulls down at least 50px, start scanning
    if (deltaY > 50 && !isScanning && !isDraggingRef.current) {
      startScan();
      isDraggingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    startYRef.current = null;
    isDraggingRef.current = false;
  };
  
  // Function to attempt to turn on Bluetooth
  const attemptBluetoothActivation = async () => {
    if (!('bluetooth' in navigator)) {
      console.warn('Bluetooth API is not available in your browser');
      return false;
    }

    try {
      // This will prompt the user to enable Bluetooth
      // Add TypeScript interface for Web Bluetooth API
      interface BluetoothNavigator extends Navigator {
        bluetooth: {
          requestDevice(options: { acceptAllDevices: boolean }): Promise<any>;
        }
      }
      
      // Cast navigator to the extended interface
      await (navigator as BluetoothNavigator).bluetooth.requestDevice({
        acceptAllDevices: true
      });
      return true;
    } catch (error) {
      console.error('Failed to activate Bluetooth:', error);
      return false;
    }
  };

  // Function to handle device selection
  const handleSelectDevice = async (deviceId: string) => {
    // Show connecting state
    setConnectionState(prev => ({
      ...prev,
      [deviceId]: 'connecting'
    }));
    
    try {
      // Call the parent component's handler
      onDeviceSelect(deviceId);
      
      // Wait a bit before showing connected state
      setTimeout(() => {
        setConnectionState(prev => ({
          ...prev,
          [deviceId]: 'connected'
        }));
      }, 1000);
    } catch (error) {
      console.error('Failed to connect to device:', error);
      setConnectionState(prev => ({
        ...prev,
        [deviceId]: 'failed'
      }));
    }
  };

  // Function to render device icon based on device type
  const getDeviceIcon = (device: DeviceInfo) => {
    const { label, deviceId } = device;
    
    if (label.toLowerCase().includes('tv') || deviceId === 'tv-device') return <Tv size={18} />;
    if (label.toLowerCase().includes('speaker')) return <Speaker size={18} />;
    if (label.toLowerCase().includes('laptop') || label.toLowerCase().includes('computer')) return <Laptop size={18} />;
    if (label.toLowerCase().includes('phone') || label.toLowerCase().includes('mobile')) return <Smartphone size={18} />;
    if (label.toLowerCase().includes('bluetooth')) return <Radio size={18} />;
    
    // Default icon
    return <Speaker size={18} />;
  };
  
  // Add mock devices for demonstration purposes
  const mockDevices = [
    { deviceId: 'tv-device', label: 'Living Room TV', kind: 'audiooutput', groupId: 'bluetooth' },
    { deviceId: 'speaker-1', label: 'Kitchen Speaker', kind: 'audiooutput', groupId: 'bluetooth' },
  ];
  
  // Combine real and mock devices
  const allDevices = [...availableDevices, ...mockDevices];
  
  // Filter devices based on active tab
  const filteredDevices = allDevices.filter(device => {
    if (activeTab === 'speakers_jams') {
      return device.deviceId === 'tv-device' || device.deviceId === 'speaker-1' || 
             device.label.toLowerCase().includes('speaker');
    } else {
      return device.kind === 'audiooutput' && !device.label.toLowerCase().includes('default');
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Bottom sheet */}
          <motion.div
            ref={bottomSheetRef}
            className="fixed bottom-0 left-0 right-0 bg-[#121212] rounded-t-2xl z-50 max-h-[85vh] overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 400 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Handle/pill for dragging */}
            <div className="w-full flex justify-center pt-2 pb-4">
              <div className="w-12 h-1 bg-white bg-opacity-20 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-4 pb-4 flex justify-between items-center">
              <h3 className="text-white text-lg font-bold">Connect to a device</h3>
              <button
                className="text-white p-1 rounded-full hover:bg-white hover:bg-opacity-10"
                onClick={onClose}
              >
                <XCircle size={24} />
              </button>
            </div>
            
            {/* Tab navigation */}
            <div className="flex border-b border-white border-opacity-10 mb-2">
              <button
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === 'speakers_jams'
                    ? 'text-green-500 border-b-2 border-green-500'
                    : 'text-white text-opacity-70'
                }`}
                onClick={() => setActiveTab('speakers_jams')}
              >
                Speakers & Jams
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium ${
                  activeTab === 'bluetooth_airplay'
                    ? 'text-green-500 border-b-2 border-green-500'
                    : 'text-white text-opacity-70'
                }`}
                onClick={() => setActiveTab('bluetooth_airplay')}
              >
                Bluetooth & Airplay
              </button>
            </div>
            
            {/* Current device */}
            {activeTab === 'bluetooth_airplay' && (
              <div className="px-4 py-3 border-b border-white border-opacity-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Smartphone size={18} className="text-white mr-3" />
                    <div>
                      <p className="text-white font-medium">This iPhone</p>
                      <p className="text-xs text-white text-opacity-70">
                        Currently playing
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
              </div>
            )}
            
            {/* Device list */}
            <div className="overflow-y-auto pb-8" style={{ maxHeight: 'calc(85vh - 140px)' }}>
              {isScanning ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw size={24} className="text-white opacity-70" />
                  </motion.div>
                  <p className="text-white opacity-70 mt-3">Scanning for devices...</p>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-white opacity-70">
                    {activeTab === 'bluetooth_airplay' 
                      ? 'No Bluetooth devices found. Make sure your devices are turned on and in pairing mode.'
                      : 'No speakers or connected devices found.'}
                  </p>
                  <button
                    className="mt-4 px-4 py-2 bg-white bg-opacity-10 text-white rounded-full text-sm font-medium"
                    onClick={startScan}
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  {filteredDevices.map((device) => (
                    <div 
                      key={device.deviceId}
                      className="px-4 py-3 border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5"
                    >
                      <div className="flex items-center justify-between">
                        <button 
                          className="flex items-center w-full justify-between"
                          onClick={() => handleSelectDevice(device.deviceId)}
                          disabled={connectionState[device.deviceId] === 'connecting' || connectionState[device.deviceId] === 'connected'}
                        >
                          <div className="flex items-center">
                            <span className="text-white mr-3">
                              {getDeviceIcon(device)}
                            </span>
                            <div>
                              <p className="text-white font-medium text-left">{device.label}</p>
                              {connectionState[device.deviceId] === 'connecting' && (
                                <p className="text-xs text-green-500">Connecting...</p>
                              )}
                              {connectionState[device.deviceId] === 'connected' && (
                                <p className="text-xs text-green-500">Connected</p>
                              )}
                              {connectionState[device.deviceId] === 'failed' && (
                                <p className="text-xs text-red-500">Connection failed</p>
                              )}
                              {device.deviceId === currentDevice && !connectionState[device.deviceId] && (
                                <p className="text-xs text-green-500">Currently selected</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {connectionState[device.deviceId] === 'connected' && (
                              <CheckCircle2 size={18} className="text-green-500" />
                            )}
                            {connectionState[device.deviceId] === 'connecting' && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <RefreshCw size={18} className="text-green-500" />
                              </motion.div>
                            )}
                            {/* Options button for each device */}
                            <button className="ml-2 p-2 rounded-full hover:bg-white hover:bg-opacity-10">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="8" cy="3" r="1.5" fill="white" />
                                <circle cx="8" cy="8" r="1.5" fill="white" />
                                <circle cx="8" cy="13" r="1.5" fill="white" />
                              </svg>
                            </button>
                          </div>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* Bluetooth not available message */}
              {activeTab === 'bluetooth_airplay' && !bluetoothAvailable && (
                <div className="px-4 py-4 mt-4 bg-white bg-opacity-5 mx-4 rounded-lg">
                  <p className="text-white opacity-70 text-sm">
                    Bluetooth API is not available in this browser. Try opening Spotify in Chrome on an Android device.
                  </p>
                </div>
              )}
            </div>
            
            {/* Refresh button */}
            <div className="absolute bottom-4 right-4">
              <button
                className="p-3 bg-white bg-opacity-10 rounded-full hover:bg-opacity-20"
                onClick={startScan}
                disabled={isScanning}
              >
                <RefreshCw
                  size={20}
                  className={`text-white ${isScanning ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SpotifyConnectView; 