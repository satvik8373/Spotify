import axios from 'axios';

const JIOSAAVN_API_BASE_URL = 'https://saavn.sumit.co/api';

async function testJioSaavn() {
  console.log('\n=== Testing JioSaavn API ===\n');
  
  try {
    console.log('1. Testing search for "happy songs"...');
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query: 'happy songs',
        page: 1,
        limit: 5
      },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response data structure:', Object.keys(response.data));
    
    if (response.data && response.data.data && response.data.data.results) {
      const songs = response.data.data.results;
      console.log(`\nFound ${songs.length} songs\n`);
      
      if (songs.length > 0) {
        const firstSong = songs[0];
        console.log('First song structure:');
        console.log(JSON.stringify(firstSong, null, 2));
        
        console.log('\n=== Key Fields ===');
        console.log('ID:', firstSong.id);
        console.log('Name:', firstSong.name);
        console.log('Artist:', firstSong.primaryArtists);
        console.log('Duration:', firstSong.duration);
        console.log('Image:', firstSong.image);
        console.log('Download URLs:', firstSong.downloadUrl);
      }
    } else {
      console.log('Unexpected response structure:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing JioSaavn:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n=== Test Complete ===\n');
}

testJioSaavn();
