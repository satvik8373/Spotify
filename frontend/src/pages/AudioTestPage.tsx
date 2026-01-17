import React, { useEffect } from 'react';
import ProductionAudioPlayer from '@/components/ProductionAudioPlayer';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Button } from '@/components/ui/button';
import { runAudioTests } from '@/utils/audioTest';

/**
 * Test page to verify audio functionality works in production
 */
const AudioTestPage: React.FC = () => {
  const { setCurrentSong, playAlbum } = usePlayerStore();

  // Test songs with different sources
  const testSongs = [
    {
      _id: 'test1',
      title: 'Test Song 1 (HTTPS)',
      artist: 'Test Artist',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      imageUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png'
    },
    {
      _id: 'test2', 
      title: 'Test Song 2 (Data URL)',
      artist: 'Test Artist',
      audioUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
      imageUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png'
    }
  ];

  const handleTestSong = (song: any) => {
    setCurrentSong(song);
    playAlbum([song], 0);
  };

  const handleRunTests = async () => {
    console.log('🎵 Running comprehensive audio tests...');
    const results = await runAudioTests(testSongs[0].audioUrl);
    
    console.group('🎵 Audio Test Results');
    results.forEach((result, index) => {
      console.log(`Test ${index + 1}:`, result.success ? '✅' : '❌', result.message);
      if (result.details) {
        console.log('Details:', result.details);
      }
    });
    console.groupEnd();
    
    alert(`Audio tests completed. Check console for results.\n\nPassed: ${results.filter(r => r.success).length}/${results.length}`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Audio Production Test</h1>
        
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Audio Playback</h2>
            <p className="text-zinc-400 mb-4">
              Click the buttons below to test different audio sources. 
              The audio player should work correctly in production.
            </p>
            
            <div className="space-y-3">
              {testSongs.map((song) => (
                <Button
                  key={song._id}
                  onClick={() => handleTestSong(song)}
                  className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  Play: {song.title}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Run Diagnostic Tests</h2>
            <p className="text-zinc-400 mb-4">
              Run comprehensive tests to check browser compatibility and audio functionality.
            </p>
            
            <Button
              onClick={handleRunTests}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Run Audio Tests
            </Button>
          </div>

          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Production Checklist</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>HTTPS enforced for audio URLs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>User interaction required before playback</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>iOS Safari compatibility (playsinline, unmuted)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>CORS headers configured</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span>Proper error handling and user feedback</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
            <h3 className="text-yellow-400 font-semibold mb-2">Testing Instructions</h3>
            <ol className="text-sm text-yellow-200 space-y-1 list-decimal list-inside">
              <li>Test on Chrome, Safari, Firefox, and Edge</li>
              <li>Test on both desktop and mobile devices</li>
              <li>Test with and without user interaction</li>
              <li>Test background playback (mobile)</li>
              <li>Test with different audio URL formats</li>
              <li>Check browser console for any errors</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <ProductionAudioPlayer />
    </div>
  );
};

export default AudioTestPage;