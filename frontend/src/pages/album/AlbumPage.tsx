import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader, Music } from 'lucide-react';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface Album {
  _id: string;
  title: string;
  artist: string;
  imageUrl: string;
  songs: any[];
}

const AlbumPage = () => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setCurrentSong } = usePlayerStore();

  useEffect(() => {
    const fetchAlbum = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        // In a real application, you would fetch album data from your backend
        setTimeout(() => {
          setAlbum({
            _id: albumId || '1',
            title: 'Example Album',
            artist: 'Various Artists',
            imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkFsYnVtIENvdmVyPC90ZXh0Pjwvc3ZnPg==',
            songs: [],
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching album:', error);
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80">
              <Loader className="h-8 w-8 animate-spin text-green-500 mb-4" />
              <p className="text-zinc-400">Loading album...</p>
            </div>
          ) : album ? (
            <>
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-8">
                <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-lg overflow-hidden shadow-xl">
                  <img
                    src={album.imageUrl}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{album.title}</h1>
                  <p className="text-zinc-400 mb-4">{album.artist}</p>

                  <div className="flex items-center gap-4">
                    <button className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-3 font-medium">
                      Play
                    </button>
                  </div>
                </div>
              </div>

              {album.songs.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4">Tracks</h2>
                  <div className="space-y-2">
                    {/* Song list would go here */}
                    <p className="text-zinc-400">Song list currently unavailable</p>
                  </div>
                </div>
              ) : (
                <div className="mt-8 text-center p-8 bg-zinc-800/50 rounded-lg">
                  <Music className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h2 className="text-xl font-medium mb-2">No tracks available</h2>
                  <p className="text-zinc-500">This album doesn't have any tracks yet.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8 bg-zinc-800/50 rounded-lg">
              <p className="text-zinc-400">Album not found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default AlbumPage;
