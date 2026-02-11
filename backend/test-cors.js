// Test CORS configuration
// Run this after deployment to verify CORS is working

const testCORS = async () => {
  const API_URL = 'https://spotify-api-drab.vercel.app';
  const origins = [
    'https://mavrixfy.site',
    'https://www.mavrixfy.site'
  ];

  console.log('🧪 Testing CORS configuration...\n');

  for (const origin of origins) {
    console.log(`Testing origin: ${origin}`);
    
    try {
      const response = await fetch(`${API_URL}/api/otp/send`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      const allowMethods = response.headers.get('Access-Control-Allow-Methods');
      const allowCredentials = response.headers.get('Access-Control-Allow-Credentials');

      console.log(`  Status: ${response.status}`);
      console.log(`  Allow-Origin: ${allowOrigin}`);
      console.log(`  Allow-Methods: ${allowMethods}`);
      console.log(`  Allow-Credentials: ${allowCredentials}`);

      if (allowOrigin === origin || allowOrigin === '*') {
        console.log(`  ✅ CORS working for ${origin}\n`);
      } else {
        console.log(`  ❌ CORS NOT working for ${origin}`);
        console.log(`  Expected: ${origin}`);
        console.log(`  Got: ${allowOrigin}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('Testing root endpoint...');
  try {
    const response = await fetch(`${API_URL}/`);
    const data = await response.json();
    console.log('  ✅ API is responding');
    console.log(`  Environment: ${data.environment}`);
    console.log(`  Timestamp: ${data.timestamp}\n`);
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }
};

testCORS();
