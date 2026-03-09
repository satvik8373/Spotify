/**
 * Test script to verify Vercel deployment
 * Run: node test-vercel-deployment.js
 */

const BASE_URL = 'https://spotify-api-drab.vercel.app';

async function testEndpoint(url, options = {}) {
  try {
    console.log(`\n🔍 Testing: ${url}`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Failed (${response.status})`);
      console.log('Error:', JSON.stringify(data, null, 2));
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Vercel Deployment\n');
  console.log('=' .repeat(50));
  
  // Test 1: Root endpoint
  await testEndpoint(`${BASE_URL}/`);
  
  // Test 2: Health check (if exists)
  await testEndpoint(`${BASE_URL}/api/test/health`);
  
  // Test 3: Mood credit status (requires auth - will fail without token)
  console.log('\n⚠️  The following test requires authentication:');
  await testEndpoint(`${BASE_URL}/api/playlists/mood-credit-status`, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN_HERE'
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📝 Notes:');
  console.log('- If root endpoint works, CORS is configured correctly');
  console.log('- If you see Firebase errors, check environment variables');
  console.log('- For authenticated endpoints, replace YOUR_TOKEN_HERE with a real Firebase token');
  console.log('\n✨ Check Vercel logs for detailed error messages:');
  console.log('   https://vercel.com/dashboard → Your Project → Logs\n');
}

runTests();
