/// <reference types="vite/client" />

import axios from "axios";
// Avoid importing Firebase eagerly to keep initial bundle small
// We'll lazy-import inside the interceptor

// Get API URL from environment variables or fallback to default
const RAW_API_URL = (import.meta.env.VITE_API_URL || "").trim();

const hostname = window.location.hostname;
const isLocalhost =
	hostname === "localhost" ||
	hostname === "127.0.0.1" ||
	hostname === "::1";
const isProductionHost =
	hostname === "mavrixfy.site" ||
	hostname === "www.mavrixfy.site";
const isHostedDeployment = !isLocalhost;

const normalizeApiUrl = (value: string) => {
	if (!value) return value;
	if (value === "/api") return value;
	return value.endsWith("/api") ? value : value.replace(/\/+$/, "") + "/api";
};

// Force correct API URL for production
let FINAL_API_URL = RAW_API_URL;

// Resolve API URL robustly for local dev + hosted previews/PWA installs.
if (!RAW_API_URL) {
	FINAL_API_URL = isHostedDeployment ? "/api" : "http://localhost:5000/api";
} else if (isProductionHost) {
	if (RAW_API_URL.includes("localhost")) {
		// Safety guard: never use localhost API on production domain.
		FINAL_API_URL = "/api";
	} else if (/^https?:\/\/spotify-api-drab\.vercel\.app\/?api?$/i.test(RAW_API_URL)) {
		// Route production traffic through same-origin proxy to avoid browser CORS failures.
		FINAL_API_URL = "/api";
	}
}

FINAL_API_URL = normalizeApiUrl(FINAL_API_URL);

// Remove trailing slash and ensure proper formatting
const cleanApiUrl = FINAL_API_URL === "/api" ? FINAL_API_URL : FINAL_API_URL.replace(/\/+$/, '');

// Create and configure axios instance
const axiosInstance = axios.create({
	baseURL: cleanApiUrl,
	timeout: 20000,
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
			const { auth, waitForAuthReady } = await import('./firebase');
			await waitForAuthReady();
			if (auth.currentUser) {
				const token = await auth.currentUser.getIdToken();
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
			// API request failed
		} else {
			// For 404 errors, use mock data without logging
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
