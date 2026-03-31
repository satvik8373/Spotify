/// <reference types="vite/client" />

import axios from "axios";
import { resolveApiBaseUrl } from "./apiUrl";
// Avoid importing Firebase eagerly to keep initial bundle small
// We'll lazy-import inside the interceptor

const FINAL_API_URL = resolveApiBaseUrl();

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
