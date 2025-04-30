// Re-export mock Indian songs data from mockMusicData.ts
export {
  mockIndianTrendingSongs,
  mockBollywoodSongs,
  mockHollywoodSongs,
  mockIndianNewReleases,
  mockHindiSongs,
  mockOfficialTrendingSongs,
} from './mockMusicData';

// Export mockTrendingSongs as an alias for mockIndianTrendingSongs
import { mockIndianTrendingSongs as mockTrendingSongs } from './mockMusicData';
// Export mockNewReleases as an alias for mockIndianNewReleases
import { mockIndianNewReleases as mockNewReleases } from './mockMusicData';
export { mockTrendingSongs, mockNewReleases };

// Re-export the search results function or create a static version
import { generateMockSearchResults } from './mockMusicData';
export const mockSearchResults = generateMockSearchResults('default'); 