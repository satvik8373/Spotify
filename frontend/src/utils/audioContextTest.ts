/**
 * Audio Context Test Utility
 * Use this to test if the AudioContext autoplay policy fix is working
 */

import { 
  getAudioContext, 
  isAudioContextReady, 
  markUserInteraction, 
  getAudioContextState 
} from './audioContextManager';

/**
 * Test AudioContext creation and state
 */
export const testAudioContext = (): void => {
  console.log('=== AudioContext Test ===');
  
  // Check initial state
  console.log('Initial state:');
  console.log('- isAudioContextReady:', isAudioContextReady());
  console.log('- getAudioContextState:', getAudioContextState());
  
  // Try to get AudioContext before user interaction
  const contextBefore = getAudioContext();
  console.log('- AudioContext before user interaction:', contextBefore);
  
  // Simulate user interaction
  console.log('\nSimulating user interaction...');
  markUserInteraction();
  
  // Check state after user interaction
  console.log('After user interaction:');
  console.log('- isAudioContextReady:', isAudioContextReady());
  console.log('- getAudioContextState:', getAudioContextState());
  
  const contextAfter = getAudioContext();
  console.log('- AudioContext after user interaction:', contextAfter);
  
  if (contextAfter) {
    console.log('- AudioContext state:', contextAfter.state);
    console.log('- AudioContext sampleRate:', contextAfter.sampleRate);
  }
  
  console.log('=== Test Complete ===');
};

/**
 * Add a button to test AudioContext in development
 */
export const addAudioContextTestButton = (): void => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const button = document.createElement('button');
  button.textContent = 'Test AudioContext';
  button.style.position = 'fixed';
  button.style.top = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '10px';
  button.style.backgroundColor = '#007bff';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', testAudioContext);
  
  document.body.appendChild(button);
  
  console.log('AudioContext test button added to page');
};