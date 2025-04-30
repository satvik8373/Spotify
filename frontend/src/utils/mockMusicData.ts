import { IndianSong } from '../stores/useMusicStore';

// Helper function to generate a placeholder image URL for a song
const generateSongImage = (index: number): string => {
  const colors = [
    "#1DB954", // Spotify green
    "#3D91F4", // Blue
    "#E13300", // Red
    "#FFA42B", // Orange
    "#8B2AC2"  // Purple
  ];
  
  const color = colors[index % colors.length];
  const bgColor = "#202020";
  
  return `data:image/svg+xml;base64,${btoa(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="300" fill="${bgColor}"/>
    <rect x="75" y="75" width="150" height="150" fill="${color}" rx="75" ry="75"/>
    <path d="M125 125L200 150L125 175Z" fill="#ffffff"/>
  </svg>`)}`;
};

// Mock data for trending songs
export const mockIndianTrendingSongs: IndianSong[] = Array.from({ length: 10 }, (_, i) => ({
  id: `trending-${i}`,
  title: `Trending Hit ${i + 1}`,
  artist: i % 2 === 0 ? 'Arijit Singh' : 'Shreya Ghoshal',
  album: `Trending Album ${i + 1}`,
  year: '2023',
  duration: '3:30',
  image: generateSongImage(i),
  url: ''
}));

// Mock data for Bollywood songs
export const mockBollywoodSongs: IndianSong[] = Array.from({ length: 15 }, (_, i) => ({
  id: `bollywood-${i}`,
  title: `Bollywood Hit ${i + 1}`,
  artist: i % 3 === 0 ? 'Arijit Singh' : i % 3 === 1 ? 'Shreya Ghoshal' : 'Sonu Nigam',
  album: `Bollywood Album ${i + 1}`,
  year: '2023',
  duration: '4:15',
  image: generateSongImage(i + 10),
  url: ''
}));

// Mock data for Hollywood songs
export const mockHollywoodSongs: IndianSong[] = Array.from({ length: 15 }, (_, i) => ({
  id: `hollywood-${i}`,
  title: `International Hit ${i + 1}`,
  artist: i % 3 === 0 ? 'Ed Sheeran' : i % 3 === 1 ? 'Taylor Swift' : 'The Weeknd',
  album: `International Album ${i + 1}`,
  year: '2023',
  duration: '3:45',
  image: generateSongImage(i + 25),
  url: ''
}));

// Mock data for new releases
export const mockIndianNewReleases: IndianSong[] = Array.from({ length: 10 }, (_, i) => ({
  id: `new-release-${i}`,
  title: `New Release ${i + 1}`,
  artist: i % 4 === 0 ? 'Arijit Singh' : i % 4 === 1 ? 'Shreya Ghoshal' : i % 4 === 2 ? 'Badshah' : 'Neha Kakkar',
  album: `Fresh Album ${i + 1}`,
  year: '2023',
  duration: '3:20',
  image: generateSongImage(i + 40),
  url: ''
}));

// Mock data for Hindi songs
export const mockHindiSongs: IndianSong[] = Array.from({ length: 15 }, (_, i) => ({
  id: `hindi-${i}`,
  title: `Hindi Top Song ${i + 1}`,
  artist: i % 5 === 0 ? 'Arijit Singh' : i % 5 === 1 ? 'Shreya Ghoshal' : i % 5 === 2 ? 'Kumar Sanu' : i % 5 === 3 ? 'Lata Mangeshkar' : 'Kishore Kumar',
  album: `Hindi Album ${i + 1}`,
  year: i % 2 === 0 ? '2023' : '2022',
  duration: '4:00',
  image: generateSongImage(i + 55),
  url: ''
}));

// Mock data for official trending songs
export const mockOfficialTrendingSongs: IndianSong[] = Array.from({ length: 15 }, (_, i) => ({
  id: `official-trending-${i}`,
  title: `Official Trending ${i + 1}`,
  artist: i % 3 === 0 ? 'Diljit Dosanjh' : i % 3 === 1 ? 'Guru Randhawa' : 'Honey Singh',
  album: `Official Album ${i + 1}`,
  year: '2023',
  duration: '3:50',
  image: generateSongImage(i + 70),
  url: ''
}));

// Mock search results
export const generateMockSearchResults = (query: string): IndianSong[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `search-${i}`,
    title: `${query} Result ${i + 1}`,
    artist: i % 3 === 0 ? 'Arijit Singh' : i % 3 === 1 ? 'A.R. Rahman' : 'Shreya Ghoshal',
    album: `${query} Album ${i + 1}`,
    year: '2023',
    duration: '3:45',
    image: generateSongImage(i + 85),
    url: ''
  }));
}; 