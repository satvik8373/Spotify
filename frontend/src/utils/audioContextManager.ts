/**
 * Audio Context Manager
 * Handles AudioContext creation with proper user gesture requirements
 * Fixes Chrome's "AudioContext was not allowed to start" error
 */

let globalAudioContext: AudioContext | null = null;
let isAudioContextInitialized = false;
let userHasInteracted = false;

/**
 * Initialize AudioContext only after user interaction
 * This prevents Chrome's autoplay policy violations
 */
export const initAudioContextOnUserGesture = (): void => {
  if (isAudioContextInitialized || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioContext = new AudioContextClass();
    isAudioContextInitialized = true;

    // Resume if suspended
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().catch(() => {
        console.warn('Failed to resume AudioContext');
      });
    }

    console.log('AudioContext initialized successfully after user gesture');
  } catch (error) {
    console.warn('Failed to initialize AudioContext:', error);
  }
};

/**
 * Get the global AudioContext, creating it if needed (with user gesture)
 */
export const getAudioContext = (): AudioContext | null => {
  if (!userHasInteracted) {
    console.warn('AudioContext not available - user interaction required');
    return null;
  }

  if (!isAudioContextInitialized) {
    initAudioContextOnUserGesture();
  }

  return globalAudioContext;
};

/**
 * Mark that user has interacted and initialize AudioContext
 */
export const markUserInteraction = (): void => {
  if (userHasInteracted) return;

  userHasInteracted = true;
  initAudioContextOnUserGesture();
};

/**
 * Resume AudioContext if suspended
 */
export const resumeAudioContext = async (): Promise<void> => {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    try {
      await context.resume();
    } catch (error) {
      console.warn('Failed to resume AudioContext:', error);
    }
  }
};

/**
 * Setup user interaction listeners to initialize AudioContext
 */
export const setupUserInteractionListeners = (): void => {
  if (typeof window === 'undefined') return;

  const handleUserInteraction = () => {
    markUserInteraction();
    
    // Remove listeners after first interaction
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('touchend', handleUserInteraction);
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
    document.removeEventListener('mousedown', handleUserInteraction);
  };

  // Add listeners for various user interaction events
  document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('touchend', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('mousedown', handleUserInteraction, { once: true, passive: true });
};

/**
 * Check if AudioContext is available and ready
 */
export const isAudioContextReady = (): boolean => {
  return userHasInteracted && isAudioContextInitialized && globalAudioContext !== null;
};

/**
 * Get AudioContext state
 */
export const getAudioContextState = (): AudioContextState | null => {
  return globalAudioContext?.state || null;
};

// Initialize user interaction listeners when module loads
if (typeof window !== 'undefined') {
  setupUserInteractionListeners();
}