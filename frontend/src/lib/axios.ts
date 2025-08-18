/// <reference types="vite/client" />

import axios from "axios";
import { auth } from "./firebase";

// Type declaration for ImportMetaEnv to include VITE environment variables
//

// Get API URL from environment variables or fallback to default
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create and configure axios instance
const axiosInstance = axios.create({
	baseURL: API_URL,
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
		// Get token from Firebase for each request
		if (auth.currentUser) {
			try {
				const token = await auth.currentUser.getIdToken(true);
				config.headers.Authorization = `Bearer ${token}`;
			} catch (error) {
				// Suppress token errors when offline to reduce console noise
				if (typeof navigator === 'undefined' || navigator.onLine) {
					console.error('Error getting Firebase ID token:', error);
				}
			}
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
		// Suppress most logs when offline
		const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
		if (!isOffline) {
			// Log errors only when not 404 to reduce console noise
			if (error.response?.status !== 404) {
				console.error('API request failed:', error.config?.url, error.message);
			}
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
