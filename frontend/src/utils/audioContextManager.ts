/**
 * Audio Context Manager
 * Handles AudioContext creation with proper user gesture requirements
 * Fixes Chrome's "AudioContext was not allowed to start" error
 */

type WebAudioContextState = 'suspended' | 'running' | 'closed';

let globalAudioContext: AudioContext | null = null;
let isAudioContextInitialized = false;
let userHasInteracted = false;
let interactionListenersSetup = false;

/**
 * Initialize AudioContext only after user interaction
 * This prevents Chrome's autoplay policy violations
 */
export const initAudioContextOnUserGesture = (): void => {
  if (isAudioContextInitialized || typeof window === 'undefined') {
    console.log('AudioContext initialization skipped:', {
      isInitialized: isAudioContextInitialized,
      hasWindow: typeof window !== 'undefined'
    });
    return;
  }

  // Don't create AudioContext if user hasn't interacted yet
  if (!userHasInteracted) {
    console.warn('Cannot initialize AudioContext - user interaction required first');
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('AudioContext not supported in this browser');
      return;
    }

    console.log('Creating AudioContext - user interaction confirmed');
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

  // Additional safety check - don't create AudioContext during initial page load
  if (document.readyState === 'loading') {
    console.warn('AudioContext not available during page load - wait for user interaction');
    return null;
  }

  if (!isAudioContextInitialized) {
    console.log('AudioContext not initialized yet, attempting to initialize...');
    initAudioContextOnUserGesture();
  }

  return globalAudioContext;
};

/**
 * Mark that user has interacted - DO NOT create AudioContext immediately
 */
export const markUserInteraction = (): void => {
  if (userHasInteracted) {
    console.log('User interaction already marked');
    return;
  }

  userHasInteracted = true;
  console.log('User interaction marked - AudioContext creation enabled');
  // Don't create AudioContext here - wait for explicit request
};

/**
 * Resume AudioContext if suspended
 */
export const resumeAudioContext = async (): Promise<void> => {
  if (!userHasInteracted) {
    console.warn('Cannot resume AudioContext - no user interaction yet');
    return;
  }

  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    try {
      await context.resume();
      console.log('AudioContext resumed successfully');
    } catch (error) {
      console.warn('Failed to resume AudioContext:', error);
    }
  }
};

/**
 * Setup user interaction listeners to enable AudioContext creation
 */
export const setupUserInteractionListeners = (): void => {
  if (typeof window === 'undefined' || interactionListenersSetup) return;

  const handleUserInteraction = (event: Event) => {
    console.log('User interaction detected:', event.type);
    markUserInteraction();
    
    // Remove listeners after first interaction
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('touchend', handleUserInteraction);
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
    document.removeEventListener('mousedown', handleUserInteraction);
    document.removeEventListener('pointerdown', handleUserInteraction);
    
    interactionListenersSetup = false;
  };

  // Add listeners for various user interaction events
  document.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('touchend', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('click', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('keydown', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('mousedown', handleUserInteraction, { once: true, passive: true });
  document.addEventListener('pointerdown', handleUserInteraction, { once: true, passive: true });
  
  interactionListenersSetup = true;
  console.log('User interaction listeners setup complete');
};

/**
 * Check if AudioContext is available and ready
 */
export const isAudioContextReady = (): boolean => {
  return userHasInteracted;
};

/**
 * Check if AudioContext is actually initialized
 */
export const getAudioContextInitializationStatus = (): boolean => {
  return isAudioContextInitialized && globalAudioContext !== null;
};

/**
 * Get AudioContext state
 */
export const getAudioContextState = (): WebAudioContextState | null => {
  return (globalAudioContext?.state as WebAudioContextState) || null;
};

/**
 * Force cleanup of AudioContext (for testing/debugging)
 */
export const cleanupAudioContext = (): void => {
  if (globalAudioContext) {
    globalAudioContext.close().catch(() => {});
    globalAudioContext = null;
  }
  isAudioContextInitialized = false;
  userHasInteracted = false;
  interactionListenersSetup = false;
};

// Export functions only - don't auto-setup listeners
// Listeners will be setup by App.tsx after component mount