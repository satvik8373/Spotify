import { Router } from "express";
import axios from "axios";
import * as jiosaavnService from "../services/jiosaavn.service.js";
import * as spotifyService from "../services/spotify.service.js";

const router = Router();

// Base URL for JioSaavn API
const JIOSAAVN_API_BASE_URL = "https://saavn.dev/api";

// Helper function to get Spotify token
const getSpotifyToken = async () => {
  try {
    const tokenData = await spotifyService.getAccessToken(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET);
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    return null;
  }
};

// Endpoint to search from both platforms
router.get("/search/all", async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }
    
    // Search from JioSaavn
    let jiosaavnResults = [];
    try {
      const jiosaavnData = await jiosaavnService.searchSongs(query, limit);
      if (jiosaavnData.data && jiosaavnData.data.results) {
        jiosaavnResults = jiosaavnData.data.results
          .filter(item => item.downloadUrl && item.downloadUrl.length > 0)
          .map(jiosaavnService.formatSongData);
      }
    } catch (error) {
      console.error("Error fetching from JioSaavn:", error);
    }
    
    // Search from Spotify
    let spotifyResults = [];
    try {
      const token = await getSpotifyToken();
      if (token) {
        const spotifyData = await spotifyService.search(token, query, "track", limit);
        if (spotifyData && spotifyData.tracks && spotifyData.tracks.items) {
          spotifyResults = spotifyData.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(", "),
            album: track.album.name,
            year: track.album.release_date ? track.album.release_date.substring(0, 4) : "",
            duration: Math.floor(track.duration_ms / 1000),
            image: track.album.images.length > 0 ? track.album.images[1].url : "",
            preview_url: track.preview_url,
            source: "spotify"
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching from Spotify:", error);
    }
    
    // Combine results
    const results = {
      jiosaavn: jiosaavnResults,
      spotify: spotifyResults,
      combined: [...jiosaavnResults, ...spotifyResults]
    };
    
    res.json({ results });
  } catch (error) {
    console.error("Error searching songs:", error);
    res.status(500).json({ message: "Failed to search songs" });
  }
});

// Proxy endpoint for JioSaavn search
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error searching songs:", error);
    res.status(500).json({ message: "Failed to search songs" });
  }
});

// Get trending songs from both platforms
router.get("/trending/all", async (req, res) => {
  try {
    const limit = req.query.limit || 15;
    
    // Get trending from JioSaavn
    let jiosaavnResults = [];
    try {
      const jiosaavnData = await jiosaavnService.getTrendingSongs(limit);
      if (jiosaavnData.data && jiosaavnData.data.results) {
        jiosaavnResults = jiosaavnData.data.results
          .filter(item => item.downloadUrl && item.downloadUrl.length > 0)
          .map(jiosaavnService.formatSongData);
      }
    } catch (error) {
      console.error("Error fetching trending from JioSaavn:", error);
    }
    
    // Get trending from Spotify
    let spotifyResults = [];
    try {
      const token = await getSpotifyToken();
      if (token) {
        // Spotify doesn't have a direct trending endpoint, so we use country-specific top tracks
        const spotifyData = await axios.get(`https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (spotifyData.data && spotifyData.data.tracks && spotifyData.data.tracks.items) {
          spotifyResults = spotifyData.data.tracks.items
            .slice(0, limit)
            .map(item => ({
              id: item.track.id,
              title: item.track.name,
              artist: item.track.artists.map(artist => artist.name).join(", "),
              album: item.track.album.name,
              year: item.track.album.release_date ? item.track.album.release_date.substring(0, 4) : "",
              duration: Math.floor(item.track.duration_ms / 1000),
              image: item.track.album.images.length > 0 ? item.track.album.images[1].url : "",
              preview_url: item.track.preview_url,
              source: "spotify"
            }));
        }
      }
    } catch (error) {
      console.error("Error fetching trending from Spotify:", error);
    }
    
    // Combine results
    const results = {
      jiosaavn: jiosaavnResults,
      spotify: spotifyResults,
      combined: [...jiosaavnResults, ...spotifyResults]
    };
    
    res.json({ results });
  } catch (error) {
    console.error("Error fetching trending songs:", error);
    res.status(500).json({ message: "Failed to fetch trending songs" });
  }
});

// Get new releases from both platforms
router.get("/new-releases/all", async (req, res) => {
  try {
    const limit = req.query.limit || 15;
    
    // Get new releases from JioSaavn
    let jiosaavnResults = [];
    try {
      const jiosaavnData = await jiosaavnService.getNewReleases(limit);
      if (jiosaavnData.data && jiosaavnData.data.results) {
        jiosaavnResults = jiosaavnData.data.results
          .filter(item => item.downloadUrl && item.downloadUrl.length > 0)
          .map(jiosaavnService.formatSongData);
      }
    } catch (error) {
      console.error("Error fetching new releases from JioSaavn:", error);
    }
    
    // Get new releases from Spotify
    let spotifyResults = [];
    try {
      const token = await getSpotifyToken();
      if (token) {
        const spotifyData = await axios.get(`https://api.spotify.com/v1/browse/new-releases`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            limit: limit,
            country: 'US'
          }
        });
        
        if (spotifyData.data && spotifyData.data.albums && spotifyData.data.albums.items) {
          const albumIds = spotifyData.data.albums.items.map(album => album.id);
          
          // For each album, get one track to represent it
          const trackPromises = albumIds.map(async (albumId) => {
            try {
              const albumTracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                params: {
                  limit: 1
                }
              });
              
              if (albumTracksResponse.data && albumTracksResponse.data.items && albumTracksResponse.data.items.length > 0) {
                const album = spotifyData.data.albums.items.find(a => a.id === albumId);
                const track = albumTracksResponse.data.items[0];
                
                return {
                  id: track.id,
                  title: track.name,
                  artist: track.artists.map(artist => artist.name).join(", "),
                  album: album.name,
                  year: album.release_date ? album.release_date.substring(0, 4) : "",
                  duration: Math.floor(track.duration_ms / 1000),
                  image: album.images.length > 0 ? album.images[1].url : "",
                  preview_url: track.preview_url,
                  source: "spotify"
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching tracks for album ${albumId}:`, error);
              return null;
            }
          });
          
          const tracks = await Promise.all(trackPromises);
          spotifyResults = tracks.filter(track => track !== null);
        }
      }
    } catch (error) {
      console.error("Error fetching new releases from Spotify:", error);
    }
    
    // Combine results
    const results = {
      jiosaavn: jiosaavnResults,
      spotify: spotifyResults,
      combined: [...jiosaavnResults, ...spotifyResults]
    };
    
    res.json({ results });
  } catch (error) {
    console.error("Error fetching new releases:", error);
    res.status(500).json({ message: "Failed to fetch new releases" });
  }
});

// Proxy endpoint for bollywood songs
router.get("/bollywood", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=bollywood%20hits&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching bollywood songs:", error);
    res.status(500).json({ message: "Failed to fetch bollywood songs" });
  }
});

// Proxy endpoint for hollywood/english songs
router.get("/hollywood", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=english%20top%20hits&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching hollywood songs:", error);
    res.status(500).json({ message: "Failed to fetch hollywood songs" });
  }
});

// Proxy endpoint for official trending songs
router.get("/trending", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=trending%20songs&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching trending songs:", error);
    res.status(500).json({ message: "Failed to fetch trending songs" });
  }
});

// Proxy endpoint for trending Hindi songs
router.get("/hindi", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=hindi%20top%20songs&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching hindi songs:", error);
    res.status(500).json({ message: "Failed to fetch hindi songs" });
  }
});

// Proxy endpoint for song details
router.get("/songs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Song ID is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/songs?id=${id}`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching song details:", error);
    res.status(500).json({ message: "Failed to fetch song details" });
  }
});

// Proxy endpoint for lyrics
router.get("/lyrics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Song ID is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/lyrics?id=${id}`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    res.status(500).json({ message: "Failed to fetch lyrics" });
  }
});

// Proxy endpoint for albums
router.get("/albums/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Album ID is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/albums?id=${id}`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching album details:", error);
    res.status(500).json({ message: "Failed to fetch album details" });
  }
});

// Get song details from both platforms (if available)
router.get("/song-details/:source/:id", async (req, res) => {
  try {
    const { source, id } = req.params;
    
    if (!id || !source) {
      return res.status(400).json({ message: "Source and ID parameters are required" });
    }
    
    let result = null;
    
    if (source.toLowerCase() === 'jiosaavn') {
      const data = await jiosaavnService.getSongDetails(id);
      if (data && data.data) {
        result = jiosaavnService.formatSongData(data.data);
      }
    } else if (source.toLowerCase() === 'spotify') {
      const token = await getSpotifyToken();
      if (token) {
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const track = response.data;
        result = {
          id: track.id,
          title: track.name,
          artist: track.artists.map(artist => artist.name).join(", "),
          album: track.album.name,
          year: track.album.release_date ? track.album.release_date.substring(0, 4) : "",
          duration: Math.floor(track.duration_ms / 1000),
          image: track.album.images.length > 0 ? track.album.images[1].url : "",
          preview_url: track.preview_url,
          source: "spotify"
        };
      }
    }
    
    if (result) {
      res.json({ song: result });
    } else {
      res.status(404).json({ message: "Song not found" });
    }
  } catch (error) {
    console.error("Error fetching song details:", error);
    res.status(500).json({ message: "Failed to fetch song details" });
  }
});

export default router; 