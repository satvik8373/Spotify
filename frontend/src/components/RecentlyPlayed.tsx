import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Music, Clock } from 'lucide-react';
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
  const { setCurrentSong } = usePlayerStore();
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
          setRecentItems(items.slice(0, 8)); // Show 8 most recent items
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
      setCurrentSong(item.data);
      addToRecentlyPlayed(item);
    } else if (item.type === 'playlist' && item.id) {
      navigate(`/playlist/${item.id}`);
    } else if (item.type === 'album' && item.id) {
      navigate(`/albums/${item.id}`);
    }
  };
  
  // Format the time since item was played
  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (recentItems.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Recently played</h2>
        {recentItems.length > 0 && (
          <button 
            onClick={() => navigate('/history')}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            See all
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {recentItems.map(item => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-md bg-zinc-800/50 cursor-pointer transition-all duration-200 hover:bg-zinc-700/60"
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => setHoveredItemId(null)}
          >
            <div className="p-2 flex flex-col h-full">
              <div className="relative mb-1.5 aspect-square rounded-md overflow-hidden shadow-md bg-zinc-900">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="object-cover w-full h-full"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://placehold.co/400x400/1f1f1f/959595?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-10 w-10 text-zinc-700" />
                  </div>
                )}
                <button
                  className={cn(
                    'absolute right-1.5 bottom-1.5 bg-green-500 rounded-full p-1.5 shadow-lg z-10 transition-all duration-300',
                    hoveredItemId === item.id
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-3'
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                >
                  <Play className="h-3.5 w-3.5 text-black" />
                </button>
              </div>
              <div className="min-h-[40px] flex flex-col justify-between">
                <h3 
                  className="font-medium text-white text-xs leading-tight line-clamp-2" 
                  title={item.title}
                >
                  {item.title}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-zinc-400 capitalize leading-none">{item.type}</p>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-0.5 leading-none">
                    <Clock className="h-2.5 w-2.5" />
                    {getTimeAgo(item.date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
