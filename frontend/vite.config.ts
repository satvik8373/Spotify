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
	
	console.log(`Mode: ${mode}`);
	console.log(`API URL: ${apiUrl}`);
	console.log(`Cloudinary Cloud Name: ${cloudinaryName}`);
	
	return {
		plugins: [
			react(),
			VitePWA({
				registerType: 'autoUpdate',
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif}'],
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
						{
							urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
							handler: 'CacheFirst',
							options: {
								cacheName: 'google-fonts',
								expiration: {
									maxEntries: 10,
									maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
								},
							},
						},
					],
				},
				manifest: {
					name: 'Mavrixfy',
					short_name: 'Music App',
					description: 'Discover, listen to, and organize music you love',
					theme_color: '#1db954',
					background_color: '#121212',
					display: 'standalone',
					orientation: 'portrait',
					scope: '/',
					start_url: '/',
					icons: [
						{
							src: '/spotify-icons/spotify-icon-192.png',
							sizes: '192x192',
							type: 'image/png',
							purpose: 'any maskable'
						},
						{
							src: '/spotify-icons/spotify-icon-512.png',
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
			minify: 'terser',
			terserOptions: {
				compress: {
					drop_console: mode === 'production',
					drop_debugger: mode === 'production',
					pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
					passes: 2,
				},
				mangle: {
					toplevel: true,
				},
			},
			cssCodeSplit: true,
			modulePreload: { polyfill: true },
			target: 'es2018',
			commonjsOptions: { transformMixedEsModules: true },
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// Core React and routing
						if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
							return 'react-core';
						}
						
						// State management
						if (id.includes('zustand')) {
							return 'state';
						}
						
						// UI components
						if (id.includes('@radix-ui')) {
							return 'ui-components';
						}
						
						// Icons
						if (id.includes('lucide-react') || id.includes('createLucideIcon')) {
							return 'icons';
						}
						
						// Utilities
						if (id.includes('clsx') || id.includes('tailwind-merge')) {
							return 'utils';
						}
						
						// Audio handling
						if (id.includes('howler')) {
							return 'audio';
						}
						
						// Firebase
						if (id.includes('firebase')) {
							return 'firebase';
						}
						
						// Cloudinary
						if (id.includes('cloudinary')) {
							return 'cloudinary';
						}
						
						// Pages - split by route
						if (id.includes('/pages/')) {
							if (id.includes('/home/')) return 'page-home';
							if (id.includes('/search/')) return 'page-search';
							if (id.includes('/liked-songs/')) return 'page-liked-songs';
							if (id.includes('/library/')) return 'page-library';
							if (id.includes('/playlist/')) return 'page-playlist';
							if (id.includes('/album/')) return 'page-album';
							if (id.includes('/profile/')) return 'page-profile';
							if (id.includes('/login/')) return 'page-auth';
							if (id.includes('/register/')) return 'page-auth';
							return 'pages';
						}
						
						// Components
						if (id.includes('/components/')) {
							if (id.includes('AudioPlayer') || id.includes('Player')) return 'player';
							if (id.includes('PlaylistCard') || id.includes('SongCard')) return 'cards';
							if (id.includes('Dialog') || id.includes('Modal')) return 'dialogs';
							return 'components';
						}
						
						// Services
						if (id.includes('/services/')) {
							if (id.includes('spotify')) return 'spotify-service';
							if (id.includes('firestore')) return 'firebase-service';
							return 'services';
						}
						
						// Stores
						if (id.includes('/stores/')) {
							return 'stores';
						}
						
						// Layout
						if (id.includes('/layout/')) {
							return 'layout';
						}
						
						// Vendor dependencies
						if (id.includes('node_modules')) {
							return 'vendor';
						}
					},
					chunkFileNames: (chunkInfo) => {
						const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
						return `js/[name]-[hash].js`;
					},
					entryFileNames: 'js/[name]-[hash].js',
					assetFileNames: (assetInfo: { name?: string }) => {
						if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
						const info = assetInfo.name.split('.');
						const ext = info[info.length - 1];
						if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
							return `images/[name]-[hash][extname]`;
						}
						if (/css/i.test(ext)) {
							return `css/[name]-[hash][extname]`;
						}
						return `assets/[name]-[hash][extname]`;
					},
				},
			},
			chunkSizeWarningLimit: 1000,
			assetsInlineLimit: 4096, // Inline small assets as base64
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
		},
		optimizeDeps: {
			include: [
				'react',
				'react-dom',
				'react-router-dom',
				'zustand',
				'lucide-react',
				'clsx',
				'tailwind-merge'
			],
			exclude: [
				'@radix-ui/react-slider',
				'@radix-ui/react-dialog',
				'@radix-ui/react-dropdown-menu'
			]
		}
	}
});
