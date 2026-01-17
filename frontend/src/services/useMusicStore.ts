convertIndianSongToAppSong: (song: { id: any; title: any; artist: any; image: any; url: any; duration: any; }) => {
  return {
    _id: song.id || `indian-song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: song.title,
    artist: song.artist || 'Unknown Artist',
    albumId: null,
    imageUrl: song.image,
    audioUrl: song.url || '',
    duration: parseInt(song.duration || '0'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}, 