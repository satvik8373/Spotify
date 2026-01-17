/// <reference types="vite/client" />

import axios from "axios";
// Avoid importing Firebase eagerly to keep initial bundle small
// We'll lazy-import inside the interceptor

// Get API URL from environment variables or fallback to default
const RAW_API_URL = import.meta.env.VITE_API_URL || "";

// Determine if we're in production
const isProduction = window.location.hostname === 'mavrixfy.site' || 
                     window.location.hostname === 'www.mavrixfy.site';

// Force correct API URL for production
let FINAL_API_URL = RAW_API_URL;

// If no explicit API URL is set, or if we're in production, ensure correct URL
if (!RAW_API_URL || isProduction) {
  FINAL_API_URL = isProduction 
    ? 'https://spotify-api-drab.vercel.app/api' 
    : 'http://localhost:5000/api';
}

// Ensure API URL has /api suffix
if (!FINAL_API_URL.endsWith('/api')) {
  // If it's the production backend URL without /api, add it
  if (FINAL_API_URL.includes('spotify-api-drab.vercel.app') || FINAL_API_URL.includes('vercel.app')) {
    FINAL_API_URL = FINAL_API_URL.replace(/\/?$/, '/api');
  } else if (!FINAL_API_URL.includes('/api')) {
    FINAL_API_URL = FINAL_API_URL.replace(/\/?$/, '/api');
  }
}

// Remove trailing slash and ensure proper formatting
const cleanApiUrl = FINAL_API_URL.replace(/\/+$/, '');

console.log('🌍 Environment:', isProduction ? 'Production' : 'Development');
console.log('🔧 RAW_API_URL:', RAW_API_URL || '(not set)');
console.log('🔗 API base URL:', cleanApiUrl);
console.log('📍 Current hostname:', window.location.hostname);

// Create and configure axios instance
const axiosInstance = axios.create({
	baseURL: cleanApiUrl,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true
});

// Function to set auth token for requests
export const setAuthToken = (token: string | null) => {
	if (token) {
		axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
	} else {
		delete axiosInstance.defaults.headers.common["Authorization"];
	}
};

// Add request interceptor
axiosInstance.interceptors.request.use(
	async (config) => {
		// Get token from Firebase for each request (lazy import to avoid eager Firebase load)
		try {
			const { auth } = await import('./firebase');
			if (auth.currentUser) {
				const token = await auth.currentUser.getIdToken(true);
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (error) {
			// Ignore token retrieval errors silently
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor
axiosInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// Log errors only when not 404 to reduce console noise
		if (error.response?.status !== 404) {
			console.error('API request failed:', error.config?.url, error.message);
		} else {
			// For 404 errors, log a more concise message without the full error stack
			console.info(`API endpoint not found: ${error.config?.url} - Using mock data`);
		}
		
		// Handle 401 unauthorized
		if (error.response?.status === 401) {
			// Clear auth token
			setAuthToken(null);
			// Redirect to login if needed
			window.location.href = '/login';
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;
