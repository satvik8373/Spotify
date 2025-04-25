/// <reference types="vite/client" />

import axios from "axios";
import { getAccessToken } from "../services/auth.service";

// Type declaration for ImportMetaEnv to include VITE environment variables
interface ImportMetaEnv {
	VITE_API_URL?: string;
	MODE: string;
}

// Get API URL from environment variables or fallback to default
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create and configure axios instance
const axiosInstance = axios.create({
	baseURL: API_URL,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
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
		// Get token from local storage for each request
		const token = getAccessToken();
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
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
	async (error) => {
		// Handle 401 unauthorized
		if (error.response?.status === 401) {
			// Clear auth token
			setAuthToken(null);
			// Redirect to login if needed
			window.location.href = '/';
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;
