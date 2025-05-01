import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import compression from "vite-plugin-compression";

export default defineConfig(({ mode }) => {
	// Load environment variables
	const env = loadEnv(mode, process.cwd(), '');
	const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
	const cloudinaryName = env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'djqq8kba8';
	const cloudinaryPreset = env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'spotify_clone';
	const cloudinaryKey = env.REACT_APP_CLOUDINARY_API_KEY || '';
	const cloudinarySecret = env.REACT_APP_CLOUDINARY_API_SECRET || '';
	
	console.log(`Mode: ${mode}`);
	console.log(`API URL: ${apiUrl}`);
	console.log(`Cloudinary Cloud Name: ${cloudinaryName}`);
	
	return {
		plugins: [
			react(),
			compression({
				algorithm: 'gzip',
				ext: '.gz',
			}),
			compression({
				algorithm: 'brotliCompress',
				ext: '.br',
			}),
			// Add bundle analyzer in build mode
			mode === 'production' && visualizer({
				open: false,
				gzipSize: true,
				brotliSize: true,
				filename: 'dist/stats.html',
			}),
		].filter(Boolean),
		base: '/',
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		server: {
			port: 3000,
			hmr: {
				overlay: false,
			},
			proxy: {
				'/api': {
					target: apiUrl,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, '')
				}
			}
		},
		preview: {
			port: 3000,
			proxy: {
				'/api': {
					target: apiUrl,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, '')
				}
			}
		},
		build: {
			outDir: "dist",
			assetsDir: "assets",
			sourcemap: false,
			// Increase size limit warnings to avoid noise
			chunkSizeWarningLimit: 1000,
			minify: 'terser',
			terserOptions: {
				compress: {
					drop_console: true,
					drop_debugger: true,
				},
			},
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// Create specific chunks for major libraries
						if (id.includes('node_modules')) {
							// React ecosystem
							if (id.includes('react') || id.includes('scheduler') || id.includes('jsx')) {
								return 'vendor-react';
							}

							// UI libraries
							if (id.includes('@radix-ui') || id.includes('@mui') || id.includes('lucide')) {
								return 'vendor-ui';
							}

							// State management
							if (id.includes('zustand') || id.includes('redux')) {
								return 'vendor-state';
							}

							// External utilities
							if (id.includes('lodash') || id.includes('axios') || id.includes('socket.io')) {
								return 'vendor-utils';
							}

							// Remainder of node_modules
							return 'vendor-others';
						}

						// Split app code by feature
						if (id.includes('/src/pages/')) {
							// Group similar pages together
							if (id.includes('/pages/home/')) {
								return 'page-home';
							}
							if (id.includes('/pages/search/')) {
								return 'page-search';
							}
							if (id.includes('/pages/playlist/')) {
								return 'page-playlist';
							}
							if (id.includes('/pages/album/')) {
								return 'page-album';
							}
							if (id.includes('/pages/liked-songs/')) {
								return 'page-liked-songs';
							}
							// All other pages
							return 'pages-other';
						}

						// Group services, stores, and contexts
						if (id.includes('/src/services/') || id.includes('/src/stores/') || id.includes('/src/contexts/')) {
							return 'app-core';
						}

						// Group by component type
						if (id.includes('/src/components/')) {
							if (id.includes('/components/layout/') || id.includes('/layout/')) {
								return 'ui-layout';
							}
							return 'ui-components';
						}
					}
				}
			}
		},
		define: {
			'process.env.VITE_API_URL': JSON.stringify(apiUrl),
			'process.env.REACT_APP_CLOUDINARY_CLOUD_NAME': JSON.stringify(cloudinaryName),
			'process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(cloudinaryPreset),
			'process.env.REACT_APP_CLOUDINARY_API_KEY': JSON.stringify(cloudinaryKey),
			'process.env.REACT_APP_CLOUDINARY_API_SECRET': JSON.stringify(cloudinarySecret)
		}
	}
});
