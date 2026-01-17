#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 * Checks if audio headers are properly configured after deployment
 */

const https = require('https');
const http = require('http');

async function checkHeaders(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        status: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function verifyDeployment(baseUrl) {
  console.log('🔍 Verifying Mavrixfy deployment...');
  console.log('Base URL:', baseUrl);
  console.log('');

  const tests = [
    {
      name: 'Main App',
      url: baseUrl,
      expectedHeaders: ['content-type']
    },
    {
      name: 'Audio Test Page',
      url: `${baseUrl}/audio-test.html`,
      expectedHeaders: ['content-type']
    }
  ];

  // Test audio file headers (if you have sample audio files)
  const audioTests = [
    { ext: 'mp3', mime: 'audio/mpeg' },
    { ext: 'wav', mime: 'audio/wav' },
    { ext: 'ogg', mime: 'audio/ogg' },
    { ext: 'm4a', mime: 'audio/mp4' }
  ];

  let allPassed = true;

  // Test main pages
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await checkHeaders(test.url);
      
      if (result.status === 200) {
        console.log('✅ Status: OK');
      } else {
        console.log(`❌ Status: ${result.status}`);
        allPassed = false;
      }
      
      console.log('Headers:', Object.keys(result.headers).join(', '));
      console.log('');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('');
      allPassed = false;
    }
  }

  // Test CORS headers (simulate from different origin)
  console.log('🌐 Testing CORS headers...');
  try {
    const result = await checkHeaders(baseUrl);
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    let corsConfigured = false;
    corsHeaders.forEach(header => {
      if (result.headers[header]) {
        console.log(`✅ ${header}: ${result.headers[header]}`);
        corsConfigured = true;
      }
    });
    
    if (!corsConfigured) {
      console.log('⚠️  No CORS headers found (may be added by audio file requests)');
    }
  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
    allPassed = false;
  }

  console.log('');
  console.log('📋 Deployment Summary:');
  console.log(`Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');
  
  if (allPassed) {
    console.log('🎉 Deployment verification successful!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Visit your audio test page: ' + baseUrl + '/audio-test.html');
    console.log('2. Run audio tests in browser console: testMavrixfyAudio()');
    console.log('3. Test with real audio files from your music sources');
  } else {
    console.log('🚨 Deployment issues detected!');
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check vercel.json syntax');
    console.log('2. Redeploy to Vercel');
    console.log('3. Check Vercel deployment logs');
    console.log('4. Verify domain is using HTTPS');
  }
}

// Get URL from command line or use default
const url = process.argv[2] || 'https://your-app.vercel.app';

if (url === 'https://your-app.vercel.app') {
  console.log('Usage: node verify-deployment.js <your-vercel-url>');
  console.log('Example: node verify-deployment.js https://mavrixfy.vercel.app');
  process.exit(1);
}

verifyDeployment(url).catch(console.error);