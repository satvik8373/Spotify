import { Song, Album, Playlist } from '@/types';

export const generateSongSEO = (song: Song) => ({
  title: `${song.title} - ${song.artist} | Mavrixfy`,
  description: `Listen to ${song.title} by ${song.artist} on Mavrixfy. Stream high-quality music online.`,
  keywords: `${song.title}, ${song.artist}, music streaming, listen online, ${song.album || 'song'}`,
  image: song.imageUrl || 'https://mavrixfy.site/mavrixfy.png',
  url: `https://mavrixfy.site/song/${song._id}`,
  type: 'music.song' as const,
  schema: {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": song.title,
    "byArtist": {
      "@type": "MusicGroup",
      "name": song.artist
    },
    "duration": `PT${Math.floor(song.duration / 60)}M${song.duration % 60}S`,
    "inAlbum": song.album ? {
      "@type": "MusicAlbum",
      "name": song.album
    } : undefined,
    "image": song.imageUrl,
    "url": `https://mavrixfy.site/song/${song._id}`
  }
});

export const generateAlbumSEO = (album: Album) => ({
  title: `${album.title} - ${album.artist} | Mavrixfy`,
  description: `Listen to ${album.title} by ${album.artist} on Mavrixfy. Full album streaming with ${album.songs?.length || 0} tracks.`,
  keywords: `${album.title}, ${album.artist}, album, music streaming, full album`,
  image: album.imageUrl || 'https://mavrixfy.site/mavrixfy.png',
  url: `https://mavrixfy.site/album/${album._id}`,
  type: 'music.album' as const,
  schema: {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "name": album.title,
    "byArtist": {
      "@type": "MusicGroup",
      "name": album.artist
    },
    "numTracks": album.songs?.length || 0,
    "image": album.imageUrl,
    "url": `https://mavrixfy.site/album/${album._id}`,
    "datePublished": album.releaseYear
  }
});

export const generatePlaylistSEO = (playlist: Playlist) => ({
  title: `${playlist.name} - Playlist | Mavrixfy`,
  description: `Listen to ${playlist.name} playlist on Mavrixfy. ${playlist.songs?.length || 0} songs curated for you.`,
  keywords: `${playlist.name}, playlist, music collection, curated music, streaming`,
  image: playlist.imageUrl || 'https://mavrixfy.site/mavrixfy.png',
  url: `https://mavrixfy.site/playlist/${playlist._id}`,
  type: 'music.playlist' as const,
  schema: {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    "name": playlist.name,
    "description": playlist.description,
    "numTracks": playlist.songs?.length || 0,
    "image": playlist.imageUrl,
    "url": `https://mavrixfy.site/playlist/${playlist._id}`
  }
});

export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Mavrixfy",
  "url": "https://mavrixfy.site",
  "logo": "https://mavrixfy.site/mavrixfy.png",
  "description": "Stream millions of songs online with Mavrixfy. Create playlists, discover new music, and enjoy high-quality streaming.",
  "sameAs": [
    "https://twitter.com/mavrixfy",
    "https://facebook.com/mavrixfy",
    "https://instagram.com/mavrixfy"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@mavrixfy.site"
  }
});
