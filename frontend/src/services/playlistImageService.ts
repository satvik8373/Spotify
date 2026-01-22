import { Song } from '@/types';

/**
 * Creates a 4-grid collage image from song cover arts
 * Similar to how Spotify generates playlist covers automatically
 */
export const createPlaylistCoverCollage = async (songs: Song[]): Promise<string> => {
  // If there are no songs, return a default image
  if (!songs || songs.length === 0) {
    return '/default-playlist.jpg';
  }

  // Take up to 4 songs for the grid
  const gridSongs = songs.slice(0, 4);
  
  // If we have less than 4 songs, duplicate the last one to fill the grid
  while (gridSongs.length < 4) {
    gridSongs.push(gridSongs[gridSongs.length - 1] || songs[0]);
  }

  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '/default-playlist.jpg';
  }

  try {
    // Load all images first to ensure they're ready
    const imagePromises = gridSongs.map((song) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS
        
        img.onload = () => resolve(img);
        img.onerror = () => {
          // If image fails to load, use a fallback
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = reject;
          fallbackImg.src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
        };
        
        img.src = song.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
      });
    });

    // Wait for all images to load
    const images = await Promise.all(imagePromises);

    // Draw each image in its quadrant
    const positions = [
      { x: 0, y: 0 },       // Top left
      { x: 300, y: 0 },     // Top right
      { x: 0, y: 300 },     // Bottom left
      { x: 300, y: 300 }    // Bottom right
    ];

    // Draw each image in its position
    images.forEach((img, index) => {
      const pos = positions[index];
      ctx.drawImage(img, pos.x, pos.y, 300, 300);
    });

    // Add a slight shadow overlay for contrast to make the eventual text more visible
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    return canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller size
  } catch (error) {
    return '/default-playlist.jpg';
  }
};

/**
 * Creates a single dominant color image from the most common color in song covers
 * Alternative to the grid collage for a more minimalist look
 */
export const createDominantColorCover = async (songs: Song[]): Promise<string> => {
  // If there are no songs, return a default image
  if (!songs || songs.length === 0) {
    return '/default-playlist.jpg';
  }

  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '/default-playlist.jpg';
  }

  try {
    // Take up to 4 songs to analyze their dominant colors
    const analyzeSongs = songs.slice(0, 4);
    
    // Load all images first to ensure they're ready
    const imagePromises = analyzeSongs.map((song) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS
        
        img.onload = () => resolve(img);
        img.onerror = () => {
          // If image fails to load, use a fallback
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = reject;
          fallbackImg.src = 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
        };
        
        img.src = song.imageUrl || 'https://cdn.iconscout.com/icon/free/png-256/free-music-1779799-1513951.png';
      });
    });

    // Wait for all images to load
    const images = await Promise.all(imagePromises);

    // Get dominant color from each image
    const dominantColors = images.map((img) => {
      // Draw the image on a small canvas to get color data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 50; // Reduced size for faster processing
      tempCanvas.height = 50;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return { r: 30, g: 215, b: 96 }; // Spotify green as fallback
      
      tempCtx.drawImage(img, 0, 0, 50, 50);
      
      // Get color data from the canvas
      const imageData = tempCtx.getImageData(0, 0, 50, 50).data;
      
      // Calculate average color
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }
      
      return {
        r: Math.floor(r / count),
        g: Math.floor(g / count),
        b: Math.floor(b / count)
      };
    });

    // Create gradient using dominant colors
    if (dominantColors.length > 0) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      
      dominantColors.forEach((color, index) => {
        gradient.addColorStop(index / (dominantColors.length - 1 || 1), `rgb(${color.r}, ${color.g}, ${color.b})`);
      });
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Fallback if no colors
      ctx.fillStyle = 'rgb(30, 215, 96)'; // Spotify green
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Add a subtle pattern overlay for texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < canvas.width; i += 20) {
      for (let j = 0; j < canvas.height; j += 20) {
        if ((i + j) % 40 === 0) {
          ctx.fillRect(i, j, 10, 10);
        }
      }
    }

    // Convert canvas to data URL
    return canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller size
  } catch (error) {
    return '/default-playlist.jpg';
  }
}; 