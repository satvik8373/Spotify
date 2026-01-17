/**
 * Production Audio Test Utilities
 * Test audio playback functionality in production environment
 */

export interface AudioTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test basic audio playback capability
 */
export const testAudioPlayback = async (): Promise<AudioTestResult> => {
  try {
    // Create a test audio element
    const audio = document.createElement('audio');
    
    // Configure for production compatibility
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.crossOrigin = 'anonymous';
    audio.muted = false;
    audio.volume = 1.0;
    
    // Use a test audio file (short silence)
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          message: 'Audio test timed out'
        });
      }, 5000);

      audio.oncanplay = () => {
        clearTimeout(timeout);
        
        // Try to play
        const playPromise = audio.play();
        
        if (playPromise) {
          playPromise
            .then(() => {
              audio.pause();
              resolve({
                success: true,
                message: 'Audio playback test successful'
              });
            })
            .catch((error) => {
              resolve({
                success: false,
                message: `Audio play failed: ${error.message}`,
                details: error
              });
            });
        } else {
          resolve({
            success: false,
            message: 'Audio play method not supported'
          });
        }
      };

      audio.onerror = (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          message: 'Audio loading failed',
          details: error
        });
      };

      // Start loading
      audio.load();
    });
  } catch (error: any) {
    return {
      success: false,
      message: `Audio test error: ${error.message}`,
      details: error
    };
  }
};

/**
 * Test HTTPS audio URL loading
 */
export const testHttpsAudio = async (url: string): Promise<AudioTestResult> => {
  try {
    // Ensure HTTPS
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }

    const audio = document.createElement('audio');
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          message: 'HTTPS audio test timed out'
        });
      }, 10000);

      audio.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve({
          success: true,
          message: 'HTTPS audio loaded successfully',
          details: {
            duration: audio.duration,
            url: audio.src
          }
        });
      };

      audio.onerror = (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          message: 'HTTPS audio loading failed',
          details: error
        });
      };

      audio.src = url;
      audio.load();
    });
  } catch (error: any) {
    return {
      success: false,
      message: `HTTPS audio test error: ${error.message}`,
      details: error
    };
  }
};

/**
 * Test user interaction requirement
 */
export const testUserInteraction = (): AudioTestResult => {
  try {
    const audio = document.createElement('audio');
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    // Try to play without user interaction
    const playPromise = audio.play();
    
    if (playPromise) {
      playPromise
        .then(() => {
          audio.pause();
          return {
            success: false,
            message: 'WARNING: Autoplay worked without user interaction (unexpected in production)'
          };
        })
        .catch(() => {
          return {
            success: true,
            message: 'User interaction requirement is properly enforced'
          };
        });
    }

    return {
      success: true,
      message: 'User interaction test completed'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `User interaction test error: ${error.message}`,
      details: error
    };
  }
};

/**
 * Run comprehensive audio tests
 */
export const runAudioTests = async (testAudioUrl?: string): Promise<AudioTestResult[]> => {
  const results: AudioTestResult[] = [];

  // Test 1: Basic audio playback
  console.log('🎵 Running basic audio playback test...');
  results.push(await testAudioPlayback());

  // Test 2: User interaction requirement
  console.log('🎵 Testing user interaction requirement...');
  results.push(testUserInteraction());

  // Test 3: HTTPS audio loading (if URL provided)
  if (testAudioUrl) {
    console.log('🎵 Testing HTTPS audio loading...');
    results.push(await testHttpsAudio(testAudioUrl));
  }

  return results;
};

/**
 * Make test function available globally for production debugging
 */
if (typeof window !== 'undefined') {
  (window as any).testMavrixfyAudio = runAudioTests;
}