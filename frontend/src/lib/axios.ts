/// <reference types="vite/client" />

import axios from "axios";

export const axiosInstance = axios.create({
	baseURL: import.meta.env.MODE === "development" 
		? "http://localhost:5000/api" 
		: "https://spotify-6ii0e5rf2-satvik8373s-projects.vercel.app/api",
});
