/**
 * Extract Firebase Private Key for Vercel
 * This script reads the firebase-service-account.json and outputs the private key
 * in the correct format for Vercel environment variables
 * 
 * Usage: node extract-firebase-key.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

try {
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ firebase-service-account.json not found');
    console.error('   Expected location:', serviceAccountPath);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  console.log('\n🔑 Firebase Credentials for Vercel\n');
  console.log('=' .repeat(70));
  console.log('\n📋 Copy these values to Vercel Environment Variables:\n');
  
  console.log('1️⃣  FIREBASE_PROJECT_ID');
  console.log('   Value:', serviceAccount.project_id);
  console.log('');
  
  console.log('2️⃣  FIREBASE_CLIENT_EMAIL');
  console.log('   Value:', serviceAccount.client_email);
  console.log('');
  
  console.log('3️⃣  FIREBASE_PRIVATE_KEY');
  console.log('   Value (copy everything below):');
  console.log('   ----------------------------------------');
  console.log(serviceAccount.private_key);
  console.log('   ----------------------------------------');
  console.log('');
  
  console.log('=' .repeat(70));
  console.log('\n✅ Instructions:');
  console.log('1. Go to: https://vercel.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to: Settings → Environment Variables');
  console.log('4. Add each variable above');
  console.log('5. For FIREBASE_PRIVATE_KEY, copy the ENTIRE key including:');
  console.log('   -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
  console.log('6. Redeploy your project\n');

  // Also save to a file for easy reference
  const outputPath = path.join(__dirname, 'vercel-env-values.txt');
  const output = `
FIREBASE_PROJECT_ID=${serviceAccount.project_id}

FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}

FIREBASE_PRIVATE_KEY=${serviceAccount.private_key}
`;
  
  fs.writeFileSync(outputPath, output);
  console.log('💾 Values also saved to:', outputPath);
  console.log('   (You can copy from this file)\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
