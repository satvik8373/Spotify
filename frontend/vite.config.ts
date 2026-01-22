import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
	// Load environment variables
	const env = loadEnv(mode, process.cwd(), '');
	const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
	const cloudinaryName = env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'djqq8kba8';
	const cloudinaryPreset = env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'spotify_clone';
	const cloudinaryKey = env.REACT_APP_CLOUDINARY_API_KEY || '';
	const cloudinarySecret = env.REACT_APP_CLOUDINARY_API_SECRET || '';
	
	return {
		plugins: [
			react(),
			VitePWA({
				registerType: 'autoUpdate',
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif}'],
					// Exclude audio files from precaching
					globIgnores: ['**/*.{mp3,mp4,m4a,aac,ogg,wav,flac}'],
					runtimeCaching: [
						{
							urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
							handler: 'CacheFirst',
							options: {
								cacheName: 'cloudinary-images',
								expiration: {
									maxEntries: 100,
									maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
								},
							},
						},
						{
							urlPattern: /^https:\/\/api\.spotify\.com\/.*/i,
							handler: 'NetworkFirst',
							options: {
								cacheName: 'spotify-api',
								expiration: {
									maxEntries: 50,
									maxAgeSeconds: 60 * 60 * 5, // 5 hours
								},
							},
						},
						// Audio files - NetworkOnly (no caching for iOS compatibility)
						{
							urlPattern: /\.(mp3|mp4|m4a|aac|ogg|wav|flac)$/i,
							handler: 'NetworkOnly',
						},
						// JioSaavn CDN - NetworkOnly for audio
						{
							urlPattern: /^https:\/\/aac\.saavncdn\.com\/.*/i,
							handler: 'NetworkOnly',
						},
					],
				},
				manifest: {
					name: 'Mavrixfy',
					short_name: 'Mavrixfy',
					description: 'Discover, listen to, and organize music you love',
					theme_color: '#1db954',
					background_color: '#121212',
					display: 'standalone',
					orientation: 'portrait',
					scope: '/',
					start_url: '/',
					icons: [
						{
							src: '/spotify-icons/spotify-icon-maskable-192.png',
							sizes: '192x192',
							type: 'image/png',
							purpose: 'any maskable'
						},
						{
							src: '/spotify-icons/spotify-icon-maskable-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'any maskable'
						}
					],
					shortcuts: [
						{
							name: 'Liked Songs',
							short_name: 'Liked',
							description: 'View your liked songs',
							url: '/liked-songs',
							icons: [{ src: '/shortcut-liked-96.png', sizes: '96x96' }]
						},
						{
							name: 'Search',
							short_name: 'Search',
							description: 'Search for music',
							url: '/search',
							icons: [{ src: '/shortcut-search-96.png', sizes: '96x96' }]
						}
					]
				}
			}),
			compression({
				algorithms: ['gzip'],
				exclude: [/\.(br)$/, /\.(gz)$/],
			}),
			compression({
				algorithms: ['brotliCompress'],
				exclude: [/\.(br)$/, /\.(gz)$/],
			}),
		],
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
			minify: 'esbuild',
			cssCodeSplit: true,
			target: 'es2020',
			commonjsOptions: { transformMixedEsModules: true },
			rollupOptions: {
				output: {
					manualChunks: {
						// Core React libraries - highest priority
						vendor: [
							'react', 
							'react-dom', 
							'react-router-dom'
						],
						// State management - load early
						store: [
							'zustand'
						],
						// UI components - can be lazy loaded
						ui: [
							'@radix-ui/react-dialog',
							'@radix-ui/react-dropdown-menu',
							'@radix-ui/react-slider',
							'@radix-ui/react-tabs',
							'@radix-ui/react-scroll-area'
						],
						// Utilities - can be lazy loaded
						utils: [
							'lodash',
							'clsx',
							'class-variance-authority'
						],
						// Firebase - lazy load after initial render
						firebase: [
							'firebase/app',
							'firebase/auth',
							'firebase/firestore'
						],
						// Icons - lazy load
						icons: [
							'lucide-react'
						],
						// Audio libraries - lazy load
						audio: [
							'howler'
						],
						// Animation libraries - lazy load
						animation: [
							'framer-motion',
							'gsap'
						]
					},
					// Optimize chunk sizes for slow connections
					chunkFileNames: (chunkInfo) => {
						const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
						return `assets/js/[name]-[hash].js`;
					},
					assetFileNames: (assetInfo) => {
						const info = assetInfo.name.split('.');
						const ext = info[info.length - 1];
						if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
							return `assets/img/[name]-[hash][extname]`;
						}
						if (/css/i.test(ext)) {
							return `assets/css/[name]-[hash][extname]`;
						}
						return `assets/[name]-[hash][extname]`;
					}
				}
			},
			chunkSizeWarningLimit: 800, // Reduced for mobile optimization
			assetsInlineLimit: 1024, // Reduced to minimize initial bundle size
		},
		define: {
			'process.env.VITE_API_URL': JSON.stringify(apiUrl),
			'process.env.REACT_APP_CLOUDINARY_CLOUD_NAME': JSON.stringify(cloudinaryName),
			'process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(cloudinaryPreset),
			'process.env.REACT_APP_CLOUDINARY_API_KEY': JSON.stringify(cloudinaryKey),
			'process.env.REACT_APP_CLOUDINARY_API_SECRET': JSON.stringify(cloudinarySecret)
		},
		esbuild: {
			drop: ['console', 'debugger']
		}
	}
});
