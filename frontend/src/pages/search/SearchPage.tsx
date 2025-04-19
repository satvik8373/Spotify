import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Loader, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Topbar from "@/components/Topbar";
import { useAuth } from "@clerk/clerk-react";
import { loadLikedSongs, saveLikedSongs } from "@/services/likedSongsService";
import IndianMusicPlayer from "@/components/IndianMusicPlayer";

const SearchPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const { isIndianMusicLoading, searchIndianSongs, indianSearchResults } = useMusicStore();
  const { isSignedIn } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update the search when the URL changes
  useEffect(() => {
    if (query) {
      const searchPromise = searchIndianSongs(query);
      
      // Handle completion
      searchPromise
        .then(() => {
          setIsInitialLoad(false);
        })
        .catch(error => {
          console.error("Search failed:", error);
          setIsInitialLoad(false);
        });
    } else {
      // Clear search results if no query
      useMusicStore.setState({ indianSearchResults: [] });
      setIsInitialLoad(false);
    }
  }, [query, searchIndianSongs]);

  // Update auth store with current user info
  useEffect(() => {
    useAuthStore.getState().setAuthStatus(
      !!isSignedIn, 
      isSignedIn ? ((window as any).Clerk?.user?.id || null) : null
    );
  }, [isSignedIn]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-zinc-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Search for music</h2>
      <p className="text-zinc-400 max-w-md">
        Search for songs, artists, or albums to start listening
      </p>
    </div>
  );

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Search</h1>
            {query && <p className="text-zinc-400">Results for "{query}"</p>}
          </div>

          {isInitialLoad ? (
            <div className="flex justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : query ? (
            // Display IndianMusicPlayer which contains search results
            <IndianMusicPlayer />
          ) : (
            // Empty state when no search query
            renderEmptyState()
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default SearchPage;