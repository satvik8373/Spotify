export type AudioOutputDeviceType =
  | 'car'
  | 'tv'
  | 'headphones'
  | 'speaker'
  | 'bluetooth'
  | 'browser'
  | 'phone';

const CAR_DEVICE_REGEX =
  /(carplay|android auto|automotive|car audio|car kit|\bcar\b|\bauto\b|hands[- ]?free)/i;

const TV_DEVICE_REGEX =
  /(apple tv|android tv|fire tv|smart tv|chromecast|bravia|roku|\btv\b)/i;

const HEADPHONES_DEVICE_REGEX =
  /(airpods|earbuds|headset|headphones|buds|neckband|beats|bose|sony|jbl|boat|skullcandy)/i;

const SPEAKER_DEVICE_REGEX =
  /(speaker|soundbar|homepod|echo|nest|sonos|marshall|boombox)/i;

const BLUETOOTH_DEVICE_REGEX = /(bluetooth|a2dp)/i;
const BROWSER_DEVICE_REGEX = /(this web browser|web browser|chrome|edge|firefox|safari|opera|browser)/i;

export const detectAudioOutputDeviceType = (label: string): AudioOutputDeviceType => {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) return 'phone';
  if (BROWSER_DEVICE_REGEX.test(normalizedLabel)) return 'browser';
  if (CAR_DEVICE_REGEX.test(normalizedLabel)) return 'car';
  if (TV_DEVICE_REGEX.test(normalizedLabel)) return 'tv';
  if (HEADPHONES_DEVICE_REGEX.test(normalizedLabel)) return 'headphones';
  if (SPEAKER_DEVICE_REGEX.test(normalizedLabel)) return 'speaker';
  if (BLUETOOTH_DEVICE_REGEX.test(normalizedLabel)) return 'bluetooth';
  return 'phone';
};
