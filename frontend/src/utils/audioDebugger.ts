/**
 * Production Audio Debugging Utilities
 * Helps identify common audio playback issues in production
 */

export interface AudioDebugInfo {
  userAgent: string;
  isHTTPS: boolean;
  hasUserInteracted: boolean;
  autoplaySupported: boolean;
  audioContext: string;
  mediaSession: boolean;
  wakeLock: boolean;
  currentUrl?: string;
  audioElement?: {
    readyState: number;
    networkState: number;
    error: string | null;
    paused: boolean;
    muted: boolean;
    volume: number;
  };
}

export const getAudioDebugInfo = (audioElement?: HTMLAudioElement): AudioDebugInfo => {
  const info: AudioDebugInfo = {
    userAgent: navigator.userAgent,
    isHTTPS: window.location.protocol === 'https:',
    hasUserInteracted: false, // Will be set by caller
    autoplaySupported: false,
    audioContext: 'unknown',
    mediaSession: 'mediaSession' in navigator,
    wakeLock: 'wakeLock' in navigator,
  };

  // Check AudioContext support
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      info.audioContext = ctx.state;
      ctx.close();
    }
  } catch (e) {
    info.audioContext = 'not supported';
  }

  // Test autoplay support
  const testAudio = document.createElement('audio');
  testAudio.muted = true;
  const playPromise = testAudio.play();
  if (playPromise) {
    playPromise
      .then(() => {
        info.autoplaySupported = true;
        testAudio.pause();
      })
      .catch(() => {
        info.autoplaySupported = false;
      });
  }

  // Audio element info
  if (audioElement) {
    info.currentUrl = audioElement.src;
    info.audioElement = {
      readyState: audioElement.readyState,
      networkState: audioElement.networkState,
      error: audioElement.error ? audioElement.error.message : null,
      paused: audioElement.paused,
      muted: audioElement.muted,
      volume: audioElement.volume,
    };
  }

  return info;
};

export const logAudioDebugInfo = (audioElement?: HTMLAudioElement, userInteracted: boolean = false) => {
  const info = getAudioDebugInfo(audioElement);
  info.hasUserInteracted = userInteracted;
  
  console.group('🎵 Audio Debug Info');
  console.log('Browser:', info.userAgent.split(' ').pop());
  console.log('HTTPS:', info.isHTTPS ? '✅' : '❌');
  console.log('User Interacted:', info.hasUserInteracted ? '✅' : '❌');
  console.log('Autoplay Supported:', info.autoplaySupported ? '✅' : '❌');
  console.log('AudioContext:', info.audioContext);
  console.log('MediaSession:', info.mediaSession ? '✅' : '❌');
  console.log('Wake Lock:', info.wakeLock ? '✅' : '❌');
  
  if (info.currentUrl) {
    console.log('Current URL:', info.currentUrl);
    console.log('URL Protocol:', new URL(info.currentUrl).protocol);
  }
  
  if (info.audioElement) {
    console.log('Audio Element:');
    console.log('  Ready State:', info.audioElement.readyState, getReadyStateText(info.audioElement.readyState));
    console.log('  Network State:', info.audioElement.networkState, getNetworkStateText(info.audioElement.networkState));
    console.log('  Error:', info.audioElement.error || 'None');
    console.log('  Paused:', info.audioElement.paused);
    console.log('  Muted:', info.audioElement.muted);
    console.log('  Volume:', info.audioElement.volume);
  }
  
  console.groupEnd();
  
  return info;
};

const getReadyStateText = (state: number): string => {
  switch (state) {
    case 0: return 'HAVE_NOTHING';
    case 1: return 'HAVE_METADATA';
    case 2: return 'HAVE_CURRENT_DATA';
    case 3: return 'HAVE_FUTURE_DATA';
    case 4: return 'HAVE_ENOUGH_DATA';
    default: return 'UNKNOWN';
  }
};

const getNetworkStateText = (state: number): string => {
  switch (state) {
    case 0: return 'NETWORK_EMPTY';
    case 1: return 'NETWORK_IDLE';
    case 2: return 'NETWORK_LOADING';
    case 3: return 'NETWORK_NO_SOURCE';
    default: return 'UNKNOWN';
  }
};

export const checkCommonIssues = (audioElement?: HTMLAudioElement, userInteracted: boolean = false): string[] => {
  const issues: string[] = [];
  
  // Check HTTPS
  if (window.location.protocol !== 'https:') {
    issues.push('Site not using HTTPS - may cause audio issues in production');
  }
  
  // Check user interaction
  if (!userInteracted) {
    issues.push('No user interaction detected - autoplay will be blocked');
  }
  
  // Check audio element
  if (audioElement) {
    if (audioElement.muted) {
      issues.push('Audio element is muted - iOS requires unmuted audio');
    }
    
    if (audioElement.volume === 0) {
      issues.push('Audio volume is 0 - iOS requires volume > 0');
    }
    
    if (audioElement.src && audioElement.src.startsWith('http://')) {
      issues.push('Audio source uses HTTP - may cause CORS issues in HTTPS environment');
    }
    
    if (audioElement.error) {
      issues.push(`Audio error: ${audioElement.error.message}`);
    }
    
    if (audioElement.networkState === 3) {
      issues.push('No audio source available');
    }
  }
  
  return issues;
};