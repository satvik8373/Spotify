import axios from 'axios';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// Scopes for Google API access
const SCOPES = [
  'profile',
  'email',
  'https://www.googleapis.com/auth/youtube.readonly'
];

// Generate a random state for security
const generateRandomState = () => {
  const array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
};

// Get Google authorization URL
export const getGoogleAuthUrl = () => {
  const state = generateRandomState();
  localStorage.setItem('oauth_state', state);

  // Use the correct redirect URI based on the environment
  const redirectUri = import.meta.env.PROD 
    ? 'https://mavrixfilms.live/auth/callback'
    : 'http://localhost:3000/auth/callback';

  console.log('Using redirect URI:', redirectUri); // Debug log

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  console.log('Generated auth URL:', authUrl); // Debug log
  return authUrl;
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (code: string) => {
  try {
    // Use the correct redirect URI based on the environment
    const redirectUri = import.meta.env.PROD 
      ? 'https://mavrixfilms.live/auth/callback'
      : 'http://localhost:3000/auth/callback';

    console.log('Using redirect URI for token exchange:', redirectUri); // Debug log

    const response = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, id_token } = response.data;
    
    // Store tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('id_token', id_token);
    
    return response.data;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
    throw error;
  }
};

// Get user info from Google
export const getUserInfo = async (accessToken: string) => {
  try {
    const response = await axios.get(GOOGLE_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
};

// Refresh access token
export const refreshAccessToken = async () => {
  try {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) throw new Error('No refresh token available');

    const response = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token'
    });

    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

// Logout user
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('id_token');
  window.location.href = '/';
};

// Get current access token
export const getAccessToken = () => {
  return localStorage.getItem('access_token');
}; 