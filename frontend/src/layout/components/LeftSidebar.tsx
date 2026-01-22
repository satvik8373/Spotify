import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Search,
    Heart,
    ArrowUpRight,
    List,
    LayoutGrid,
    Plus,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { CreatePlaylistDialog } from '../../components/playlist/CreatePlaylistDialog';
import { getLikedSongsCount } from '@/services/likedSongsService';
// Removed Spotify section per request

interface LeftSidebarProps {
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export const LeftSidebar = ({ isCollapsed = false, onToggleCollapse }: LeftSidebarProps) => {
    const { isAuthenticated } = useAuth();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [likedSongsCount, setLikedSongsCount] = useState(0);
    const { userPlaylists, fetchUserPlaylists, fetchPublicPlaylists } = usePlaylistStore();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            fetchUserPlaylists();
            loadLikedSongsCount();
        }
        fetchPublicPlaylists();
    }, [isAuthenticated, fetchUserPlaylists, fetchPublicPlaylists]);

    // Listen for liked songs updates
    useEffect(() => {
        const handleLikedSongsUpdated = () => {
            loadLikedSongsCount();
        };

        document.addEventListener('likedSongsUpdated', handleLikedSongsUpdated);

        return () => {
            document.removeEventListener('likedSongsUpdated', handleLikedSongsUpdated);
        };
    }, []);

    const loadLikedSongsCount = async () => {
        if (isAuthenticated) {
            try {
                const count = await getLikedSongsCount();
                setLikedSongsCount(count);
            } catch (error) {
                setLikedSongsCount(0);
            }
        } else {
            setLikedSongsCount(0);
        }
    };

    const isActive = (path: string) => {
        return location.pathname.startsWith(path);
    };

    return (
        <div className="hidden md:flex flex-col h-full bg-transparent w-full overflow-hidden">
            {/* Header */}
            <div className={cn("px-3 py-3 flex items-center gap-2", isCollapsed ? "justify-center" : "justify-between")}>
                {/* Collapse button on the left */}
                {onToggleCollapse && (
                    <button
                        className="p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {/* Sidebar icon: vertical rectangle with chevron - matches Spotify design */}
                        <div className="relative w-5 h-4 flex items-center">
                            {/* Narrow left section (solid bar) - about 20% width */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground rounded-l"></div>
                            {/* Wider right section (80% width) with border and chevron */}
                            <div className="absolute left-1 top-0 bottom-0 right-0 border border-foreground border-l-0 rounded-r flex items-center justify-center">
                                <ChevronLeft size={8} className="text-foreground" strokeWidth={2.5} />
                            </div>
                        </div>
                    </button>
                )}

                {/* Your Library text in the middle */}
                {!isCollapsed && (
                    <h1 className="text-base font-bold text-foreground flex-1">Your Library</h1>
                )}

                {/* Action buttons on the right */}
                {!isCollapsed && (
                    <div className="flex gap-1 flex-shrink-0">
                        <button
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            onClick={() => setShowCreateDialog(true)}
                            title="Create playlist"
                        >
                            <Plus size={18} className="text-foreground" />
                        </button>
                        <button
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            onClick={() => navigate('/library')}
                            title="Open Your Library"
                        >
                            <ArrowUpRight size={18} className="text-foreground" />
                        </button>
                    </div>
                )}
            </div>

            {/* Search and View Options */}
            {!isCollapsed && (
                <div className="px-2 flex justify-between items-center">
                    <button className="p-1.5 rounded-full hover:bg-white/10 transition-colors" title="Search">
                        <Search size={16} className="text-muted-foreground hover:text-foreground" />
                    </button>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs font-medium px-2 py-1 rounded hover:bg-white/10 transition-colors">
                        <span>Recents</span>
                        <List size={14} />
                    </button>
                </div>
            )}

            {/* Playlists */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-2 sidebar-scroll px-1">
                <div className="space-y-0.5 py-1">

                    {/* Liked Songs */}
                    <Link
                        to="/liked-songs"
                        className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors',
                            isActive('/liked-songs') ? 'bg-white/10' : '',
                            isCollapsed && 'justify-center'
                        )}
                        title={isCollapsed ? "Liked Songs" : undefined}
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-green-500 rounded flex items-center justify-center flex-shrink-0">
                            <Heart size={16} className="text-white" fill="white" />
                        </div>
                        {!isCollapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">Liked Songs</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    Playlist • {likedSongsCount} songs
                                </p>
                            </div>
                        )}
                    </Link>


                    {/* Favourite Playlists (from local likes) */}
                    {!isCollapsed && <FavouritePlaylists />}

                    {/* Only Favourites (liked playlists) and Liked Songs are shown */}

                    {/* Your Playlists */}
                    {isAuthenticated && userPlaylists.length > 0 && (
                        <div className="mt-1">
                            {!isCollapsed && (
                                <h3 className="text-xs text-muted-foreground px-2 mb-1 font-medium">Your Playlists</h3>
                            )}
                            {userPlaylists.slice(0, isCollapsed ? 8 : undefined).map((playlist: any) => (
                                <Link
                                    key={`own-${playlist._id}`}
                                    to={`/playlist/${playlist._id}`}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors group',
                                        isActive(`/playlist/${playlist._id}`) ? 'bg-white/10' : '',
                                        isCollapsed && 'justify-center'
                                    )}
                                    title={isCollapsed ? playlist.name : undefined}
                                >
                                    <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {playlist.imageUrl ? (
                                            <img
                                                src={playlist.imageUrl}
                                                alt={playlist.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                                                <LayoutGrid size={16} className="text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate">{playlist.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {playlist.createdBy?.fullName ? `By ${playlist.createdBy.fullName}` : 'Playlist'}
                                                </p>
                                            </div>
                                            <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CreatePlaylistDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
        </div>
    );
};

export default LeftSidebar;

function FavouritePlaylists() {
    let likedIds: string[] = [];
    try {
        likedIds = JSON.parse(localStorage.getItem('liked_playlists') || '[]');
    } catch { }

    const { playlists } = usePlaylistStore();
    const location = useLocation();
    const isActive = (path: string) => location.pathname.startsWith(path);
    const favs = playlists.filter(p => likedIds.includes(p._id)).slice(0, 6);
    if (favs.length === 0) return null;

    return (
        <div className="mt-1">
            <h3 className="text-xs text-muted-foreground px-2 mb-1 font-medium">Favourites</h3>
            {favs.map((playlist) => (
                <Link
                    key={`fav-${playlist._id}`}
                    to={`/playlist/${playlist._id}`}
                    className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-colors',
                        isActive(`/playlist/${playlist._id}`) ? 'bg-white/10' : ''
                    )}
                >
                    <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {playlist.imageUrl ? (
                            <img
                                src={playlist.imageUrl}
                                alt={playlist.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                                <LayoutGrid size={16} className="text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{playlist.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {playlist.createdBy?.fullName ? `By ${playlist.createdBy.fullName}` : 'Favourite'}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
