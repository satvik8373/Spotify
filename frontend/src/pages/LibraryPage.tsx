import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Topbar from '@/components/Topbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LibraryPage = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);

  // Load library data
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLibraryLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          <h1 className="text-3xl font-bold mb-6">Your Library</h1>
          
          {isLibraryLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : !isSignedIn ? (
            <div className="bg-zinc-800/50 rounded-lg p-8 text-center">
              <Library className="h-12 w-12 mx-auto mb-4 text-zinc-500" />
              <h2 className="text-xl font-semibold mb-2">Sign in to view your library</h2>
              <p className="text-zinc-400 mb-6">
                Create an account or sign in to save and access your favorite music
              </p>
              <Button 
                onClick={() => navigate('/')}
                className="bg-white text-black hover:bg-zinc-200"
              >
                Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-zinc-800/70 rounded-lg p-6 hover:bg-zinc-700/50 transition cursor-pointer" onClick={() => navigate('/liked-songs')}>
                  <h2 className="text-xl font-semibold mb-2">Liked Songs</h2>
                  <p className="text-zinc-400">Your saved tracks</p>
                </div>
                
                <div className="bg-zinc-800/70 rounded-lg p-6 hover:bg-zinc-700/50 transition cursor-pointer">
                  <h2 className="text-xl font-semibold mb-2">Albums</h2>
                  <p className="text-zinc-400">Your saved albums</p>
                </div>
                
                <div className="bg-zinc-800/70 rounded-lg p-6 hover:bg-zinc-700/50 transition cursor-pointer">
                  <h2 className="text-xl font-semibold mb-2">History</h2>
                  <p className="text-zinc-400">Recently played</p>
                </div>
              </div>
              
              <div className="bg-zinc-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Your Playlists</h2>
                <p className="text-zinc-500 text-center py-8">
                  You don't have any playlists yet.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default LibraryPage; 