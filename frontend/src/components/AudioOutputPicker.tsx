import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bluetooth, Car, Check, Headphones, Monitor, RefreshCw, Smartphone, Speaker, Tv, Volume2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { detectAudioOutputDeviceType, type AudioOutputDeviceType } from '@/lib/audioOutputDevice';

interface AudioOutputPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

type OutputDevice = MediaDeviceInfo & { kind: 'audiooutput' };

type AudioWithSink = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
};

const DEFAULT_BROWSER_LABEL = 'This web browser';

const isActiveDevice = (deviceId: string, activeDeviceId: string) =>
  activeDeviceId === deviceId || (activeDeviceId === 'default' && deviceId === 'default');

const cleanDeviceLabel = (device: OutputDevice): string => {
  const rawLabel = (device.label || '').trim();
  if (device.deviceId === 'default' || !rawLabel) {
    return DEFAULT_BROWSER_LABEL;
  }

  return rawLabel.replace(/^(default|communications)\s*-\s*/i, '').trim() || DEFAULT_BROWSER_LABEL;
};

const getDeviceRank = (device: OutputDevice, activeDeviceId: string): number => {
  const label = cleanDeviceLabel(device);
  const type = detectAudioOutputDeviceType(label);
  let rank = 0;

  if (isActiveDevice(device.deviceId, activeDeviceId)) rank += 100;
  if (type === 'bluetooth' || type === 'headphones' || type === 'car' || type === 'tv') rank += 40;
  if (device.deviceId === 'default') rank += 20;
  if (device.label) rank += 5;

  return rank;
};

const isUnwantedDeviceLabel = (label: string): boolean => {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === DEFAULT_BROWSER_LABEL.toLowerCase()) return true;
  if (normalized === 'receiver') return true;
  if (/^receiver(\s|\(|$)/i.test(label)) return true;
  return false;
};

const AudioOutputPicker: React.FC<AudioOutputPickerProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = React.useState<OutputDevice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeDeviceId, setActiveDeviceId] = React.useState<string>('default');
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const [sinkSupported, setSinkSupported] = React.useState(false);

  const preferredOutputId = usePlayerStore((state) => state.audioOutputDevice);

  const renderOutputIcon = (type: AudioOutputDeviceType) => {
    switch (type) {
      case 'car':
        return <Car className="h-4 w-4 text-amber-300 flex-shrink-0" />;
      case 'tv':
        return <Tv className="h-4 w-4 text-violet-300 flex-shrink-0" />;
      case 'headphones':
        return <Headphones className="h-4 w-4 text-cyan-300 flex-shrink-0" />;
      case 'speaker':
        return <Speaker className="h-4 w-4 text-emerald-300 flex-shrink-0" />;
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4 text-cyan-300 flex-shrink-0" />;
      case 'browser':
        return <Monitor className="h-4 w-4 text-white/80 flex-shrink-0" />;
      default:
        return <Smartphone className="h-4 w-4 text-white/75 flex-shrink-0" />;
    }
  };

  const getAudioElement = React.useCallback((): AudioWithSink | null => {
    if (typeof document === 'undefined') return null;
    return document.querySelector('audio') as AudioWithSink | null;
  }, []);

  const loadDevices = React.useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Your browser does not support audio output device listing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const outputList = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device): device is OutputDevice => device.kind === 'audiooutput'
      );
      const audio = getAudioElement();
      const sinkId = (audio?.sinkId || '').trim();
      const resolvedActive = sinkId || preferredOutputId || 'default';

      setDevices(outputList);
      setActiveDeviceId(resolvedActive);
      setSinkSupported(!!audio && typeof audio.setSinkId === 'function');
    } catch {
      setError('Unable to fetch output devices. Allow permissions and try again.');
    } finally {
      setLoading(false);
    }
  }, [getAudioElement, preferredOutputId]);

  const requestPermissionAndRefresh = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      await loadDevices();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await loadDevices();
    } catch {
      setError('Permission denied. Connect Bluetooth in system settings, then refresh.');
      setLoading(false);
    }
  }, [loadDevices]);

  const selectOutput = React.useCallback(
    async (deviceId: string) => {
      const audio = getAudioElement();
      if (!audio) {
        setError('Audio element not found.');
        return;
      }

      if (typeof audio.setSinkId !== 'function') {
        setError('Output switching is not supported on this browser.');
        return;
      }

      setSwitchingId(deviceId);
      setError(null);
      try {
        await audio.setSinkId(deviceId);
        usePlayerStore.setState({ audioOutputDevice: deviceId });
        setActiveDeviceId(deviceId);
      } catch {
        setError('Unable to switch output. Keep device connected and try again.');
      } finally {
        setSwitchingId(null);
      }
    },
    [getAudioElement]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    void loadDevices();
  }, [isOpen, loadDevices]);

  const rawDevices = React.useMemo<OutputDevice[]>(
    () =>
      devices.length
        ? devices
        : [
            {
              deviceId: 'default',
              kind: 'audiooutput',
              groupId: '',
              label: DEFAULT_BROWSER_LABEL,
              toJSON: () => ({}),
            } as OutputDevice,
          ],
    [devices]
  );

  const displayDevices = React.useMemo(() => {
    const uniqueByLabel = new Map<string, OutputDevice>();

    for (const device of rawDevices) {
      const key = cleanDeviceLabel(device).toLowerCase();
      const existing = uniqueByLabel.get(key);
      if (!existing) {
        uniqueByLabel.set(key, device);
        continue;
      }

      const existingRank = getDeviceRank(existing, activeDeviceId);
      const nextRank = getDeviceRank(device, activeDeviceId);
      if (nextRank > existingRank) {
        uniqueByLabel.set(key, device);
      }
    }

    const sortedDevices = Array.from(uniqueByLabel.values()).sort((a, b) => {
      const rankDiff = getDeviceRank(b, activeDeviceId) - getDeviceRank(a, activeDeviceId);
      if (rankDiff !== 0) return rankDiff;
      return cleanDeviceLabel(a).localeCompare(cleanDeviceLabel(b));
    });

    const filtered = sortedDevices.filter((device) => {
      const label = cleanDeviceLabel(device);
      return !isUnwantedDeviceLabel(label);
    });

    // Keep at least one fallback row if every device was filtered out.
    if (filtered.length === 0 && sortedDevices.length > 0) {
      return [sortedDevices[0]];
    }

    return filtered;
  }, [activeDeviceId, rawDevices]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[80]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 35, mass: 0.52 }}
            className="fixed bottom-0 left-0 right-0 z-[81] rounded-t-3xl border border-white/15 bg-[linear-gradient(180deg,rgba(30,30,40,0.98)_0%,rgba(17,17,24,0.98)_100%)] backdrop-blur-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.65)]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
          >
            <div className="w-full flex justify-center pt-2 pb-1">
              <div className="w-11 h-1.5 rounded-full bg-white/25" />
            </div>

            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-white/85" />
                <h3 className="text-white text-sm font-semibold">Playback Device</h3>
              </div>
              <button
                onClick={() => void requestPermissionAndRefresh()}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-white/85 bg-white/10 border border-white/15 active:scale-95 transition-transform"
                aria-label="Refresh devices"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="px-4 pb-3">
              {!sinkSupported && (
                <p className="text-[11px] leading-relaxed text-white/60 mb-2">
                  Browser cannot switch output directly. Connect Bluetooth from system settings and playback will follow active system output.
                </p>
              )}
              <p className="text-[11px] leading-relaxed text-white/55 mb-2">
                Mavrixfy-like list only shows browser/available outputs from your OS. For Bluetooth names, allow audio permission once, then refresh.
              </p>
              {error && <p className="text-[11px] text-red-300 mb-2">{error}</p>}
            </div>

            <div className="px-3 pb-2 max-h-[50vh] overflow-y-auto">
              {displayDevices.map((device) => {
                const label = cleanDeviceLabel(device);
                const deviceType = device.deviceId === 'default' ? 'browser' : detectAudioOutputDeviceType(label);
                const isActive = isActiveDevice(device.deviceId, activeDeviceId);
                const isSwitching = switchingId === device.deviceId;

                return (
                  <button
                    key={device.deviceId}
                    onClick={() => void selectOutput(device.deviceId)}
                    disabled={isSwitching || !sinkSupported}
                    className={`w-full text-left flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
                      isActive
                        ? 'border-emerald-400/30 bg-emerald-500/12'
                        : 'border-transparent bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {renderOutputIcon(deviceType)}
                      <span className={`text-sm truncate ${isActive ? 'text-emerald-300' : 'text-white'}`}>{label}</span>
                    </div>
                    <div className="flex-shrink-0">
                      {isSwitching ? (
                        <RefreshCw className="h-4 w-4 text-white/70 animate-spin" />
                      ) : isActive ? (
                        <Check className="h-4 w-4 text-emerald-300" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AudioOutputPicker;

