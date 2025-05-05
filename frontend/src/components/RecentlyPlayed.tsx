import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Music } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { cn } from '@/lib/utils';

// We'll use localStorage to simulate backend-saved recently played items
interface RecentItem {
  id: string;
  title: string;
  imageUrl: string;
  type: 'song' | 'playlist' | 'album';
  date: number;
  data?: any; // Store any additional data needed when playing
}

export function RecentlyPlayed() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const { setCurrentSong, playPlaylist } = usePlayerStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Load recently played items from localStorage
    const loadRecentItems = () => {
      try {
        const savedItems = localStorage.getItem('recently_played');
        if (savedItems) {
          const items: RecentItem[] = JSON.parse(savedItems);
          // Sort by most recently played
          items.sort((a, b) => b.date - a.date);
          setRecentItems(items.slice(0, 6)); // Only show the most recent 6 items
        }
      } catch (error) {
        console.error('Error loading recently played items:', error);
      }
    };

    loadRecentItems();

    // Listen for updates to recently played
    const handleRecentlyPlayedUpdated = () => loadRecentItems();
    document.addEventListener('recentlyPlayedUpdated', handleRecentlyPlayedUpdated);

    return () => {
      document.removeEventListener('recentlyPlayedUpdated', handleRecentlyPlayedUpdated);
    };
  }, []);

  // Add an item to recently played
  const addToRecentlyPlayed = (item: RecentItem) => {
    try {
      const savedItems = localStorage.getItem('recently_played');
      let items: RecentItem[] = savedItems ? JSON.parse(savedItems) : [];

      // Remove if already exists to prevent duplicates
      items = items.filter(i => i.id !== item.id);

      // Add to the beginning
      items.unshift({
        ...item,
        date: Date.now(),
      });

      // Keep only the most recent 20 items
      if (items.length > 20) {
        items = items.slice(0, 20);
      }

      localStorage.setItem('recently_played', JSON.stringify(items));
      document.dispatchEvent(new Event('recentlyPlayedUpdated'));
    } catch (error) {
      console.error('Error adding to recently played:', error);
    }
  };

  const handleItemClick = (item: RecentItem) => {
    if (item.type === 'song' && item.data) {
      // Immediately set the current song on a single click
      setCurrentSong(item.data);
      addToRecentlyPlayed(item);
      // Ensure playback starts right away
      setTimeout(() => {
        const playerStore = usePlayerStore.getState();
        playerStore.setUserInteracted();
        playerStore.setIsPlaying(true);
      }, 50);
    } else if (item.type === 'playlist' && item.id) {
      // Navigate to playlist immediately
      navigate(`/playlist/${item.id}`);
    } else if (item.type === 'album' && item.id) {
      // Navigate to album immediately
      navigate(`/albums/${item.id}`);
    }
  };

  if (recentItems.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Recently played</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {recentItems.map(item => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-md bg-zinc-800/50 cursor-pointer transition-all duration-300 hover:bg-zinc-700/60"
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <div className="p-4 flex flex-col h-full">
              <div className="relative mb-4 aspect-square rounded-md overflow-hidden shadow-md bg-zinc-900">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="object-cover w-full h-full"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-12 w-12 text-zinc-700" />
                  </div>
                )}
                <button
                  className={cn(
                    'absolute right-2 bottom-2 bg-green-500 rounded-full p-2 shadow-lg z-10 transition-all duration-300',
                    hoveredItemId === item.id
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                >
                  <Play className="h-4 w-4 text-black" />
                </button>
              </div>
              <div>
                <h3 className="font-medium text-white truncate">{item.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 capitalize">{item.type}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
