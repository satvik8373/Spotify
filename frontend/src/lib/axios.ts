/// <reference types="vite/client" />

import axios from "axios";
// Avoid importing Firebase eagerly to keep initial bundle small
// We'll lazy-import inside the interceptor

// Type declaration for ImportMetaEnv to include VITE environment variables
// Remove unused ImportMetaEnv interface to avoid warnings

// Get API URL from environment variables or fallback to default
const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const isLocalhost = /^(http(s)?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(RAW_API_URL);
const API_URL = isLocalhost ? RAW_API_URL : RAW_API_URL.replace(/^http:\/\//, 'https://');

// Determine if we're in production
const isProduction = window.location.hostname === 'mavrixfilms.live' || 
                     window.location.hostname === 'www.mavrixfilms.live';

// Use production API URL in production, localhost in development
const FINAL_API_URL = isProduction 
  ? (import.meta.env.VITE_API_URL || 'https://mavrixfilms.live')
  : "http://localhost:5000";

// Normalize base URL: remove trailing slash and trailing /api to avoid double /api when using path "/api/..."
let cleanApiUrl = FINAL_API_URL.trim();
cleanApiUrl = cleanApiUrl.replace(/\/+$/, ''); // strip trailing slashes
cleanApiUrl = cleanApiUrl.replace(/\/(api)$/, ''); // strip trailing /api if present

console.log('🌍 Environment:', isProduction ? 'Production' : 'Development');
console.log('🔗 API base URL:', cleanApiUrl);
console.log('📍 Current hostname:', window.location.hostname);
console.log('🔧 RAW_API_URL:', RAW_API_URL);
console.log('🔧 FINAL_API_URL:', FINAL_API_URL);
console.log('🔧 Normalized API URL:', cleanApiUrl);

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
